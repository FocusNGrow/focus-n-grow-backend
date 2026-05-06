const express = require('express');
const Subject = require('../models/Subject');

const router = express.Router();

// GET ALL SUBJECTS
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { learning_mode } = req.query;
    const where = { user_id, is_active: true };
    if (learning_mode) where.learning_mode = learning_mode;

    const subjects = await Subject.findAll({
      where,
      order: [['order_index', 'ASC'], ['createdAt', 'ASC']],
    });

    if (subjects.length === 0) {
      const defaults = getDefaultSubjects(user_id, learning_mode || 'secondary');
      return res.status(200).json({
        status: 'success',
        data: defaults,
        is_default: true,
      });
    }

    res.status(200).json({ status: 'success', data: subjects });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ADD SUBJECT
router.post('/add', async (req, res) => {
  try {
    const { user_id, name, color, icon, learning_mode } = req.body;

    if (!user_id || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and name are required',
      });
    }

    const maxOrder = await Subject.max('order_index', { where: { user_id } }) || 0;

    const subject = await Subject.create({
      user_id,
      name,
      color: color || '#6C63FF',
      icon: icon || '📚',
      learning_mode: learning_mode || 'secondary',
      order_index: maxOrder + 1,
    });

    res.status(201).json({
      status: 'success',
      message: 'Subject added!',
      data: subject,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// UPDATE SUBJECT
router.put('/update/:subject_id', async (req, res) => {
  try {
    const { subject_id } = req.params;
    const { name, color, icon, order_index } = req.body;

    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      return res.status(404).json({ status: 'error', message: 'Subject not found' });
    }

    await subject.update({
      name: name || subject.name,
      color: color || subject.color,
      icon: icon || subject.icon,
      order_index: order_index !== undefined ? order_index : subject.order_index,
    });

    res.status(200).json({
      status: 'success',
      message: 'Subject updated!',
      data: subject,
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// DELETE SUBJECT
router.delete('/delete/:subject_id', async (req, res) => {
  try {
    const { subject_id } = req.params;

    const subject = await Subject.findByPk(subject_id);
    if (!subject) {
      return res.status(404).json({ status: 'error', message: 'Subject not found' });
    }

    await subject.update({ is_active: false });

    res.status(200).json({ status: 'success', message: 'Subject deleted!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// REORDER SUBJECTS
router.post('/reorder', async (req, res) => {
  try {
    const { subjects } = req.body;

    for (const item of subjects) {
      await Subject.update(
        { order_index: item.order_index },
        { where: { id: item.id } }
      );
    }

    res.status(200).json({ status: 'success', message: 'Subjects reordered!' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

function getDefaultSubjects(user_id, learning_mode) {
  const secondary = [
    { user_id, name: 'Mathematics', color: '#6C63FF', icon: '➗', learning_mode: 'secondary' },
    { user_id, name: 'English Language', color: '#03DAC6', icon: '📝', learning_mode: 'secondary' },
    { user_id, name: 'Physics', color: '#FF5722', icon: '⚡', learning_mode: 'secondary' },
    { user_id, name: 'Chemistry', color: '#4CAF50', icon: '🧪', learning_mode: 'secondary' },
    { user_id, name: 'Biology', color: '#FF9800', icon: '🧬', learning_mode: 'secondary' },
    { user_id, name: 'Economics', color: '#2196F3', icon: '💰', learning_mode: 'secondary' },
    { user_id, name: 'Government', color: '#9C27B0', icon: '🏛️', learning_mode: 'secondary' },
    { user_id, name: 'Literature', color: '#E91E63', icon: '📖', learning_mode: 'secondary' },
  ];

  const university = [
    { user_id, name: 'General Studies', color: '#6C63FF', icon: '🎓', learning_mode: 'university' },
    { user_id, name: 'Core Course 1', color: '#03DAC6', icon: '📚', learning_mode: 'university' },
    { user_id, name: 'Core Course 2', color: '#FF5722', icon: '📗', learning_mode: 'university' },
    { user_id, name: 'Elective', color: '#4CAF50', icon: '📘', learning_mode: 'university' },
  ];

  if (learning_mode === 'university') return university;
  return secondary;
}

module.exports = router;