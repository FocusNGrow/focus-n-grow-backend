const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const getSecret = () => process.env.JWT_SECRET || 'focus-n-grow-secret-key-2025';

// POST /api/auth/register (main signup endpoint)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, school, grade_level } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email and password are required',
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email already exists',
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      phone: phone || '',
      school: school || '',
      grade_level: grade_level || '',
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      getSecret(),
      { expiresIn: '30d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully',
      token,
      data: {
        token,
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || '',
        plan_type: newUser.plan_type || 'free',
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/auth/signup (alias for register)
router.post('/signup', async (req, res) => {
  req.url = '/register';
  router.handle(req, res, () => {});
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      getSecret(),
      { expiresIn: '30d' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      token,
      data: {
        token,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        plan_type: user.plan_type || 'free',
      },
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// POST /api/auth/fcm-token
router.post('/fcm-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, getSecret());
    const userId = decoded.id || decoded.userId;

    const { fcm_token } = req.body;
    if (!fcm_token) return res.status(400).json({ error: 'FCM token required' });

    await User.update({ fcm_token }, { where: { id: userId } });
    res.json({ status: 'success', message: 'FCM token saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;