require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let VTU_TOKEN = null;

async function getVtuToken() {
  const res = await axios.post('https://vtu.ng/wp-json/jwt-auth/v1/token', {
    username: process.env.VTU_USERNAME,
    password: process.env.VTU_PASSWORD
  });
  VTU_TOKEN = res.data.token;
  return VTU_TOKEN;
}

app.post('/buy-data', async (req, res) => {
  const { phone, network, plan_id, paystack_ref } = req.body;
  
  try {
    // 1. Verify Paystack
    const verify = await axios.get(`https://api.paystack.co/transaction/verify/${paystack_ref}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET}` }
    });
    if (verify.data.data.status !== 'success') {
      return res.json({ success: false, message: 'Payment not verified' });
    }

    // 2. Get VTU token
    if (!VTU_TOKEN) await getVtuToken();
    
    // 3. Buy data from vtu.ng
    const vtuRes = await axios.post('https://vtu.ng/wp-json/api/v2/data', {
      network: network,
      phone: phone,
      plan_id: plan_id,
      pin: process.env.VTU_PIN
    }, {
      headers: { Authorization: `Bearer ${VTU_TOKEN}` }
    });

    res.json({ success: true, message: 'Data sent!', vtu: vtuRes.data });

  } catch (e) {
    if (e.response?.status === 401) { VTU_TOKEN = null; }
    res.json({ success: false, message: e.response?.data?.message || e.message });
  }
});

app.listen(3000, () => console.log('Backend running'));
