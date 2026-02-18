# Brand Guide Scraping — Firecrawl → RTRVR Fallback Diagnostic

## 🎯 Current Status

✅ **Fallback system is fully implemented and ready**
⚠️ **May not be triggering due to missing IAM binding**

---

## 🏗️ Architecture Overview

```
User clicks "Extract from Website" in Brand Guide UI
         ↓
createBrandGuide() server action
         ↓
BrandGuideExtractor.extractFromUrl()
         ↓
discovery.discoverUrl(url)  [Primary: Firecrawl]
         ↓
    [Firecrawl succeeds?]
    ├─ YES → Return markdown
    └─ NO → Catch error, try RTRVR fallback
         ↓
RTRVR.ai browser automation  [Fallback]
         ↓
Return content or throw error
```

---

## 📁 Key Files

### Primary Flow
| File | Purpose | Lines |
|------|---------|-------|
| `src/server/services/firecrawl.ts` | Singleton with fallback logic | 84-124, 187-239, 245-286, 292-352 |
| `src/server/services/brand-guide-extractor.ts` | Brand guide extraction | 86-216 |
| `src/server/actions/brand-guide.ts` | Server action orchestrator | 255-283 |
| `src/app/dashboard/settings/brand-guide/page.tsx` | UI page | — |

### Fallback Implementation
| Method | Firecrawl | RTRVR | Status |
|--------|-----------|-------|--------|
| `discoverUrl()` | `scrape()` | `extractFromUrl()` | ✅ Both implemented |
| `discoverWithActions()` | `scrape(actions)` | `executeAgentTask()` | ✅ Both implemented |
| `search()` | `search()` | `executeAgentTask()` | ✅ Both implemented |
| `mapSite()` | `mapUrl()` | `executeAgentTask()` | ✅ Both implemented |
| `extractData()` | `scrape(schema)` | `extractFromUrl()` | ✅ Both implemented |

---

## 🔧 How the Fallback Works

### Step 1: Try Firecrawl
```typescript
// firecrawl.ts line 85-96
if (this.isFirecrawlAvailable()) {
    try {
        const response = await this.app!.scrape(url, { formats });
        if (!response.success) throw new Error(`Discovery failed: ${response.error}`);
        return response;  // SUCCESS
    } catch (error) {
        // FAILED - try RTRVR
        logger.warn('[Discovery] Firecrawl discoverUrl failed, trying RTRVR fallback', { url, error });
        if (!this.isRTRVRAvailable()) throw error;  // RTRVR not available - give up
    }
}
```

### Step 2: Fallback to RTRVR
```typescript
// firecrawl.ts line 108-124
logger.info('[Discovery] Using RTRVR fallback for discoverUrl', { url });
const res = await extractFromUrl(url, 'Extract the full content...');
if (!res.success) throw new Error(`RTRVR fallback failed: ${res.error}`);
const content = this.extractRTRVRContent(res.data);
return { success: true, markdown: content };
```

---

## 🔍 Checking Configuration

### Check 1: Environment Variables are Set

Both secrets are configured in `apphosting.yaml` (lines 266-274):

```yaml
- variable: FIRECRAWL_API_KEY
  secret: FIRECRAWL_API_KEY
  availability: [ RUNTIME ]

- variable: RTRVR_API_KEY
  secret: RTRVR_API_KEY
  availability: [ RUNTIME ]
```

### Check 2: Secrets Exist in Google Cloud

Both secrets are created:
```
FIRECRAWL_API_KEY                                    2025-12-30T23:37:30  ✅
RTRVR_API_KEY                                        2026-01-03T16:03:19  ✅
```

### Check 3: Firebase App Hosting Can Access Them

**THIS IS THE LIKELY ISSUE!**

RTRVR_API_KEY may need IAM permission grant. Run:

```powershell
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands"
firebase apphosting:secrets:grantaccess RTRVR_API_KEY --backend=bakedbot-prod
```

---

## 🧪 Testing the Fallback

### Test 1: Check if Services Initialize Correctly

Create a test script at `scripts/test-discovery.mjs`:

```javascript
import { discovery } from '@/server/services/firecrawl.ts';

const service = discovery;
console.log('Firecrawl Available:', service.isConfigured());
console.log('Can extract from URL:', typeof service.discoverUrl === 'function');

// Test with a simple URL
try {
    const result = await service.discoverUrl('https://example.com');
    console.log('✅ Discovery succeeded');
    console.log('Content length:', result.markdown?.length);
} catch (error) {
    console.error('❌ Discovery failed:', error.message);
}
```

### Test 2: Monitor Logs

When brand guide extraction runs, check Firebase App Hosting logs:

```bash
firebase functions:log --lines=100
```

Look for:
```
[Discovery] discoverUrl succeeded via Firecrawl
// OR if fallback:
[Discovery] Firecrawl discoverUrl failed, trying RTRVR fallback
[Discovery] Using RTRVR fallback for discoverUrl
```

### Test 3: Force Test with Firecrawl Down

Temporarily comment out FIRECRAWL_API_KEY in apphosting.yaml to force RTRVR fallback:

```yaml
# - variable: FIRECRAWL_API_KEY
#   secret: FIRECRAWL_API_KEY
#   availability: [ RUNTIME ]
```

Then redeploy and test brand guide extraction.

---

## 🚀 Step-by-Step Fix

### 1️⃣ Grant RTRVR Access to Firebase App Hosting

```powershell
cd "c:\Users\admin\BakedBot for Brands\bakedbot-for-brands"

# Grant Firebase App Hosting service account access to RTRVR_API_KEY
firebase apphosting:secrets:grantaccess RTRVR_API_KEY --backend=bakedbot-prod
```

**Output should show:**
```
✓ Granted bakedbot-prod service account access to RTRVR_API_KEY@N
```

### 2️⃣ Verify Configuration

Check apphosting.yaml has both secrets:

```yaml
- variable: FIRECRAWL_API_KEY
  secret: FIRECRAWL_API_KEY
  availability: [ RUNTIME ]

- variable: RTRVR_API_KEY
  secret: RTRVR_API_KEY
  availability: [ RUNTIME ]
```

### 3️⃣ Deploy Changes

The logging improvements I added will help diagnose issues:

```powershell
git add src/server/services/firecrawl.ts src/server/services/brand-guide-extractor.ts
git commit -m "fix: Improve logging for brand guide scraping and Firecrawl/RTRVR fallback"
git push origin main
```

### 4️⃣ Test Brand Guide Extraction

1. Go to `/dashboard/settings/brand-guide`
2. Click "Create Brand Guide"
3. Enter a website URL (e.g., https://example.com)
4. Click "Extract from Website"
5. Check logs in Firebase Console for fallback messages

---

## 📊 What Each Component Does

### DiscoveryService (firecrawl.ts)

**Purpose**: Central scraping service with intelligent fallback

**Available Methods**:
- `discoverUrl(url)` — Get markdown from URL
- `discoverWithActions(url, actions)` — Handle interactive pages (click, scroll, type)
- `search(query)` — Web search
- `mapSite(url)` — Find all links on a site
- `extractData(url, schema)` — LLM-based structured extraction

**Fallback Logic**:
1. Try Firecrawl first
2. If Firecrawl fails, try RTRVR.ai
3. If RTRVR fails, throw error

### BrandGuideExtractor (brand-guide-extractor.ts)

**Purpose**: Extract brand identity from website + social media

**Calls**:
1. `discovery.discoverUrl(url)` — Scrape website (Firecrawl → RTRVR)
2. `discovery.discoverUrl(socialProfileUrl)` — Scrape social media (Firecrawl → RTRVR)
3. `callClaude()` — Parse extracted content with AI

**Returns**: BrandGuide with colors, fonts, voice, messaging, confidence score

### Brand Guide Server Actions (brand-guide.ts)

**Purpose**: Orchestrate extraction and storage

**Main Function**: `createBrandGuide(input)`
- Calls `BrandGuideExtractor.extractFromUrl()`
- Stores result in Firestore
- Returns brand guide to UI

---

## 🐛 Debugging Tips

### Issue: "Firecrawl is down but RTRVR fallback not working"

**Possible causes:**
1. RTRVR_API_KEY secret doesn't exist → Create it in Secret Manager
2. RTRVR_API_KEY secret exists but Firebase App Hosting can't access → Run grant command
3. RTRVR_API_KEY is empty → Check secret value in Secret Manager
4. RTRVR service is temporarily down → Check https://www.rtrvr.ai/status
5. RTRVR request timed out → Check network/firewall

**Diagnosis steps:**
```powershell
# Check if secret exists
gcloud secrets list --project=studio-567050101-bc6e8 | grep RTRVR_API_KEY

# Check if secret has a value
gcloud secrets versions list RTRVR_API_KEY --project=studio-567050101-bc6e8

# Grant access
firebase apphosting:secrets:grantaccess RTRVR_API_KEY --backend=bakedbot-prod

# Redeploy
git push origin main
```

### Issue: "Brand guide extraction is very slow"

**Possible cause**: RTRVR fallback is running (Firecrawl is fast, RTRVR takes 20-60s)

**Check logs for**:
```
[Discovery] Firecrawl discoverUrl failed, trying RTRVR fallback
[Discovery] Using RTRVR fallback for discoverUrl
```

If you see this, Firecrawl is failing. Either:
1. Firecrawl API is down
2. URL is blocked by Firecrawl
3. FIRECRAWL_API_KEY is invalid
4. Network/firewall issue

**Solution**:
- Test Firecrawl directly: https://docs.firecrawl.dev/
- Check API key in Secret Manager
- Consider increasing RTRVR timeout (default 120s)

---

## 📞 Quick Reference

### Environment Variables (apphosting.yaml)

| Variable | Secret Name | Used By | Purpose |
|----------|-------------|---------|---------|
| `FIRECRAWL_API_KEY` | `FIRECRAWL_API_KEY` | `DiscoveryService` | Primary scraper |
| `RTRVR_API_KEY` | `RTRVR_API_KEY` | `getRTRVRClient()` | Fallback scraper |
| `CLAUDE_API_KEY` | `CLAUDE_API_KEY` | `BrandGuideExtractor` | Brand analysis AI |

### Logging Signals

| Log Message | Meaning | Action |
|-------------|---------|--------|
| `Firecrawl succeeded via Firecrawl` | Primary path working | ✅ Normal |
| `Firecrawl failed, trying RTRVR fallback` | Firecrawl failed | Check logs |
| `Using RTRVR fallback for discoverUrl` | Using fallback | May be slow (20-60s) |
| `RTRVR fallback failed` | Both failed | Error returned to user |
| `API key not configured` | Secret missing/empty | Grant access + redeploy |

---

## ✅ Checklist

- [ ] Run `firebase apphosting:secrets:grantaccess RTRVR_API_KEY --backend=bakedbot-prod`
- [ ] Verify apphosting.yaml has both FIRECRAWL_API_KEY and RTRVR_API_KEY
- [ ] Check Firebase Console Secrets page shows both secrets
- [ ] Deploy updated code with improved logging
- [ ] Test brand guide extraction with a URL
- [ ] Verify logs show fallback trigger (if Firecrawl fails)
- [ ] Verify extraction completes successfully

---

## 📚 References

- [Firecrawl Documentation](https://docs.firecrawl.dev/)
- [RTRVR.ai API Docs](https://www.rtrvr.ai/docs/api)
- [Firebase App Hosting Secrets](https://firebase.google.com/docs/app-hosting/manage-environments)
- [Code Location: DiscoveryService](src/server/services/firecrawl.ts)
- [Code Location: BrandGuideExtractor](src/server/services/brand-guide-extractor.ts)
