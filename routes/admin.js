const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createClient } = require('@supabase/supabase-js');

const getSecret = () => process.env.JWT_SECRET || 'focus-n-grow-secret-key-2025';
const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.supabase.co';
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ANON_KEY || '';
const sb = () => createClient(SB_URL, SB_KEY());

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

router.get('/school/:school_id/overview', async (req, res) => {
  try {
    const schoolId = req.params.school_id;
    const { data: students } = await sb().from('school_enrollments')
      .select('student_user_id').eq('school_id', schoolId);
    const { data: classes } = await sb().from('school_classes')
      .select().eq('school_id', schoolId);
    const classIds = classes?.map(c => c.id) || [];
    const { data: assignments } = classIds.length
      ? await sb().from('assignments').select().in('class_id', classIds)
      : { data: [] };
    const { data: moods } = await sb().from('school_mood_logs')
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
        mood_summary: moodSummary,
        classes,
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

router.post('/school/:school_id/class', async (req, res) => {
  try {
    const { name, grade_level, teacher_id } = req.body;
    const { data, error } = await sb().from('school_classes')
      .insert({ school_id: req.params.school_id, name, grade_level, teacher_id })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

router.post('/school/set-limit', async (req, res) => {
  try {
    const { school_id, max_students, amount_paid } = req.body;
    const { data, error } = await sb().from('schools')
      .update({ max_students: parseInt(max_students),
        subscription_amount: amount_paid, subscription_plan: 'institutional' })
      .eq('id', school_id).select().single();
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Enhanced principal overview with all classes detail
router.get('/school/:school_id/full-overview', async (req, res) => {
  try {
    const schoolId = req.params.school_id;

    const { data: school } = await sb().from('schools')
      .select('*').eq('id', schoolId).single();

    const { data: classes } = await sb().from('school_classes')
      .select('*').eq('school_id', schoolId);

    const classIds = classes?.map(c => c.id) || [];

    const { data: enrollments } = classIds.length
      ? await sb().from('school_enrollments')
          .select('*').in('class_id', classIds)
      : { data: [] };

    const { data: assignments } = classIds.length
      ? await sb().from('assignments')
          .select('*').in('class_id', classIds)
      : { data: [] };

    const { data: completions } = await sb()
      .from('assignment_completions')
      .select('*, assignments(class_id)')
      .in('assignments.class_id', classIds)
      .eq('completed', true);

    const { data: moods } = await sb()
      .from('school_mood_logs')
      .select('*').eq('school_id', schoolId)
      .gte('logged_at',
        new Date(Date.now()-7*24*60*60*1000).toISOString());

    // Build per-class stats
    const classStats = (classes || []).map(cls => {
      const classEnroll = enrollments?.filter(
        e => e.class_id === cls.id) || [];
      const classAssign = assignments?.filter(
        a => a.class_id === cls.id) || [];
      const classMoods = moods?.filter(
        m => m.class_id === cls.id) || [];

      const moodCounts = {great:0,ok:0,struggling:0,overwhelmed:0};
      classMoods.forEach(m => {
        if (moodCounts[m.mood] !== undefined) moodCounts[m.mood]++;
      });

      const totalMoods = Object.values(moodCounts)
        .reduce((a,b) => a+b, 0);
      const atRisk = moodCounts.struggling + moodCounts.overwhelmed;
      const moodStatus = totalMoods === 0 ? 'No data'
        : atRisk / totalMoods > 0.4 ? 'Needs attention'
        : '✓ Positive';

      return {
        ...cls,
        student_count: classEnroll.length,
        assignment_count: classAssign.length,
        mood_summary: moodCounts,
        mood_status: moodStatus,
        at_risk_students: atRisk,
      };
    });

    // Students not studied this week
    const allStudentIds = enrollments?.map(e =>
      e.student_user_id) || [];
    const { data: streaks } = await sb()
      .from('streaks')
      .select('*')
      .in('user_id', allStudentIds)
      .lt('last_study_date',
        new Date(Date.now()-2*24*60*60*1000)
          .toISOString().substring(0,10));

    res.json({
      status: 'success',
      data: {
        school,
        total_students: enrollments?.length || 0,
        total_classes: classes?.length || 0,
        total_assignments: assignments?.length || 0,
        assignments_completed: completions?.length || 0,
        students_not_studying: streaks?.length || 0,
        mood_summary: moods?.reduce((acc, m) => {
          acc[m.mood] = (acc[m.mood] || 0) + 1;
          return acc;
        }, {}),
        classes: classStats,
      }
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;