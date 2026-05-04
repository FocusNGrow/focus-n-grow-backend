const express = require('express');
const User = require('../models/User');

const router = express.Router();

// GET SUBSCRIPTION STATUS
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    const plans = {
      free: {
        name: 'Free',
        messages_per_day: 5,
        offline_plans: false,
        group_study: false,
        advanced_analytics: false,
        price: 0,
      },
      '₦500_monthly': {
        name: 'Basic Premium',
        messages_per_day: 50,
        offline_plans: true,
        group_study: false,
        advanced_analytics: true,
        price: 500,
      },
      '₦1000_monthly': {
        name: 'Full Premium',
        messages_per_day: 100,
        offline_plans: true,
        group_study: true,
        advanced_analytics: true,
        price: 1000,
      },
    };

    res.status(200).json({
      status: 'success',
      data: {
        user_id: user.id,
        email: user.email,
        current_plan: user.plan_type,
        plan_details: plans[user.plan_type] || plans.free,
        subscription_status: user.subscription_status,
        available_plans: plans,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get subscription',
      error: error.message,
    });
  }
});

// UPGRADE PLAN (Manual for now, Flutterwave later)
router.post('/upgrade', async (req, res) => {
  try {
    const { user_id, plan_type } = req.body;

    if (!user_id || !plan_type) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and plan_type are required',
      });
    }

    const validPlans = ['free', '₦500_monthly', '₦1000_monthly'];
    if (!validPlans.includes(plan_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid plan type',
      });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    await user.update({ plan_type });

    res.status(200).json({
      status: 'success',
      message: `Plan upgraded to ${plan_type}!`,
      data: {
        user_id: user.id,
        plan_type: user.plan_type,
      },
    });
  } catch (error) {
    console.error('Upgrade error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upgrade plan',
      error: error.message,
    });
  }
});

module.exports = router;