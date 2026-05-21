const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ojjsdkucujkxxsfbzqpf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

const getSecret = () => process.env.JWT_SECRET || 'focus-n-grow-secret-key-2025';

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: 'admin' },
      getSecret(), { expiresIn: '7d' });
    res.json({ status: 'success', token, name: user.name, id: user.id });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/admin/school/:school_id/overview
router.get('/school/:school_id/overview', async (req, res) => {
  try {
    const schoolId = req.params.school_id;
    const { data: students } = await supabase.from('school_enrollments')
      .select('student_user_id').eq('school_id', schoolId);
    const { data: classes } = await supabase.from('school_classes')
      .select().eq('school_id', schoolId);
    const { data: assignments } = await supabase.from('assignments')
      .select().in('class_id', classes?.map(c => c.id) || []);
    const { data: completions } = await supabase.from('assignment_completions')
      .select().eq('completed', true);
    const { data: moods } = await supabase.from('school_mood_logs')
      .select().eq('school_id', schoolId)
      .gte('logged_at', new Date(Date.now() - 7*24*60*60*1000).toISOString());

    const moodSummary = { great: 0, ok: 0, struggling: 0, overwhelmed: 0 };
    moods?.forEach(m => { if (moodSummary[m.mood] !== undefined) moodSummary[m.mood]++; });

    res.json({
      status: 'success',
      data: {
        total_students: students?.length || 0,
        total_classes: classes?.length || 0,
        total_assignments: assignments?.length || 0,
        total_completions: completions?.length || 0,
        mood_summary: moodSummary,
        classes,
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/admin/school/:school_id/class
router.post('/school/:school_id/class', async (req, res) => {
  try {
    const { name, grade_level, teacher_id } = req.body;
    const { data, error } = await supabase.from('school_classes').insert({
      school_id: req.params.school_id, name, grade_level, teacher_id,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;