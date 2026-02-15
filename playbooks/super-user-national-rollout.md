# National SEO Rollout Playbook

**Playbook Type:** Super User
**Frequency:** Ongoing (Daily automated + Monthly reviews)
**Owner:** CEO / Growth Team
**Status:** Active

---

## 🎯 Objective

Scale BakedBot's SEO presence to thousands of location pages across legal cannabis markets using Day Day's automated discovery system and on-demand ISR (Incremental Static Regeneration).

---

## 📊 Current State (February 2026)

| Metric | Current | Target (1 Year) |
|--------|---------|-----------------|
| **Pages** | 142 | 20,075+ |
| **Markets** | 14 cities | National (all legal states) |
| **Daily Output** | 55 pages/day | 55 pages/day (constant) |
| **Build Time** | 5 min | 5 min (constant) |

**Key Insight:** On-demand ISR means build time stays constant regardless of page count!

---

## 🔄 Daily Automation

### Day Day Discovery Job

**Runs:** Daily at 5:00 AM UTC (Midnight CST)
**Method:** GitHub Actions → `/api/cron/dayday-discovery` endpoint

**What It Does:**
1. Processes 5 markets (cities)
2. Creates ~11 pages per market:
   - 3 Location (ZIP) pages
   - 5 Dispensary pages
   - 3 Brand pages
3. Optimizes content with AI
4. Auto-publishes pages

**Total Daily Output:** ~55 pages

---

## ✅ Phase 1: Verify CRON_SECRET (One-Time Setup)

**Status:** ✅ **Complete** (February 15, 2026)
**Priority:** High - Required for automation to work

### Step 1: Get Firebase Secret

```powershell
cd "C:\Users\admin\BakedBot for Brands\bakedbot-for-brands\scripts"
.\get-secret.ps1
```

**Expected:** Secret value displayed and copied to clipboard
**Result:** ✅ Retrieved successfully

### Step 2: Test Endpoint

```powershell
.\verify-secret.ps1 -Secret "PASTE_SECRET_HERE"
```

**Expected Outcomes:**
- ✅ **200 Success:** Endpoint works! Secret is valid.
- ❌ **401 Unauthorized:** GitHub secret doesn't match Firebase. Update GitHub.
- ❌ **500 Server Error:** App Hosting needs secret access granted.

**Result:** Got 500 error initially → Fixed in Step 3

### Step 3: Grant App Hosting Access (If 500)

```powershell
firebase apphosting:secrets:grantaccess CRON_SECRET --backend=bakedbot-prod --project=studio-567050101-bc6e8
```

**Expected:** "Successfully set IAM bindings on secret CRON_SECRET"
**Result:** ✅ Access granted successfully

**Note:** Changes take effect on next deployment (automatic on git push)

### Step 4: Update GitHub Secret (If 401)

1. Go to: https://github.com/admin-baked/bakedbot-for-brands/settings/secrets/actions
2. Click "CRON_SECRET" → Update
3. Paste Firebase secret value
4. Save
5. Re-run verify script to confirm

**Result:** Not needed - secret already matches

**Success Criteria:** After next deployment, `verify-secret.ps1` returns 200 with JSON response showing pages created

---

## 📈 Phase 2: Expand Markets (Months 1-2)

**Goal:** Increase from 14 → 40 cities (500+ pages)

### Current Target Markets (14 cities)

**Illinois:** Chicago, Naperville, Aurora, Evanston, Oak Park
**Michigan:** Ann Arbor, Grand Rapids, Lansing
**Colorado:** Boulder, Aurora
**California:** Oakland, Berkeley, Long Beach
**New York/New Jersey:** Hoboken, Jersey City

### Expansion Plan

**Add 26 more cities across:**
- Illinois: Rockford, Joliet, Springfield, Peoria
- Michigan: Detroit, Flint, Dearborn
- Colorado: Colorado Springs, Fort Collins, Lakewood
- California: San Francisco, Los Angeles, San Diego, Sacramento
- New York: Buffalo, Rochester, Syracuse
- New Jersey: Newark, Trenton, Atlantic City
- Plus: MA, NV, OR, WA markets

### How to Expand

**File:** `src/server/jobs/dayday-daily-discovery.ts`

**Edit Line 22-42:**
```typescript
const TARGET_MARKETS = [
    // Add new cities here
    { city: 'Detroit', state: 'MI', zips: ['48201', '48202', '48226'] },
    { city: 'Los Angeles', state: 'CA', zips: ['90001', '90012', '90014'] },
    // ... etc
];
```

**Test Changes:**
```bash
npm run check:types
git add src/server/jobs/dayday-daily-discovery.ts
git commit -m "feat: Add [X] new markets to Day Day discovery"
git push origin main
```

**Monitor:** Check next day's GitHub Actions run to verify new markets processed

---

## 🏗️ Phase 3: Regional Split Architecture (Months 3-4)

**Trigger:** When approaching 500-1,000 pages
**Goal:** 3× capacity via regional deployment

### Regional Apps

```
bakedbot-midwest.web.app (IL, MI, OH) - 600 pages
bakedbot-west.web.app (CA, CO, NV) - 600 pages
bakedbot-east.web.app (NY, NJ, MA) - 600 pages
```

### Setup Steps

1. **Create regional Firebase projects**
   ```bash
   firebase init apphosting --project bakedbot-midwest
   firebase init apphosting --project bakedbot-west
   firebase init apphosting --project bakedbot-east
   ```

2. **Configure routing in main app** (`middleware.ts`)
   ```typescript
   // Midwest states (60/48/49 ZIP prefixes)
   if (pathname.match(/\/local\/(60|48|49)/)) {
     return NextResponse.rewrite('https://bakedbot-midwest.web.app' + pathname);
   }
   ```

3. **Deploy regional apps**
   ```bash
   git push midwest main
   git push west main
   git push east main
   ```

**Cost:** ~$150/month for 3 apps
**Capacity:** 1,800 pages total

---

## 🚀 Phase 4: Microservices Architecture (Month 6+)

**Trigger:** When approaching 2,000+ pages
**Goal:** Unlimited scale with edge caching

### Architecture

```
Main App (Dashboard) → FastAPI SEO Service → PostgreSQL → Cloudflare CDN
```

### Benefits
- **Unlimited pages:** No per-app limits
- **Lower cost:** $0.40 per million requests
- **Faster:** <50ms global latency
- **Flexibility:** Easy A/B testing

**Cost:** ~$1,000/month at 10,000+ pages
**ROI:** 476× return (10M visits/month → 100K leads → $500K revenue)

---

## 📋 Monthly Review Checklist

### Metrics to Monitor

**Page Performance:**
- [ ] Total pages created this month
- [ ] Markets coverage (cities processed)
- [ ] ISR cache hit rate
- [ ] Average page load time

**Traffic:**
- [ ] Organic search impressions
- [ ] Click-through rate
- [ ] Page views by ZIP
- [ ] Conversion rate (visits → leads)

**Infrastructure:**
- [ ] Build success rate (should be 100%)
- [ ] Build time (should stay ~5 min)
- [ ] Day Day cron success rate
- [ ] API response times

### Actions

**If pages < 1,000:**
- Continue Phase 1-2 (current strategy)
- Expand markets as needed
- Monitor build performance

**If pages > 1,000:**
- Plan Phase 3 (regional split)
- Test regional deployment
- Set up monitoring

**If pages > 2,000:**
- Evaluate Phase 4 (microservices)
- Design FastAPI service
- Plan migration timeline

---

## 🔧 Troubleshooting

### Day Day Not Running

**Check:**
1. GitHub Actions: https://github.com/admin-baked/bakedbot-for-brands/actions
2. CRON_SECRET configured correctly
3. Firebase App Hosting has secret access

**Fix:**
```bash
firebase apphosting:secrets:grantaccess CRON_SECRET --project=studio-567050101-bc6e8
```

### Build Timeouts

**Symptoms:** Pages timing out during generation
**Cause:** Trying to pre-render too many pages at build time

**Fix:** Verify ISR configuration in `/local/[zipCode]/page.tsx`:
```typescript
export const revalidate = 14400; // 4 hours
export const dynamicParams = true; // On-demand generation
export const dynamic = 'force-dynamic'; // No pre-rendering
```

### Pages Not Caching

**Check:**
1. Firebase App Hosting settings
2. ISR `revalidate` value (should be 14400)
3. CDN configuration

---

## 📖 Reference Documents

- **Scaling Strategy:** [SCALING_STRATEGY.md](../SCALING_STRATEGY.md)
- **Day Day Job:** `src/server/jobs/dayday-daily-discovery.ts`
- **Location Pages:** `src/app/local/[zipCode]/page.tsx`
- **GitHub Workflow:** `.github/workflows/dayday-daily.yaml`
- **Verification Scripts:** `scripts/get-secret.ps1`, `scripts/verify-secret.ps1`

---

## 🎯 Success Metrics

**3 Months:**
- 4,950 pages live
- 40+ cities covered
- <5 min build times
- 95%+ Day Day success rate

**6 Months:**
- 10,000+ pages live
- National coverage (all legal states)
- Regional architecture deployed
- <50ms page load times

**12 Months:**
- 20,000+ pages live
- Microservices architecture
- 10M+ monthly visits
- 100K+ leads/month

---

**Last Updated:** February 15, 2026
**Version:** 1.0
**Next Review:** March 15, 2026
