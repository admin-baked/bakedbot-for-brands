# Firebase App Hosting Deployment Guide

**Project**: BakedBot for Brands
**Firebase Project**: `studio-567050101-bc6e8`
**GitHub Repository**: `admin-baked/bakedbot-for-brands`
**Branch**: `main`

---

## Quick Deploy (Recommended)

Firebase App Hosting deploys automatically from your GitHub repository. Here's how:

### Option 1: Deploy via Firebase Console (Easiest)

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
   - Click on **App Hosting** in the left sidebar

2. **Connect GitHub Repository** (if not already connected)
   - Click **Get Started** or **Add Backend**
   - Authorize Firebase to access your GitHub account
   - Select repository: `admin-baked/bakedbot-for-brands`
   - Select branch: `main`

3. **Configure Build Settings**
   - Firebase will detect your `apphosting.yaml` automatically
   - Build command: Already configured (`npm install --legacy-peer-deps`)
   - Environment variables: Already configured in `apphosting.yaml`

4. **Deploy**
   - Click **Create Backend** or **Deploy**
   - Firebase will build and deploy your app
   - First deployment takes 5-10 minutes

5. **Get Your URL**
   - After deployment completes, you'll get a URL like:
   - `https://bakedbot-for-brands--main-<hash>.web.app`

### Option 2: Deploy via GitHub Push (Automatic)

Once you've set up App Hosting in the console, every push to `main` automatically deploys:

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Firebase automatically builds and deploys
# Check status at: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
```

---

## Pre-Deployment Checklist

Before deploying, verify:

### 1. Secrets Configuration ✅
All secrets are already configured in Google Secret Manager:

- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY`
- ✅ `BLACKLEAF_API_KEY` (just added)
- ✅ `SENDGRID_API_KEY`
- ✅ `CANNMENUS_API_KEY`
- ✅ `CANPAY_APP_KEY`
- ✅ `CANPAY_API_SECRET`
- ✅ `CANPAY_INTEGRATOR_ID`
- ✅ `SENTRY_DSN`
- ✅ `STRIPE_SECRET_KEY`
- ✅ `AUTHNET_API_LOGIN_ID`
- ✅ `AUTHNET_TRANSACTION_KEY`

Verify all secrets exist:
```bash
# List all secrets
gcloud secrets list --project=studio-567050101-bc6e8
```

### 2. Build Verification ✅

Ensure the build passes locally:

```bash
# Check TypeScript
npm run check:types

# Run full build
npm run build
```

### 3. Environment Variables ✅

Configured in [apphosting.yaml](apphosting.yaml):
- ✅ Firebase credentials
- ✅ Payment providers (CannPay, Stripe, Authorize.Net)
- ✅ Email service (SendGrid)
- ✅ SMS service (Blackleaf)
- ✅ Monitoring (Sentry)
- ✅ APIs (CannMenus)

### 4. Firestore Security Rules ⚠️

**ACTION REQUIRED**: Deploy Firestore rules before first customer transaction

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules --project=studio-567050101-bc6e8
```

Verify rules at:
https://console.firebase.google.com/project/studio-567050101-bc6e8/firestore/rules

---

## Deployment Methods

### Method 1: Firebase Console (GUI)

**Best for**: First-time deployment, visual monitoring

1. Navigate to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
2. Click **Create Backend** or **Add Backend**
3. Follow the setup wizard:
   - Connect GitHub repository
   - Select branch (`main`)
   - Configure build settings (auto-detected from `apphosting.yaml`)
   - Deploy

**Status Monitoring**:
- Build logs: Real-time in console
- Deployment status: Shows progress bar
- Live URL: Provided after successful deployment

### Method 2: GitHub Auto-Deploy

**Best for**: Continuous deployment workflow

**Setup** (one-time):
1. Complete Method 1 to connect GitHub
2. Enable auto-deploy in Firebase Console

**Usage** (ongoing):
```bash
# Every push to main auto-deploys
git push origin main

# Monitor at:
# https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
```

### Method 3: Firebase CLI (Advanced)

**Best for**: CI/CD pipelines, manual control

```bash
# Login to Firebase
firebase login

# Deploy to App Hosting
firebase apphosting:backends:create \
  --project=studio-567050101-bc6e8 \
  --repo=admin-baked/bakedbot-for-brands \
  --branch=main

# Check deployment status
firebase apphosting:backends:list --project=studio-567050101-bc6e8
```

---

## Post-Deployment Verification

### 1. Check Deployment Status

**Firebase Console**:
- Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
- Verify deployment shows "Deployed" status
- Note the live URL

**Via CLI**:
```bash
firebase apphosting:backends:list --project=studio-567050101-bc6e8
```

### 2. Test the Live Site

Visit your deployment URL and verify:

- ✅ Homepage loads
- ✅ Age gate appears
- ✅ Product pages work
- ✅ Chatbot appears and responds
- ✅ Login flows work
- ✅ Onboarding completes without session errors

### 3. Test Critical Features

```bash
# Test checklist:
- [ ] User can create account
- [ ] User can log in
- [ ] Onboarding flow completes
- [ ] Products display correctly
- [ ] Add to cart works
- [ ] Checkout flow initiates
- [ ] Age verification enforced
- [ ] State compliance checked
```

### 4. Monitor Logs

**Application Logs**:
```bash
# View logs in Cloud Logging
gcloud logging read \
  "resource.type=cloud_run_revision" \
  --project=studio-567050101-bc6e8 \
  --limit=50 \
  --format=json
```

**Or in Console**:
- Go to: https://console.cloud.google.com/logs/query?project=studio-567050101-bc6e8
- Filter by: `resource.type="cloud_run_revision"`

### 5. Check Sentry

- Dashboard: https://sentry.io/organizations/bakedbot/projects/
- Verify errors are being tracked
- Check error rates

---

## Environment-Specific Configuration

### Sandbox Mode (Current)

Environment variables in `apphosting.yaml`:
- `CANPAY_MODE=sandbox`
- `CANPAY_ENVIRONMENT=sandbox`
- `AUTHNET_ENV=sandbox`

This is **safe for testing** - no real money transactions.

### Production Mode (Future)

When ready for production:

1. Update secrets in Secret Manager:
```bash
# Update CannPay to production
gcloud secrets versions add CANPAY_APP_KEY \
  --data-file=- \
  --project=studio-567050101-bc6e8

gcloud secrets versions add CANPAY_API_SECRET \
  --data-file=- \
  --project=studio-567050101-bc6e8
```

2. Update `apphosting.yaml`:
```yaml
- variable: CANPAY_MODE
  value: "production"
- variable: CANPAY_ENVIRONMENT
  value: "production"
- variable: AUTHNET_ENV
  value: "production"
```

3. Commit and push to deploy

---

## Rollback Strategy

### Quick Rollback (Console)

1. Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
2. Click on your backend
3. Go to **Rollouts** tab
4. Select a previous version
5. Click **Rollback**

### Rollback via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push -f origin main
```

### Emergency Rollback

If the site is completely broken:

1. Go to Firebase Console → App Hosting
2. Click **Pause** to stop serving traffic
3. Fix the issue locally
4. Test thoroughly
5. Deploy fixed version
6. Click **Resume**

---

## Common Issues & Solutions

### Issue 1: Build Fails with "Cannot find module"

**Cause**: Missing dependencies
**Solution**:
```bash
# Ensure package-lock.json is committed
git add package-lock.json
git commit -m "Add package-lock.json"
git push origin main
```

### Issue 2: Environment Variable Not Found

**Cause**: Secret not in Secret Manager or wrong name
**Solution**:
```bash
# List all secrets
gcloud secrets list --project=studio-567050101-bc6e8

# Check specific secret
gcloud secrets versions access latest \
  --secret=SECRET_NAME \
  --project=studio-567050101-bc6e8
```

### Issue 3: "Unauthorized: No session cookie found"

**Cause**: Session cookie not propagating (should be fixed now)
**Solution**: Already fixed with `window.location.href` navigation

### Issue 4: Build Takes Too Long

**Cause**: Installing dependencies every time
**Solution**: Already optimized with `--legacy-peer-deps`

### Issue 5: Deployment Succeeds but Site Shows Error

**Check**:
1. Application logs in Cloud Logging
2. Sentry error dashboard
3. Browser console for client-side errors
4. Network tab for failed API calls

---

## Monitoring & Alerts

### Set Up Monitoring

1. **Uptime Monitoring**
   - Go to: https://console.cloud.google.com/monitoring/uptime?project=studio-567050101-bc6e8
   - Create uptime check for your App Hosting URL
   - Set alert policy

2. **Error Rate Alerts**
   - Sentry: Configure alert rules
   - Cloud Monitoring: Set error rate thresholds

3. **Performance Monitoring**
   - Enable in Firebase Console
   - Track page load times
   - Monitor API response times

---

## Cost Monitoring

### Firebase App Hosting Pricing

- **Free tier**:
  - 1 backend
  - 360 build hours/month
  - 2 GB storage

- **Paid tier** (if exceeded):
  - $0.10/build hour
  - $0.026/GB storage/month

### Current Usage Estimate

For 1,000 orders/month:
- **Firebase App Hosting**: Free (within limits)
- **Firestore**: ~$5-10/month
- **Cloud Run** (for Next.js): ~$20-30/month
- **SMS (Blackleaf)**: ~$35-60/month
- **Email (SendGrid)**: Free (up to 100/day)
- **Sentry**: Free tier (5K errors/month)

**Total**: ~$60-100/month

Monitor costs at:
https://console.cloud.google.com/billing?project=studio-567050101-bc6e8

---

## Production Launch Checklist

Before launching to customers:

### Critical (P0)
- [ ] Deploy Firestore security rules
- [ ] Verify all secrets in Secret Manager
- [ ] Test complete checkout flow
- [ ] Verify age verification works
- [ ] Test state compliance rules
- [ ] Verify SMS notifications send
- [ ] Test email notifications
- [ ] Enable Sentry monitoring
- [ ] Set up uptime monitoring
- [ ] Test emergency rollback procedure

### Important (P1)
- [ ] Switch to production payment credentials
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Configure CDN for assets
- [ ] Enable Cloud Armor (DDoS protection)
- [ ] Set up automated backups
- [ ] Create runbook for common issues

### Nice to Have (P2)
- [ ] Set up staging environment
- [ ] Configure A/B testing
- [ ] Enable advanced analytics
- [ ] Set up load testing
- [ ] Configure auto-scaling

---

## Custom Domain Setup

1. **Add Domain in Firebase Console**
   - Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/hosting/main
   - Click **Add custom domain**
   - Enter: `bakedbot.ai` or `app.bakedbot.ai`

2. **Configure DNS**
   - Add TXT record for verification
   - Add A/AAAA records for routing
   - Wait for propagation (up to 24 hours)

3. **SSL Certificate**
   - Firebase automatically provisions SSL
   - Force HTTPS redirect enabled by default

---

## Support & Resources

### Documentation
- Firebase App Hosting: https://firebase.google.com/docs/app-hosting
- Next.js on Firebase: https://firebase.google.com/docs/app-hosting/frameworks/nextjs
- Secret Manager: https://cloud.google.com/secret-manager/docs

### Dashboards
- Firebase Console: https://console.firebase.google.com/project/studio-567050101-bc6e8
- Google Cloud Console: https://console.cloud.google.com/?project=studio-567050101-bc6e8
- Sentry: https://sentry.io
- GitHub Actions: https://github.com/admin-baked/bakedbot-for-brands/actions

### Getting Help
- Firebase Support: https://firebase.google.com/support
- Community: https://stackoverflow.com/questions/tagged/firebase
- GitHub Issues: https://github.com/admin-baked/bakedbot-for-brands/issues

---

## Quick Commands Reference

```bash
# List backends
firebase apphosting:backends:list --project=studio-567050101-bc6e8

# View logs
gcloud logging read "resource.type=cloud_run_revision" \
  --project=studio-567050101-bc6e8 --limit=50

# List secrets
gcloud secrets list --project=studio-567050101-bc6e8

# Deploy Firestore rules
firebase deploy --only firestore:rules --project=studio-567050101-bc6e8

# Check build status
npm run build

# Run tests
npm test

# Check TypeScript
npm run check:types
```

---

**Last Updated**: November 30, 2025
**Version**: 1.0
**Status**: Ready for Deployment
