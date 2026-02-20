# Production Spec: Analytics (Pops Agent)

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Pops (Lead Data Analyst)
**Tier:** 2 — Core Product

---

## 1. Feature Overview

Analytics (powered by Pops, the Lead Data Analyst) provides revenue, retention, funnel, and product performance insights for brands and dispensaries. Pops uses a Plan-Execute-Synthesize loop to answer data questions, detect anomalies, validate hypotheses, and coordinate with other agents (Money Mike for margins, Craig for marketing ROI, Mrs. Parker for retention). The system tracks sales by product, category affinity, conversion funnels, channel performance, repeat customer rate, churn, and cohorts. Analytics data is displayed at `/dashboard/analytics` with charts, KPI cards, and Pops' natural language insights.

---

## 2. Current State

### Shipped ✅
- Pops agent implementation (`src/server/agents/pops.ts`) with Plan-Execute-Synthesize loop
- Analytics dashboard UI (`src/app/dashboard/analytics/page.tsx`, `analytics-dashboard.tsx`)
- KPI tracking: totalRevenue, totalOrders, averageOrderValue, repeatCustomerRate, churnRate
- Product analytics: salesByProduct, salesByCategory, affinityPairs
- Funnel analytics: conversionFunnel, channelPerformance
- Cohort analysis: cohorts array with retention data
- Anomaly detection algorithm (`src/server/algorithms/pops-algo.ts`) — statistical z-score check
- Tool definitions: analyzeData(), detectAnomalies(), lettaSaveFact(), lettaUpdateCoreMemory(), lettaMessageAgent()
- Analytics tools: getSearchConsoleStats(), getGA4Traffic(), findSEOOpportunities() (`src/server/agents/tools/analytics-tools.ts`)
- Hypothesis-driven analysis: Pops validates hypotheses from hypotheses_backlog (proposed → running → validated/invalidated)
- Letta Hive Mind integration: shared analyst blocks across Executive agents
- Squad roster + integration status summary (Google Analytics, Search Console, POS, etc.)
- Grounding rules to prevent hallucination (ONLY report queryable metrics, check integration status before claiming data access)

### Partially Working ⚠️
- Analytics data fetched via `getAnalyticsData(brandId)` but unclear if data is real or mocked
- Hypothesis backlog exists in PopsMemory schema but unclear how hypotheses are created (manually or auto-generated)
- Integration status summary shows GA4/Search Console but unclear if actual API connections exist
- Anomaly detection runs but unclear if alerts are surfaced to user (no notification system)
- Pops coordinate with other agents via lettaMessageAgent() but unclear if responses are awaited or fire-and-forget
- Cohort analysis data structure defined but unclear if retention calculation is accurate

### Not Implemented ❌
- Real-time analytics (data refreshed daily, not live)
- Predictive analytics (no forecasting of future revenue/churn)
- Segment builder (no UI to create custom customer segments)
- Export to CSV/Excel (no data export functionality)
- Scheduled reports (no email digest of weekly/monthly analytics)
- Goal tracking (no KPI targets or progress bars)
- Comparative analytics (no period-over-period or competitor benchmarking)

---

## 3. Acceptance Criteria

### Functional
- [ ] User can view analytics dashboard at `/dashboard/analytics` with KPI cards (revenue, orders, AOV, repeat rate, churn)
- [ ] User can see product performance (salesByProduct) sorted by revenue
- [ ] User can see category affinity (which categories are bought together)
- [ ] User can see conversion funnel (page views → add to cart → checkout → purchase)
- [ ] User can see channel performance (organic, paid, social, email)
- [ ] User can ask Pops a data question ("What products are selling best this month?") and get natural language answer
- [ ] Pops detects anomalies in metrics (sudden spike/drop) and flags them
- [ ] Pops validates hypotheses from backlog (proposed → running → validated/invalidated)
- [ ] Pops coordinates with Money Mike for margin analysis ("Which products have best margins?")
- [ ] Pops uses analytics tools (getGA4Traffic, getSearchConsoleStats) when GA4/Search Console integrated
- [ ] Pops cites data sources in responses ("Based on POS data from last 30 days...")
- [ ] Pops shows "No data available" if integration missing, NOT fabricated numbers

### Compliance / Security
- [ ] Analytics data scoped to orgId — no cross-tenant leakage
- [ ] `requireUser()` check on all analytics server actions
- [ ] Pops NEVER fabricates metrics — only reports queryable data
- [ ] Integration credentials (GA4, Search Console API keys) never exposed to client
- [ ] Revenue data redacted for non-admin roles (brand_member sees trends, not exact $)

### Performance
- [ ] Analytics dashboard loads in < 2s for brands with 1000+ orders
- [ ] Pops responds to data questions in < 15s (Plan → Execute → Synthesize loop)
- [ ] Anomaly detection runs in < 5s for 90-day metric history
- [ ] Cohort analysis calculates in < 10s for 12-month window

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| Unclear if analytics data is real or mocked | 🔴 Critical | `getAnalyticsData()` may return placeholder data — needs validation |
| No anomaly alerts surfaced to user | 🟡 High | Anomalies detected but invisible — no notification system |
| Hypothesis creation unclear | 🟡 High | Backlog exists but unclear how hypotheses are added (manual or auto) |
| Integration status unclear | 🟡 High | GA4/Search Console shown as available but unclear if actually connected |
| No real-time analytics | 🟡 High | Data refreshed daily — lag for fast-moving dispensaries |
| lettaMessageAgent() unclear if awaited | 🟡 High | Agent coordination may be fire-and-forget — responses not used |
| Cohort retention calculation unclear | 🟡 High | Data structure exists but math needs validation |
| No predictive analytics | 🟢 Low | Can't forecast future revenue/churn |
| No segment builder | 🟢 Low | Can't create custom customer segments |
| No export functionality | 🟢 Low | Can't download analytics as CSV |
| No scheduled reports | 🟢 Low | No weekly/monthly email digests |

---

## 5. Test Coverage

### Existing Tests
None found for Pops agent or analytics dashboard.

### Missing Tests (Required for Production-Ready)
- [ ] `pops-agent-plan-execute-synthesize.unit.test.ts` — validates Pops' Plan-Execute-Synthesize loop with mock tools
- [ ] `pops-anomaly-detection.unit.test.ts` — validates statistical z-score anomaly detection
- [ ] `pops-hypothesis-validation.unit.test.ts` — validates hypothesis backlog flow (proposed → running → validated)
- [ ] `pops-analytics-tools.integration.test.ts` — validates getGA4Traffic, getSearchConsoleStats with mock APIs
- [ ] `pops-grounding-rules.unit.test.ts` — validates Pops says "No data available" when integration missing (not fabricated numbers)
- [ ] `analytics-dashboard-kpi.unit.test.ts` — validates KPI card calculations (revenue, AOV, churn)
- [ ] `analytics-dashboard-cohort.unit.test.ts` — validates cohort retention calculation
- [ ] `analytics-data-scoping.integration.test.ts` — validates orgId scoping (no cross-tenant leakage)

### Golden Set Eval
Not applicable — Pops' golden set would cover data analysis quality, but no set exists yet. Recommend creating `.agent/golden-sets/pops-analytics.json` with 20+ data question scenarios.

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| POS sync | Provides sales data | Analytics show empty state ("No orders yet") |
| Firestore | Stores analytics aggregations | Analytics re-calculate from raw orders (slow) |
| Money Mike | Provides margin data | Pops can't answer "Which products have best margins?" |
| Craig | Provides campaign ROI | Pops can't answer "Which campaigns drove most revenue?" |
| Letta | Shared analyst blocks (Hive Mind) | Pops loses cross-session memory |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| Google Analytics 4 | Website traffic data | Show "GA4 not connected" + prompt to integrate |
| Google Search Console | SEO performance data | Show "Search Console not connected" + prompt to integrate |

---

## 7. Degraded Mode

- **If POS sync is down:** Analytics show last-known data with "Data may be outdated" banner.
- **If Firestore aggregations missing:** Re-calculate from raw orders (slower, but functional).
- **If GA4 API fails:** Show "GA4 data unavailable" + fall back to POS-only analytics.
- **If Pops times out:** Show "Pops is crunching the numbers... this may take a minute" spinner, retry after 30s.
- **Data loss risk:** If analytics aggregations are deleted, must re-calculate from all historical orders (expensive). Mitigation: Daily backup of analytics Firestore docs.

---

## 8. Open Questions

1. **Analytics data validation**: Is `getAnalyticsData()` returning real POS data, or mocked/placeholder data? Needs production validation.
2. **Hypothesis creation**: How are hypotheses added to Pops' backlog? Manual input, auto-generated from trends, or both?
3. **Anomaly alerts**: Should anomalies trigger Slack/email alerts, or just appear in dashboard?
4. **Agent coordination**: When Pops calls `lettaMessageAgent()` to coordinate with Money Mike/Craig, are responses awaited or fire-and-forget?
5. **Real-time analytics**: Should we build live dashboards (WebSocket updates), or is daily refresh sufficient for cannabis retail?
6. **Predictive analytics**: Should we add revenue forecasting (ARIMA, linear regression), or is historical analysis sufficient?
7. **Scheduled reports**: Should Pops auto-send weekly/monthly analytics emails, or rely on users checking dashboard?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit |
