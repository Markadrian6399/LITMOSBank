const express = require('express');
const nibss = require('../services/nibssClient');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.get('/transactions/:ref', authenticate, async (req, res) => {
  try {
    const txn = await nibss.getTransaction(req.params.ref);
    res.json(txn);
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'Transaction lookup failed', detail: err.response ? err.response.data : err.message });
  }
});

// One-off: onboard this app as a fintech with the NIBSS sandbox.
// Not tied to a bank customer, so it's not behind local user auth.
router.post('/fintech/onboard', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' });

  try {
    const result = await nibss.onboardFintech(name, email);
    res.json(result);
  } catch (err) {
    const status = err.response ? err.response.status : 502;
    res.status(status).json({ error: 'Fintech onboarding failed', detail: err.response ? err.response.data : err.message });
  }
});

module.exports = router;
