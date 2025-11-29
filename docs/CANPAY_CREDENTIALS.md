# CannPay Test Credentials

## Sandbox Account (BakedBot WEB)

**API Credentials** (stored in Secret Manager):
- Integrator ID: `8954cd15`
- Internal Version: `B4k3dBoT`
- App Key: `BaKxozke8`
- API Secret: `7acfs2il`
- Mode: `sandbox`

**API Endpoints**:
- API Base: `https://sandbox-api.canpaydebit.com`
- Widget JS: `https://sandbox-remotepay.canpaydebit.com/cp-min.js`

## Test Consumer Accounts

For testing payments in sandbox:

| Phone | PIN |
|-------|-----|
| 5557794523 | 2222 |
| 5554489921 | 3333 |

## Usage Notes

- Never expose API Secret to browser/frontend
- Use test consumers for E2E payment testing
- Switch to live mode credentials before production launch

---
*Provided by Dustin Eide (CEO@canpaydebit.com) on 2025-08-07*
