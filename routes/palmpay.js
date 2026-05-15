// server/routes/palmpay.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

const PALMPAY_APP_ID = process.env.PALMPAY_APP_ID;
const PALMPAY_PRIVATE_KEY = process.env.PALMPAY_PRIVATE_KEY;
const PALMPAY_BASE_URL = 'https://api-sandbox.palmpay-inc.com'; // prod: https://api.palmpay-inc.com

function signPalmPayRequest(payload) {
  const sortedKeys = Object.keys(payload).sort();
  const signStr = sortedKeys.map(k => `${k}=${payload[k]}`).join('&')
    + `&key=${PALMPAY_PRIVATE_KEY}`;
  return crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
}

router.post('/initialize-palmpay', async (req, res) => {
  const { amount, email, name, phone, reference, plan } = req.body;

  const payload = {
    merchantId: PALMPAY_APP_ID,
    merchantOrderNo: reference,
    orderAmount: Math.round(amount * 100), // kobo
    orderCurrency: 'NGN',
    productName: `Focus N Grow ${plan} Plan`,
    productDescription: `30-day ${plan} subscription`,
    callbackUrl: `${process.env.BACKEND_URL}/payments/palmpay-webhook`,
    returnUrl: 'focusngrow://payment-complete',
    buyerName: name,
    buyerEmail: email,
    buyerPhone: phone,
  };

  payload.sign = signPalmPayRequest(payload);

  try {
    const response = await axios.post(
      `${PALMPAY_BASE_URL}/payment/v2/merchant/order/initialize`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data.code === '00000') {
      res.json({
        success: true,
        paymentUrl: response.data.data.paymentUrl,
        reference,
      });
    } else {
      res.json({ success: false, error: response.data.msg });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/palmpay-webhook', async (req, res) => {
  const { status, merchantOrderNo, transAmount } = req.body;
  
  if (status === 'SUCCESS') {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    await supabase.from('payments').update({
      status: 'success',
      paid_at: new Date().toISOString(),
    }).eq('transaction_ref', merchantOrderNo);

    const plan = merchantOrderNo.split('_')[1];
    const userId = merchantOrderNo.split('_')[2];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    await supabase.from('profiles').update({
      subscription_plan: plan,
      subscription_expires_at: expiresAt.toISOString(),
    }).eq('id', userId);
  }

  res.json({ code: '00000', msg: 'success' });
});

module.exports = router;