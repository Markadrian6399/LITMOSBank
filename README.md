# LITMOSBank

A simple bank REST API built on Node.js/Express, backed by the [NibbsByPhoenix](https://nibssbyphoenix.onrender.com/api/docs/) fintech sandbox API for BVN/NIN verification, account creation, balances and transfers.

Your own users (email/password, JWT-authenticated) are stored locally in SQLite. Each local user links to one NIBSS-issued account number.

## Setup

```bash
npm install
cp .env.example .env
# edit .env: set NIBSS_API_KEY, NIBSS_API_SECRET and a real JWT_SECRET
npm start
```

Server runs on `http://localhost:3000` by default.

## Auth

All endpoints except `/api/auth/*` and `/api/fintech/onboard` require:

```
Authorization: Bearer <token from register/login>
```

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | - | `{ email, password, fullName }` → creates a local user |
| POST | `/api/auth/login` | - | `{ email, password }` → returns a JWT |
| POST | `/api/fintech/onboard` | - | `{ name, email }` → onboard this app with NIBSS (one-off setup) |
| POST | `/api/kyc/bvn` | ✓ | `{ bvn, firstName, lastName, dob, phone }` → insert + validate BVN |
| POST | `/api/kyc/nin` | ✓ | `{ nin, firstName, lastName, dob }` → insert + validate NIN |
| POST | `/api/accounts` | ✓ | `{ kycType: "BVN"\|"NIN", dob }` → creates the NIBSS account for your validated BVN/NIN |
| GET | `/api/accounts/me` | ✓ | Your account number, name-enquiry and balance |
| GET | `/api/accounts/balance` | ✓ | Your balance only |
| GET | `/api/accounts/name-enquiry/:accountNumber` | ✓ | Look up any account's name |
| POST | `/api/transfers` | ✓ | `{ to, amount }` → transfer from your account |
| GET | `/api/transfers` | ✓ | Your local transfer history |
| GET | `/api/transactions/:ref` | ✓ | Look up a transaction by reference on NIBSS |

## Typical flow

1. `POST /api/auth/register` → get a JWT
2. `POST /api/kyc/bvn` (or `/api/kyc/nin`) → validate identity
3. `POST /api/accounts` with `kycType` matching step 2 → get an account number
4. `GET /api/accounts/me` → confirm balance
5. `POST /api/transfers` → send money to another account number

## Notes

- The NIBSS `/api/auth/token` bearer token (server-to-server) is fetched once, cached in memory, and auto-refreshed on a 401 — it is unrelated to the JWT this app issues to its own users.
- The upstream OpenAPI spec doesn't document response bodies beyond a description, so `src/services/nibssClient.js` defensively looks in a few common places (`token`, `accessToken`, `data.token`, etc.) for the token and account number. If the live API's response shape differs, adjust `extractToken` / `extractAccountNumber` there.
- SQLite file lives at `data/bank.sqlite` (gitignored).
