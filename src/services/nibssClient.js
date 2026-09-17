const axios = require('axios');
const env = require('../config/env');

const http = axios.create({ baseURL: env.nibss.baseUrl });

let cachedToken = null;

// The API's token response shape isn't documented beyond "200 Token generated",
// so we defensively check the common places a JWT could show up.
function extractToken(data) {
  if (!data) return null;
  if (typeof data === 'string') return data;
  return (
    data.token ||
    data.accessToken ||
    data.access_token ||
    (data.data && (data.data.token || data.data.accessToken)) ||
    null
  );
}

async function fetchToken({ forceRefresh = false } = {}) {
  if (cachedToken && !forceRefresh) return cachedToken;

  const { data } = await http.post('/api/auth/token', {
    apiKey: env.nibss.apiKey,
    apiSecret: env.nibss.apiSecret,
  });

  const token = extractToken(data);
  if (!token) {
    throw new Error('NIBSS token response did not contain a recognizable token field');
  }
  cachedToken = token;
  return token;
}

// Wraps a NIBSS call, injecting the bearer token and retrying once on 401
// in case the cached token expired.
async function authedRequest(config) {
  const token = await fetchToken();
  try {
    return await http.request({
      ...config,
      headers: { ...(config.headers || {}), Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    if (err.response && err.response.status === 401) {
      const freshToken = await fetchToken({ forceRefresh: true });
      return http.request({
        ...config,
        headers: { ...(config.headers || {}), Authorization: `Bearer ${freshToken}` },
      });
    }
    throw err;
  }
}

module.exports = {
  fetchToken,

  onboardFintech: (name, email) =>
    http.post('/api/fintech/onboard', { name, email }).then((r) => r.data),

  insertBvn: (payload) => http.post('/api/insertBvn', payload).then((r) => r.data),

  validateBvn: (bvn) => http.post('/api/validateBvn', { bvn }).then((r) => r.data),

  insertNin: (payload) => http.post('/api/insertNin', payload).then((r) => r.data),

  validateNin: (nin) => http.post('/api/validateNin', { nin }).then((r) => r.data),

  createAccount: ({ kycType, kycID, dob }) =>
    authedRequest({ method: 'post', url: '/api/account/create', data: { kycType, kycID, dob } }).then(
      (r) => r.data
    ),

  nameEnquiry: (accountNumber) =>
    authedRequest({ method: 'get', url: `/api/account/name-enquiry/${accountNumber}` }).then((r) => r.data),

  getBalance: (accountNumber) =>
    authedRequest({ method: 'get', url: `/api/account/balance/${accountNumber}` }).then((r) => r.data),

  transfer: ({ from, to, amount }) =>
    authedRequest({ method: 'post', url: '/api/transfer', data: { from, to, amount } }).then((r) => r.data),

  getTransaction: (ref) =>
    authedRequest({ method: 'get', url: `/api/transaction/${ref}` }).then((r) => r.data),

  getAccounts: () => authedRequest({ method: 'get', url: '/api/accounts' }).then((r) => r.data),
};
