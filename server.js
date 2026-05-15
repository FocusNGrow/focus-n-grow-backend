require('dotenv').config();
const express = require('express');
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

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

const PORT = process.env.PORT || 3000;

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