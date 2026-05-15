// server/routes/opay.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

const OPAY_MERCHANT_ID = process.env.OPAY_MERCHANT_ID;
const OPAY_PUBLIC_KEY = process.env.OPAY_PUBLIC_KEY;
const OPAY_SECRET_KEY = process.env.OPAY_SECRET_KEY;

// OPay uses NG endpoint
const OPAY_BASE_URL = 'https://sandboxapi.pay.opay.ng'; // use https://cashierapi.opayweb.com for production

function generateOPaySignature(payload) {
  const payloadStr = JSON.stringify(payload);
  const hash = crypto
    .createHmac('sha512', OPAY_SECRET_KEY)
    .update(payloadStr)
    .digest('hex');
  return hash;
}

// Initialize OPay web payment
router.post('/initialize-opay', async (req, res) => {
  const { amount, email, name, phone, reference, plan } = req.body;

  const payload = {
    merchantId: OPAY_MERCHANT_ID,
    reference,
    amount: {
      total: Math.round(amount * 100), // OPay uses kobo
      currency: 'NGN',
    },
    returnUrl: 'focusngrow://payment-complete',
    callbackUrl: `${process.env.BACKEND_URL}/payments/opay-webhook`,
    expireAt: 30, // minutes
    userInfo: {
      userId: reference,
      userName: name,
      userEmail: email,
      userMobile: phone,
    },
    product: {
      name: `Focus N Grow ${plan} Plan`,
      description: `30-day ${plan} subscription`,
    },
  };

  const signature = generateOPaySignature(payload);

  try {
    const response = await axios.post(
      `${OPAY_BASE_URL}/api/v1/international/cashier/create`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${OPAY_PUBLIC_KEY}`,
          MerchantId: OPAY_MERCHANT_ID,
          Signature: signature,
        },
      }
    );

    res.json({
      success: true,
      cashierUrl: response.data.data.cashierUrl,
      reference,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});

// OPay webhook — called when payment completes
router.post('/opay-webhook', async (req, res) => {
  const { status, reference } = req.body;
  
  if (status === 'SUCCESS') {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    await supabase.from('payments').update({
      status: 'success',
      paid_at: new Date().toISOString(),
    }).eq('transaction_ref', reference);

    // Activate subscription
    const plan = reference.split('_')[1];
    const userId = reference.split('_')[2];
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    await supabase.from('profiles').update({
      subscription_plan: plan,
      subscription_expires_at: expiresAt.toISOString(),
    }).eq('id', userId);
  }

  res.json({ code: '00000', message: 'success' }); // OPay expects this exact response
});

module.exports = router;