const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.supabase.co';
const sb = () => createClient(SB_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '');

function genCode(prefix, len = 6) {
  return prefix + Math.random().toString(36)
    .substring(2, 2 + len).toUpperCase();
}

// ─── UNIVERSITY ────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, address, state, admin_user_id } = req.body;
    if (!name) return res.status(400).json({ status:'error',
      message:'University name required' });
    const university_code = genCode('UNI');
    const { data, error } = await sb().from('universities')
      .insert({ name, address, state, university_code,
        hod_user_id: admin_user_id })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

// ─── DEPARTMENTS ───────────────────────────────────────
router.post('/department/create', async (req, res) => {
  try {
    const { university_id, name, hod_user_id } = req.body;
    const department_code = genCode('DEPT');
    const { data, error } = await sb().from('departments')
      .insert({ university_id, name, department_code, hod_user_id })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

router.get('/university/:uni_id/departments', async (req, res) => {
  try {
    const { data, error } = await sb().from('departments')
      .select().eq('university_id', req.params.uni_id);
    if (error) throw error;
    res.json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

// ─── COURSES ───────────────────────────────────────────
router.post('/course/create', async (req, res) => {
  try {
    const { department_id, lecturer_user_id, course_name,
            course_code, course_units, level, semester } = req.body;
    if (!course_name || !lecturer_user_id) return res.status(400)
      .json({ status:'error', message:'Course name and lecturer required' });
    const code = course_code?.toUpperCase() || genCode('CRS');
    const { data, error } = await sb().from('courses')
      .insert({ department_id, lecturer_user_id, course_name,
        course_code: code, course_units: course_units || 3,
        level: level || '100', semester: semester || '1st Semester' })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

router.get('/department/:dept_id/courses', async (req, res) => {
  try {
    const { data, error } = await sb().from('courses')
      .select().eq('department_id', req.params.dept_id);
    if (error) throw error;
    res.json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

// ─── STUDENT ENROLLMENT ────────────────────────────────
router.post('/course/join', async (req, res) => {
  try {
    const { course_code, student_user_id } = req.body;
    const { data: course } = await sb().from('courses')
      .select().eq('course_code', course_code.toUpperCase()).single();
    if (!course) return res.status(404).json({ status:'error',
      message:'Course not found. Check the course code.' });

    const { data: existing } = await sb().from('course_enrollments')
      .select().eq('course_id', course.id)
      .eq('student_user_id', student_user_id).single();
    if (existing) return res.json({ status:'success',
      data: existing, course, alreadyEnrolled: true });

    const { data, error } = await sb().from('course_enrollments')
      .insert({ course_id: course.id, student_user_id })
      .select().single();
    if (error) throw error;

    await User.update({ plan_type: 'premium' },
      { where: { id: student_user_id } });

    res.json({ status:'success', data, course,
      message:`Enrolled in ${course.course_name}!` });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

router.get('/student/:user_id/courses', async (req, res) => {
  try {
    const { data: enrollments } = await sb().from('course_enrollments')
      .select('course_id').eq('student_user_id', req.params.user_id);
    if (!enrollments?.length) return res.json({ status:'success', data:[] });
    const courseIds = enrollments.map(e => e.course_id);
    const { data, error } = await sb().from('courses')
      .select().in('id', courseIds);
    if (error) throw error;
    res.json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

// ─── ASSIGNMENTS ───────────────────────────────────────
router.post('/assignment/create', async (req, res) => {
  try {
    const { course_id, lecturer_user_id, title, description,
            type, minimum_focus_minutes, due_date } = req.body;
    const { data, error } = await sb().from('course_assignments')
      .insert({ course_id, lecturer_user_id, title, description,
        type: type || 'homework',
        minimum_focus_minutes: minimum_focus_minutes || 45,
        due_date: due_date || null })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

router.get('/student/:user_id/assignments', async (req, res) => {
  try {
    const { data: enrollments } = await sb().from('course_enrollments')
      .select('course_id').eq('student_user_id', req.params.user_id);
    if (!enrollments?.length) return res.json({ status:'success', data:[] });
    const courseIds = enrollments.map(e => e.course_id);
    const { data: assignments } = await sb().from('course_assignments')
      .select().in('course_id', courseIds)
      .order('created_at', { ascending: false });
    const { data: completions } = await sb()
      .from('course_assignment_completions')
      .select('assignment_id').eq('student_user_id', req.params.user_id);
    const completedIds = new Set(completions?.map(c => c.assignment_id));
    const result = assignments?.map(a => ({
      ...a, completed: completedIds.has(a.id)
    })) || [];
    res.json({ status:'success', data: result });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

router.post('/assignment/complete', async (req, res) => {
  try {
    const { assignment_id, student_user_id, minutes_studied } = req.body;
    const { data, error } = await sb()
      .from('course_assignment_completions')
      .insert({ assignment_id, student_user_id,
        minutes_studied: minutes_studied || 45 })
      .select().single();
    if (error) throw error;
    res.json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

// ─── MOOD ──────────────────────────────────────────────
router.post('/mood', async (req, res) => {
  try {
    const { student_user_id, university_id, department_id,
            course_id, mood, note } = req.body;
    const { data, error } = await sb().from('university_mood_logs')
      .insert({ student_user_id, university_id, department_id,
        course_id, mood, note })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

// ─── HoD ANALYTICS ────────────────────────────────────
router.get('/department/:dept_id/analytics', async (req, res) => {
  try {
    const deptId = req.params.dept_id;
    const { data: courses } = await sb().from('courses')
      .select().eq('department_id', deptId);
    const courseIds = courses?.map(c => c.id) || [];
    const { data: enrollments } = courseIds.length
      ? await sb().from('course_enrollments').select().in('course_id', courseIds)
      : { data: [] };
    const { data: moods } = await sb().from('university_mood_logs')
      .select().eq('department_id', deptId)
      .gte('logged_at', new Date(Date.now()-7*24*60*60*1000).toISOString());
    const moodSummary = { great:0, ok:0, struggling:0, overwhelmed:0 };
    moods?.forEach(m => { if (moodSummary[m.mood]!==undefined)
      moodSummary[m.mood]++; });
    const uniqueStudents = new Set(enrollments?.map(e => e.student_user_id));
    res.json({
      status:'success',
      data: {
        total_courses: courses?.length || 0,
        total_students: uniqueStudents.size,
        mood_summary: moodSummary,
        courses,
      },
    });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

// ─── LECTURER COURSES ──────────────────────────────────
router.get('/lecturer/:user_id/courses', async (req, res) => {
  try {
    const { data, error } = await sb().from('courses')
      .select().eq('lecturer_user_id', req.params.user_id);
    if (error) throw error;
    res.json({ status:'success', data });
  } catch(e) { res.status(500).json({ status:'error', message:e.message }); }
});

module.exports = router; 
