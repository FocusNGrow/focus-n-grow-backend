const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const MoodLog = require('../models/MoodLog');
const Streak = require('../models/Streak');
const { Op } = require('sequelize');

const router = express.Router();

// ============================================
// SMART AI RESPONSE (No API key needed yet!)
// Uses template-based coaching until Claude added
// ============================================

function getSmartResponse(message, context) {
  const msg = message.toLowerCase();
  const mood = context.mood || 'neutral';
  const name = context.name?.split(' ')[0] || 'Champion';
  const streak = context.streak || 0;

  // Stressed/anxious responses
  if (msg.includes('stress') || msg.includes('anxious') || msg.includes('worried') || msg.includes('scared')) {
    return `${name}, I hear you. Feeling stressed before exams is completely normal - it means you care about your future. Take one deep breath, then focus on just ONE small task today. You don't have to do everything at once. 💙`;
  }

  // Motivation needed
  if (msg.includes('motivat') || msg.includes('lazy') || msg.includes('cant') || msg.includes("can't") || msg.includes('tired')) {
    if (streak > 0) {
      return `${name}, you have a ${streak}-day streak! That proves you CAN do this. Even 20 minutes of studying today keeps your momentum alive. Start small - open your book right now. 🔥`;
    }
    return `${name}, every expert was once a beginner. Today is the perfect day to start fresh. Set a 25-minute timer and just begin - the motivation comes AFTER you start, not before. 💪`;
  }

  // JAMB specific
  if (msg.includes('jamb')) {
    return `${name}, JAMB is very manageable when you break it down! Focus on one subject per day, practice past questions daily, and remember - thousands of students pass JAMB every year. You will be one of them! 📚`;
  }

  // WAEC specific
  if (msg.includes('waec') || msg.includes('wasc')) {
    return `${name}, for WAEC success: read your syllabus carefully, practice past questions from at least 5 years back, and don't neglect English. Consistency beats cramming every time! ✅`;
  }

  // Help with studying
  if (msg.includes('study') || msg.includes('read') || msg.includes('learn')) {
    return `${name}, here's what works: Study in 25-minute blocks with 5-minute breaks (Pomodoro technique). Your brain retains more in shorter focused sessions. Which subject are you working on? 📖`;
  }

  // Math help
  if (msg.includes('math') || msg.includes('maths') || msg.includes('calcul')) {
    return `${name}, Mathematics becomes easy with practice. Identify which topics confuse you most, then solve at least 10 past questions on that topic daily. Pattern recognition is key! ➕`;
  }

  // English help
  if (msg.includes('english') || msg.includes('comprehension') || msg.includes('essay')) {
    return `${name}, for English - read newspapers and novels daily to improve comprehension. For essays: Introduction → 3 body paragraphs → Conclusion. Always check your grammar! ✍️`;
  }

  // Greeting
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('good morning') || msg.includes('good evening')) {
    const greetings = [
      `Hello ${name}! Ready to conquer today's studies? What subject are we tackling? 🎯`,
      `Hey ${name}! Great to see you. Your ${streak}-day streak shows real dedication! What do you need help with today? 💪`,
      `Hi ${name}! Your consistency is inspiring. What are we studying today? 📚`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Mood-based responses
  if (mood === 'stressed' || mood === 'burnt_out') {
    return `${name}, I can see you're going through a tough time. Let's make today manageable - what's ONE thing you could study for just 20 minutes? Small steps lead to big results. You've got this! 💙`;
  }

  if (mood === 'excited' || mood === 'motivated') {
    return `${name}, love that energy! 🔥 Channel it into your studies right now. Set a 45-minute deep focus session and watch what you can accomplish. What subject needs your attention?`;
  }

  // Default intelligent response
  const defaults = [
    `${name}, that's a great question! The key to academic success is consistency over intensity. What specific area would you like to focus on today? 🎯`,
    `${name}, I'm here to help you succeed! Tell me more about what you're working on and I'll give you specific guidance. 📚`,
    `${name}, with your ${streak}-day streak, you're clearly committed to your goals! What challenge can we tackle together today? 💪`,
    `${name}, every study session brings you closer to your goal. What are you working on right now? Let me help you break it down! ✅`,
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ============================================
// SEND MESSAGE
// ============================================
router.post('/send', async (req, res) => {
  try {
    const { user_id, content, name, grade_level, exam_type } = req.body;

    if (!user_id || !content) {
      return res.status(400).json({
        status: 'error',
        message: 'user_id and content are required',
      });
    }

    // Check daily message limit (free = 5/day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayMessages = await ChatMessage.count({
      where: {
        user_id,
        role: 'user',
        createdAt: { [Op.gte]: today },
      },
    });

    if (todayMessages >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Daily limit reached! Upgrade to premium for unlimited messages 🚀',
        upgrade_required: true,
      });
    }

    // Get student context
    const latestMood = await MoodLog.findOne({
      where: { user_id },
      order: [['createdAt', 'DESC']],
    });

    const streak = await Streak.findOne({ where: { user_id } });

    const studentContext = {
      name: name || 'Champion',
      grade_level: grade_level || 'Not set',
      exam_type: exam_type || 'upcoming exam',
      mood: latestMood?.mood || 'neutral',
      streak: streak?.current_streak || 0,
    };

    // Save user message
    await ChatMessage.create({
      user_id,
      role: 'user',
      content,
    });

    // Generate response
    const aiResponse = getSmartResponse(content, studentContext);

    // Save assistant response
    const assistantMessage = await ChatMessage.create({
      user_id,
      role: 'assistant',
      content: aiResponse,
    });

    res.status(200).json({
      status: 'success',
      data: {
        assistant_message: assistantMessage,
        messages_today: todayMessages + 1,
        messages_remaining: Math.max(0, 4 - todayMessages),
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send message',
      error: error.message,
    });
  }
});

// ============================================
// GET CHAT HISTORY
// ============================================
router.get('/history/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const messages = await ChatMessage.findAll({
      where: { user_id },
      order: [['createdAt', 'ASC']],
      limit: 50,
    });
    res.status(200).json({ status: 'success', data: messages });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// ============================================
// CLEAR CHAT
// ============================================
router.delete('/clear/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    await ChatMessage.destroy({ where: { user_id } });
    res.status(200).json({ status: 'success', message: 'Chat cleared' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;