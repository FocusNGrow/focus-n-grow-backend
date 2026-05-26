const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../models/User');

const getTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// POST /api/notifications/weekly-report (sends email to student)
router.post('/weekly-report', async (req, res) => {
  try {
    const { user_id, study_hours, assignments_done, streak_days } = req.body;
    const user = await User.findByPk(user_id,
      { attributes: ['email', 'name'] });
    if (!user) return res.status(404).json({ status: 'error' });

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
        <div style="max-width:500px;margin:0 auto;background:#1e1e2e;
          border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#6c63ff,#9c27b0);
            padding:24px;text-align:center">
            <h1 style="color:white;margin:0">📊 Weekly Report</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">
              Focus N Grow</p>
          </div>
          <div style="padding:24px">
            <p style="color:#ccc">Hi <strong style="color:white">
              ${user.name}</strong>,</p>
            <p style="color:#888">Here's your study summary for this week:</p>
            <div style="display:grid;gap:12px;margin:20px 0">
              <div style="background:#2d2d3d;border-radius:10px;padding:14px;
                display:flex;justify-content:space-between">
                <span style="color:#888">⏱️ Study Hours</span>
                <strong style="color:#6c63ff">${study_hours} hrs</strong>
              </div>
              <div style="background:#2d2d3d;border-radius:10px;padding:14px;
                display:flex;justify-content:space-between">
                <span style="color:#888">✅ Assignments Done</span>
                <strong style="color:#4caf50">${assignments_done}</strong>
              </div>
              <div style="background:#2d2d3d;border-radius:10px;padding:14px;
                display:flex;justify-content:space-between">
                <span style="color:#888">🔥 Current Streak</span>
                <strong style="color:#ff9800">${streak_days} days</strong>
              </div>
            </div>
            <div style="text-align:center;margin:20px 0">
              <a href="https://play.google.com/store/apps/details?id=com.focusngrow.app"
                style="background:#6c63ff;color:white;padding:12px 24px;
                border-radius:10px;text-decoration:none;font-weight:bold">
                Open Focus N Grow App
              </a>
            </div>
            <p style="color:#666;font-size:12px;text-align:center">
              Keep studying! Every session brings you closer to your goals.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await getTransporter().sendMail({
      from: `"Focus N Grow" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `📊 Your Weekly Study Report — ${study_hours} hours this week!`,
      html,
    });

    res.json({ status: 'success', message: 'Email sent' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// POST /api/notifications/parent-alert (sends email to parent)
router.post('/parent-alert', async (req, res) => {
  try {
    const { parent_email, child_name, study_hours,
            assignments_done, mood_alert } = req.body;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
        <div style="max-width:500px;margin:0 auto;background:#1e1e2e;
          border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#4caf50,#2e7d32);
            padding:24px;text-align:center">
            <h1 style="color:white;margin:0">👨‍👩‍👧 Parent Update</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">
              Focus N Grow — Weekly Report</p>
          </div>
          <div style="padding:24px">
            <p style="color:#ccc">
              Here is this week's study update for
              <strong style="color:white">${child_name}</strong>:
            </p>
            <div style="background:#2d2d3d;border-radius:10px;padding:16px;margin:16px 0">
              <p style="color:#4caf50;margin:0 0 8px;font-weight:bold">
                📚 This Week's Activity</p>
              <p style="color:#ccc;margin:4px 0">
                Study Hours: <strong>${study_hours} hours</strong></p>
              <p style="color:#ccc;margin:4px 0">
                Assignments Completed: <strong>${assignments_done}</strong></p>
            </div>
            ${mood_alert ? `
            <div style="background:#cf667922;border:1px solid #cf6679;
              border-radius:10px;padding:14px;margin:16px 0">
              <p style="color:#cf6679;margin:0;font-weight:bold">
                ⚠️ Mood Alert</p>
              <p style="color:#ccc;margin:8px 0 0;font-size:13px">
                ${child_name} has been feeling overwhelmed this week.
                Consider checking in with them about their workload.</p>
            </div>` : ''}
            <p style="color:#666;font-size:12px;text-align:center;margin-top:20px">
              Monitor ${child_name}'s progress at:<br>
              <a href="https://focus-n-grow-backend-production.up.railway.app/parent.html"
                style="color:#4caf50">
                focus-n-grow-backend-production.up.railway.app/parent.html
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await getTransporter().sendMail({
      from: `"Focus N Grow" <${process.env.EMAIL_USER}>`,
      to: parent_email,
      subject: `👨‍👩‍👧 ${child_name}'s Weekly Study Report`,
      html,
    });

    res.json({ status: 'success', message: 'Parent email sent' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router; 
