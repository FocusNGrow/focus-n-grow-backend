// server/utils/send_notification.js
const admin = require('firebase-admin');

// Initialize once in app.js:
// admin.initializeApp({ credential: admin.credential.cert(require('./firebase-admin-key.json')) });

async function sendPushNotification({ token, title, body, data = {} }) {
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'focus_n_grow_channel' },
      },
    });
  } catch (error) {
    console.error('Push notification failed:', error.message);
  }
}

// Send morning greeting notification
async function sendMorningGreeting(userId, supabase) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('fcm_token, full_name')
    .eq('id', userId)
    .single();

  if (!profile?.fcm_token) return;

  const firstName = profile.full_name?.split(' ')[0] || 'Champion';
  
  await sendPushNotification({
    token: profile.fcm_token,
    title: `Good morning, ${firstName}! 🌅`,
    body: 'Your daily study coach is ready. Let\'s crush today\'s goals!',
    data: { type: 'morning_greeting' },
  });
}

module.exports = { sendPushNotification, sendMorningGreeting };