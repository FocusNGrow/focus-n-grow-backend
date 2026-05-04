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

// Import ALL routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const studyRoutes = require('./routes/study');
const moodRoutes = require('./routes/mood');
const streakRoutes = require('./routes/streak');
const timerRoutes = require('./routes/timer');
const chatRoutes = require('./routes/chat');

const app = express();

app.use(express.json());
app.use(cors());

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
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      profiles: '/api/profiles',
      study: '/api/study',
      mood: '/api/mood',
      streak: '/api/streak',
      timer: '/api/timer',
      chat: '/api/chat',
    }
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

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   FOCUS N GROW - BACKEND SERVER        ║
  ║   Running on port 3000                 ║
  ║   Database: SQLite (Local)             ║
  ║   Environment: development             ║
  ╠════════════════════════════════════════╣
  ║   ROUTES ACTIVE:                       ║
  ║   /api/auth (signup/login)             ║
  ║   /api/profiles (profile mgmt)         ║
  ║   /api/study (study plans)             ║
  ║   /api/mood (mood tracking)            ║
  ║   /api/streak (streak tracking)        ║
  ║   /api/timer (focus timer)             ║
  ║   /api/chat (AI coaching)              ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;