const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.sb().co';
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ANON_KEY || '';
const sb = () => createClient(SB_URL, SB_KEY());

// POST /api/curriculum/add
router.post('/add', async (req, res) => {
  try {
    const { class_id, teacher_id, subject, topic,
            week_number, term, resources } = req.body;
    if (!subject || !topic || !teacher_id) {
      return res.status(400).json({ status: 'error',
        message: 'Subject, topic and teacher_id required' });
    }
    const { data, error } = await supabase
      .from('curriculum_topics')
      .insert({ class_id, teacher_id, subject, topic,
        week_number: week_number || 1, term: term || '1st Term',
        resources: resources || '' })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/curriculum/class/:class_id
router.get('/class/:class_id', async (req, res) => {
  try {
    const { week, term } = req.query;
    let query = getsupabase().from('curriculum_topics')
      .select().eq('class_id', req.params.class_id)
      .order('week_number').order('subject');
    if (week) query = query.eq('week_number', week);
    if (term) query = query.eq('term', term);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/curriculum/current-week/:class_id
router.get('/current-week/:class_id', async (req, res) => {
  try {
    const now = new Date();
    const sept1 = new Date(now.getFullYear(), 8, 1);
    const weekNumber = Math.ceil(
      (now - sept1) / (7 * 24 * 60 * 60 * 1000));
    const currentWeek = Math.max(1, Math.min(weekNumber, 40));

    const { data, error } = await supabase
      .from('curriculum_topics')
      .select()
      .eq('class_id', req.params.class_id)
      .eq('week_number', currentWeek);
    if (error) throw error;
    res.json({ status: 'success', data, current_week: currentWeek });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router; 
