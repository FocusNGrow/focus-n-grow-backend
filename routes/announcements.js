const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.sb().co';
const SB_KEY = () => process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ANON_KEY || '';
const sb = () => createClient(SB_URL, SB_KEY());

// POST /api/announcements/create
router.post('/create', async (req, res) => {
  try {
    const { school_id, class_id, teacher_id, title, message } = req.body;
    if (!title || !message || !teacher_id) {
      return res.status(400).json({ status: 'error',
        message: 'Title, message and teacher_id required' });
    }
    const { data, error } = await supabase
      .from('teacher_announcements')
      .insert({ school_id, class_id, teacher_id, title, message })
      .select().single();
    if (error) throw error;
    res.status(201).json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/announcements/school/:school_id
router.get('/school/:school_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('teacher_announcements')
      .select()
      .eq('school_id', req.params.school_id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;