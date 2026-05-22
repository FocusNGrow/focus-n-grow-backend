const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ojjsdkucujkxxsfbzqpf.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// Generate unique school code
function generateCode() {
  return 'FNG' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// POST /api/school/create
router.post('/create', async (req, res) => {
  try {
    const { name, address, state, admin_user_id } = req.body;
    if (!name || !admin_user_id) {
      return res.status(400).json({ status: 'error', message: 'School name and admin required' });
    }
    const school_code = generateCode();
    const { data, error } = await supabase
      .from('schools')
      .insert({ name, address, state, admin_user_id, school_code })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ status: 'success', data, school_code });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/school/join (student joins with school code)
router.post('/join', async (req, res) => {
  try {
    const { school_code, student_user_id, class_id } = req.body;
    const { data: school } = await supabase
      .from('schools')
      .select()
      .eq('school_code', school_code)
      .single();
    if (!school) return res.status(404).json({ status: 'error', message: 'Invalid school code' });
    const { data, error } = await supabase
      .from('school_enrollments')
      .insert({ school_id: school.id, class_id, student_user_id })
      .select()
      .single();
    if (error) throw error;
    res.json({ status: 'success', data, school });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/school/:school_id/classes
router.get('/:school_id/classes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('school_classes')
      .select()
      .eq('school_id', req.params.school_id);
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/school/class/create
router.post('/class/create', async (req, res) => {
  try {
    const { school_id, name, grade_level, teacher_id } = req.body;
    const { data, error } = await supabase
      .from('school_classes')
      .insert({ school_id, name, grade_level, teacher_id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/school/student/:user_id/assignments
router.get('/student/:user_id/assignments', async (req, res) => {
  try {
    const { data: enrollments } = await supabase
      .from('school_enrollments')
      .select('class_id')
      .eq('student_user_id', req.params.user_id);
    if (!enrollments?.length) return res.json({ status: 'success', data: [] });
    const classIds = enrollments.map(e => e.class_id);
    const { data, error } = await supabase
      .from('assignments')
      .select()
      .in('class_id', classIds)
      .order('due_date');
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/school/assignment/complete
router.post('/assignment/complete', async (req, res) => {
  try {
    const { assignment_id, student_user_id, minutes_studied } = req.body;
    const { data, error } = await supabase
      .from('assignment_completions')
      .upsert({
        assignment_id,
        student_user_id,
        minutes_studied,
        completed: true,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /api/school/:school_id/mood-pulse (for admin dashboard)
router.get('/:school_id/mood-pulse', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('school_mood_logs')
      .select()
      .eq('school_id', req.params.school_id)
      .gte('logged_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if (error) throw error;
    const summary = { overwhelmed: 0, struggling: 0, ok: 0, great: 0 };
    data.forEach(log => {
      if (summary[log.mood] !== undefined) summary[log.mood]++;
    });
    res.json({ status: 'success', data, summary });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/school/mood
router.post('/mood', async (req, res) => {
  try {
    const { student_user_id, school_id, class_id, mood } = req.body;
    const { data, error } = await supabase
      .from('school_mood_logs')
      .insert({ student_user_id, school_id, class_id, mood })
      .select()
      .single();
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
module.exports = router; 
