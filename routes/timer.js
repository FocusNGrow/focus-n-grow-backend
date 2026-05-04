const express = require('express');
const FocusSession = require('../models/FocusSession');
const Streak = require('../models/Streak');

const router = express.Router();

// START FOCUS SESSION
router.post('/start', async (req, res) => {
  try {
    const { user_id, duration_minutes, subject } = req.body;

    if (!user_id || !duration_minutes) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and duration_minutes are required',
      });
    }

    const session = await FocusSession.create({
      user_id,
      duration_minutes,
      subject: subject || null,
      started_at: new Date(),
      completed: false,
    });

    res.status(201).json({
      status: 'success',
      message: 'Focus session started!',
      data: session,
    });
  } catch (error) {
    console.error('Start timer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start session',
      error: error.message,
    });
  }
});

// END FOCUS SESSION
router.post('/end', async (req, res) => {
  try {
    const { session_id, user_id, completed } = req.body;

    if (!session_id || !user_id) {
      return res.status(400).json({
        status: 'error',
        message: 'session_id and user_id are required',
      });
    }

    const session = await FocusSession.findByPk(session_id);
    if (!session) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
    }

    await session.update({
      ended_at: new Date(),
      completed: completed || false,
    });

    // Update streak if session completed
    if (completed) {
      let streak = await Streak.findOne({ where: { user_id } });
      if (!streak) {
        await Streak.create({
          user_id,
          current_streak: 1,
          longest_streak: 1,
          last_study_date: new Date(),
          total_study_days: 1,
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: completed ? 'Session completed! 🎉' : 'Session ended',
      data: session,
    });
  } catch (error) {
    console.error('End timer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to end session',
      error: error.message,
    });
  }
});

// GET SESSION HISTORY
router.get('/history/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const sessions = await FocusSession.findAll({
      where: { user_id },
      order: [['started_at', 'DESC']],
      limit: 20,
    });

    const totalMinutes = sessions
      .filter(s => s.completed)
      .reduce((sum, s) => sum + s.duration_minutes, 0);

    res.status(200).json({
      status: 'success',
      data: {
        sessions,
        total_sessions: sessions.length,
        completed_sessions: sessions.filter(s => s.completed).length,
        total_minutes_studied: totalMinutes,
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sessions',
      error: error.message,
    });
  }
});

module.exports = router;