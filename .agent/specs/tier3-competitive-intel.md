# Production Spec: Competitive Intelligence (Ezal)

**Last updated:** 2026-02-19
**Spec status:** 🔴 Gaps Identified
**Owner agent(s):** Ezal (Lookout)
**Tier:** 3 — Supporting Systems

---

## 1. Feature Overview

Competitive Intelligence (Ezal agent) is the automated market monitoring system that tracks competitors' pricing, deals, and product strategies. Daily cron job scrapes competitor data via RTRVR browser automation, stores snapshots in Firestore (`tenants/{orgId}/competitor_snapshots`), generates weekly markdown reports with pricing gaps and recommendations, saves reports to Drive (`competitive_intel_drive_files`), creates Inbox notifications (market_intel type), and sends email summaries via Mailjet. Real-time alerts detect price drops (>30%), pricing strategy changes, and new product launches. Ezal agent reads Drive reports via `readDriveFile()` and `listCompetitiveReports()` tools. Currently deployed for Thrive Syracuse with 4 seeded competitors, 15 test snapshots, and Cloud Scheduler job running daily at 9 AM EST.

---

## 2. Current State

### Shipped ✅
- **Competitor registration**: `tenants/{orgId}/competitors` collection with fields: `name`, `website`, `distance`, `location`, `active` (`memory/competitive-intel.md:38-43`)
- **Snapshot scraping**: RTRVR browser automation scrapes competitor websites, stores raw data in `competitor_snapshots` collection (`memory/competitive-intel.md:40`)
- **Weekly report generation**: `generateWeeklyIntelReport()` aggregates last 7 days of snapshots, builds markdown report with sections per competitor (pricing strategy, top deals, avg price) (`src/server/services/ezal/weekly-intel-report.ts`)
- **Drive integration**: `saveReportToDrive()` uploads markdown to Firebase Storage, creates `drive_files` doc (visible in Drive UI), creates `competitive_intel_drive_files` index doc (`memory/competitive-intel.md:66`)
- **Inbox notifications**: `createInboxNotification()` creates market_intel thread in Inbox, links to Drive report (`memory/competitive-intel.md:66`)
- **Email alerts**: `sendReportEmail()` via Mailjet to org admin (with tenant doc fallback to users query) (`memory/competitive-intel.md:70-76`)
- **Real-time alerts**: `analyzeCompetitorChanges()` detects 3 alert types (price_drop_major >30%, pricing_strategy_change, new_product_launch >50% deal count increase), saves to `competitor_alerts` collection (`memory/competitive-intel.md:82-88`)
- **Ezal agent tools**: `readDriveFile(reportId)`, `listCompetitiveReports(orgId, limit)` (Ezal can read Drive reports directly) (`memory/competitive-intel.md:92-96`)
- **Daily cron job**: Cloud Scheduler `thrive-competitive-intel` → `POST /api/cron/competitive-intel` with `{ orgId }` payload (`memory/competitive-intel.md:11-18`)
- **Pricing dashboard card**: `competitive-intel-card.tsx` shows latest report summary in `/dashboard/pricing` (`memory/competitive-intel.md:31`)

### Partially Working ⚠️
- **RTRVR scraping**: Test snapshots seeded manually for Thrive — RTRVR scraper integrated but NOT verified live (no proof of daily auto-scrapes)
- **Playbook template**: `playbook_templates/competitive_intel_daily` exists for future pilots but NOT tested with real org (only Thrive direct endpoint) (`memory/competitive-intel.md:100`)
- **Competitor seeding**: `seed-thrive-competitors.ts` script is Thrive-specific — no generic seeding tool for new orgs
- **Email fallback logic**: Tenant doc fallback to users query works for Thrive but NOT tested with orgs that have tenant docs (may skip admin detection)
- **Alert notifications**: Alerts saved to Firestore but NO Slack/SMS integration (alerts silent until user checks Inbox)

### Not Implemented ❌
- **Competitive pricing recommendations**: `competitive-pricing.ts` exists but NO UI to apply recommendations (just Drive report parsing)
- **Competitor CRUD UI**: No admin page to add/edit/delete competitors (must use scripts)
- **Snapshot history viewer**: No UI to view historical snapshots (raw data invisible to users)
- **Price trend charts**: No visualization of competitor pricing over time (data exists, no charts)
- **Multi-market support**: Assumes single geographic market per org (no regional competitor sets)
- **Scraper health monitoring**: No alerts if RTRVR scraping fails (silent failures)
- **Competitor benchmarking**: No side-by-side comparison of org's pricing vs competitors
- **Alert preferences**: No org-level settings to configure alert thresholds (hardcoded 30%, 50%)
- **Automatic competitor discovery**: No geocoding-based competitor finder (must manually seed)

---

## 3. Acceptance Criteria

### Functional
- [ ] Daily cron job scrapes ALL active competitors for org and saves snapshots to Firestore
- [ ] Weekly report generation aggregates last 7 days of snapshots and builds markdown with pricing gaps + recommendations
- [ ] Weekly report saved to Drive and visible in Drive UI with "Competitive Intel" category
- [ ] Inbox notification created with link to Drive report (market_intel type, Ezal as sender)
- [ ] Email sent to org admin with report summary (with fallback to users query if tenant doc missing)
- [ ] Real-time alerts detect price_drop_major (>30%), pricing_strategy_change, new_product_launch (>50%)
- [ ] Alerts saved to `competitor_alerts` collection and create Inbox threads
- [ ] Ezal agent can read Drive reports via `readDriveFile()` and answer competitor questions
- [ ] `listCompetitiveReports()` returns available reports sorted by date
- [ ] Pricing dashboard shows latest report summary with top competitor deals

### Compliance / Security
- [ ] Competitor scraping MUST respect robots.txt (RTRVR validation)
- [ ] Scraped data MUST NOT include customer PII (only public pricing/product data)
- [ ] Drive reports MUST be org-scoped (no cross-org access to competitor data)
- [ ] Inbox notifications MUST be org-scoped (no leakage to other orgs)
- [ ] Email alerts MUST only send to org admins (role-gated recipient list)
- [ ] RTRVR scraping MUST rotate user agents + IPs to avoid detection/blocking

### Performance
- [ ] Competitor scraping completes in < 2 min per competitor (RTRVR timeout)
- [ ] Weekly report generation completes in < 30s for orgs with < 10 competitors
- [ ] Drive report upload completes in < 5s for markdown files < 50KB
- [ ] Ezal `readDriveFile()` completes in < 2s (Firebase Storage download)
- [ ] Alert detection runs in < 10s per competitor (Firestore query + analysis)

---

## 4. Known Gaps / Tech Debt

| Gap | Severity | Notes |
|-----|----------|-------|
| No RTRVR scraper verification | 🔴 Critical | Test snapshots seeded manually — no proof of daily auto-scrapes |
| No competitor CRUD UI | 🔴 Critical | Must use scripts to add/edit competitors — not scalable for new pilots |
| No scraper health monitoring | 🟡 High | RTRVR failures silent — no alerts if scraping stops |
| No pricing recommendation UI | 🟡 High | `competitive-pricing.ts` exists but no way to apply recommendations |
| Alert notifications silent | 🟡 High | Alerts saved but no Slack/SMS integration (must check Inbox) |
| No price trend charts | 🟡 High | Historical data exists but no visualization (can't see trends) |
| No competitor seeding tool | 🟡 High | `seed-thrive-competitors.ts` is Thrive-specific — need generic script |
| Email fallback untested | 🟡 High | Works for Thrive (no tenant doc) but not tested with orgs that have tenant docs |
| No alert threshold settings | 🟢 Low | Hardcoded 30%, 50% — no org-level customization |
| No automatic competitor discovery | 🟢 Low | Must manually seed competitors — no geocoding-based finder |
| No multi-market support | 🟢 Low | Assumes single market per org — can't track multiple regions |
| No competitor benchmarking UI | 🟢 Low | No side-by-side pricing comparison (data exists, no UI) |

---

## 5. Test Coverage

### Existing Tests
| Test | Location | Coverage |
|------|----------|---------|
| None | — | No tests exist for competitive intelligence system |

### Missing Tests (Required for Production-Ready)
- [ ] `competitive-intel-scraping.integration.test.ts` — validates RTRVR scraper saves snapshots to Firestore
- [ ] `competitive-intel-report-generation.integration.test.ts` — validates weekly report markdown structure + Drive save
- [ ] `competitive-intel-alerts.unit.test.ts` — validates alert detection logic (price_drop_major, pricing_strategy_change, new_product_launch)
- [ ] `competitive-intel-email.integration.test.ts` — validates Mailjet email send with tenant doc fallback
- [ ] `competitive-intel-ezal-tools.integration.test.ts` — validates `readDriveFile()` and `listCompetitiveReports()` agent tools
- [ ] `competitive-intel-cron.e2e.test.ts` — validates full cron flow (scrape → report → Drive → Inbox → email)

### Golden Set Eval
| Golden Set | Location | Threshold | Last Run |
|------------|----------|-----------|---------|
| None | — | — | Never |

Note: Ezal agent has no golden set yet. Should add eval for "Ezal reads Drive report and answers competitor questions" (10-15 test cases).

---

## 6. Dependencies

### Internal
| System | Why needed | Failure mode |
|--------|-----------|-------------|
| Firestore `competitor_snapshots` | Stores scraped competitor data | No snapshots → report generation fails (empty report) |
| Drive system | Stores weekly reports | Reports generated but not visible in UI (Inbox link broken) |
| Inbox | Notifies org admin of new reports | Reports generated but admin not notified |
| requireUser | Auth gate for pricing dashboard | Public access to competitor data (CRITICAL security failure) |

### External Services
| Service | Purpose | Fallback |
|---------|---------|---------|
| RTRVR | Browser automation for competitor scraping | Manual seeding of test snapshots (scraping stops) |
| Mailjet | Email alerts for weekly reports | None — email notifications fail silently |
| Firebase Storage | Stores Drive report markdown files | Drive reports inaccessible (404 on download) |

---

## 7. Degraded Mode

- **If RTRVR is down:** No new snapshots scraped. Weekly report uses last available snapshots (stale data). Email alert warns "No new competitor data this week".
- **If Firestore `competitor_snapshots` unavailable:** Report generation fails. Email alert sent to admin: "Competitive intel report unavailable due to database error".
- **If Drive system down:** Report generated but not saved to Drive. Inbox notification created without Drive link. Email includes report summary inline.
- **If Mailjet down:** Report generated, Drive saved, Inbox notification created, but NO email sent. Silent failure (no retry).
- **If Ezal agent tools fail:** Ezal can't read Drive reports. Falls back to "I don't have access to the latest competitor data" response.
- **Data loss risk:** If RTRVR scrapes but Firestore write fails, scraped data lost (no retry). Mitigation: RTRVR should write to temporary storage before Firestore.

---

## 8. Open Questions

1. **RTRVR scraper verification**: How do we verify RTRVR is actually scraping daily? Should we add scraper health check to heartbeat monitor?
2. **Competitor seeding workflow**: Should we build admin UI for adding competitors, or require manual scripts for every pilot?
3. **Alert threshold customization**: Should alert thresholds (30%, 50%) be org-configurable, or keep hardcoded for all orgs?
4. **Pricing recommendation application**: Should recommendations auto-apply to pricing dashboard, or require manual review + approval?
5. **Multi-market support**: Should orgs be able to track competitors in multiple cities/regions (e.g. chain dispensaries)?
6. **Automatic competitor discovery**: Should we use Google Places API + geocoding to auto-discover nearby competitors?
7. **Scraper frequency**: Daily at 9 AM EST is current schedule — should we offer hourly/weekly options?
8. **Snapshot retention**: How long should we keep snapshots? 30 days? 90 days? Forever?
9. **Alert notifications**: Should alerts send Slack/SMS immediately, or only show in Inbox?
10. **Competitor benchmarking**: Should we build side-by-side pricing comparison UI, or keep Drive reports only?

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-02-19 | Claude Code (audit) | Initial draft — based on codebase audit + memory/competitive-intel.md |
