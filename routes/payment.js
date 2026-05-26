const express = require('express');
const https = require('https');
const User = require('../models/User');

const router = express.Router();

const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY;

// INITIATE PAYMENT
router.post('/initiate', async (req, res) => {
  try {
    const { user_id, amount, plan_type, email, name, phone } = req.body;

    if (!user_id || !amount || !plan_type) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id, amount, and plan_type are required',
      });
    }

    const tx_ref = `FNG-${user_id}-${Date.now()}`;

    const paymentData = {
      tx_ref,
      amount,
      currency: 'NGN',
      redirect_url: 'https://focus-n-grow-backend-production.up.railway.app/api/payment/callback',
      customer: {
        email,
        name,
        phone_number: phone,
      },
      meta: {
        user_id,
        plan_type,
      },
      customizations: {
        title: 'Focus N Grow Premium',
        description: `Upgrade to ${plan_type} plan`,
        logo: 'https://focus-n-grow-backend-production.up.railway.app/logo.png',
      },
    };

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    if (data.status === 'success') {
      res.status(200).json({
        status: 'success',
        payment_link: data.data.link,
        tx_ref,
      });
    } else {
      res.status(400).json({
        status: 'error',
        message: 'Failed to initiate payment',
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// PAYMENT CALLBACK (after payment)
router.get('/callback', async (req, res) => {
  try {
    const { tx_ref, transaction_id, status } = req.query;

    if (status === 'successful') {
      // Verify payment with Flutterwave
      const verifyResponse = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
        {
          headers: {
            'Authorization': `Bearer ${FLW_SECRET_KEY}`,
          },
        }
      );

      const verifyData = await verifyResponse.json();

      if (verifyData.status === 'success' &&
          verifyData.data.status === 'successful') {
        const { user_id, plan_type } = verifyData.data.meta;

        // Update user plan
        await User.update(
          { plan_type, subscription_status: 'active' },
          { where: { id: user_id } }
        );

        res.redirect(
          'focusgrow://payment-success?plan=' + plan_type
        );
      } else {
        res.redirect('focusgrow://payment-failed');
      }
    } else {
      res.redirect('focusgrow://payment-failed');
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// WEBHOOK (Flutterwave calls this)
router.post('/webhook', async (req, res) => {
  try {
    const secretHash = process.env.FLW_WEBHOOK_HASH;
    const signature = req.headers['verif-hash'];

    if (!signature || signature !== secretHash) {
      return res.status(401).send('Unauthorized');
    }

    const payload = req.body;

    if (payload.event === 'charge.completed' &&
        payload.data.status === 'successful') {
      const { user_id, plan_type } = payload.data.meta;

      await User.update(
        { plan_type, subscription_status: 'active' },
        { where: { id: user_id } }
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/payment/webhook (Flutterwave sends this after payment)
router.post('/webhook', async (req, res) => {
  try {
    const hash = req.headers['verif-hash'];
    const secretHash = process.env.FLW_WEBHOOK_HASH || 'focusngrow2025webhook';

    if (hash !== secretHash) {
      return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    if (event.event === 'charge.completed' &&
        event.data.status === 'successful') {

      const meta = event.data.meta || {};
      const userId = meta.user_id;
      const planType = meta.plan_type || 'basic';

      if (userId) {
        await User.update(
          { plan_type: planType },
          { where: { id: userId } }
        );

        // Verify referral if they came from a referral
        try {
          const axios = require('axios');
          await axios.post(
            `${process.env.APP_URL || 'https://focus-n-grow-backend-production.up.railway.app'}/api/referral/verify-subscription`,
            { user_id: userId }
          );
        } catch (_) {}

        console.log(`✅ Payment verified: user ${userId} upgraded to ${planType}`);
      }
    }

    res.status(200).json({ status: 'success' });
  } catch (e) {
    console.error('Webhook error:', e.message);
    res.status(500).json({ status: 'error' });
  }
});

module.exports = router;