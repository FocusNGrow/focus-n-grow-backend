const express = require('express');
const router = express.Router();
const axios = require('axios');
 
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
 
// In-memory cache: userId -> { greeting, date }
const greetingCache = {};
 
// GET /api/greeting/today
router.get('/today', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
 
    // Simple token decode to get user info
    const token = authHeader.replace('Bearer ', '');
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
 
    const userId = decoded.id || decoded.userId || decoded.user_id;
    const today = new Date().toISOString().substring(0, 10);
 
    // Return cached greeting for today
    if (greetingCache[userId] && greetingCache[userId].date === today) {
      return res.json({ greeting: greetingCache[userId].greeting, cached: true });
    }
 
    // Generate new greeting with Claude
    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';
 
    const prompt = `You are Zara, an AI study coach for Nigerian students.
Generate a SHORT, warm, motivating ${timeOfDay} greeting for a student.
Requirements:
- Maximum 2 sentences
- Reference studying, exams, or personal growth
- Warm and encouraging Nigerian tone
- End with an emoji
- Do NOT start with "Good morning/afternoon/evening"
- Be creative and different every time
Just output the greeting text only, nothing else.`;
 
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
    } catch {
      // Fallback greetings if Claude is unavailable
      const fallbacks = [
        "Champion, today is your day to push beyond your limits! Every page you read brings you closer to your goals. 📚",
        "Your future self will thank you for the work you put in today. Let's make every minute count! 🔥",
        "Big dreams require consistent daily action. Open those books and let's build something great today! ✨",
        "Zara believes in you! Today's effort is tomorrow's success story. 💪",
        "Rise and grind! Your WAEC/JAMB result is being written right now by your daily choices. 🎯",
      ];
      greeting = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
 
    // Cache it
    greetingCache[userId] = { greeting, date: today };
 
    res.json({ greeting, cached: false });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get greeting',
      greeting: "Today is a great day to learn something new! Keep going! 🌟",
    });
  }
});
 
module.exports = router; 
