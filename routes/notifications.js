const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const User = require('../models/User');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.warn('⚠️ Firebase not configured. Push notifications disabled.');
  }
}

// Register device token
router.post('/register-token', async (req, res) => {
  try {
    const { userId, deviceToken } = req.body;

    if (!userId || !deviceToken) {
      return res.status(400).json({
        status: 'error',
        message: 'userId and deviceToken required',
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    // Store device token
    user.fcm_token = deviceToken;
    await user.save();

    res.json({
      status: 'success',
      message: 'Device token registered',
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Send notification to user
router.post('/send', async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'userId, title, and body required',
      });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.fcm_token) {
      return res.status(404).json({
        status: 'error',
        message: 'User or device token not found',
      });
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: user.fcm_token,
    };

    const response = await admin.messaging().send(message);

    res.json({
      status: 'success',
      message: 'Notification sent',
      messageId: response,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Send to multiple users
router.post('/send-bulk', async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'userIds (array), title, and body required',
      });
    }

    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'fcm_token'],
    });

    const tokens = users
      .filter(u => u.fcm_token)
      .map(u => u.fcm_token);

    if (tokens.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No valid device tokens found',
      });
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
    };

    const response = await admin.messaging().sendMulticast({
      ...message,
      tokens,
    });

    res.json({
      status: 'success',
      message: 'Bulk notification sent',
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Subscribe user to topic
router.post('/subscribe-topic', async (req, res) => {
  try {
    const { userId, topic } = req.body;

    if (!userId || !topic) {
      return res.status(400).json({
        status: 'error',
        message: 'userId and topic required',
      });
    }

    const user = await User.findByPk(userId);
    if (!user || !user.fcm_token) {
      return res.status(404).json({
        status: 'error',
        message: 'User or device token not found',
      });
    }

    await admin.messaging().subscribeToTopic(user.fcm_token, topic);

    res.json({
      status: 'success',
      message: `Subscribed to topic: ${topic}`,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

// Send to topic
router.post('/send-topic', async (req, res) => {
  try {
    const { topic, title, body, data } = req.body;

    if (!topic || !title || !body) {
      return res.status(400).json({
        status: 'error',
        message: 'topic, title, and body required',
      });
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      topic,
    };

    const response = await admin.messaging().send(message);

    res.json({
      status: 'success',
      message: 'Topic notification sent',
      messageId: response,
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
});

module.exports = router;

