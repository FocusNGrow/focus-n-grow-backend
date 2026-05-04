const express = require('express');
const StudyPlan = require('../models/StudyPlan');
const StudyPlanItem = require('../models/StudyPlanItem');

const router = express.Router();

// CREATE STUDY PLAN
router.post('/plans/create', async (req, res) => {
  try {
    const { user_id, title, description, start_date, end_date, exam_date } = req.body;

    if (!user_id || !title) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and title are required',
      });
    }

    const plan = await StudyPlan.create({
      user_id,
      title,
      description,
      start_date,
      end_date,
      exam_date,
    });

    res.status(201).json({
      status: 'success',
      message: 'Study plan created successfully',
      data: plan,
    });
  } catch (error) {
    console.error('Study plan creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Study plan creation failed',
      error: error.message,
    });
  }
});

// GET STUDY PLAN
router.get('/plans/:plan_id', async (req, res) => {
  try {
    const { plan_id } = req.params;

    const plan = await StudyPlan.findByPk(plan_id);
    if (!plan) {
      return res.status(404).json({
        status: 'error',
        message: 'Study plan not found',
      });
    }

    const items = await StudyPlanItem.findAll({ where: { study_plan_id: plan_id } });

    res.status(200).json({
      status: 'success',
      data: {
        plan,
        items,
      },
    });
  } catch (error) {
    console.error('Get study plan error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get study plan',
      error: error.message,
    });
  }
});

// ADD STUDY PLAN ITEM
router.post('/items/create', async (req, res) => {
  try {
    const { study_plan_id, date, subject, topic, description, duration_minutes, priority } = req.body;

    if (!study_plan_id || !date || !subject || !topic) {
      return res.status(400).json({
        status: 'error',
        message: 'study_plan_id, date, subject, and topic are required',
      });
    }

    const item = await StudyPlanItem.create({
      study_plan_id,
      date,
      subject,
      topic,
      description,
      duration_minutes,
      priority,
    });

    res.status(201).json({
      status: 'success',
      message: 'Study task created successfully',
      data: item,
    });
  } catch (error) {
    console.error('Study item creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Study task creation failed',
      error: error.message,
    });
  }
});

// GET TODAY'S TASKS
router.get('/tasks/today/:plan_id', async (req, res) => {
  try {
    const { plan_id } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await StudyPlanItem.findAll({
      where: {
        study_plan_id: plan_id,
        date: {
          [require('sequelize').Op.between]: [today, tomorrow],
        },
      },
      order: [['date', 'ASC']],
    });

    res.status(200).json({
      status: 'success',
      data: tasks,
    });
  } catch (error) {
    console.error('Get today tasks error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get today tasks',
      error: error.message,
    });
  }
});

module.exports = router;