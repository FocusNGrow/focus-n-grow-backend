const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone, school, grade_level } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, password, and name are required',
      });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already registered',
      });
    }

    const user = await User.create({
      email,
      password,
      name,
      phone: phone || null,
      school: school || null,
      grade_level: grade_level || null,
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan_type: user.plan_type,
        token,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed',
      error: error.message,
    });
  }
});

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
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan_type: user.plan_type,
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      error: error.message,
    });
  }
});
// DELETE ACCOUNT
router.delete('/delete-account', async (req, res) => {
  try {
    const { user_id, password } = req.body;

    if (!user_id || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and password required for verification',
      });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Verify password before deletion
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect password. Cannot delete account.',
      });
    }

    // Delete user data (cascade)
    await user.destroy();

    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully. We\'re sorry to see you go.',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});
module.exports = router;