# Manual Setup Required - CEO Action Items

**Date:** November 29, 2025
**Status:** 🚨 BLOCKING PRODUCTION DEPLOYMENT
**Estimated Time:** 30-45 minutes

---

## Overview

Dev 2 (Infrastructure) encountered authentication/permission blockers that require **CEO/Owner-level access** to resolve. These are one-time setup tasks that unblock the entire development team.

---

## TASK 1: Create GCP Secrets (CRITICAL - 15 minutes)

### Why This Matters:
Without these secrets, the app cannot:
- Process payments (CannPay/Stripe)
- Track errors in production (Sentry)
- Deploy to Firebase App Hosting

### Steps:

1. **Open Google Cloud Console:**
   - Go to: https://console.cloud.google.com/security/secret-manager
   - Select project: `bakedbot-ai` (or your Firebase project ID)

2. **Create CannPay Secrets** (values in `docs/CANPAY_CREDENTIALS.md`):

   **Secret 1: CANPAY_APP_KEY**
   - Click "CREATE SECRET"
   - Name: `CANPAY_APP_KEY`
   - Secret value: `[Get from docs/CANPAY_CREDENTIALS.md]`
   - Click "CREATE SECRET"

   **Secret 2: CANPAY_API_SECRET**
   - Name: `CANPAY_API_SECRET`
   - Secret value: `[Get from docs/CANPAY_CREDENTIALS.md]`
   - Click "CREATE SECRET"

   **Secret 3: CANPAY_INTEGRATOR_ID**
   - Name: `CANPAY_INTEGRATOR_ID`
   - Secret value: `[Get from docs/CANPAY_CREDENTIALS.md]`
   - Click "CREATE SECRET"

   **Secret 4: CANPAY_INTERNAL_VERSION**
   - Name: `CANPAY_INTERNAL_VERSION`
   - Secret value: `[Get from docs/CANPAY_CREDENTIALS.md]`
   - Click "CREATE SECRET"

3. **Create Stripe Secrets** (if using Stripe - OPTIONAL):

   **Secret 5: STRIPE_SECRET_KEY**
   - Name: `STRIPE_SECRET_KEY`
   - Secret value: `sk_live_...` (from Stripe Dashboard)
   - Click "CREATE SECRET"

   **Secret 6: STRIPE_WEBHOOK_SECRET**
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Secret value: `whsec_...` (from Stripe Dashboard → Webhooks)
   - Click "CREATE SECRET"

4. **Create Sentry Secret:**

   **Secret 7: SENTRY_DSN**
   - Name: `SENTRY_DSN`
   - Secret value: `https://...@o...ingest.sentry.io/...` (from Sentry.io project settings)
   - Click "CREATE SECRET"

### Verification:
After creating all secrets, run:
```bash
gcloud secrets list
```

You should see all 7 secrets listed (or 5 if skipping Stripe).

---

## TASK 2: Deploy Firestore Security Rules (CRITICAL - 5 minutes)

### Why This Matters:
Without deployed security rules, **the database is wide open** to unauthorized access. This is a **critical security vulnerability**.

### Steps:

1. **Ensure Firebase CLI is authenticated:**
   ```bash
   firebase login
   ```

2. **Deploy Firestore rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Verify deployment:**
   - Go to: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/rules
   - Confirm the rules match `firestore.rules` in the repo
   - Look for collections: `brands`, `customers`, `analytics_events`, `chatSessions`, `playbooks`, etc.

### Expected Output:
```
✔  Deploy complete!
Firestore Rules:
  Released rules to firestore.
```

---

## TASK 3: Grant Service Account Permissions (OPTIONAL - 10 minutes)

### Why This Matters:
This allows Dev 2 to automate future secret/deployment tasks without needing CEO intervention.

### Steps:

1. **Find the service account email:**
   ```bash
   gcloud iam service-accounts list
   ```
   Look for: `firebase-adminsdk-...@bakedbot-ai.iam.gserviceaccount.com`

2. **Grant Secret Manager permissions:**
   ```bash
   gcloud projects add-iam-policy-binding bakedbot-ai \
     --member="serviceAccount:firebase-adminsdk-...@bakedbot-ai.iam.gserviceaccount.com" \
     --role="roles/secretmanager.admin"
   ```

3. **Grant Firestore deployment permissions:**
   ```bash
   gcloud projects add-iam-policy-binding bakedbot-ai \
     --member="serviceAccount:firebase-adminsdk-...@bakedbot-ai.iam.gserviceaccount.com" \
     --role="roles/firebase.admin"
   ```

---

## TASK 4: Verify App Hosting Build (OPTIONAL - 5 minutes)

### Why This Matters:
Confirms the production site can build and deploy successfully.

### Steps:

1. **Trigger a manual build:**
   - Go to: https://console.firebase.google.com/project/YOUR_PROJECT/apphosting
   - Find backend: `bakedbot-for-brands`
   - Click "Deploy" → "Deploy from branch" → Select `main`

2. **Monitor build logs:**
   - Wait 3-5 minutes for build to complete
   - Check for errors in build logs
   - Verify site loads at: https://bakedbot.ai

### Success Criteria:
- Build completes without errors
- Site loads with no 500 errors
- Can navigate to `/demo` route

---

## Completion Checklist

Once you've completed the tasks above, check off:

- [ ] All 7 GCP secrets created (or 5 if skipping Stripe)
- [ ] Firestore rules deployed successfully
- [ ] Service account permissions granted (optional)
- [ ] App Hosting build verified (optional)
- [ ] Notified dev team in Slack/email that infrastructure is ready

---

## What Happens Next?

After you complete these tasks:

1. **Dev 2** can verify all secrets are accessible
2. **Dev 1** can integrate Sentry error tracking
3. **Dev 3** can run end-to-end tests against production Firebase
4. **Dev 4** can test CannPay payment flows
5. **Production deployment unblocked!** 🚀

---

## Questions or Issues?

If you encounter any errors:

1. Take a screenshot of the error message
2. Share in dev team chat with context
3. Dev 2 can troubleshoot specific permission issues

**Estimated total time:** 30-45 minutes (mostly waiting for builds)

---

*Generated by Dev 1 @ November 29, 2025*
*This is a ONE-TIME setup. Future deployments will be automated.*
