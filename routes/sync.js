const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const TimerSession = require('../models/TimerSession');
const protect = require('../middleware/authMiddleware'); // 1. Import the guard

// URL: POST /api/sync/offline-sync
// We add 'protect' here. If the token is missing or wrong, the code inside stays locked.
router.post('/offline-sync', protect, async (req, res) => {
    try {
        const { tasks, timer_sessions } = req.body;
        
        // 2. Use the ID from the TOKEN (req.user.id) for better security
        const user_id = req.user.id; 

        console.log(`Syncing data for user: ${user_id}`);

        // Sync Tasks
        if (tasks && tasks.length > 0) {
            for (const taskData of tasks) {
                await Task.upsert({
                    ...taskData,
                    user_id: user_id // Ensure task belongs to the logged-in user
                });
            }
        }

        // Sync Timer Sessions
        if (timer_sessions && timer_sessions.length > 0) {
            for (const sessionData of timer_sessions) {
                await TimerSession.create({
                    ...sessionData,
                    user_id: user_id
                });
            }
        }

        res.status(200).json({
            status: 'success',
            message: 'Data synced securely via token'
        });

    } catch (error) {
        console.error('Sync Error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;