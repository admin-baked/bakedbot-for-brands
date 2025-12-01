# Firebase App Hosting Setup - Step by Step

**Status**: ⚠️ Not Yet Deployed
**Next Action**: Follow steps below to deploy

---

## Why This Guide?

We've **disabled GitHub Actions** in favor of **Firebase App Hosting** because:
- ✅ Simpler - no GitHub secrets needed
- ✅ Automatic environment variable management via Google Secret Manager
- ✅ Built-in CI/CD with automatic deployments
- ✅ Better Firebase integration
- ✅ Easier rollbacks

---

## Current Status

| Component | Status |
|-----------|--------|
| Code | ✅ Ready in GitHub |
| Secrets | ✅ All configured in Secret Manager |
| Build Config | ✅ `apphosting.yaml` ready |
| Firebase Backend | ❌ **Not created yet** |
| Live Deployment | ❌ **Not live** |

---

## Setup Instructions (5 Minutes)

### Step 1: Open Firebase App Hosting Console

**Click this link** to go directly to your Firebase App Hosting page:

👉 **https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting**

---

### Step 2: Create Your First Backend

1. **Click "Get Started"** (if first time) or **"Create Backend"**

2. **Choose GitHub repository**:
   - Click "Connect to GitHub"
   - Authorize Firebase to access your GitHub account
   - Select repository: **`admin-baked/bakedbot-for-brands`**
   - Select branch: **`main`**
   - Click "Next"

3. **Configure build settings**:
   - Firebase will auto-detect `apphosting.yaml`
   - Root directory: `/` (leave default)
   - Build configuration file: `apphosting.yaml` ✅ Detected
   - Click "Next"

4. **Review and create**:
   - Backend name: `bakedbot-main` (or your choice)
   - Region: `us-central1` (recommended)
   - Click "Create Backend"

---

### Step 3: Wait for First Build

Firebase will now:
- 📦 Clone your GitHub repository
- 🔧 Run `npm install --legacy-peer-deps`
- 🏗️ Run `npm run build`
- 🔐 Load all secrets from Secret Manager
- 🚀 Deploy to a live URL

**Time**: 5-10 minutes for first build

**Monitor progress**:
- Build logs appear in real-time
- Status shows: Building → Deploying → Deployed

---

### Step 4: Get Your Live URL

Once deployment completes, you'll see:

```
✅ Deployment successful!
🌐 Live URL: https://bakedbot-for-brands--main-<hash>.web.app
```

**Test your site**:
- Visit the URL
- Verify homepage loads
- Test user login
- Try onboarding flow
- Add products to cart

---

## What Happens After Setup?

### Automatic Deployments

Every time you push to `main` branch:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Firebase automatically:
1. Detects the push
2. Builds your app
3. Deploys to production
4. Updates your live URL

**No manual action needed!**

---

## Monitoring Your Deployments

### Build Status

Check build status at:
https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting

You'll see:
- ✅ Green checkmark = Successful deployment
- ⏳ Yellow spinner = Building
- ❌ Red X = Build failed (check logs)

### View Logs

**Build Logs**: Click on any build to see detailed logs

**Application Logs**: Go to Cloud Logging
```bash
# Or via CLI
gcloud logging read "resource.type=cloud_run_revision" \
  --project=studio-567050101-bc6e8 \
  --limit=50
```

---

## Environment Variables (Already Configured)

All environment variables are managed via `apphosting.yaml` and Google Secret Manager.

**Secrets loaded automatically**:
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY`
- ✅ `BLACKLEAF_API_KEY` (just added)
- ✅ `SENDGRID_API_KEY`
- ✅ `CANNMENUS_API_KEY`
- ✅ `CANPAY_APP_KEY`, `CANPAY_API_SECRET`, `CANPAY_INTEGRATOR_ID`
- ✅ `SENTRY_DSN`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `AUTHNET_API_LOGIN_ID`, `AUTHNET_TRANSACTION_KEY`

**Public variables set in `apphosting.yaml`**:
- `CANPAY_MODE=sandbox`
- `AUTHNET_ENV=sandbox`
- `BLACKLEAF_BASE_URL=https://api.blackleaf.io`
- etc.

**No GitHub secrets needed!** ✅

---

## Troubleshooting

### Build Fails with "Cannot find module"

**Cause**: Missing dependencies or package-lock.json issues

**Fix**:
```bash
# Regenerate package-lock.json
rm package-lock.json
npm install --legacy-peer-deps
git add package-lock.json
git commit -m "fix: Regenerate package-lock.json"
git push origin main
```

### Build Fails with "Secret not found"

**Cause**: Secret missing in Secret Manager

**Check**:
```bash
# List all secrets
gcloud secrets list --project=studio-567050101-bc6e8

# Verify specific secret
gcloud secrets versions access latest \
  --secret=SECRET_NAME \
  --project=studio-567050101-bc6e8
```

### Build Succeeds but Site Shows Error

**Check**:
1. **Application logs** in Cloud Logging
2. **Sentry dashboard** for errors
3. **Browser console** for client-side errors
4. **Network tab** for failed API calls

### "No session cookie found" Error

**Status**: ✅ Already fixed with `window.location.href` navigation

If you still see this:
1. Clear browser cookies
2. Try in incognito mode
3. Check application logs

---

## Post-Deployment Checklist

After your first successful deployment:

### Critical (Do Immediately)

- [ ] **Deploy Firestore Rules**
  ```bash
  firebase deploy --only firestore:rules --project=studio-567050101-bc6e8
  ```

- [ ] **Test User Flows**
  - [ ] User can sign up
  - [ ] User can log in
  - [ ] Onboarding completes
  - [ ] Products display
  - [ ] Cart works
  - [ ] Checkout initiates

- [ ] **Verify Integrations**
  - [ ] Sentry tracking errors
  - [ ] Blackleaf SMS ready (test with demo number)
  - [ ] Email service configured

### Important (Within 24 Hours)

- [ ] Set up uptime monitoring
- [ ] Configure custom domain (if ready)
- [ ] Enable Cloud Armor (DDoS protection)
- [ ] Set up automated Firestore backups
- [ ] Review cost estimates

### Before Customer Launch

- [ ] Switch to production payment credentials
- [ ] Complete legal review of compliance rules
- [ ] Test all 51 state compliance rules
- [ ] Verify age verification works
- [ ] Test emergency rollback procedure
- [ ] Set up on-call alerts

---

## Custom Domain Setup (Optional)

Once your site is live, you can add a custom domain:

1. **Go to Firebase Hosting**:
   https://console.firebase.google.com/project/studio-567050101-bc6e8/hosting/main

2. **Click "Add custom domain"**

3. **Enter your domain**:
   - `bakedbot.ai` or
   - `app.bakedbot.ai`

4. **Follow DNS configuration**:
   - Add TXT record for verification
   - Add A/AAAA records for routing

5. **Wait for SSL provisioning**:
   - Firebase auto-provisions SSL certificate
   - Takes 15 minutes to 24 hours

---

## Rollback Procedure

If you need to rollback a bad deployment:

### Quick Rollback (Console)

1. Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
2. Click on your backend
3. Go to **"Rollouts"** tab
4. Select previous working version
5. Click **"Rollback"**

### Rollback via Git

```bash
# Revert last commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <good-commit-hash>
git push -f origin main
```

---

## Cost Estimate

**Firebase App Hosting** (current usage):
- Free tier: 1 backend, 360 build hours/month
- Expected: **$0/month** (within free tier)

**Total Monthly Cost** (estimated):
- Firebase App Hosting: $0
- Firestore: $5-10
- Cloud Run (Next.js): $20-30
- Blackleaf SMS: $35-60
- SendGrid Email: $0 (free tier)
- Sentry: $0 (free tier)

**Total: ~$60-100/month**

Monitor at: https://console.cloud.google.com/billing?project=studio-567050101-bc6e8

---

## Support Resources

### Documentation
- **Firebase App Hosting**: https://firebase.google.com/docs/app-hosting
- **Next.js on Firebase**: https://firebase.google.com/docs/app-hosting/frameworks/nextjs

### Dashboards
- **Firebase Console**: https://console.firebase.google.com/project/studio-567050101-bc6e8
- **App Hosting**: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
- **Cloud Logging**: https://console.cloud.google.com/logs/query?project=studio-567050101-bc6e8
- **Sentry**: https://sentry.io

### Need Help?
- Check build logs in Firebase Console
- Review [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed troubleshooting
- Contact Firebase Support: https://firebase.google.com/support

---

## Quick Reference

**Your Configuration**:
- ✅ Project: `studio-567050101-bc6e8`
- ✅ Repository: `admin-baked/bakedbot-for-brands`
- ✅ Branch: `main`
- ✅ Build config: `apphosting.yaml`
- ✅ All secrets in Secret Manager

**Setup URL**: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting

**Current Status**: ⚠️ Backend not created yet - follow Step 1 above

---

## Next Steps

1. **Click the setup URL above** 👆
2. **Follow Steps 1-4** to create your backend
3. **Wait for first build** (5-10 minutes)
4. **Get your live URL**
5. **Deploy Firestore rules**
6. **Test your site**
7. **🎉 You're live!**

---

**Last Updated**: November 30, 2025
**Status**: Ready for Setup
**Estimated Setup Time**: 5 minutes (+ 5-10 min build time)
