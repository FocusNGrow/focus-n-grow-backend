// server/routes/airtime.js
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

const VTPASS_API_KEY = process.env.VTPASS_API_KEY;
const VTPASS_PUBLIC_KEY = process.env.VTPASS_PUBLIC_KEY;
const VTPASS_SECRET_KEY = process.env.VTPASS_SECRET_KEY;
const VTPASS_BASE_URL = 'https://sandbox.vtpass.com/api'; // prod: https://vtpass.com/api

// Get available airtime networks
router.get('/airtime-networks', async (req, res) => {
  res.json({
    networks: [
      { id: 'mtn', name: 'MTN', logo: 'https://vtpass.com/resources/mtn.png' },
      { id: 'airtel', name: 'Airtel', logo: 'https://vtpass.com/resources/airtel.png' },
      { id: 'glo', name: 'Glo', logo: 'https://vtpass.com/resources/glo.png' },
      { id: '9mobile', name: '9Mobile', logo: 'https://vtpass.com/resources/etisalat.png' },
    ],
  });
});

// Purchase airtime
router.post('/purchase-airtime', async (req, res) => {
  const { network, phone, amount, userId } = req.body;

  if (amount < 50 || amount > 50000) {
    return res.status(400).json({ success: false, error: 'Amount must be between ₦50 and ₦50,000' });
  }

  const requestId = `FNG_AIR_${Date.now()}_${userId.substring(0, 8)}`;

  try {
    const response = await axios.post(
      `${VTPASS_BASE_URL}/pay`,
      {
        request_id: requestId,
        serviceID: network,
        amount: amount,
        phone: phone,
      },
      {
        auth: {
          username: VTPASS_API_KEY,
          password: VTPASS_SECRET_KEY,
        },
        headers: {
          'api-key': VTPASS_API_KEY,
          'public-key': VTPASS_PUBLIC_KEY,
          'secret-key': VTPASS_SECRET_KEY,
        },
      }
    );

    const result = response.data;

    if (result.code === '000') {
      // Log to Supabase
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
      
      await supabase.from('payments').insert({
        user_id: userId,
        transaction_ref: requestId,
        provider: 'airtime',
        amount: amount,
        status: 'success',
        phone: phone,
        paid_at: new Date().toISOString(),
        metadata: { network, vtpass_ref: result.requestId },
      });

      res.json({
        success: true,
        message: `₦${amount} airtime sent to ${phone}`,
        reference: requestId,
      });
    } else {
      res.json({ success: false, error: result.response_description || 'Airtime purchase failed' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Purchase data bundle
router.get('/data-bundles/:network', async (req, res) => {
  const { network } = req.params;
  
  const serviceIdMap = {
    mtn: 'mtn-data',
    airtel: 'airtel-data',
    glo: 'glo-data',
    '9mobile': 'etisalat-data',
  };

  try {
    const response = await axios.get(
      `${VTPASS_BASE_URL}/service-variations?serviceID=${serviceIdMap[network]}`,
      { headers: { 'api-key': VTPASS_API_KEY } }
    );

    const bundles = response.data.content.variations.map(v => ({
      id: v.variation_code,
      name: v.name,
      amount: parseFloat(v.variation_amount),
    }));

    res.json({ success: true, bundles });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;