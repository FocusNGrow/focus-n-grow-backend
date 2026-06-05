const cron = require('node-cron');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Streak = require('../models/Streak');
const { Op } = require('sequelize');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.supabase.co';
const sb = () => createClient(SB_URL,
  process.env.SUPABASE_SERVICE_KEY || '');

const getTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ─────────────────────────────────────────────────────────
// SEND FCM PUSH NOTIFICATION
// ─────────────────────────────────────────────────────────
async function sendPushNotification(fcmToken, title, body) {
  if (!fcmToken || !process.env.FIREBASE_SERVER_KEY) return;
  try {
    await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      {
        to: fcmToken,
        notification: { title, body, sound: 'default' },
        data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      },
      {
        headers: {
          Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (e) {
    console.log('Push error:', e.message);
  }
}

// ─────────────────────────────────────────────────────────
// MORNING REMINDER — 6:30 AM Nigeria time (5:30 UTC)
// ─────────────────────────────────────────────────────────
cron.schedule('30 5 * * *', async () => {
  console.log('🌅 Morning reminders running...');
  try {
    const users = await User.findAll({
      where: { fcm_token: { [Op.ne]: null } },
      attributes: ['id', 'name', 'fcm_token'],
    });

    const streaks = await Streak.findAll({
      where: { user_id: { [Op.in]: users.map(u => u.id) } },
    });
    const streakMap = {};
    streaks.forEach(s => { streakMap[s.user_id] = s; });

    for (const user of users) {
      const streak = streakMap[user.id];
      const currentStreak = streak?.current_streak || 0;
      const name = user.name?.split(' ')[0] || 'Champion';

      let title = `Good morning, ${name}! 🌟`;
      let body = 'Time to study! Open Focus N Grow and hit your daily target.';

      if (currentStreak >= 7) {
        body = `You have a ${currentStreak}-day streak! Don't break it today. Keep going! 🔥`;
      } else if (currentStreak >= 3) {
        body = `${currentStreak} days strong! Today's study session will make it ${currentStreak + 1}. 💪`;
      } else if (currentStreak === 0) {
        title = `Start fresh today, ${name}! 📚`;
        body = 'Every expert was once a beginner. Open the app and begin your streak today.';
      }

      await sendPushNotification(user.fcm_token, title, body);
    }
    console.log(`✅ Morning reminders sent to ${users.length} students`);
  } catch (e) {
    console.error('Morning cron error:', e.message);
  }
}, { timezone: 'Africa/Lagos' });

// ─────────────────────────────────────────────────────────
// STREAK BREAK ALERT — 8:00 PM if not studied today
// ─────────────────────────────────────────────────────────
cron.schedule('0 19 * * *', async () => {
  console.log('⚠️ Streak break check running...');
  try {
    const today = new Date().toISOString().substring(0, 10);
    const streaks = await Streak.findAll({
      where: {
        current_streak: { [Op.gte]: 1 },
        last_study_date: { [Op.lt]: today },
      },
    });

    for (const streak of streaks) {
      const user = await User.findByPk(streak.user_id);
      if (!user?.fcm_token) continue;
      const name = user.name?.split(' ')[0] || 'Champion';
      const days = streak.current_streak;

      await sendPushNotification(
        user.fcm_token,
        `⚠️ Your ${days}-day streak is at risk, ${name}!`,
        'You have not studied today. Open Focus N Grow now to keep your streak alive!',
      );
    }
    console.log(`✅ Streak alerts sent`);
  } catch (e) {
    console.error('Streak alert error:', e.message);
  }
}, { timezone: 'Africa/Lagos' });

// ─────────────────────────────────────────────────────────
// PARENT ALERT — Daily 10 PM: alert if child not studied
// ─────────────────────────────────────────────────────────
cron.schedule('0 21 * * *', async () => {
  console.log('👨‍👩‍👧 Parent alerts running...');
  try {
    const today = new Date().toISOString().substring(0, 10);
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 60 * 60 * 1000
    ).toISOString().substring(0, 10);

    // Find all parent-child links
    const { data: links } = await sb()
      .from('parent_child_links')
      .select('*')
      .eq('verified', true);

    if (!links || links.length === 0) return;

    for (const link of links) {
      // Check if child studied in last 2 days
      const streak = await Streak.findOne({
        where: { user_id: link.child_user_id },
      });

      const lastStudy = streak?.last_study_date;
      const notStudiedRecently = !lastStudy ||
        lastStudy < twoDaysAgo;

      if (!notStudiedRecently) continue;

      const child = await User.findByPk(link.child_user_id);
      if (!child) continue;

      // Find parent email
      const parent = link.parent_user_id
        ? await User.findByPk(link.parent_user_id)
        : null;
      const parentEmail = parent?.email;

      if (!parentEmail || !process.env.EMAIL_USER) continue;

      const html = `
        <div style="font-family:Arial;background:#1e1e2e;
          padding:24px;border-radius:12px;max-width:500px;">
          <h2 style="color:#6c63ff">📚 Focus N Grow — Parent Alert</h2>
          <p style="color:#ccc">Dear Parent,</p>
          <p style="color:#ccc">
            Your child <strong style="color:white">
            ${child.name}</strong> has not opened the 
            Focus N Grow study app in the last 2 days.
          </p>
          <div style="background:#2d2d3d;padding:16px;
            border-radius:10px;margin:16px 0">
            <p style="color:#ff9800;margin:0;font-weight:bold">
              ⚠️ Action Required
            </p>
            <p style="color:#ccc;margin:8px 0 0">
              Please encourage ${child.name.split(' ')[0]} 
              to open the app and study today. 
              Consistent daily study is key to exam success.
            </p>
          </div>
          <p style="color:#888;font-size:12px">
            View detailed study report at:<br>
            <a href="https://focus-n-grow-backend-production.up.railway.app/parent.html"
               style="color:#6c63ff">Parent Portal</a>
          </p>
        </div>`;

      await getTransporter().sendMail({
        from: `Focus N Grow <${process.env.EMAIL_USER}>`,
        to: parentEmail,
        subject: `⚠️ ${child.name} has not studied in 2 days`,
        html,
      });
      console.log(`Parent alert sent for ${child.name}`);
    }
  } catch (e) {
    console.error('Parent alert error:', e.message);
  }
}, { timezone: 'Africa/Lagos' });

// ─────────────────────────────────────────────────────────
// WEEKLY REPORT — Every Sunday 7 PM
// ─────────────────────────────────────────────────────────
cron.schedule('0 18 * * 0', async () => {
  console.log('📊 Weekly reports running...');
  try {
    const { data: links } = await sb()
      .from('parent_child_links')
      .select('*')
      .eq('verified', true);

    if (!links || links.length === 0) return;

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    for (const link of links) {
      const child = await User.findByPk(link.child_user_id);
      const parent = link.parent_user_id
        ? await User.findByPk(link.parent_user_id) : null;

      if (!child || !parent?.email) continue;

      const streak = await Streak.findOne({
        where: { user_id: link.child_user_id } });

      const { data: results } = await sb()
        .from('past_question_results')
        .select('*')
        .eq('user_id', link.child_user_id)
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });

      const totalSessions = results?.length || 0;
      const avgScore = totalSessions > 0
        ? Math.round(results.reduce(
            (s, r) => s + (r.percentage || 0), 0) / totalSessions)
        : 0;
      const totalMinutes = results?.reduce(
        (s, r) => s + (r.time_minutes || 0), 0) || 0;

      const subjectScores = {};
      results?.forEach(r => {
        if (!subjectScores[r.subject]) {
          subjectScores[r.subject] = { total: 0, count: 0 };
        }
        subjectScores[r.subject].total += r.percentage;
        subjectScores[r.subject].count++;
      });

      const subjectRows = Object.entries(subjectScores)
        .map(([subj, data]) => {
          const avg = Math.round(data.total / data.count);
          const bar = avg >= 70 ? '🟢' : avg >= 50 ? '🟡' : '🔴';
          return `<tr>
            <td style="color:#ccc;padding:6px">${subj}</td>
            <td style="color:#fff;padding:6px;font-weight:bold">
              ${bar} ${avg}%</td>
          </tr>`;
        }).join('');

      const html = `
        <div style="font-family:Arial;background:#1e1e2e;
          padding:24px;border-radius:12px;max-width:550px">
          <div style="background:linear-gradient(135deg,#6c63ff,#9c27b0);
            padding:20px;border-radius:10px;margin-bottom:20px">
            <h2 style="color:white;margin:0">📊 Weekly Study Report</h2>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">
              ${child.name} — Week ending ${new Date().toDateString()}
            </p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;
            gap:12px;margin-bottom:20px">
            <div style="background:#2d2d3d;padding:14px;border-radius:10px">
              <p style="color:#888;margin:0;font-size:12px">
                ⏱️ Total Study Time</p>
              <p style="color:#6c63ff;margin:4px 0 0;
                font-size:22px;font-weight:bold">
                ${Math.round(totalMinutes / 60 * 10) / 10} hrs</p>
            </div>
            <div style="background:#2d2d3d;padding:14px;border-radius:10px">
              <p style="color:#888;margin:0;font-size:12px">
                📝 Quizzes Completed</p>
              <p style="color:#4caf50;margin:4px 0 0;
                font-size:22px;font-weight:bold">${totalSessions}</p>
            </div>
            <div style="background:#2d2d3d;padding:14px;border-radius:10px">
              <p style="color:#888;margin:0;font-size:12px">
                🎯 Average Score</p>
              <p style="color:#ff9800;margin:4px 0 0;
                font-size:22px;font-weight:bold">${avgScore}%</p>
            </div>
            <div style="background:#2d2d3d;padding:14px;border-radius:10px">
              <p style="color:#888;margin:0;font-size:12px">
                🔥 Study Streak</p>
              <p style="color:#cf6679;margin:4px 0 0;
                font-size:22px;font-weight:bold">
                ${streak?.current_streak || 0} days</p>
            </div>
          </div>
          ${subjectRows ? `
          <div style="background:#2d2d3d;padding:14px;
            border-radius:10px;margin-bottom:20px">
            <p style="color:#6c63ff;font-weight:bold;margin:0 0 10px">
              📚 Subject Performance</p>
            <table style="width:100%">${subjectRows}</table>
          </div>` : ''}
          <p style="color:#888;font-size:12px;text-align:center">
            View live report at 
            <a href="https://focus-n-grow-backend-production.up.railway.app/parent.html"
               style="color:#6c63ff">Parent Portal</a>
          </p>
        </div>`;

      await getTransporter().sendMail({
        from: `Focus N Grow <${process.env.EMAIL_USER}>`,
        to: parent.email,
        subject: `📊 ${child.name}'s Weekly Study Report`,
        html,
      });
      console.log(`Weekly report sent for ${child.name}`);
    }
  } catch (e) {
    console.error('Weekly report error:', e.message);
  }
}, { timezone: 'Africa/Lagos' });

// ─────────────────────────────────────────────────────────
// ASSIGNMENT DUE TOMORROW REMINDER — 7 PM daily
// ─────────────────────────────────────────────────────────
cron.schedule('0 18 * * *', async () => {
  console.log('📋 Assignment reminders running...');
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().substring(0, 10);

    const { data: assignments } = await sb()
      .from('assignments')
      .select('*, school_classes(name)')
      .gte('due_date', tomorrowStr + 'T00:00:00')
      .lte('due_date', tomorrowStr + 'T23:59:59');

    if (!assignments || assignments.length === 0) return;

    for (const assign of assignments) {
      const { data: enrollments } = await sb()
        .from('school_enrollments')
        .select('student_user_id')
        .eq('class_id', assign.class_id);

      for (const enrollment of (enrollments || [])) {
        const user = await User.findByPk(
          enrollment.student_user_id);
        if (!user?.fcm_token) continue;
        await sendPushNotification(
          user.fcm_token,
          `📋 Assignment due tomorrow!`,
          `${assign.subject}: "${assign.title}" is due tomorrow. `
          + `Complete at least ${assign.minimum_focus_minutes} minutes of study.`,
        );
      }
    }
    console.log('✅ Assignment reminders sent');
  } catch (e) {
    console.error('Assignment reminder error:', e.message);
  }
}, { timezone: 'Africa/Lagos' });

console.log('✅ All cron jobs registered');
module.exports = {};