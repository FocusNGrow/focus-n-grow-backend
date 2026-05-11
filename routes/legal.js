const express = require('express');
const router = express.Router();

router.get('/privacy', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Focus N Grow - Privacy Policy</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; 
         margin: 0 auto; padding: 20px; color: #333; }
  h1 { color: #6C63FF; }
  h2 { color: #444; }
</style>
</head>
<body>
<h1>Focus N Grow - Privacy Policy</h1>
<p><strong>Last updated: ${new Date().toLocaleDateString()}</strong></p>

<h2>1. Information We Collect</h2>
<p>We collect the following information:</p>
<ul>
  <li>Name and email address (during signup)</li>
  <li>Study activity data (sessions, streaks, moods)</li>
  <li>Device information for app functionality</li>
</ul>

<h2>2. How We Use Your Information</h2>
<ul>
  <li>To provide personalized AI coaching</li>
  <li>To track your study progress and streaks</li>
  <li>To send study reminders and motivational messages</li>
  <li>To improve the app experience</li>
</ul>

<h2>3. Data Sharing</h2>
<p>We do NOT sell your personal data to third parties.</p>
<p>School mode: If you join a school class, your teacher can see 
your study activity. Your personal goals and private sessions 
remain private.</p>

<h2>4. Data Security</h2>
<p>We use industry-standard encryption to protect your data. 
Passwords are encrypted and never stored in plain text.</p>

<h2>5. Children's Privacy</h2>
<p>Our service is designed for students 13 and older. We do not 
knowingly collect data from children under 13.</p>

<h2>6. Data Deletion</h2>
<p>You can delete your account at any time from the app settings. 
All your data will be permanently deleted within 30 days.</p>

<h2>7. Contact Us</h2>
<p>For privacy questions, contact us at: privacy@focusngrow.com</p>

<h2>8. Changes to This Policy</h2>
<p>We will notify you of significant changes via the app or email.</p>
</body>
</html>
  `);
});

router.get('/terms', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Focus N Grow - Terms of Service</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; 
         margin: 0 auto; padding: 20px; color: #333; }
  h1 { color: #6C63FF; }
</style>
</head>
<body>
<h1>Terms of Service</h1>
<p><strong>Last updated: ${new Date().toLocaleDateString()}</strong></p>

<h2>1. Acceptance of Terms</h2>
<p>By using Focus N Grow, you agree to these terms.</p>

<h2>2. Use of Service</h2>
<ul>
  <li>You must be 13 or older to use the service</li>
  <li>You are responsible for maintaining your account security</li>
  <li>You agree not to share accounts or misuse the service</li>
</ul>

<h2>3. Subscription</h2>
<p>Premium subscriptions are billed monthly. 
You can cancel anytime from your account settings.</p>

<h2>4. Content</h2>
<p>AI coaching responses are for educational guidance only. 
We do not guarantee specific exam results.</p>

<h2>5. Termination</h2>
<p>We reserve the right to suspend accounts that violate these terms.</p>

<h2>6. Contact</h2>
<p>legal@focusngrow.com</p>
</body>
</html>
  `);
});

module.exports = router;