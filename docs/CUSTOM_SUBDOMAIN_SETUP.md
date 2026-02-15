# Custom Subdomain Setup for Lead Magnets

## Overview

This guide shows how to set up custom subdomains for BakedBot's lead magnet apps:
- **academy.bakedbot.ai** → Academy (Cannabis Marketing AI Academy)
- **vibe.bakedbot.ai** → Vibe Studio (Menu Theme Generator)
- **training.bakedbot.ai** → Training (BakedBot Builder Bootcamp)

## Why Custom Subdomains?

**Before:** Ugly URLs that went to spam
- ❌ `bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app/academy`
- ❌ Redirected from `bakedbot.ai/academy` (shows Firebase URL in browser)

**After:** Clean, professional URLs
- ✅ `academy.bakedbot.ai`
- ✅ `vibe.bakedbot.ai`
- ✅ `training.bakedbot.ai`

## Architecture

```
User Request
     ↓
DNS CNAME Lookup
     ↓
Firebase App Hosting Backend
     ├── academy.bakedbot.ai → bakedbot-magnets
     ├── vibe.bakedbot.ai → bakedbot-magnets
     └── training.bakedbot.ai → bakedbot-training
```

## Step 1: Add Custom Domains in Firebase Console

### For Academy & Vibe (bakedbot-magnets backend)

1. Navigate to Firebase Console:
   - URL: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting
   - Click **"bakedbot-magnets"** backend

2. Add academy.bakedbot.ai:
   - Click **"Custom domains"** tab
   - Click **"Add custom domain"**
   - Enter: `academy.bakedbot.ai`
   - Click **"Continue"**
   - Follow TXT record verification steps (see Step 2)
   - Wait for SSL certificate provisioning (~15 minutes)

3. Add vibe.bakedbot.ai:
   - Click **"Add custom domain"** again
   - Enter: `vibe.bakedbot.ai`
   - Follow verification steps
   - Wait for SSL certificate

### For Training (bakedbot-training backend)

1. Navigate to Firebase Console:
   - Click **"bakedbot-training"** backend
   - Click **"Custom domains"** tab

2. Add training.bakedbot.ai:
   - Click **"Add custom domain"**
   - Enter: `training.bakedbot.ai`
   - Follow verification steps
   - Wait for SSL certificate

## Step 2: Configure DNS Records

### Option A: Google Domains

1. Go to: https://domains.google.com/registrar/bakedbot.ai/dns
2. Scroll to **"Custom records"**
3. Add the following records:

```
Type: TXT (for verification - Firebase will provide exact value)
Name: _acme-challenge.academy
Data: [Firebase will provide this value]
TTL: 3600

Type: CNAME
Name: academy
Data: bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app
TTL: 3600

Type: TXT (for verification)
Name: _acme-challenge.vibe
Data: [Firebase will provide this value]
TTL: 3600

Type: CNAME
Name: vibe
Data: bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app
TTL: 3600

Type: TXT (for verification)
Name: _acme-challenge.training
Data: [Firebase will provide this value]
TTL: 3600

Type: CNAME
Name: training
Data: bakedbot-training--studio-567050101-bc6e8.us-central1.hosted.app
TTL: 3600
```

### Option B: Cloudflare

1. Go to Cloudflare DNS management
2. Add records:

```
Type: TXT
Name: _acme-challenge.academy
Value: [Firebase provides]
Proxy: DNS only (gray cloud)

Type: CNAME
Name: academy
Target: bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app
Proxy: DNS only (gray cloud) - IMPORTANT: Must be DNS only!

Type: TXT
Name: _acme-challenge.vibe
Value: [Firebase provides]
Proxy: DNS only

Type: CNAME
Name: vibe
Target: bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app
Proxy: DNS only

Type: TXT
Name: _acme-challenge.training
Value: [Firebase provides]
Proxy: DNS only

Type: CNAME
Name: training
Target: bakedbot-training--studio-567050101-bc6e8.us-central1.hosted.app
Proxy: DNS only
```

**IMPORTANT:** Disable Cloudflare proxy (gray cloud icon) for App Hosting domains!

## Step 3: Wait for Propagation

- **DNS Propagation:** 5 minutes - 48 hours (usually < 1 hour)
- **SSL Certificate:** 15 minutes - 1 hour after DNS propagates
- **Status:** Check Firebase Console → Custom domains tab

### Verification Commands

```bash
# Check DNS propagation
dig academy.bakedbot.ai CNAME
dig vibe.bakedbot.ai CNAME
dig training.bakedbot.ai CNAME

# Check if live
curl -I https://academy.bakedbot.ai
curl -I https://vibe.bakedbot.ai
curl -I https://training.bakedbot.ai
```

## Step 4: Update Marketing Materials

Once live, update all marketing references:

**Email Templates:**
- ✅ "Visit our Academy: https://academy.bakedbot.ai"
- ✅ "Try Vibe Studio: https://vibe.bakedbot.ai"
- ✅ "Join Training: https://training.bakedbot.ai"

**Social Media:**
- Twitter bio
- LinkedIn company page
- Instagram link
- Facebook page

**Website:**
- Navigation menus
- Footer links
- Landing pages
- Blog posts

## Troubleshooting

### Issue: "Your connection is not private" (SSL Error)

**Cause:** SSL certificate not provisioned yet
**Fix:** Wait 15-60 minutes after DNS propagates

### Issue: DNS_PROBE_FINISHED_NXDOMAIN

**Cause:** DNS not propagated yet
**Fix:** Wait up to 48 hours (usually < 1 hour)

**Check with:**
```bash
dig academy.bakedbot.ai
```

### Issue: Cloudflare 526 Error (Invalid SSL)

**Cause:** Cloudflare proxy enabled (orange cloud)
**Fix:** Disable proxy - click icon to make it gray (DNS only)

### Issue: Page shows but no SSL (http only)

**Cause:** CNAME points to wrong target
**Fix:** Ensure CNAME value is the full hosted.app URL:
```
bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app
```

## Code Changes

The following files were updated to support custom subdomains:

**src/proxy.ts:**
- Removed redirect logic (lines 29-37)
- Added reserved subdomains: 'academy', 'vibe', 'training'
- Added documentation comments

**Why no rewrites needed:**
DNS routes traffic directly to the correct backend. The proxy in bakedbot-prod never sees requests to academy.bakedbot.ai - they go straight to bakedbot-magnets.

## Testing Checklist

After setup, verify:

- [ ] `https://academy.bakedbot.ai` loads without redirect
- [ ] `https://vibe.bakedbot.ai` loads without redirect
- [ ] `https://training.bakedbot.ai` loads without redirect
- [ ] All have valid SSL certificates (🔒 in browser)
- [ ] URLs don't change when navigating pages
- [ ] Email tracking links work
- [ ] Social share buttons work
- [ ] Form submissions work
- [ ] Analytics tracking works

## Estimated Timeline

- **DNS Configuration:** 15 minutes (manual work)
- **DNS Propagation:** 30 minutes - 2 hours (wait time)
- **SSL Provisioning:** 30 minutes - 1 hour (automatic)
- **Testing:** 15 minutes
- **Total:** 2-4 hours (mostly waiting)

## Support

**Firebase Console:**
- https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting

**Firebase Support:**
- https://firebase.google.com/support

**DNS Provider Support:**
- Google Domains: https://support.google.com/domains
- Cloudflare: https://support.cloudflare.com

---

**Last Updated:** February 15, 2026
**Maintained By:** BakedBot Engineering Team
