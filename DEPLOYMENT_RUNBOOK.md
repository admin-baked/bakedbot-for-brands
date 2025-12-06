# Production Deployment Runbook: Security Fixes

**Version:** 1.0
**Date:** December 6, 2025
**Branch:** `fix/deploy-clean` (recommended) or `main` (requires secret cleanup)

---

## 🎯 Executive Summary

This runbook guides deployment of comprehensive security fixes to production. All critical vulnerabilities have been addressed and code has been verified with successful builds.

**Deployment Status:** ✅ READY FOR PRODUCTION

---

## 📋 Pre-Deployment Checklist

### ✅ Completed Items

- [x] All security fixes implemented and tested
- [x] Type checking passed (`npm run check:types`)
- [x] Production build successful (87 routes compiled)
- [x] Code pushed to GitHub (`fix/deploy-clean` branch)
- [x] reCAPTCHA configuration verified in `apphosting.yaml`
- [x] No breaking changes to existing APIs

### ⚠️ Pre-Deployment Requirements

- [ ] **CRITICAL:** Ensure `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` secret exists in Google Secret Manager
- [ ] Verify Firebase project ID: `studio-567050101-bc6e8`
- [ ] Confirm Firebase App Hosting backend is configured
- [ ] Review security headers in browser DevTools (post-deploy)

---

## 🔒 Security Improvements Deployed

### Critical Fixes (Production Blockers - RESOLVED)

| Issue | Before | After | File(s) |
|-------|--------|-------|---------|
| **CORS** | Allow-all (`*`) | Strict whitelist | `next.config.js`, `src/lib/cors.ts`, `src/middleware.ts` |
| **App Check** | Disabled in prod | Enabled + verified | `src/firebase/client-provider.tsx`, `src/server/middleware/app-check.ts` |
| **CSRF** | None | Double Submit Cookie | `src/lib/csrf.ts`, `src/server/middleware/csrf.ts`, `src/app/api/csrf/route.ts`, `src/hooks/use-csrf.ts` |

### High Priority Improvements

| Feature | Implementation | Benefits |
|---------|----------------|----------|
| **Input Validation** | Zod middleware | Type-safe API inputs, prevents injection |
| **Error Handling** | Standardized AppError | Consistent responses, better logging |
| **Type Safety** | Replaced 15+ `any` types | Compile-time safety, fewer runtime errors |

---

## 🚀 Deployment Options

### **Option A: Deploy from `fix/deploy-clean` Branch (RECOMMENDED)**

This avoids the secret in main branch history and is the cleanest path.

```bash
# 1. Configure Firebase to deploy from fix/deploy-clean branch
firebase apphosting:backends:update --branch fix/deploy-clean

# 2. Trigger deployment
firebase deploy --only hosting

# OR let Firebase auto-deploy on push (if configured)
```

**Why this option?**
- Clean commit history without secrets
- Already pushed and verified
- Avoids GitHub push protection issues

---

### **Option B: Clean Main Branch and Deploy**

If you need to deploy from `main` branch:

```bash
# 1. Resolve the secret in commit history
# Visit: https://github.com/admin-baked/bakedbot-for-brands/security/secret-scanning/unblock-secret/36T7hUlAwDSbjD4KXJuF2Isa24j
# Click "Allow secret" (NOT recommended - only for testing)

# 2. Or use BFG Repo-Cleaner to remove secret from history
# Download from: https://reco.bfg-repo-cleaner.com/
java -jar bfg.jar --delete-files service-account.json

# 3. Force push cleaned main
git push origin main --force

# 4. Deploy
firebase deploy --only hosting
```

**⚠️ WARNING:** Force pushing to main can disrupt team members. Coordinate first.

---

### **Option C: Create Pull Request (Safest for Teams)**

```bash
# On GitHub, create PR from fix/deploy-clean -> main
# Title: "security: comprehensive production security fixes"
# Reviewers: Request approval from tech lead
# Merge strategy: Squash and merge (clean history)
```

**Advantages:**
- Team review process
- Clean merge commit
- No force push needed

---

## 🔧 Environment Variables Verification

### Required Secrets in Google Secret Manager

Run this command to verify all secrets exist:

```bash
gcloud secrets list --project=studio-567050101-bc6e8 --format="table(name)"
```

**Critical for App Check:**
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY  ← Must exist!
RECAPTCHA_SECRET_KEY             ← Must exist!
```

**Already configured in `apphosting.yaml`:**
- ✅ Lines 25-28: Both reCAPTCHA keys referenced
- ✅ Line 13: Firebase service account key
- ✅ Lines 84-93: Sentry DSN for monitoring

### If reCAPTCHA keys are missing:

1. **Create reCAPTCHA v3 Site:**
   - Visit: https://www.google.com/recaptcha/admin/create
   - Type: reCAPTCHA v3
   - Domains: `bakedbot.ai`, `app.bakedbot.ai`
   - Copy Site Key and Secret Key

2. **Add to Secret Manager:**
   ```bash
   # Site key (public)
   echo -n "YOUR_SITE_KEY" | gcloud secrets create NEXT_PUBLIC_RECAPTCHA_SITE_KEY \
     --data-file=- --project=studio-567050101-bc6e8

   # Secret key (server-side)
   echo -n "YOUR_SECRET_KEY" | gcloud secrets create RECAPTCHA_SECRET_KEY \
     --data-file=- --project=studio-567050101-bc6e8
   ```

3. **Grant access to App Hosting service account:**
   ```bash
   # Find service account
   gcloud iam service-accounts list --project=studio-567050101-bc6e8 --filter="firebase OR apphosting"

   # Grant access (replace with actual service account)
   gcloud secrets add-iam-policy-binding NEXT_PUBLIC_RECAPTCHA_SITE_KEY \
     --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
     --role="roles/secretmanager.secretAccessor" \
     --project=studio-567050101-bc6e8

   gcloud secrets add-iam-policy-binding RECAPTCHA_SECRET_KEY \
     --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
     --role="roles/secretmanager.secretAccessor" \
     --project=studio-567050101-bc6e8
   ```

---

## 📊 Deployment Steps (Detailed)

### Step 1: Pre-Deployment Verification

```bash
# Ensure you're on the correct branch
git checkout fix/deploy-clean

# Verify build passes
npm run build

# Check for uncommitted changes
git status

# Verify remote is up to date
git fetch origin
git diff origin/fix/deploy-clean  # Should show no differences
```

### Step 2: Firebase Deployment

```bash
# Login to Firebase (if needed)
firebase login

# Select project
firebase use studio-567050101-bc6e8

# Preview what will be deployed
firebase deploy --only hosting --dry-run

# Deploy to production
firebase deploy --only hosting

# Monitor deployment
# Visit: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
```

### Step 3: Post-Deployment Verification

#### A. Health Check
```bash
# Test health endpoint
curl https://bakedbot.ai/health

# Expected: {"status":"ok","timestamp":"..."}
```

#### B. Security Feature Verification

**1. CORS Test:**
```bash
# From unauthorized domain (should fail)
curl -H "Origin: https://evil.com" \
     -X POST https://bakedbot.ai/api/csrf

# Expected: 403 Forbidden (or CORS error)
```

**2. App Check Test:**
- Open browser DevTools → Console
- Visit: https://bakedbot.ai
- Look for: `"App Check initialized successfully"`
- **If missing:** Check `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` secret

**3. CSRF Test:**
```bash
# Fetch CSRF token
curl https://bakedbot.ai/api/csrf

# Response: {"csrfToken":"..."}

# Try POST without token (should fail in prod)
curl -X POST https://bakedbot.ai/api/some-protected-route \
     -H "Content-Type: application/json" \
     -d '{"test":"data"}'

# Expected: {"error":"Invalid or missing CSRF token","code":"CSRF_VALIDATION_FAILED"}
```

**4. HTTPS & Security Headers:**
```bash
curl -I https://bakedbot.ai | grep -E "X-Frame|X-Content|Strict-Transport"

# Should show:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Strict-Transport-Security: max-age=...
```

#### C. Functional Verification

Test critical user flows:

1. **Authentication:**
   - [ ] Brand login works
   - [ ] Customer registration works
   - [ ] Password reset works

2. **Dashboard:**
   - [ ] Products page loads
   - [ ] Analytics page loads
   - [ ] No console errors

3. **Checkout:**
   - [ ] Add to cart works
   - [ ] Payment form renders
   - [ ] Test transaction (use test card)

4. **API Endpoints:**
   - [ ] `/api/chat` responds
   - [ ] `/api/recommendations/personalized` works
   - [ ] `/api/agents/dispatch` accepts events

---

## 🔍 Monitoring Post-Deployment

### Google Cloud Logging

```bash
# View recent logs
gcloud logging read "resource.type=cloud_run_revision" \
  --project=studio-567050101-bc6e8 \
  --limit=50 \
  --format=json

# Filter for errors
gcloud logging read "severity>=ERROR" \
  --project=studio-567050101-bc6e8 \
  --limit=20
```

**Watch for:**
- ❌ `"NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set"` → Missing secret
- ❌ `"App Check verification failed"` → Client/server mismatch
- ❌ `"CSRF token validation failed"` → Normal for unauthorized requests
- ✅ `"App Check initialized successfully"` → Working correctly

### Sentry Error Tracking

1. Visit: https://sentry.io/organizations/YOUR_ORG/issues/
2. Filter by: `environment:production`
3. Look for new error patterns
4. Set up alerts for:
   - App Check initialization failures
   - CSRF validation errors (high volume)
   - API 500 errors

### Firebase Console

1. Visit: https://console.firebase.google.com/project/studio-567050101-bc6e8
2. Check:
   - **App Hosting** → Deployments → Success status
   - **Authentication** → Users → Sign-ins working
   - **Firestore** → Usage → No errors
   - **Functions** → Logs → Agent dispatch working

---

## 🚨 Rollback Plan

If issues are detected post-deployment:

### Quick Rollback (5 minutes)

```bash
# Option 1: Rollback via Firebase Console
# 1. Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
# 2. Click on backend name
# 3. Navigate to "Rollouts" tab
# 4. Click "Rollback" on previous deployment

# Option 2: Redeploy previous commit
git checkout <PREVIOUS_COMMIT_HASH>
firebase deploy --only hosting --force
```

### Disable Specific Features

If only one security feature is problematic:

**Disable CSRF (emergency only):**
```typescript
// src/server/middleware/csrf.ts
export async function validateCsrf(request: NextRequest): Promise<boolean> {
  return true; // TEMP: Bypass CSRF validation
}
```

**Disable App Check (emergency only):**
```typescript
// src/firebase/client-provider.tsx
// Comment out lines 41-44 (initializeAppCheck call)
```

**Note:** These are emergency measures only. Fix root cause ASAP.

---

## 📈 Success Metrics

### Immediate (First 24 hours)

- [ ] Zero App Check initialization errors in logs
- [ ] CORS rejections only from known unauthorized origins
- [ ] CSRF token generation success rate > 99%
- [ ] No increase in 500 errors
- [ ] Authentication flow success rate maintained

### Week 1

- [ ] App Check verification rate > 95%
- [ ] Zero security incidents related to CORS/CSRF
- [ ] Bot traffic reduced (App Check working)
- [ ] Error rate below 0.5%

### Month 1

- [ ] Security audit passes
- [ ] No secret leaks detected
- [ ] Type safety preventing bugs (fewer runtime errors)
- [ ] Input validation catching malformed requests

---

## 🛠️ Troubleshooting

### Issue: "App Check failed to initialize"

**Symptoms:**
- Browser console shows initialization error
- No `X-Firebase-AppCheck` header in requests

**Resolution:**
1. Check `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` exists:
   ```bash
   gcloud secrets describe NEXT_PUBLIC_RECAPTCHA_SITE_KEY --project=studio-567050101-bc6e8
   ```
2. Verify reCAPTCHA console shows domain: https://www.google.com/recaptcha/admin
3. Check browser console for specific error message
4. Ensure `apphosting.yaml` lines 27-28 reference the secret

---

### Issue: "CORS error from bakedbot.ai"

**Symptoms:**
- Legitimate requests blocked
- Browser console shows CORS error

**Resolution:**
1. Check `src/lib/cors.ts` ALLOWED_ORIGINS includes your domain
2. Verify middleware is not rejecting valid origins
3. Add domain to whitelist if needed:
   ```typescript
   // src/lib/cors.ts
   export const ALLOWED_ORIGINS = [
     'https://bakedbot.ai',
     'https://www.bakedbot.ai',
     'https://your-new-domain.com', // Add here
   ];
   ```

---

### Issue: "CSRF token validation failed" (high volume)

**Symptoms:**
- Many legitimate POST requests failing
- Users reporting form submission errors

**Resolution:**
1. Check `/api/csrf` endpoint is accessible
2. Verify client is calling `fetchWithCsrf()` or including token
3. Check cookie settings (HttpOnly, Secure, SameSite)
4. Temporary workaround (dev only):
   ```typescript
   // src/server/middleware/csrf.ts line 51
   if (process.env.NODE_ENV === 'development' || process.env.DISABLE_CSRF === 'true') {
   ```

---

### Issue: Build fails on Firebase

**Symptoms:**
- Deployment stuck or fails
- Error about missing dependencies

**Resolution:**
1. Check build logs in Firebase console
2. Verify `package-lock.json` is committed and in sync
3. Ensure `apphosting.yaml` has `--legacy-peer-deps` flag
4. Try rebuilding locally:
   ```bash
   rm -rf node_modules package-lock.json
   npm install --legacy-peer-deps
   npm run build
   git add package-lock.json
   git commit -m "chore: regenerate lock file"
   git push
   ```

---

## 📞 Support Contacts

**Deployment Issues:**
- Firebase Support: https://firebase.google.com/support
- GitHub Actions: Check `.github/workflows/` if CI/CD configured

**Security Concerns:**
- Review `DEPLOYMENT_RUNBOOK.md` (this file)
- Check Sentry alerts
- Contact tech lead

**Emergency Rollback:**
- Use Firebase Console rollback (fastest)
- Document reason in incident report

---

## 📝 Change Log

### v1.0 - December 6, 2025
- Initial deployment runbook
- Security fixes for CORS, App Check, CSRF
- Input validation and error handling improvements
- Type safety enhancements

---

## ✅ Deployment Sign-Off

**Before marking complete, verify:**

- [ ] Code deployed to production
- [ ] Health check endpoint returns 200
- [ ] App Check initialization confirmed in browser console
- [ ] CORS working for authorized domains
- [ ] CSRF tokens being generated and validated
- [ ] No spike in error rates
- [ ] Monitoring dashboards show normal metrics
- [ ] Team notified of deployment

**Deployed by:** ________________
**Date:** ________________
**Commit:** ________________
**Notes:** ________________

---

**Last Updated:** December 6, 2025
**Maintained by:** DevOps Team
**Review Cadence:** After each major deployment
