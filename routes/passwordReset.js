const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const router = express.Router();

// Email setup (use Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// REQUEST PASSWORD RESET
router.post('/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required',
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return res.status(200).json({
        status: 'success',
        message: 'If this email exists, a reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { id: user.id, type: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const resetUrl = `focusgrow://reset-password?token=${resetToken}`;

    // Send email
    await transporter.sendMail({
      from: `"Focus N Grow" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Focus N Grow Password',
      html: `
        <div style="font-family: Arial; padding: 20px; background: #121212; color: white;">
          <h2 style="color: #6C63FF;">Focus N Grow</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset. Click below to reset your password:</p>
          <a href="${resetUrl}" 
             style="background: #6C63FF; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 8px; display: inline-block;">
            Reset Password
          </a>
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            This link expires in 1 hour. If you didn't request this, ignore this email.
          </p>
        </div>
      `,
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset email sent! Check your inbox.',
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// RESET PASSWORD
router.post('/reset', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({
        status: 'error',
        message: 'Token and new_password are required',
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'password_reset') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid reset token',
      });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await user.update({ password: hashedPassword });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully! You can now log in.',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({
        status: 'error',
        message: 'Reset link has expired. Please request a new one.',
      });
    }
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;