# Production Environment Setup Guide

## Required Environment Variables

### Firebase (Already Configured)
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Communications (REQUIRED)
```bash
# SendGrid for Email
SENDGRID_API_KEY=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
SENDGRID_FROM_EMAIL=orders@bakedbot.ai

# BlackLeaf.io for SMS
BLACKLEAF_BASE_URL=https://api.blackleaf.io
BLACKLEAF_API_KEY=T1E2U2lZNWxzY2JsN0hWU1daeV95WA==
```

### Payments (User-Provided)
```bash
# Stripe - Each brand provides their own keys
# These should be stored per-brand in Firestore, not as global env vars
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key  # Optional: for platform fees
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
```

**Note:** Brands connect their own Stripe accounts. Platform-level Stripe keys are only needed if you're taking platform fees.

### CannMenus (Already Configured)
```bash
CANNMENUS_API_BASE=https://api.cannmenus.com
CANNMENUS_API_KEY=your-cannmenus-api-key
CANNMENUS_40TONS_BRAND_ID=10982
NEXT_PUBLIC_BAYSIDE_RETAILER_ID=1
```

## Setup Instructions

### Option 1: Firebase App Hosting (Recommended)
1. Go to Firebase Console → App Hosting → Settings
2. Add each secret using Google Cloud Secret Manager:
   ```bash
   gcloud secrets create SENDGRID_API_KEY --data-file=-
   # Paste the key, then Ctrl+D
   ```
3. Grant access to App Hosting service account

### Option 2: Local Development
1. Copy `.env.example` to `.env.local`
2. Fill in all values
3. Never commit `.env.local` to git

## Verification Checklist
- [ ] SendGrid API key set and tested
- [ ] BlackLeaf API key set and tested
- [ ] Stripe secret key set
- [ ] Stripe webhook secret configured
- [ ] All keys added to Firebase Secret Manager
- [ ] Service account has access to secrets

## Firestore Backup Setup

### Enable Automated Backups
```bash
# Using gcloud CLI (specify database name)
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=7d

# If you get an error, try:
gcloud firestore backups schedules create \
  --database=default \
  --recurrence=daily \
  --retention=7d
```

### Verify Backups
```bash
gcloud firestore backups schedules list
```

## Monitoring Alerts

### Set up in Firebase Console
1. Go to Firebase Console → Performance → Alerts
2. Create alerts for:
   - Error rate > 5% (5 minutes)
   - P95 latency > 2s (10 minutes)
   - Crash-free users < 99% (1 hour)

### Sentry Alerts (Already configured)
- Error spikes
- New issues
- Performance degradation

## Security Headers Verification

Already configured in `next.config.js`:
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: origin-when-cross-origin
- ✅ CORS for API routes

## Pre-Launch Checklist
- [ ] All environment variables set in production
- [ ] Firestore backups enabled (daily, 7-day retention)
- [ ] Monitoring alerts configured
- [ ] E2E tests passing
- [ ] Rate limiting tested
- [ ] ToS and Privacy Policy reviewed by legal
- [ ] Age gate tested
- [ ] Purchase limits tested
- [ ] Email notifications tested
- [ ] SMS notifications tested
