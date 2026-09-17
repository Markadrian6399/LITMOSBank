const express = require('express');
const db = require('../db');
const nibss = require('../services/nibssClient');

const router = express.Router();

router.post('/', async (req, res) => {
  const user = req.user;
  if (!user.account_number) {
    return res.status(400).json({ error: 'You need an account before you can transfer funds' });
  }

  const { to, amount } = req.body;
  if (!to || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'to (account number) and a positive amount are required' });
  }

  try {
    const result = await nibss.transfer({ from: user.account_number, to, amount: Number(amount) });
    const reference = result && (result.reference || (result.data && result.data.reference)) || null;

    db.prepare(
      `INSERT INTO transfers (user_id, from_account, to_account, amount, reference, status, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(user.id, user.account_number, to, Number(amount), reference, 'success', JSON.stringify(result));

    res.status(201).json({ message: 'Transfer successful', reference, raw: result });
  } catch (err) {
    const detail = err.response ? err.response.data : err.message;
    db.prepare(
      `INSERT INTO transfers (user_id, from_account, to_account, amount, reference, status, raw_response)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`
    ).run(user.id, user.account_number, to, Number(amount), 'failed', JSON.stringify(detail));

    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'Transfer failed', detail });
  }
});

router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM transfers WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json(rows);
});

module.exports = router;
