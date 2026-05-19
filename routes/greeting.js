const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const greetingCache = {};

router.get('/today', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.id || decoded.userId || decoded.user_id;
    const today = new Date().toISOString().substring(0, 10);

    if (greetingCache[userId] && greetingCache[userId].date === today) {
      return res.json({
        greeting: greetingCache[userId].greeting,
        cached: true,
      });
    }

    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';

    const prompt = `You are Bella-Thalia, an AI study coach for Nigerian students.
Generate a SHORT, warm, motivating ${timeOfDay} greeting for a student.
Requirements:
- Maximum 2 sentences
- Reference studying, exams, or personal growth
- Warm Nigerian tone
- End with one emoji
- Do NOT start with "Good morning/afternoon/evening"
- Be creative
Output the greeting text only.`;

    let greeting;

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 100,
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );
      greeting = response.data.content[0].text.trim();
    } catch (err) {
      const fallbacks = [
        "Champion, today is your day to push beyond your limits! Every page you read brings you closer to your goals. 📚",
        "Your future self will thank you for the work you put in today. Let's make every minute count! 🔥",
        "Big dreams require consistent daily action — open those books and let's build something great! ✨",
        "Bella-Thalia believes in you! Today's effort is tomorrow's success story. 💪",
        "Rise and shine! Your WAEC/JAMB result is being written right now by your daily choices. 🎯",
      ];
      greeting = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    greetingCache[userId] = { greeting, date: today };
    res.json({ greeting, cached: false });
  } catch (error) {
    res.status(500).json({
      greeting: "Today is a great day to learn something new! Keep going! 🌟",
    });
  }
});

module.exports = router;