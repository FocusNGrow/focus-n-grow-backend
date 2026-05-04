const express = require('express');
const Profile = require('../models/Profile');
const User = require('../models/User');

const router = express.Router();

// CREATE PROFILE
router.post('/create', async (req, res) => {
  try {
    const { user_id, school_name, grade_level, exam_type, study_hours_per_day, preferred_study_time, subjects, goals } = req.body;

    if (!user_id || !school_name) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and school_name are required',
      });
    }

    const profile = await Profile.create({
      user_id,
      school_name,
      grade_level,
      exam_type,
      study_hours_per_day,
      preferred_study_time,
      subjects,
      goals,
    });

    res.status(201).json({
      status: 'success',
      message: 'Profile created successfully',
      data: profile,
    });
  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Profile creation failed',
      error: error.message,
    });
  }
});

// GET PROFILE
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const profile = await Profile.findOne({ where: { user_id } });
    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile',
      error: error.message,
    });
  }
});

// UPDATE PROFILE
router.put('/update/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { school_name, grade_level, exam_type, study_hours_per_day, preferred_study_time, subjects, goals, bio } = req.body;

    const profile = await Profile.findOne({ where: { user_id } });
    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found',
      });
    }

    await profile.update({
      school_name: school_name || profile.school_name,
      grade_level: grade_level || profile.grade_level,
      exam_type: exam_type || profile.exam_type,
      study_hours_per_day: study_hours_per_day || profile.study_hours_per_day,
      preferred_study_time: preferred_study_time || profile.preferred_study_time,
      subjects: subjects || profile.subjects,
      goals: goals || profile.goals,
      bio: bio || profile.bio,
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Profile update failed',
      error: error.message,
    });
  }
});

module.exports = router;