const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken'); // 1. Import JWT

const JWT_SECRET = 'your_super_secret_key_123'; // In production, move this to .env

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password, school } = req.body;
        const newUser = await User.create({ name, email, password, school });
        res.status(201).json({ status: 'success', user: { id: newUser.id, email: newUser.email } });
    } catch (error) {
        res.status(400).json({ status: 'error', message: error.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
        }

        // 2. Create the Token
        const token = jwt.sign(
            { id: user.id, email: user.email }, 
            JWT_SECRET, 
            { expiresIn: '24h' } // Token lasts for 1 day
        );

        res.status(200).json({
            status: 'success',
            message: 'Logged in successfully',
            token, // 3. Send the token back to the user!
            user: { id: user.id, name: user.name }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Save FCM token for push notifications
router.post('/fcm-token', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
 
    const jwt = require('jsonwebtoken');
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded.userId;
 
    const { fcm_token } = req.body;
    if (!fcm_token) return res.status(400).json({ error: 'FCM token required' });
 
    await User.update({ fcm_token }, { where: { id: userId } });
 
    res.json({ status: 'success', message: 'FCM token saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;