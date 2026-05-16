// send_notification.js
// Firebase Admin will be initialized when firebase-admin-key.json is available

let admin = null;

function getAdmin() {
  if (admin) return admin;
  try {
    admin = require('firebase-admin');
    const keyPath = process.env.FIREBASE_ADMIN_KEY_PATH;
    if (keyPath) {
      const serviceAccount = require(keyPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (err) {
    console.warn('⚠️  Firebase Admin not initialized:', err.message);
    admin = null;
  }
  return admin;
}

async function sendPushNotification({ token, title, body, data = {} }) {
  const adminSdk = getAdmin();
  if (!adminSdk) {
    console.warn('⚠️  Push notification skipped — Firebase Admin not ready');
    return;
  }
  try {
    await adminSdk.messaging().send({
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
    body: "Your daily study coach is ready. Let's crush today's goals!",
    data: { type: 'morning_greeting' },
  });
}

module.exports = { sendPushNotification, sendMorningGreeting };