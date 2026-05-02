// ============================================
// FOCUS N GROW - BACKEND SERVER
// Main entry point
// ============================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE (Process every request)
// ============================================

app.use(express.json()); // Parse JSON bodies
app.use(cors()); // Allow frontend requests

// ============================================
// SIMPLE HEALTH CHECK ENDPOINT
// ============================================

app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Focus N Grow API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================
// SIMPLE TEST ENDPOINT
// ============================================

app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'API is working correctly!',
    endpoint: '/api/test',
    method: 'GET'
  });
});

// ============================================
// ERROR HANDLER (Catch errors)
// ============================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║   FOCUS N GROW - BACKEND SERVER        ║
  ║   Running on port ${PORT}                  ║
  ║   Environment: ${process.env.NODE_ENV}         ║
  ║                                        ║
  ║   Test endpoints:                      ║
  ║   GET http://localhost:${PORT}/            ║
  ║   GET http://localhost:${PORT}/api/test    ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;