const express = require('express');
const ChatMessage = require('../models/ChatMessage');

const router = express.Router();

// GET CHAT HISTORY
router.get('/history/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const messages = await ChatMessage.findAll({
      where: { user_id },
      order: [['createdAt', 'ASC']],
      limit: 50,
    });

    res.status(200).json({
      status: 'success',
      data: messages,
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get chat history',
      error: error.message,
    });
  }
});

// SEND MESSAGE (Basic - AI integration comes Day 4)
router.post('/send', async (req, res) => {
  try {
    const { user_id, content } = req.body;

    if (!user_id || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and content are required',
      });
    }

    // Check message limit for free users (5 per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessages = await ChatMessage.count({
      where: {
        user_id,
        role: 'user',
        createdAt: {
          [require('sequelize').Op.gte]: today,
        },
      },
    });

    if (todayMessages >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Daily message limit reached. Upgrade to premium for unlimited messages!',
      });
    }

    // Save user message
    const userMessage = await ChatMessage.create({
      user_id,
      role: 'user',
      content,
    });

    // Basic response (AI integration comes Day 4)
    const basicResponse = "I received your message! AI coaching will be activated soon. Keep studying! 💪";

    const assistantMessage = await ChatMessage.create({
      user_id,
      role: 'assistant',
      content: basicResponse,
    });

    res.status(200).json({
      status: 'success',
      data: {
        user_message: userMessage,
        assistant_message: assistantMessage,
        messages_today: todayMessages + 1,
        messages_remaining: 4 - todayMessages,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: error.message,
    });
  }
});

// DELETE CHAT HISTORY
router.delete('/clear/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    await ChatMessage.destroy({ where: { user_id } });

    res.status(200).json({
      status: 'success',
      message: 'Chat history cleared',
    });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to clear chat',
      error: error.message,
    });
  }
});

module.exports = router;