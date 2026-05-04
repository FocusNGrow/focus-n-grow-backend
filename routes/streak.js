const express = require('express');
const Streak = require('../models/Streak');

const router = express.Router();

// GET STREAK
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    let streak = await Streak.findOne({ where: { user_id } });

    if (!streak) {
      streak = await Streak.create({
        user_id,
        current_streak: 0,
        longest_streak: 0,
        total_study_days: 0,
      });
    }

    res.status(200).json({
      status: 'success',
      data: streak,
    });
  } catch (error) {
    console.error('Get streak error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get streak',
      error: error.message,
    });
  }
});

// UPDATE STREAK (called when student completes study session)
router.post('/update', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id is required',
      });
    }

    let streak = await Streak.findOne({ where: { user_id } });

    if (!streak) {
      streak = await Streak.create({
        user_id,
        current_streak: 1,
        longest_streak: 1,
        last_study_date: new Date(),
        total_study_days: 1,
      });
    } else {
      const today = new Date();
      const lastStudy = streak.last_study_date ? new Date(streak.last_study_date) : null;

      let newStreak = streak.current_streak;

      if (lastStudy) {
        const daysDiff = Math.floor((today - lastStudy) / (1000 * 60 * 60 * 24));

        if (daysDiff === 0) {
          // Same day - no change
        } else if (daysDiff === 1) {
          // Consecutive day - increase streak
          newStreak += 1;
        } else {
          // Missed days - reset streak
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }

      await streak.update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streak.longest_streak),
        last_study_date: today,
        total_study_days: streak.total_study_days + 1,
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Streak updated!',
      data: streak,
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update streak',
      error: error.message,
    });
  }
});

module.exports = router;