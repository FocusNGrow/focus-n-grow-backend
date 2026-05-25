const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createClient } = require('@supabase/supabase-js');

const getSupabase = () => createClient(
  process.env.SUPABASE_URL || 'https://ojjsdkucujkxxsfbzqpf.getsupabase().co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'missing'
);

const getSecret = () => process.env.JWT_SECRET || 'focus-n-grow-secret-key-2025';

// POST /api/teacher/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: 'teacher' },
      getSecret(), { expiresIn: '7d' });
    res.json({ status: 'success', token, name: user.name });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/teacher/assignment/create
router.post('/assignment/create', async (req, res) => {
  try {
    const { class_id, teacher_id, subject, title, description,
            minimum_focus_minutes, due_date } = req.body;
    const { data, error } = await getsupabase().from('assignments').insert({
      class_id, teacher_id, subject, title, description,
      minimum_focus_minutes: minimum_focus_minutes || 30,
      due_date,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/teacher/:teacher_id/assignments
router.get('/:teacher_id/assignments', async (req, res) => {
  try {
    const { data, error } = await getsupabase().from('assignments')
      .select().eq('teacher_id', req.params.teacher_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/teacher/class/:class_id/students
router.get('/class/:class_id/students', async (req, res) => {
  try {
    const { data, error } = await getsupabase().from('school_enrollments')
      .select('student_user_id').eq('class_id', req.params.class_id);
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/teacher/assignment/:id/completions
router.get('/assignment/:id/completions', async (req, res) => {
  try {
    const { data, error } = await getsupabase().from('assignment_completions')
      .select().eq('assignment_id', req.params.id);
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;