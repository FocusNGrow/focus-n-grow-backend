const express = require('express');
const MoodLog = require('../models/MoodLog');

const router = express.Router();

// LOG MOOD
router.post('/log', async (req, res) => {
  try {
    const { user_id, mood, energy_level, notes, study_time_today } = req.body;

    if (!user_id || !mood) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and mood are required',
      });
    }

    const moodLog = await MoodLog.create({
      user_id,
      mood,
      energy_level,
      notes,
      study_time_today,
    });

    res.status(201).json({
      status: 'success',
      message: 'Mood logged successfully',
      data: moodLog,
    });
  } catch (error) {
    console.error('Mood log error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to log mood',
      error: error.message,
    });
  }
});

// GET MOOD HISTORY (Last 7 days)
router.get('/history/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const moods = await MoodLog.findAll({
      where: {
        user_id,
        createdAt: {
          [require('sequelize').Op.gte]: sevenDaysAgo,
        },
      },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      status: 'success',
      data: moods,
    });
  } catch (error) {
    console.error('Get mood history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get mood history',
      error: error.message,
    });
  }
});

// GET MOOD ANALYSIS
router.get('/analysis/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const moods = await MoodLog.findAll({
      where: { user_id },
      order: [['createdAt', 'DESC']],
      limit: 30,
    });

    const moodCounts = {};
    moods.forEach(log => {
      moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    });

    const avgEnergyLevel = moods.length > 0
      ? (moods.reduce((sum, log) => sum + (log.energy_level || 0), 0) / moods.length).toFixed(2)
      : 0;

    res.status(200).json({
      status: 'success',
      data: {
        total_logs: moods.length,
        mood_distribution: moodCounts,
        average_energy_level: avgEnergyLevel,
        most_common_mood: Object.keys(moodCounts).reduce((a, b) => moodCounts[a] > moodCounts[b] ? a : b, null),
      },
    });
  } catch (error) {
    console.error('Mood analysis error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get mood analysis',
      error: error.message,
    });
  }
});

module.exports = router;