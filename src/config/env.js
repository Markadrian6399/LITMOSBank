require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: required('JWT_SECRET'),
  nibss: {
    baseUrl: process.env.NIBSS_BASE_URL || 'https://nibssbyphoenix.onrender.com',
    apiKey: required('NIBSS_API_KEY'),
    apiSecret: required('NIBSS_API_SECRET'),
  },
};
