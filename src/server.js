const express = require('express');
const env = require('./config/env');
require('./db'); // ensure tables exist on boot

const authenticate = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const kycRoutes = require('./routes/kyc');
const accountRoutes = require('./routes/accounts');
const transferRoutes = require('./routes/transfers');
const nibssRoutes = require('./routes/nibss');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api', nibssRoutes); // /api/fintech/onboard (public), /api/transactions/:ref (authed internally)

app.use('/api/kyc', authenticate, kycRoutes);
app.use('/api/accounts', authenticate, accountRoutes);
app.use('/api/transfers', authenticate, transferRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`LITMOSBank API listening on port ${env.port}`);
});
