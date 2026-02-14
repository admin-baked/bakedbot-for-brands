# Multi-App Deployment Guide

**Date**: February 14, 2026
**Project**: BakedBot Multi-App Architecture
**Firebase Project**: studio-567050101-bc6e8

---

## 🎯 Overview

This guide walks through deploying the new multi-app architecture consisting of 5 specialized apps:

1. **bakedbot-for-brands** (Core) - Main dashboard, auth, agent chat
2. **bakedbot-magnets** (Lead Magnets) - Academy, Vibe Studio, Training
3. **bakedbot-seo** (SEO) - Location/zip pages with ISR
4. **bakedbot-operations** (Operations) - CEO Dashboard
5. **bakedbot-shop** (E-commerce) - Checkout, menu, products

---

## 📊 Architecture Benefits

### Before (Monolith)
- **Pages**: 201
- **Memory**: 30GB → OOM failures
- **Build Time**: 29+ minutes → FAILED
- **Dependencies**: 140+ packages

### After (Multi-App)
- **Total Pages**: 200+ (distributed)
- **Max Memory**: 12GB per app
- **Expected Build**: 8-10 min per app
- **Dependencies**: Minimized per app

---

## 🚀 Deployment Steps

### Step 1: Core App (Already Deployed)

✅ **Status**: Deployed - build triggered automatically

```
Backend: bakedbot-prod
GitHub: https://github.com/admin-baked/BakedBot-for-Brands
Pages: 55 (reduced from 201)
Memory: 12GB (reduced from 30GB)
Expected Build: 8-10 minutes
```

**Monitor**: Firebase Console → App Hosting → bakedbot-prod

### Step 2: SEO App (New)

**GitHub**: https://github.com/admin-baked/bakedbot-seo

**Firebase Console Steps**:
1. Go to [Firebase Console](https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting)
2. Click "Add Backend"
3. Backend settings:
   - **Name**: `bakedbot-seo`
   - **Repository**: `admin-baked/bakedbot-seo`
   - **Branch**: `master`
   - **Root directory**: `/`
4. Click "Next" → "Create Backend"
5. Wait for initial build (~5-8 minutes)

**Expected Results**:
- Build memory: 8GB
- Build time: 5-8 minutes
- Pages: Infinite (ISR enabled)
- URL: `https://bakedbot-seo--studio-567050101-bc6e8.us-central1.hosted.app`

**Verify**:
```bash
curl https://bakedbot-seo--studio-567050101-bc6e8.us-central1.hosted.app/local/10001
# Should return NYC location page
```

### Step 3: Operations App (New)

**GitHub**: https://github.com/admin-baked/bakedbot-operations

**Firebase Console Steps**:
1. Go to App Hosting → Add Backend
2. Backend settings:
   - **Name**: `bakedbot-operations`
   - **Repository**: `admin-baked/bakedbot-operations`
   - **Branch**: `master`
   - **Root directory**: `/`
3. Create Backend

**Expected Results**:
- Build memory: 10GB
- Build time: 8-12 minutes
- Pages: 96 (CEO Dashboard)
- URL: `https://bakedbot-operations--studio-567050101-bc6e8.us-central1.hosted.app`

**Verify**:
```bash
# Test CEO dashboard loads
curl https://bakedbot-operations--studio-567050101-bc6e8.us-central1.hosted.app/dashboard/ceo
```

### Step 4: Shop App (New)

**GitHub**: https://github.com/admin-baked/bakedbot-shop

**Firebase Console Steps**:
1. Go to App Hosting → Add Backend
2. Backend settings:
   - **Name**: `bakedbot-shop`
   - **Repository**: `admin-baked/bakedbot-shop`
   - **Branch**: `master`
   - **Root directory**: `/`
3. Create Backend

**Expected Results**:
- Build memory: 6GB
- Build time: 4-6 minutes
- Pages: 25 (checkout, menu, products)
- URL: `https://bakedbot-shop--studio-567050101-bc6e8.us-central1.hosted.app`

**Verify**:
```bash
curl https://bakedbot-shop--studio-567050101-bc6e8.us-central1.hosted.app/checkout
```

---

## 🔗 Update Proxy Routing

After all apps are deployed, update [proxy.ts](./src/proxy.ts) with actual URLs:

```typescript
// SEO App
const SEO_URL = 'https://bakedbot-seo--studio-567050101-bc6e8.us-central1.hosted.app';

// Operations App
const OPERATIONS_URL = 'https://bakedbot-operations--studio-567050101-bc6e8.us-central1.hosted.app';

// Shop App
const SHOP_URL = 'https://bakedbot-shop--studio-567050101-bc6e8.us-central1.hosted.app';
```

**Commit and Push**:
```bash
cd "C:\Users\admin\BakedBot for Brands\bakedbot-for-brands"
git add src/proxy.ts
git commit -m "fix(proxy): Update URLs for deployed micro-apps"
git push origin main
```

---

## ✅ Verification Checklist

### Core App
- [ ] Build completes in <10 minutes
- [ ] Memory usage <12GB
- [ ] `/dashboard/inbox` loads
- [ ] Agent chat works
- [ ] Auth flow works

### SEO App
- [ ] `/local/10001` loads (NYC)
- [ ] `/local/90210` loads (Beverly Hills)
- [ ] ISR revalidation works (1 hour)
- [ ] Sitemap generates: `/api/sitemap`

### Operations App
- [ ] `/dashboard/ceo` loads
- [ ] CEO Dashboard tabs work
- [ ] Agent tools accessible
- [ ] Playbooks page loads

### Shop App
- [ ] `/checkout` loads
- [ ] `/menu` loads
- [ ] `/products/[id]` loads
- [ ] Cart functionality works

### Routing (via Proxy)
- [ ] `bakedbot.ai/local/10001` → SEO app
- [ ] `bakedbot.ai/dashboard/ceo` → Operations app
- [ ] `bakedbot.ai/checkout` → Shop app
- [ ] `bakedbot.ai/dashboard/inbox` → Core app
- [ ] `bakedbot.ai/academy` → Magnets app

---

## 🔍 Monitoring

### Firebase Console
Monitor all builds at:
[Firebase App Hosting](https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting)

### Build Logs
Each backend has separate build logs:
- `bakedbot-prod` - Core app
- `bakedbot-magnets` - Lead magnets
- `bakedbot-seo` - SEO pages
- `bakedbot-operations` - CEO Dashboard
- `bakedbot-shop` - E-commerce

### Error Tracking
If any build fails with OOM (exit code 137):
1. Check `apphosting.yaml` memory allocation
2. Review `package.json` dependencies
3. Check for circular dependencies
4. Consider further extraction

---

## 📈 Performance Expectations

| App | Pages | Memory | Build Time | Success Rate |
|-----|-------|--------|------------|--------------|
| Core | 55 | 12GB | 8-10 min | 95%+ |
| Magnets | 25 | 8GB | 5-7 min | 99%+ |
| SEO | ∞ (ISR) | 8GB | 5-8 min | 99%+ |
| Operations | 96 | 10GB | 8-12 min | 90%+ |
| Shop | 25 | 6GB | 4-6 min | 99%+ |

---

## 🚨 Troubleshooting

### Build Fails with OOM
```yaml
# Increase memory in apphosting.yaml
env:
  - variable: NODE_OPTIONS
    value: "--max-old-space-size=16384"  # Increase by 4GB
    availability: [ BUILD ]
```

### Routing Not Working
1. Check proxy.ts URLs match deployed backends
2. Verify all backends are deployed and running
3. Clear browser cache
4. Check Firebase App Hosting status

### Missing Dependencies
```bash
# Add to package.json
npm install <missing-package> --save
git add package.json package-lock.json
git commit -m "fix: Add missing dependency"
git push
```

### Import Path Errors
```bash
# Run import fixer for specific app
cd bakedbot-<app-name>
bash scripts/fix-imports.sh
```

---

## 📝 Next Steps After Deployment

1. **Monitor Core Build**: Should complete in ~10 min with 12GB
2. **Deploy SEO App**: Follow Step 2 above
3. **Deploy Operations App**: Follow Step 3 above
4. **Deploy Shop App**: Follow Step 4 above
5. **Update Proxy URLs**: Update proxy.ts with actual deployment URLs
6. **End-to-End Test**: Test routing across all apps
7. **Performance Review**: Monitor build times and memory usage

---

## 🎉 Success Metrics

After successful deployment:
- ✅ No OOM failures
- ✅ All builds <15 minutes
- ✅ Memory usage <12GB per app
- ✅ Seamless routing between apps
- ✅ ISR working for location pages
- ✅ All features functional

---

## 📞 Support

If you encounter issues:
1. Check Firebase Console build logs
2. Review `MULTI_APP_ARCHITECTURE.md`
3. Check `FIREBASE_SUPPORT_REQUEST.md` for escalation
4. Test individual apps directly via their URLs

---

**Last Updated**: February 14, 2026
**Status**: Ready for deployment
**Next Action**: Deploy SEO app (Step 2)
