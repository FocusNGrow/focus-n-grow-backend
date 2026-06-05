const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Streak = require('../models/Streak');
const { createClient } = require('@supabase/supabase-js');

const SB_URL = 'https://ojjsdkucujkxxsfbzqpf.supabase.co';
const sb = () => createClient(SB_URL,
  process.env.SUPABASE_SERVICE_KEY || '');

// Called by Flutter app after EVERY study session ends
// (past questions, timer, bible, assignment)
router.post('/record', async (req, res) => {
  try {
    const {
      user_id,
      session_type,   // 'past_questions' | 'timer' | 'bible' | 'assignment'
      subject,
      minutes_studied,
      score,          // percentage 0-100 (for past questions)
      total_questions,
      correct_answers,
      exam_type,      // WAEC | JAMB | BECE
    } = req.body;

    if (!user_id) return res.status(400)
      .json({ status: 'error', message: 'user_id required' });

    const today = new Date().toISOString().substring(0, 10);
    const user = await User.findByPk(user_id);
    if (!user) return res.status(404)
      .json({ status: 'error', message: 'User not found' });

    // 1. UPDATE STREAK
    let streak = await Streak.findOne({ where: { user_id } });
    if (!streak) {
      streak = await Streak.create({
        user_id, current_streak: 1,
        longest_streak: 1, last_study_date: today,
      });
    } else {
      const lastDate = streak.last_study_date;
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString().substring(0, 10);
      let newStreak = streak.current_streak;
      if (lastDate === today) {
        // Already studied today, just update time
      } else if (lastDate === yesterday) {
        newStreak += 1;
      } else {
        newStreak = 1; // streak broken
      }
      const longest = Math.max(newStreak,
        streak.longest_streak || 0);
      await streak.update({
        current_streak: newStreak,
        longest_streak: longest,
        last_study_date: today,
        total_study_days: (streak.total_study_days || 0) + 1,
      });
      streak.current_streak = newStreak;
    }

    // 2. SAVE PAST QUESTION RESULT
    if (session_type === 'past_questions' && score !== undefined) {
      await sb().from('past_question_results').insert({
        user_id,
        exam_type: exam_type || 'WAEC',
        subject: subject || 'General',
        score: correct_answers || 0,
        total_questions: total_questions || 15,
        percentage: score || 0,
        time_minutes: minutes_studied || 0,
        created_at: new Date().toISOString(),
      });
    }

    // 3. SAVE STUDY SESSION
    await sb().from('study_sessions').upsert({
      user_id,
      session_type,
      subject: subject || 'General',
      minutes_studied: minutes_studied || 0,
      study_date: today,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,study_date,session_type,subject' });

    // 4. CHECK BADGE ACHIEVEMENTS
    const badges = [];
    const allResults = await sb()
      .from('past_question_results')
      .select('*')
      .eq('user_id', user_id);

    const totalQuestions = allResults.data?.length || 0;
    const highScores = allResults.data?.filter(
      r => r.percentage >= 80) || [];

    if (totalQuestions >= 10) badges.push('first_10_questions');
    if (totalQuestions >= 50) badges.push('fifty_questions');
    if (totalQuestions >= 100) badges.push('century_questions');
    if (streak.current_streak >= 7) badges.push('week_streak');
    if (streak.current_streak >= 30) badges.push('month_streak');
    if (highScores.length >= 5) badges.push('five_high_scores');

    // Save new badges
    for (const badge of badges) {
      await sb().from('user_badges').upsert({
        user_id, badge_id: badge,
        earned_at: new Date().toISOString(),
      }, { onConflict: 'user_id,badge_id' });
    }

    // 5. NOTIFY PARENT IF MILESTONE
    if (badges.length > 0) {
      const { data: link } = await sb()
        .from('parent_child_links')
        .select('*')
        .eq('child_user_id', user_id)
        .eq('verified', true)
        .single();

      if (link?.parent_user_id) {
        const parent = await User.findByPk(link.parent_user_id);
        if (parent?.email && process.env.EMAIL_USER) {
          const badgeNames = {
            'first_10_questions': 'Completed 10 Past Questions',
            'fifty_questions': 'Completed 50 Past Questions!',
            'century_questions': '🏆 100 Questions Champion!',
            'week_streak': '7-Day Study Streak!',
            'month_streak': '30-Day Study Streak Legend!',
            'five_high_scores': 'Scored 80%+ five times!',
          };
          const earned = badges.map(
            b => badgeNames[b] || b).join(', ');

          const nodemailer = require('nodemailer');
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });
          await transporter.sendMail({
            from: `Focus N Grow <${process.env.EMAIL_USER}>`,
            to: parent.email,
            subject: `🏆 ${user.name} just earned a badge!`,
            html: `
              <div style="font-family:Arial;background:#1e1e2e;
                padding:24px;border-radius:12px">
                <h2 style="color:#6c63ff">🏆 Achievement Unlocked!</h2>
                <p style="color:#ccc">
                  Your child <strong style="color:white">
                  ${user.name}</strong> just earned:
                </p>
                <div style="background:#2d2d3d;padding:16px;
                  border-radius:10px;margin:16px 0">
                  <p style="color:#ff9800;font-size:18px;
                    font-weight:bold;margin:0">${earned}</p>
                </div>
                <p style="color:#888;font-size:12px">
                  Current streak: ${streak.current_streak} days 🔥
                </p>
              </div>`,
          });
        }
      }
    }

    res.json({
      status: 'success',
      streak: streak.current_streak,
      badges_earned: badges,
      message: `Session recorded. Streak: ${streak.current_streak} days`,
    });
  } catch (e) {
    console.error('Study record error:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Get student report card data
router.get('/report/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { days = 30 } = req.query;

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString();

    const [streak, results, sessions, badges] = await Promise.all([
      Streak.findOne({ where: { user_id } }),
      sb().from('past_question_results').select('*')
        .eq('user_id', user_id).gte('created_at', since)
        .order('created_at', { ascending: false }),
      sb().from('study_sessions').select('*')
        .eq('user_id', user_id).gte('created_at', since),
      sb().from('user_badges').select('*').eq('user_id', user_id),
    ]);

    const pqResults = results.data || [];
    const studySessions = sessions.data || [];

    // Subject performance
    const subjectPerf = {};
    pqResults.forEach(r => {
      if (!subjectPerf[r.subject]) {
        subjectPerf[r.subject] = {
          sessions: 0, total_score: 0,
          total_questions: 0, total_correct: 0,
        };
      }
      subjectPerf[r.subject].sessions++;
      subjectPerf[r.subject].total_score += r.percentage;
      subjectPerf[r.subject].total_questions += r.total_questions;
      subjectPerf[r.subject].total_correct += r.score;
    });

    Object.keys(subjectPerf).forEach(s => {
      const p = subjectPerf[s];
      p.average_percentage = Math.round(
        p.total_score / p.sessions);
      p.performance = p.average_percentage >= 70
        ? 'Strong' : p.average_percentage >= 50
        ? 'Developing' : 'Needs Work';
    });

    const totalMinutes = studySessions.reduce(
      (s, r) => s + (r.minutes_studied || 0), 0);

    res.json({
      status: 'success',
      data: {
        streak: streak?.current_streak || 0,
        longest_streak: streak?.longest_streak || 0,
        total_study_minutes: totalMinutes,
        total_study_hours: (totalMinutes / 60).toFixed(1),
        total_quiz_sessions: pqResults.length,
        average_score: pqResults.length > 0
          ? Math.round(pqResults.reduce(
              (s, r) => s + r.percentage, 0) / pqResults.length)
          : 0,
        subject_performance: subjectPerf,
        recent_results: pqResults.slice(0, 10),
        badges: badges.data || [],
      },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;