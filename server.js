require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

// Import models
const User = require('./models/User');
const Profile = require('./models/Profile');
const StudyPlan = require('./models/StudyPlan');
const StudyPlanItem = require('./models/StudyPlanItem');
const MoodLog = require('./models/MoodLog');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const studyRoutes = require('./routes/study');
const moodRoutes = require('./routes/mood');

const app = express();

app.use(express.json());
app.use(cors());

// Sync database
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ SQLite database tables synced');
  })
  .catch(err => {
    console.error('❌ Database sync error:', err);
  });

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Focus N Grow API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is working correctly!',
    endpoint: '/api/test',
    method: 'GET'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/mood', moodRoutes);

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
  ║                                        ║
  ║   API Endpoints:                       ║
  ║   POST http://localhost:3000/api/auth/register
  ║   POST http://localhost:3000/api/auth/login
  ║   POST http://localhost:3000/api/profiles/create
  ║   GET  http://localhost:3000/api/profiles/:user_id
  ║   POST http://localhost:3000/api/study/plans/create
  ║   POST http://localhost:3000/api/study/items/create
  ║   GET  http://localhost:3000/api/study/tasks/today/:plan_id
  ║   POST http://localhost:3000/api/mood/log
  ║   GET  http://localhost:3000/api/mood/history/:user_id
  ║   GET  http://localhost:3000/api/mood/analysis/:user_id
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;