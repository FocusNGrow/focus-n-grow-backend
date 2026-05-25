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

// Generate 6-digit link code
function genLinkCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/parent/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ status: 'error',
        message: 'Name, email and password required' });
    }
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ status: 'error',
        message: 'Email already registered' });
    }
    const user = await User.create({
      name, email, password, phone: phone || '',
      plan_type: 'parent',
    });
    const token = jwt.sign({ id: user.id, email: user.email },
      getSecret(), { expiresIn: '30d' });
    res.status(201).json({
      status: 'success',
      data: { token, id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/parent/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ status: 'error',
        message: 'Invalid email or password' });
    }
    const token = jwt.sign({ id: user.id, email: user.email },
      getSecret(), { expiresIn: '30d' });
    res.json({
      status: 'success',
      data: { token, id: user.id, name: user.name, email: user.email },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/parent/link-child (parent links to child using child's link code)
router.post('/link-child', async (req, res) => {
  try {
    const { parent_user_id, link_code } = req.body;
    const { data: link, error } = await supabase
      .from('parent_child_links')
      .select('*, child_name')
      .eq('link_code', link_code.toUpperCase())
      .eq('verified', false)
      .single();
    if (error || !link) {
      return res.status(404).json({ status: 'error',
        message: 'Invalid code. Ask your child to generate a link code.' });
    }
    await supabase.from('parent_child_links')
      .update({ parent_user_id, verified: true })
      .eq('id', link.id);
    res.json({ status: 'success',
      message: `Linked to ${link.child_name}!`, data: link });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/parent/:parent_id/children
router.get('/:parent_id/children', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('parent_child_links')
      .select()
      .eq('parent_user_id', req.params.parent_id)
      .eq('verified', true);
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/parent/child/:child_id/report
router.get('/child/:child_id/report', async (req, res) => {
  try {
    const childId = req.params.child_id;
    const child = await User.findOne({
      where: { id: childId },
      attributes: ['id', 'name', 'email', 'plan_type', 'createdAt'],
    });
    if (!child) return res.status(404).json({ status: 'error',
      message: 'Child not found' });

    // Mood logs last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString();
    const { data: moods } = await supabase
      .from('school_mood_logs')
      .select()
      .eq('student_user_id', childId)
      .gte('logged_at', sevenDaysAgo)
      .order('logged_at', { ascending: false });

    // Assignment completions
    const { data: completions } = await supabase
      .from('assignment_completions')
      .select('*, assignments(subject, title, minimum_focus_minutes)')
      .eq('student_user_id', childId)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(10);

    // Total study minutes
    const totalMinutes = completions?.reduce(
      (sum, c) => sum + (c.minutes_studied || 0), 0) || 0;

    // Mood summary
    const moodCounts = {};
    moods?.forEach(m => {
      moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1;
    });

    res.json({
      status: 'success',
      data: {
        child: {
          name: child.name,
          plan: child.plan_type,
        },
        this_week: {
          total_study_minutes: totalMinutes,
          total_study_hours: (totalMinutes / 60).toFixed(1),
          assignments_completed: completions?.length || 0,
          mood_logs: moods?.length || 0,
          mood_summary: moodCounts,
        },
        recent_assignments: completions?.slice(0, 5) || [],
        recent_moods: moods?.slice(0, 7) || [],
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/parent/generate-link-code (child generates code for parent)
router.post('/generate-link-code', async (req, res) => {
  try {
    const { child_user_id, child_name } = req.body;
    const linkCode = genLinkCode();
    await supabase.from('parent_child_links')
      .delete()
      .eq('child_user_id', child_user_id)
      .eq('verified', false);
    const { data, error } = await supabase
      .from('parent_child_links')
      .insert({ child_user_id, child_name, link_code: linkCode })
      .select().single();
    if (error) throw error;
    res.json({ status: 'success', link_code: linkCode, data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;