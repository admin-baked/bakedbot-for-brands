# Day Day Weekly SEO Review Playbook

**Playbook Type:** Super User
**Frequency:** Weekly (Every Monday at 9:00 AM UTC)
**Owner:** CEO / Growth Team
**Status:** Active
**Email Notifications:** martez@bakedbot.ai

---

## 🎯 Objective

Automated weekly analysis of SEO performance across all location pages, identifying growth opportunities, content gaps, and optimization priorities.

---

## 📊 Current State (February 2026)

| Metric | Current | Target (Q1) |
|--------|---------|-------------|
| **Total Pages** | 142 | 500+ |
| **Weekly Review** | Automated | Automated |
| **Email Reports** | Yes | Yes |
| **Markets Analyzed** | 14 cities | 40 cities |

---

## 🔄 Weekly Automation

### Review Schedule

**Runs:** Every Monday at 9:00 AM UTC (3:00 AM CST)
**Method:** GitHub Actions → `/api/cron/dayday-review` endpoint
**Notification:** Email sent to martez@bakedbot.ai after completion

**What It Analyzes:**
1. **Page Performance:**
   - Total pages created this week
   - Page views by ZIP code
   - Cache hit rates
   - Load time metrics

2. **Content Quality:**
   - Pages needing optimization
   - Missing metadata
   - Duplicate content issues
   - Low-quality content flags

3. **Growth Opportunities:**
   - High-traffic ZIPs to prioritize
   - New markets to enter
   - Competitor gaps
   - Search trends

4. **Technical Health:**
   - Build success rate
   - ISR cache performance
   - API response times
   - Error rates

---

## ✅ Phase 1: Weekly Review Setup (Complete)

**Status:** ✅ **Complete** (February 15, 2026)
**Priority:** High - Required for automated growth insights

### Step 1: Verify GitHub Action

```bash
# Check workflow exists
cat .github/workflows/dayday-weekly.yaml
```

**Expected:** Workflow configured with:
- Schedule: `'0 9 * * 1'` (Mondays at 9am UTC)
- Endpoint: `https://bakedbot.ai/api/cron/dayday-review`
- Auth: Uses `CRON_SECRET`
- Error handling: Proper HTTP status checks

**Result:** ✅ Workflow active and configured

### Step 2: Test Manual Trigger

**Via GitHub:**
1. Go to: https://github.com/admin-baked/bakedbot-for-brands/actions/workflows/dayday-weekly.yaml
2. Click "Run workflow"
3. Click "Run workflow" button
4. Wait for completion (~5 min)

**Via PowerShell:**
```powershell
cd "C:\Users\admin\BakedBot for Brands\bakedbot-for-brands\scripts"
.\trigger-weekly-review.ps1
```

**Expected Results:**
- ✅ 200 Success response
- ✅ JSON with growth metrics
- ✅ Email sent to martez@bakedbot.ai

### Step 3: Verify Email Delivery

**Check inbox for:**
- **Subject:** "Day Day Weekly SEO Review - [Date]"
- **From:** BakedBot Notifications
- **Content:**
  - Executive summary
  - Key metrics (pages, traffic, growth)
  - Top opportunities
  - Action items

**Email Format:**
```
📊 Day Day Weekly SEO Review
Week of February 15, 2026

EXECUTIVE SUMMARY
- Total Pages: 142 (+55 this week)
- Markets: 14 cities
- Top ZIP: 60601 (Chicago) - 1,234 views
- Growth Rate: +63% WoW

KEY METRICS
✅ Pages Created: 55
✅ Cache Hit Rate: 94%
✅ Avg Load Time: 1.2s
⚠️  Pages Needing Optimization: 12

TOP OPPORTUNITIES
1. Expand to Detroit metro (high search volume)
2. Optimize Chicago pages (low CTR)
3. Add more dispensary partnerships

ACTION ITEMS
[ ] Review low-performing pages
[ ] Plan Detroit market entry
[ ] Update Chicago content
```

---

## 📈 Phase 2: Email Notifications (In Progress)

**Goal:** Automated email reports after each review

### Current Implementation

**Email Service:** SendGrid (already configured)
**Template:** `day-day-weekly-review`
**Recipient:** martez@bakedbot.ai
**Trigger:** After successful review completion

### Email Contents

**Section 1: Executive Summary**
- Total pages and growth
- Top performing markets
- Week-over-week changes

**Section 2: Performance Metrics**
- Page views by market
- Cache performance
- Load times
- Error rates

**Section 3: Content Quality**
- Pages optimized this week
- Pages flagged for improvement
- Content gaps identified

**Section 4: Growth Opportunities**
- New markets to consider
- High-traffic ZIPs to prioritize
- Competitor analysis insights

**Section 5: Action Items**
- Recommended next steps
- Priority optimizations
- Market expansion plans

### Setup Steps

**1. Configure Email Template:**
```typescript
// src/server/services/emails/weekly-review-template.ts
export const weeklyReviewTemplate = {
  subject: 'Day Day Weekly SEO Review - {{date}}',
  html: '...',
  text: '...'
};
```

**2. Update Review Endpoint:**
```typescript
// src/app/api/cron/dayday-review/route.ts
const result = await runDayDayWeeklyReview();

// Send email notification
await sendWeeklyReviewEmail({
  to: 'martez@bakedbot.ai',
  result: result
});
```

**3. Test Email Delivery:**
```powershell
# Manual trigger
.\trigger-weekly-review.ps1

# Check email inbox within 5 minutes
```

---

## 🔍 Weekly Review Metrics

### Growth Tracking

**Week-over-Week:**
- Pages created
- Markets expanded
- Total traffic
- Cache performance

**Month-over-Month:**
- Total pages live
- Markets covered
- Traffic growth
- Conversion improvements

### Quality Indicators

**Content Quality:**
- Meta descriptions present
- Title tags optimized
- Unique content score
- Schema markup complete

**Technical Quality:**
- ISR cache hit rate (target: >90%)
- Page load time (target: <2s)
- Build success rate (target: 100%)
- Zero 404 errors

### Opportunity Scoring

**High Priority (Score 90+):**
- New markets with 10k+ monthly searches
- Existing pages with 500+ views but low CTR
- ZIPs with 5+ dispensaries but no page

**Medium Priority (Score 70-89):**
- Markets with 5k+ monthly searches
- Pages with 100+ views, moderate CTR
- ZIPs with 2-4 dispensaries

**Low Priority (Score <70):**
- Markets with <5k monthly searches
- Pages with <100 views
- Single-dispensary ZIPs

---

## 🛠️ Troubleshooting

### Email Not Received

**Check:**
1. GitHub Action success: https://github.com/admin-baked/bakedbot-for-brands/actions
2. SendGrid dashboard for delivery status
3. Spam folder (add notifications@bakedbot.ai to contacts)

**Fix:**
```typescript
// Verify SendGrid API key
process.env.SENDGRID_API_KEY

// Check email template ID
WEEKLY_REVIEW_TEMPLATE_ID
```

### Review Job Failed

**Symptoms:** 500 error, no email sent

**Check:**
1. CRON_SECRET properly configured
2. Review job completing successfully
3. Error logs in Cloud Logging

**Fix:**
```powershell
# Re-grant secret access if needed
firebase apphosting:secrets:grantaccess CRON_SECRET --backend=bakedbot-prod

# Manual test
.\trigger-weekly-review.ps1
```

### Incomplete Data

**Symptoms:** Email shows 0 pages or missing metrics

**Check:**
1. Firestore query permissions
2. Day Day discovery job running
3. Cache warming completing

**Fix:**
```typescript
// Verify Firestore access
db.collection('seo_pages').get()

// Check last discovery run
db.collection('dayday_discovery_log').orderBy('timestamp', 'desc').limit(1)
```

---

## 📋 Monthly Checklist

### Review Email Reports (Every Monday)

- [ ] Open weekly email
- [ ] Review executive summary
- [ ] Note top opportunities
- [ ] Check action items
- [ ] Plan follow-ups

### Quarterly Deep Dive (Every 3 Months)

- [ ] Analyze 12 weeks of data
- [ ] Identify seasonal trends
- [ ] Adjust market priorities
- [ ] Update content strategy
- [ ] Review competitor landscape

### Annual Planning (January)

- [ ] Set yearly growth targets
- [ ] Plan market expansion
- [ ] Budget for infrastructure
- [ ] Evaluate ROI
- [ ] Adjust automation strategy

---

## 📖 Reference Documents

- **GitHub Workflow:** `.github/workflows/dayday-weekly.yaml`
- **Review Endpoint:** `src/app/api/cron/dayday-review/route.ts`
- **Review Logic:** `src/server/jobs/dayday-weekly-review.ts`
- **National Rollout:** `playbooks/super-user-national-rollout.md`

---

## 🎯 Success Metrics

**Weekly:**
- ✅ Email delivered within 10 minutes of review
- ✅ All metrics populated (no nulls)
- ✅ At least 3 opportunities identified
- ✅ Action items clear and actionable

**Monthly:**
- ✅ 4/4 weekly emails delivered
- ✅ Growth trends visible
- ✅ Opportunities actioned
- ✅ Quality scores improving

**Quarterly:**
- ✅ Pages 2× baseline
- ✅ Traffic 3× baseline
- ✅ Quality score >85%
- ✅ ROI positive

---

## 🔗 Quick Links

- **GitHub Actions:** https://github.com/admin-baked/bakedbot-for-brands/actions/workflows/dayday-weekly.yaml
- **SendGrid Dashboard:** https://app.sendgrid.com/
- **Firebase Console:** https://console.firebase.google.com/project/studio-567050101-bc6e8
- **Analytics:** https://bakedbot.ai/dashboard/ceo

---

**Last Updated:** February 15, 2026
**Version:** 1.0
**Next Review:** February 22, 2026 (automated)
