# BakedBot AI - Secrets Configuration

## Production Secrets (Google Secret Manager)

### Currently Configured ✅
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Firebase Admin SDK (v4)
- `SENDGRID_API_KEY` - Email service
- `RECAPTCHA_SECRET_KEY` - Server-side reCAPTCHA
- `CANNMENUS_API_KEY` - Menu data provider
- `AUTHNET_API_LOGIN_ID` - Authorize.Net payments
- `AUTHNET_TRANSACTION_KEY` - Authorize.Net payments
- `NEXT_PUBLIC_AUTHNET_CLIENT_KEY` - Client-side auth
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` - Client-side reCAPTCHA
- `CLAUDE_API_KEY` - AI agent tasks
- `BLACKLEAF_API_KEY` - SMS notifications

### Missing (CRITICAL - Blocking Launch) ⚠️
**CannPay Credentials** (required from customer):
- `CANPAY_APP_KEY` - CannPay integration key
- `CANPAY_API_SECRET` - For HMAC webhook verification
- `CANPAY_INTEGRATOR_ID` - Merchant identifier
- `CANPAY_INTERNAL_VERSION` - API version
- `CANPAY_MODE` - Environment (sandbox/live)

**Monitoring**:
- `SENTRY_DSN` - Error tracking

### Missing (Optional - Customer Provided) 📋
**Stripe** (configured in apphosting.yaml, awaiting keys):
- `STRIPE_SECRET_KEY` - Payment processing (no fallback - fails fast if missing)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

**Google APIs** (optional tools):
- `GOOGLE_SEARCH_API_KEY` - Web search tool
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` - Search engine ID
- `GOOGLE_SHEETS_API_KEY` - Sheets integration
- `SMOKEY_PAY_API_KEY` - Alternative payment (if used)

### Environment Variables (Non-Secret)
Set directly in `apphosting.yaml`:
- `SENDGRID_FROM_EMAIL`
- `SENDGRID_FROM_NAME`
- `CANNMENUS_API_BASE`
- `AUTHNET_ENV` (sandbox/production)
- `BLACKLEAF_BASE_URL`

## Local Development (.env.local)

Required for local dev:
```bash
FIREBASE_SERVICE_ACCOUNT_KEY=<base64_json>
STRIPE_SECRET_KEY=sk_test_xxx
SENDGRID_API_KEY=SG.xxx
CANNMENUS_API_KEY=xxx
```

## Next Steps

1. **P0-SEC-STRIPE-CONFIG**: Add STRIPE_SECRET_KEY to Secret Manager
2. **P0-SEC-CANNPAY-WEBHOOK**: Add CANPAY_WEBHOOK_SECRET
3. **P0-MON-SENTRY**: Add SENTRY_DSN
4. Remove dummy fallbacks from code

---
*Updated by Dev2 @ 2025-11-29*
