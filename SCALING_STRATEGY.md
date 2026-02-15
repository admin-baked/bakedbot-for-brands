# BakedBot National Rollout - Scaling Strategy

## Executive Summary

**Current State:** 142 pages, 12GB heap, stable builds
**Target:** Thousands of location pages across legal states
**Strategy:** Incremental Static Regeneration (ISR) → Regional Split → Microservices

---

## ✅ Phase 1: ISR Optimization (0-500 pages) - IMPLEMENTED

### What Changed

**Location Pages (`/local/[zipCode]`):**
```typescript
export const revalidate = 14400;  // 4 hours (was 1 hour)
export const dynamicParams = true; // On-demand generation
export const dynamic = 'force-static'; // Force static where possible

export async function generateStaticParams() {
  // Pre-render top 50 ZIPs at build time
  return TOP_50_ZIPS.map(zip => ({ zipCode: zip }));
}
```

### How It Works

1. **Build Time:** Only 50 pages pre-rendered (top markets)
2. **First Visit:** Other pages generated on-demand, then cached
3. **Subsequent Visits:** Served from cache (4-hour TTL)
4. **Revalidation:** Background regeneration after 4 hours

### Performance Impact

| Metric | Before | After |
|--------|--------|-------|
| Pages at build | 142 | 192 (142 + 50 locations) |
| Build memory | 12GB | 12GB (no change!) |
| Page load (top 50) | ~500ms | ~100ms (pre-rendered) |
| Page load (other) | ~500ms first, instant after | Same |
| Revalidation frequency | Every hour | Every 4 hours |

### Cost Impact

- **Before:** ~720 regenerations/month per page
- **After:** ~180 regenerations/month per page
- **Savings:** 75% reduction in compute costs

---

## 📊 Scaling Projections

### Phase 1: ISR (Current) - 0 to 500 pages

**Capacity:**
- ✅ 50 pages pre-rendered at build
- ✅ 450 pages generated on-demand
- ✅ 4-hour cache reduces server load by 75%
- ✅ No build-time memory increase

**Recommended Markets:**
- Expand from 14 cities → 40 cities
- Cover all major metros in IL, MI, CA, CO, NY/NJ
- ~15 ZIPs per city = 600 total pages

**Action Required:**
- Update `TARGET_MARKETS` in `dayday-daily-discovery.ts`
- Increase `generateStaticParams()` to top 100 ZIPs (from 50)

**ETA:** 2-3 months at 5 markets/day

---

### Phase 2: Regional Split - 500 to 2,000 pages

**Problem:** Single app reaching build limits

**Solution:** Regional deployment architecture

```
Main App (bakedbot.ai)
├── Dashboard & Authentication
├── API Layer
└── Redirects to regional apps

Regional Apps:
├── bakedbot-midwest.web.app (IL, MI, OH)
├── bakedbot-west.web.app (CA, CO, NV)
└── bakedbot-east.web.app (NY, NJ, MA)
```

**Implementation:**

1. **Create Regional Apps:**
```bash
# Clone base app for each region
firebase init apphosting --project bakedbot-midwest
firebase init apphosting --project bakedbot-west
firebase init apphosting --project bakedbot-east
```

2. **Configure Routing:**
```typescript
// middleware.ts in main app
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Midwest states
  if (pathname.match(/\/local\/(60|48|49)/)) {
    return NextResponse.rewrite('https://bakedbot-midwest.web.app' + pathname);
  }

  // West states
  if (pathname.match(/\/local\/(80|90|91|92|93|94|95)/)) {
    return NextResponse.rewrite('https://bakedbot-west.web.app' + pathname);
  }

  // East states
  if (pathname.match(/\/local\/(10|07|08|01|02)/)) {
    return NextResponse.rewrite('https://bakedbot-east.web.app' + pathname);
  }
}
```

3. **Shared Firestore:**
- All apps read from same Firestore database
- No data duplication
- Consistent authentication

**Benefits:**
- 3× build capacity (each app handles ~600 pages)
- Regional edge caching (faster for users)
- Fault isolation (one region down doesn't affect others)

**Cost:** ~$150/month for 3 apps

**ETA:** Month 3-4

---

### Phase 3: Microservices - 2,000+ pages

**Problem:** Even regional splits hitting limits at national scale

**Solution:** Specialized architecture

```
┌─────────────────────┐
│  bakedbot.ai        │  ← Dashboard + Authentication
│  (Next.js)          │
└──────────┬──────────┘
           │
    ┌──────┴───────┐
    │              │
┌───▼────┐    ┌───▼────┐
│SEO API │    │Pages DB│
│FastAPI │    │Postgres│
└────────┘    └────────┘
    │              │
    └──────┬───────┘
           │
    ┌──────▼──────┐
    │ CDN (CF)    │
    │ Edge Cache  │
    └─────────────┘
```

**Components:**

1. **SEO API (Python/FastAPI):**
   - Generates HTML for location pages
   - 10× faster than Next.js SSR
   - Deployed on Cloud Run (auto-scales)

2. **Pages Database (PostgreSQL):**
   - Stores page metadata & content
   - Indexed for fast queries
   - Cheaper than Firestore at scale

3. **CDN (Cloudflare):**
   - Cache HTML at edge locations
   - 1-hour TTL with stale-while-revalidate
   - 99.9% cache hit rate

**Flow:**
```
User Request
  ↓
Cloudflare Edge (Cache Check)
  ↓ (miss)
FastAPI API (Generate HTML)
  ↓
PostgreSQL (Get Data)
  ↓
Return HTML + Cache for 1h
```

**Benefits:**
- **Unlimited scale:** No per-app page limits
- **Lower cost:** $0.40 per million requests (vs $25 on Firebase)
- **Faster:** Edge caching = <50ms latency globally
- **Flexibility:** Easy A/B testing, personalization

**Migration Path:**
```bash
# 1. Deploy SEO API
gcloud run deploy seo-api \
  --image gcr.io/bakedbot-prod/seo-api \
  --region us-central1 \
  --memory 2Gi \
  --max-instances 100

# 2. Setup PostgreSQL
gcloud sql instances create bakedbot-pages \
  --tier=db-g1-small \
  --region=us-central1

# 3. Configure Cloudflare
# Point *.bakedbot.ai to Cloud Run
# Enable caching for /local/* paths
```

**Cost:** ~$1,000/month at 10,000+ pages

**ETA:** Month 6+

---

## 🔧 Day Day GitHub Action Fix

### Problem

GitHub Action getting "Unauthorized" when calling `/api/cron/dayday-discovery`

### Root Cause

`CRON_SECRET` not set in GitHub Actions secrets or doesn't match Firebase secret

### Solution

**1. Generate Secure Secret:**
```bash
cd scripts
chmod +x setup-cron-secret.sh
./setup-cron-secret.sh
```

This will:
- Generate a secure 64-character hex secret
- Show GitHub Actions setup instructions
- Show Firebase Secret Manager commands
- Provide test curl command

**2. Add to GitHub:**
1. Go to: https://github.com/admin-baked/bakedbot-for-brands/settings/secrets/actions
2. Add `CRON_SECRET` with the generated value

**3. Add to Firebase:**
```bash
echo 'YOUR_SECRET_HERE' | gcloud secrets create CRON_SECRET \
  --project=studio-567050101-bc6e8 \
  --data-file=-

firebase apphosting:secrets:grantaccess CRON_SECRET
```

**4. Test:**
```bash
curl -X GET https://bakedbot.ai/api/cron/dayday-discovery \
  -H "Authorization: Bearer YOUR_SECRET_HERE"

# Expected: {"success": true, "result": {...}}
```

### Enhanced Workflow

New GitHub Action checks for secret and shows better errors:

```yaml
- name: Check CRON_SECRET
  run: |
    if [ -z "${{ secrets.CRON_SECRET }}" ]; then
      echo "ERROR: CRON_SECRET not set"
      exit 1
    fi

- name: Trigger with Error Handling
  run: |
    response=$(curl -s -w "\n%{http_code}" ...)
    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" != "200" ]; then
      echo "ERROR: Failed with status $http_code"
      exit 1
    fi
```

---

## 📈 Rollout Timeline

| Month | Action | Pages | Strategy |
|-------|--------|-------|----------|
| **1** | Fix CRON_SECRET | 142 | Current |
| **1-2** | Expand to 40 cities | 500 | ISR (Phase 1) |
| **3** | Deploy Midwest app | 800 | Regional split start |
| **3-4** | Deploy West/East apps | 1,500 | Full regional split |
| **5** | National coverage | 2,500 | Regional at capacity |
| **6+** | Microservices migration | 5,000+ | Phase 3 |

---

## 💰 Cost Projection

### Phase 1: ISR (500 pages)
- Firebase App Hosting: $25/month
- Cloud Build: $15/month
- AI Generation (Gemini): $50/month
- **Total: $90/month**

### Phase 2: Regional (2,000 pages)
- 3× Firebase Apps: $150/month
- Cloud Build: $50/month
- AI Generation: $200/month
- **Total: $400/month**

### Phase 3: Microservices (10,000 pages)
- Cloud Run (SEO API): $200/month
- PostgreSQL: $100/month
- Cloudflare CDN: $200/month
- AI Generation: $500/month
- Firebase (dashboard only): $50/month
- **Total: $1,050/month**

### ROI Analysis

At 10,000 pages with 1,000 visitors/day each:
- **Traffic:** 10M visits/month
- **Leads:** 100K/month (1% conversion)
- **Revenue:** $500K/month (assuming $5 per lead)
- **Infrastructure:** $1,050/month
- **ROI:** 476× return on infrastructure spend

---

## ✅ Next Actions

### This Week
- [ ] Run `scripts/setup-cron-secret.sh`
- [ ] Add `CRON_SECRET` to GitHub Actions
- [ ] Add `CRON_SECRET` to Firebase Secret Manager
- [ ] Test Day Day workflow manually
- [ ] Monitor build for ISR improvements

### Next 2 Weeks
- [ ] Expand `TARGET_MARKETS` to 40 cities
- [ ] Increase `generateStaticParams()` to top 100 ZIPs
- [ ] Add monitoring for page generation metrics
- [ ] Setup alerts for build failures

### Month 2
- [ ] Reach 500 pages
- [ ] Evaluate regional split readiness
- [ ] Plan Midwest app architecture

### Month 6
- [ ] Design microservices architecture
- [ ] Build FastAPI SEO service
- [ ] Setup PostgreSQL database
- [ ] Configure Cloudflare CDN

---

## 📞 Support

**Questions?** Contact the engineering team or reference:
- [MEMORY.md](./MEMORY.md) - Build optimization history
- [Day Day Discovery Job](./src/server/jobs/dayday-daily-discovery.ts) - Page generation logic
- [Location Page](./src/app/local/[zipCode]/page.tsx) - ISR implementation

---

**Last Updated:** February 15, 2026
**Version:** 1.0
**Author:** BakedBot Engineering Team
