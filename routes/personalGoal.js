const express = require('express');
const PersonalGoal = require('../models/PersonalGoal');
const BiblePlan = require('../models/BiblePlan');

const router = express.Router();

// GET ALL GOALS
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const goals = await PersonalGoal.findAll({
      where: { user_id, is_active: true },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json({ status: 'success', data: goals });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// CREATE GOAL
router.post('/create', async (req, res) => {
  try {
    const { user_id, goal_type, title, description, target_date } = req.body;

    if (!user_id || !goal_type || !title) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id, goal_type, and title are required',
      });
    }

    const goal = await PersonalGoal.create({
      user_id, goal_type, title, description, target_date,
    });

    res.status(201).json({
      status: 'success',
      message: 'Goal created!',
      data: goal,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// UPDATE PROGRESS
router.put('/progress/:goal_id', async (req, res) => {
  try {
    const { goal_id } = req.params;
    const { progress_percentage } = req.body;

    const goal = await PersonalGoal.findByPk(goal_id);
    if (!goal) return res.status(404).json({ status: 'error', message: 'Goal not found' });

    await goal.update({ progress_percentage });
    res.status(200).json({ status: 'success', data: goal });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET BIBLE PLAN
router.get('/bible/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    let plan = await BiblePlan.findOne({ where: { user_id } });
    if (!plan) plan = await BiblePlan.create({ user_id });

    const today = getBibleReading(plan.current_day);

    res.status(200).json({
      status: 'success',
      data: {
        plan,
        today_reading: today,
        progress: Math.round((plan.current_day / plan.total_days) * 100),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// COMPLETE BIBLE DAY
router.post('/bible/complete', async (req, res) => {
  try {
    const { user_id } = req.body;

    let plan = await BiblePlan.findOne({ where: { user_id } });
    if (!plan) plan = await BiblePlan.create({ user_id });

    const completed = JSON.parse(plan.completed_days || '[]');
    const today = plan.current_day;

    if (!completed.includes(today)) {
      completed.push(today);
      await plan.update({
        completed_days: JSON.stringify(completed),
        current_day: Math.min(today + 1, 365),
        last_read_date: new Date(),
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Day ${today} completed! 🎉`,
      data: plan,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

function getBibleReading(day) {
  const schedule = [
    { day: 1, passage: 'Genesis 1-3', theme: 'Creation' },
    { day: 2, passage: 'Genesis 4-7', theme: 'Early History' },
    { day: 3, passage: 'Genesis 8-11', theme: 'Noah and Babel' },
    { day: 4, passage: 'Genesis 12-15', theme: "Abraham's Call" },
    { day: 5, passage: 'Genesis 16-18', theme: "God's Promise" },
    { day: 6, passage: 'Genesis 19-21', theme: 'Sodom and Isaac' },
    { day: 7, passage: 'Genesis 22-24', theme: 'Faith Tested' },
    { day: 8, passage: 'Genesis 25-26', theme: 'Isaac and Jacob' },
    { day: 9, passage: 'Genesis 27-29', theme: 'Jacob and Esau' },
    { day: 10, passage: 'Genesis 30-31', theme: "Jacob's Family" },
  ];

  const reading = schedule.find(s => s.day === day);
  if (reading) return reading;

  return {
    day,
    passage: `Day ${day} Reading`,
    theme: 'Continue your journey',
  };
}

module.exports = router;