const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const User = require('../models/User');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.supabase.co';
const sb = () => createClient(
  SB_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
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
    const { data, error } = await sb()
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

// POST /api/school/join (student joins with personal token)
router.post('/join', async (req, res) => {
  try {
    const { student_token, student_user_id } = req.body;

    if (!student_token || !student_user_id) {
      return res.status(400).json({
        status: 'error',
        message: 'Student token and user ID are required',
      });
    }

    // Find the token
    const { data: tokenRecord, error: tokenErr } = await sb()
      .from('school_student_tokens')
      .select('*, schools(*)')
      .eq('token', student_token.toUpperCase())
      .single();

    if (tokenErr || !tokenRecord) {
      return res.status(404).json({
        status: 'error',
        message: 'Invalid token. Please check the code your school gave you.',
      });
    }
    // Check if token has expired
    if (tokenRecord.expires_at) {
      const expiry = new Date(tokenRecord.expires_at);
      if (new Date() > expiry) {
        return res.status(403).json({
          status: 'error',
          message: 'This token has expired. Your school needs to renew '
            + 'their subscription for the new term.',
        });
      }
    }
    // Check if already used by someone else
    if (tokenRecord.used && tokenRecord.used_by !== student_user_id) {
      return res.status(403).json({
        status: 'error',
        message: 'This token has already been used by another student.',
      });
    }

    // If already used by this same student, let them back in (re-login)
    if (tokenRecord.used && tokenRecord.used_by === student_user_id) {
      return res.json({
        status: 'success',
        data: tokenRecord,
        school: tokenRecord.schools,
        alreadyEnrolled: true,
        message: 'Welcome back!',
      });
    }

    // Mark token as used
    await sb()
      .from('school_student_tokens')
      .update({
        used: true,
        used_by: student_user_id,
        used_at: new Date().toISOString(),
      })
      .eq('id', tokenRecord.id);

    // Enroll student
    const { data: enrollment } = await sb()
      .from('school_enrollments')
      .insert({
        school_id: tokenRecord.school_id,
        student_user_id,
      })
      .select()
      .single();

    // Update enrolled count
    const { data: school } = await sb()
      .from('schools')
      .select('students_enrolled')
      .eq('id', tokenRecord.school_id)
      .single();
    await sb()
      .from('schools')
      .update({ students_enrolled: (school?.students_enrolled || 0) + 1 })
      .eq('id', tokenRecord.school_id);

    // Grant premium to student
    const User = require('../models/User');
    await User.update(
      { plan_type: 'premium' },
      { where: { id: student_user_id } }
    );

    res.json({
      status: 'success',
      data: enrollment,
      school: tokenRecord.schools,
      token_expires_at: tokenRecord.expires_at,
      message: 'Successfully joined! Premium access granted.',
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/school/:school_id/classes
router.get('/:school_id/classes', async (req, res) => {
  try {
    const { data, error } = await sb()
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
    const { data, error } = await sb()
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
    const { data: enrollments } = await sb()
      .from('school_enrollments')
      .select('class_id')
      .eq('student_user_id', req.params.user_id);
    if (!enrollments?.length) return res.json({ status: 'success', data: [] });
    const classIds = enrollments.map(e => e.class_id);
    const { data, error } = await sb()
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
    const { data, error } = await sb()
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
    const { data, error } = await sb()
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
    const { data, error } = await sb()
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
// GET /api/school/:school_id/leaderboard
router.get('/:school_id/leaderboard', async (req, res) => {
  try {
    const { data: completions, error } = await sb()
      .from('assignment_completions')
      .select('student_user_id, minutes_studied')
      .eq('completed', true);

    if (error) throw error;

    // Aggregate by student
    const totals = {};
    completions.forEach(c => {
      const id = c.student_user_id;
      totals[id] = (totals[id] || 0) + (c.minutes_studied || 0);
    });

    const leaderboard = Object.entries(totals)
      .map(([student_user_id, total_minutes]) => ({
        student_user_id,
        total_minutes,
        total_hours: Math.round(total_minutes / 60 * 10) / 10,
      }))
      .sort((a, b) => b.total_minutes - a.total_minutes)
      .slice(0, 20);

    res.json({ status: 'success', data: leaderboard });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});
// POST /api/school/weekly-target/set
router.post('/weekly-target/set', async (req, res) => {
  try {
    const { class_id, subject, weekly_hours, teacher_id } = req.body;
    const { data, error } = await sb()
      .from('assignments')
      .insert({
        class_id, teacher_id, subject,
        title: `Weekly Target: ${weekly_hours} hours of ${subject}`,
        description: `Complete ${weekly_hours} hours of focused ${subject} study this week`,
        minimum_focus_minutes: weekly_hours * 60,
        is_weekly_target: true,
      })
      .select().single();
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});
// POST /api/school/generate-tokens (super admin generates tokens after payment)
router.post('/generate-tokens', async (req, res) => {
  try {
    const { school_id, quantity, term_months } = req.body;
    if (!school_id || !quantity || quantity < 1 || quantity > 2000) {
      return res.status(400).json({
        status: 'error',
        message: 'school_id and quantity (1-2000) required',
      });
    }

    // Default expiry: 4 months from now (one Nigerian school term)
    const termMonths = parseInt(term_months) || 4;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + termMonths);

    const tokens = [];
    const usedTokens = new Set();
    while (tokens.length < quantity) {
      const token = 'FNG-' + Math.random().toString(36)
        .substring(2, 7).toUpperCase();
      if (!usedTokens.has(token)) {
        usedTokens.add(token);
        tokens.push({ school_id, token, expires_at: expiresAt.toISOString() });
      }
    }

    const { data, error } = await sb()
      .from('school_student_tokens')
      .insert(tokens)
      .select();

    if (error) throw error;

    // Update max_students count on school
    const { data: school } = await sb()
      .from('schools').select('max_students').eq('id', school_id).single();
    await sb().from('schools')
      .update({
        max_students: (school?.max_students || 0) + quantity,
        term_expires_at: expiresAt.toISOString(),
      })
      .eq('id', school_id);

    res.json({
      status: 'success',
      message: `${quantity} tokens generated`,
      tokens: data.map(t => t.token),
      data,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/school/:school_id/tokens (super admin views token usage)
router.get('/:school_id/tokens', async (req, res) => {
  try {
    const { data, error } = await sb()
      .from('school_student_tokens')
      .select()
      .eq('school_id', req.params.school_id)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const total = data.length;
    const used = data.filter(t => t.used).length;
    const remaining = total - used;

    res.json({
      status: 'success',
      summary: { total, used, remaining },
      tokens: data,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});
module.exports = router; 
