require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const sequelize = require('./config/database');

// Import ALL models
const User = require('./models/User');
const Profile = require('./models/Profile');
const StudyPlan = require('./models/StudyPlan');
const StudyPlanItem = require('./models/StudyPlanItem');
const MoodLog = require('./models/MoodLog');
const Streak = require('./models/Streak');
const FocusSession = require('./models/FocusSession');
const ChatMessage = require('./models/ChatMessage');
const Subject = require('./models/Subject');
const PersonalGoal = require('./models/PersonalGoal');
const BiblePlan = require('./models/BiblePlan');

// Import ALL routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const studyRoutes = require('./routes/study');
const moodRoutes = require('./routes/mood');
const streakRoutes = require('./routes/streak');
const timerRoutes = require('./routes/timer');
const chatRoutes = require('./routes/chat');
const subscriptionRoutes = require('./routes/subscription');
const subjectRoutes = require('./routes/subjects');
const personalGoalRoutes = require('./routes/personalGoal');
const paymentRoutes      = require('./routes/payment');
const passwordResetRoutes = require('./routes/passwordReset');
const legalRoutes        = require('./routes/legal');
const syncRoutes         = require('./routes/sync');
const opayRoutes         = require('./routes/opay');
const palmPayRoutes      = require('./routes/palmpay');
const airtimeRoutes      = require('./routes/airtime');
const teacherRoutes = require('./routes/teacher');
const adminRoutes  = require('./routes/admin');
const schoolRoutes = require('./routes/school');
const greetingRoutes = require('./routes/greeting');

const app = express();

app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Sync ALL tables
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ All database tables synced');
  })
  .catch(err => {
    console.error('❌ Database sync error:', err);
  });

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Focus N Grow API is running!',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    database: 'Supabase PostgreSQL ✅',
  });
});

// ALL API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/streak', streakRoutes);
app.use('/api/timer', timerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/goals', personalGoalRoutes);
app.use('/api/payment',        paymentRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/legal',          legalRoutes);
app.use('/api/sync',           syncRoutes);
app.use('/api/payment',        opayRoutes);
app.use('/api/payment',        palmPayRoutes);
app.use('/api/airtime',        airtimeRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/admin',   adminRoutes);
// Super admin stats endpoint
app.get('/api/superadmin/stats', async (req, res) => {
  try {
    const User = require('./models/User');
    const { Op } = require('sequelize');
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(
      process.env.SUPABASE_URL || 'https://ojjsdkucujkxxsfbzqpf.supabase.co',
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );

    const totalUsers = await User.count();
    const freeUsers = await User.count({ where: { plan_type: [null, 'free'] } });
    const basicUsers = await User.count({ where: { plan_type: 'basic' } });
    const premiumUsers = await User.count({ where: { plan_type: 'premium' } });

    const { data: schools } = await sb.from('schools').select();
    const schoolRevenue = schools?.reduce((sum, s) =>
      sum + (parseFloat(s.subscription_amount) || 0), 0) || 0;

    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: ['id', 'name', 'email', 'plan_type', 'createdAt'],
    });

    res.json({
      status: 'success',
      stats: {
        total_users: totalUsers,
        free_users: freeUsers,
        basic_users: basicUsers,
        premium_users: premiumUsers,
        total_schools: schools?.length || 0,
        school_revenue: schoolRevenue,
      },
      recent_users: recentUsers,
      schools: schools || [],
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/school', schoolRoutes);
app.use('/api/greeting', greetingRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

const PORT = process.env.PORT || 3000;

// Daily check: expire school subscriptions
async function checkExpiredSubscriptions() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const sb = createClient(
      process.env.SUPABASE_URL || 'https://ojjsdkucujkxxsfbzqpf.supabase.co',
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );

    // Find expired tokens
    const { data: expiredTokens } = await sb
      .from('school_student_tokens')
      .select('used_by')
      .eq('used', true)
      .lt('expires_at', new Date().toISOString())
      .not('used_by', 'is', null);

    if (expiredTokens?.length) {
      const expiredUserIds = expiredTokens
        .map(t => t.used_by)
        .filter(Boolean);

      // Revert their plan to free
      const User = require('./models/User');
      await User.update(
        { plan_type: 'free' },
        { where: { id: expiredUserIds } }
      );

      console.log(`✅ Expired ${expiredUserIds.length} school subscriptions`);
    }
  } catch (e) {
    console.error('Expiry check error:', e.message);
  }
}

// Run expiry check every 24 hours
setInterval(checkExpiredSubscriptions, 24 * 60 * 60 * 1000);
// Also run once on startup
setTimeout(checkExpiredSubscriptions, 5000);
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   FOCUS N GROW - BACKEND v2.0          ║
  ║   Running on port ${PORT}                  ║
  ║   Database: Supabase PostgreSQL        ║
  ╠════════════════════════════════════════╣
  ║   /api/auth        /api/subjects       ║
  ║   /api/profiles    /api/goals          ║
  ║   /api/study       /api/streak         ║
  ║   /api/mood        /api/timer          ║
  ║   /api/chat        /api/subscription   ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;