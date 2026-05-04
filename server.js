require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');

const app = express();

app.use(express.json());
app.use(cors());

sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ SQLite database tables synced');
  })
  .catch(err => {
    console.error('❌ Database sync error:', err);
  });

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

app.use('/api/auth', authRoutes);

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
  ║   GET  http://localhost:3000/          ║
  ║   POST http://localhost:3000/api/auth/register
  ║   POST http://localhost:3000/api/auth/login
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;