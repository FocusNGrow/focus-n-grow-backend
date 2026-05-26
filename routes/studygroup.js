const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.supabase.co';
const sb = () => createClient(SB_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '');

function genGroupCode() {
  return 'GRP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

// POST /api/studygroup/create
router.post('/create', async (req, res) => {
  try {
    const { creator_user_id, name, subject, target_minutes, display_name } = req.body;
    const group_code = genGroupCode();
    const { data: group, error } = await sb().from('study_groups')
      .insert({ creator_user_id, name, subject,
        target_minutes: target_minutes || 60, group_code })
      .select().single();
    if (error) throw error;
    // Auto-join creator
    await sb().from('study_group_members').insert({
      group_id: group.id, user_id: creator_user_id,
      display_name: display_name || 'You',
    });
    res.status(201).json({ status: 'success', data: group, group_code });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/studygroup/join
router.post('/join', async (req, res) => {
  try {
    const { group_code, user_id, display_name } = req.body;
    const { data: group } = await sb().from('study_groups')
      .select().eq('group_code', group_code.toUpperCase()).single();
    if (!group) return res.status(404).json({ status: 'error',
      message: 'Invalid group code' });
    const { data: existing } = await sb().from('study_group_members')
      .select().eq('group_id', group.id).eq('user_id', user_id).single();
    if (!existing) {
      await sb().from('study_group_members').insert({
        group_id: group.id, user_id, display_name: display_name || 'Member',
      });
    }
    res.json({ status: 'success', data: group });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/studygroup/:group_id/members
router.get('/:group_id/members', async (req, res) => {
  try {
    const { data, error } = await sb().from('study_group_members')
      .select().eq('group_id', req.params.group_id)
      .order('minutes_today', { ascending: false });
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/studygroup/update-status
router.post('/update-status', async (req, res) => {
  try {
    const { group_id, user_id, is_studying, minutes_today } = req.body;
    await sb().from('study_group_members')
      .update({ is_studying, minutes_today,
        last_seen: new Date().toISOString() })
      .eq('group_id', group_id).eq('user_id', user_id);
    res.json({ status: 'success' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// GET /api/studygroup/user/:user_id
router.get('/user/:user_id', async (req, res) => {
  try {
    const { data: memberships } = await sb().from('study_group_members')
      .select('group_id').eq('user_id', req.params.user_id);
    if (!memberships?.length) return res.json({ status: 'success', data: [] });
    const groupIds = memberships.map(m => m.group_id);
    const { data, error } = await sb().from('study_groups')
      .select().in('id', groupIds).eq('is_active', true);
    if (error) throw error;
    res.json({ status: 'success', data });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router; 
