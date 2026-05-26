const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.supabase.co';
const sb = () => createClient(SB_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '');

// Generate referral code from user id
function genCode(userId) {
  return 'FNG-' + userId.substring(0, 6).toUpperCase();
}

// GET /api/referral/:user_id/code
router.get('/:user_id/code', async (req, res) => {
  try {
    const code = genCode(req.params.user_id);
    const { data: referrals } = await sb()
      .from('referrals')
      .select()
      .eq('referrer_user_id', req.params.user_id);

    const verified = referrals?.filter(r => r.subscription_verified).length || 0;
    const remaining = Math.max(0, 5 - verified);
    const rewardEarned = Math.floor(verified / 5);

    res.json({
      status: 'success',
      referral_code: code,
      stats: {
        total_referrals: referrals?.length || 0,
        verified_subscribers: verified,
        remaining_for_reward: remaining,
        free_months_earned: rewardEarned,
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/referral/apply (called when new user registers with referral code)
router.post('/apply', async (req, res) => {
  try {
    const { referral_code, new_user_id, new_user_email } = req.body;
    if (!referral_code || !new_user_id) {
      return res.status(400).json({ status: 'error', message: 'Missing fields' });
    }

    // Find referrer by their code pattern
    const allUsers = await User.findAll({ attributes: ['id'] });
    const referrer = allUsers.find(u => genCode(u.id) === referral_code.toUpperCase());

    if (!referrer) {
      return res.status(404).json({ status: 'error', message: 'Invalid referral code' });
    }
    if (referrer.id === new_user_id) {
      return res.status(400).json({ status: 'error', message: 'Cannot refer yourself' });
    }

    // Check not already referred
    const { data: existing } = await sb().from('referrals')
      .select().eq('referred_user_id', new_user_id).single();
    if (existing) {
      return res.json({ status: 'success', message: 'Already tracked' });
    }

    await sb().from('referrals').insert({
      referrer_user_id: referrer.id,
      referred_user_id: new_user_id,
      referred_email: new_user_email,
    });

    res.json({ status: 'success', message: 'Referral tracked!' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/referral/verify-subscription (called when referred user pays)
router.post('/verify-subscription', async (req, res) => {
  try {
    const { user_id } = req.body;

    // Find their referral record
    const { data: referral } = await sb().from('referrals')
      .select().eq('referred_user_id', user_id)
      .eq('subscription_verified', false).single();

    if (!referral) return res.json({ status: 'success', message: 'No referral to verify' });

    // Mark as verified
    await sb().from('referrals')
      .update({ subscription_verified: true })
      .eq('id', referral.id);

    // Count verified referrals for the referrer
    const { data: allVerified } = await sb().from('referrals')
      .select().eq('referrer_user_id', referral.referrer_user_id)
      .eq('subscription_verified', true)
      .eq('rewarded', false);

    // Every 5 verified referrals = 1 free month
    if (allVerified?.length >= 5) {
      const toReward = allVerified.slice(0, 5);
      const ids = toReward.map(r => r.id);
      await sb().from('referrals').update({ rewarded: true }).in('id', ids);

      // Extend referrer's subscription by 1 month
      const referrer = await User.findByPk(referral.referrer_user_id);
      if (referrer) {
        const currentPlan = referrer.plan_type || 'free';
        if (currentPlan === 'free') {
          await User.update({ plan_type: 'basic' },
            { where: { id: referral.referrer_user_id } });
        }
      }
      res.json({ status: 'success', message: 'Referrer rewarded with free month!' });
    } else {
      res.json({ status: 'success',
        message: `${allVerified?.length || 1} of 5 referrals verified` });
    }
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router; 
