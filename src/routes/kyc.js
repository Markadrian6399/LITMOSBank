const express = require('express');
const db = require('../db');
const nibss = require('../services/nibssClient');

const router = express.Router();

router.post('/bvn', async (req, res) => {
  const { bvn, firstName, lastName, dob, phone } = req.body;
  if (!bvn || !firstName || !lastName || !dob || !phone) {
    return res.status(400).json({ error: 'bvn, firstName, lastName, dob and phone are required' });
  }

  try {
    await nibss.insertBvn({ bvn, firstName, lastName, dob, phone });
    const validation = await nibss.validateBvn(bvn);

    db.prepare('UPDATE users SET bvn = ?, bvn_validated = 1 WHERE id = ?').run(bvn, req.user.id);
    res.json({ message: 'BVN validated', validation });
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'BVN verification failed', detail: err.response ? err.response.data : err.message });
  }
});

router.post('/nin', async (req, res) => {
  const { nin, firstName, lastName, dob } = req.body;
  if (!nin || !firstName || !lastName || !dob) {
    return res.status(400).json({ error: 'nin, firstName, lastName and dob are required' });
  }

  try {
    await nibss.insertNin({ nin, firstName, lastName, dob });
    const validation = await nibss.validateNin(nin);

    db.prepare('UPDATE users SET nin = ?, nin_validated = 1 WHERE id = ?').run(nin, req.user.id);
    res.json({ message: 'NIN validated', validation });
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'NIN verification failed', detail: err.response ? err.response.data : err.message });
  }
});

module.exports = router;
