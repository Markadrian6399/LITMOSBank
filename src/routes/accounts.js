const express = require('express');
const db = require('../db');
const nibss = require('../services/nibssClient');

const router = express.Router();

function extractAccountNumber(data) {
  if (!data) return null;
  return data.accountNumber || (data.data && data.data.accountNumber) || null;
}

router.post('/', async (req, res) => {
  const user = req.user;
  if (user.account_number) {
    return res.status(409).json({ error: 'Account already created', accountNumber: user.account_number });
  }

  const { kycType, dob } = req.body;
  if (!kycType || !['BVN', 'NIN'].includes(kycType.toUpperCase())) {
    return res.status(400).json({ error: "kycType must be 'BVN' or 'NIN'" });
  }
  if (!dob) return res.status(400).json({ error: 'dob is required' });

  const useBvn = kycType.toUpperCase() === 'BVN';
  if (useBvn && !user.bvn_validated) {
    return res.status(400).json({ error: 'BVN has not been validated for this user yet' });
  }
  if (!useBvn && !user.nin_validated) {
    return res.status(400).json({ error: 'NIN has not been validated for this user yet' });
  }

  const kycID = useBvn ? user.bvn : user.nin;

  try {
    const result = await nibss.createAccount({ kycType: kycType.toUpperCase(), kycID, dob });
    const accountNumber = extractAccountNumber(result);
    if (!accountNumber) {
      return res.status(502).json({ error: 'Account created but no account number returned', raw: result });
    }

    db.prepare('UPDATE users SET account_number = ? WHERE id = ?').run(accountNumber, user.id);
    res.status(201).json({ message: 'Account created', accountNumber, raw: result });
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'Account creation failed', detail: err.response ? err.response.data : err.message });
  }
});

router.get('/me', async (req, res) => {
  const user = req.user;
  if (!user.account_number) {
    return res.status(404).json({ error: 'No account has been created for this user yet' });
  }

  try {
    const [nameInfo, balance] = await Promise.all([
      nibss.nameEnquiry(user.account_number),
      nibss.getBalance(user.account_number),
    ]);
    res.json({ accountNumber: user.account_number, name: nameInfo, balance });
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'Failed to fetch account info', detail: err.response ? err.response.data : err.message });
  }
});

router.get('/balance', async (req, res) => {
  const user = req.user;
  if (!user.account_number) {
    return res.status(404).json({ error: 'No account has been created for this user yet' });
  }

  try {
    const balance = await nibss.getBalance(user.account_number);
    res.json(balance);
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'Failed to fetch balance', detail: err.response ? err.response.data : err.message });
  }
});

router.get('/name-enquiry/:accountNumber', async (req, res) => {
  try {
    const info = await nibss.nameEnquiry(req.params.accountNumber);
    res.json(info);
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'Name enquiry failed', detail: err.response ? err.response.data : err.message });
  }
});

module.exports = router;
