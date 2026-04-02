# Thrive Syracuse — Go-Live Master Playbook
**Date:** 2026-03-31 | **Go-Live:** 2026-04-01
**Tester:** Claude (AI Agent, browser-loop mode)
**Environment:** Production — `bakedbot.ai/thrivesyracuse`
**Test Contact:** Martez Anderson | martezandco@gmail.com | 312-684-0522
**Loop Strategy:** Run full suite → log findings → fix → re-run until P0/P1 count = 0

> **This is the single source of truth for Thrive Syracuse launch.**
> It combines go-live testing (15 modules, 2 personas) with all natural language playbooks and automations.

---

## Table of Contents

1. [Briefing Card System](#-briefing-card-system)
2. [Natural Language Playbooks & Automations](#-natural-language-playbooks--automations)
3. [Pre-Flight Checklist](#-pre-flight-checklist)
4. [Persona A: Dispensary Manager (Modules 1–12)](#-persona-a-dispensary-manager)
5. [Persona B: Customer Experience (Modules 13–15)](#-persona-b-customer-experience)
6. [P0 / P1 Bug Criteria](#-p0-bug-criteria)
7. [Screenshot Requirements](#-screenshot-requirements)
8. [Loop Protocol](#-loop-protocol)
9. [Launch Approval Criteria](#-launch-approval-criteria)
10. [Per-Loop Summary Card Template](#-per-loop-summary-card-template)
11. [Post-Deploy Retest Addendum](#post-deploy-retest-addendum)

---

## 📋 Briefing Card System

Each test module produces a **Review Briefing Card** — a structured summary card agents fill in after running that module. Cards follow the same schema as inbox insight cards so they can be surfaced in the dispensary briefing panel. On each loop re-run the agent overwrites the prior card with fresh observations.

### Card Schema

```json
{
  "id": "test-{module}-{loop-number}",
  "loop": 1,
  "runAt": "2026-03-31T14:00:00Z",
  "module": "check-in",
  "agentId": "mrs_parker",
  "agentName": "Mrs. Parker",
  "title": "CHECK-IN FLOW",
  "status": "pass | fail | partial",
  "severity": "success | info | warning | critical",
  "headline": "Welcome Playbook firing ✓",
  "subtext": "Email delivered to martezandco@gmail.com in 4s",
  "metric": { "label": "Email delivery time", "value": "4s", "trend": "up" },
  "finding": null,
  "recommendation": null,
  "uxIssue": null,
  "ctaLabel": "View Check-Ins",
  "threadType": "customer_health",
  "screenshotPath": "dev/testing/screenshots/thrive_golive_2026-03-31/module2_checkin_result.png"
}
```

### Status Definitions

| Status | Meaning | Inbox Card Color |
|--------|---------|-----------------|
| `pass` | All steps completed as expected | Green / success |
| `partial` | Mostly working, minor issues found | Amber / warning |
| `fail` | Blocking issue — P0 or P1 | Red / critical |
| `skip` | Not tested this loop | Gray / info |

### Agent Assignment Per Module

| Module | Owner Agent | Why |
|--------|-------------|-----|
| 1 — Dashboard | Pops | Analytics & KPI owner |
| 2 — Check-In | Mrs. Parker | Loyalty & customer enrollment |
| 3 — Loyalty Tablet | Mrs. Parker | Loyalty capture device |
| 4 — Rewards Page | Mrs. Parker | Consumer loyalty UI |
| 5 — Playbooks | Mrs. Parker | Welcome sequence owner |
| 6 — CRM | Mrs. Parker | Customer records |
| 7 — Inbox | Leo | Workspace orchestration |
| 8A — Smokey | Smokey | Product search agent |
| 8B — Craig | Craig | Campaign & creative |
| 8C — Mrs. Parker | Mrs. Parker | Retention flows |
| 8D — Pops | Pops | Analytics |
| 8E — Ezal | Ezal | Competitive intel |
| 8F — Deebo | Deebo | Compliance |
| 9 — Creative Center | Craig | Content generation |
| 10 — Intelligence | Ezal | Market data |
| 11 — Settings | Linus | Admin/config |
| 12 — Orders | Pops | Commerce ops |
| 13 — Consumer Page | Smokey | Consumer experience |
| 14 — Loyalty Sign-Up | Mrs. Parker | Consumer enrollment |
| 15 — Consumer Prompts | Smokey | Budtender skill |

---

## 🤖 Natural Language Playbooks & Automations

These are intent-driven automations running behind the scenes for Thrive. Each maps to a cron route and Cloud Scheduler job. All deliver to martez@bakedbot.ai via Mailjet and post to #thrive-syracuse-pilot Slack.

---

### Playbook 1 — FlnnStoned Competitive Deep Dive

**Playbook ID:** `flnnstoned-competitive-deep-dive`
**Agent:** Ezal
**Intent:** "Research FlnnStoned Cannabis and run a detailed competitive analysis. Email it to martez@bakedbot.ai."
**Schedule:** Weekly, Monday 9:00 AM ET
**Cron route:** `POST /api/cron/flnnstoned-competitive-analysis`

**What it does:**
- Pulls FlnnStoned menu data from Ezal's competitor profile store (`competitor_profiles` collection)
- Compares pricing on flower, vapes, edibles vs Thrive Alleaves inventory
- Identifies active promos, new products, pricing gaps
- Claude Sonnet synthesizes: executive summary + pricing analysis + 3–5 opportunity gaps + 3 action items
- Sends branded HTML email to martez@bakedbot.ai
- Posts summary card to #thrive-syracuse-pilot Slack
- Saves report to `competitive_reports` Firestore collection

**Cloud Scheduler setup:**
```bash
gcloud scheduler jobs create http flnnstoned-competitive-analysis \
  --schedule="0 9 * * 1" \
  --time-zone="America/New_York" \
  --uri="https://bakedbot.ai/api/cron/flnnstoned-competitive-analysis" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body="{}" \
  --project=studio-567050101-bc6e8
```

**Output sample:**
```
Subject: 🕵️ FlnnStoned Competitive Deep Dive — Mar 31
To: martez@bakedbot.ai

Executive Summary:
FlnnStoned is running a 20% off flower sale this week...

Action Items:
1. Match FlnnStoned's 1/8 price point ($35 → $33) on Gorilla Glue
2. Launch counter-promotion: "Better Buds, Better Price" this weekend
3. Add 3 new edibles SKUs — FlnnStoned's edibles section doubled this month
```

**Manual test trigger:**
```bash
curl -X POST https://bakedbot.ai/api/cron/flnnstoned-competitive-analysis \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
# Expected: email delivered to martez@bakedbot.ai within 30s
```

---

### Playbook 2 — Daily Sales Highlights

**Playbook ID:** `daily-sales-highlights`
**Agent:** Pops (Analytics)
**Intent:** "Daily Summary of Previous Sales and Highlights"
**Schedule:** Daily, 8:00 PM ET
**Cron route:** `POST /api/cron/daily-sales-summary`

**What it does:**
- Pulls all completed orders from the current day
- Computes: total revenue, order count, avg transaction, top 5 products (units + revenue)
- Splits customers: new vs returning
- Identifies peak sales hour
- Compares vs prior day (% change)
- Claude Haiku synthesizes highlights and tomorrow's recommended promotions
- Sends HTML email to martez@bakedbot.ai
- Posts Slack summary with key metrics to #thrive-syracuse-pilot
- Writes `daily_sales_summary` artifact to inbox

**Cloud Scheduler setup:**
```bash
gcloud scheduler jobs create http daily-sales-summary \
  --schedule="0 20 * * *" \
  --time-zone="America/New_York" \
  --uri="https://bakedbot.ai/api/cron/daily-sales-summary" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body="{}" \
  --project=studio-567050101-bc6e8
```

**Output sample:**
```
Subject: ✅ Thrive Daily Sales — $1,240 · Up 18% from yesterday
To: martez@bakedbot.ai

Revenue: $1,240 | Orders: 31 | Avg: $40 | Peak: 3 PM

Top Products:
1. Blue Dream 3.5g — 12 units, $420
2. Gorilla Glue Vape — 9 units, $270
...

Tomorrow's Actions:
1. Run a flash deal on slow-moving pre-rolls (12 units stagnant)
2. SMS the 8 new customers from today with a loyalty enrollment prompt
```

**Manual test trigger:**
```bash
curl -X POST https://bakedbot.ai/api/cron/daily-sales-summary \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
# Expected: email + Slack post within 15s
```

---

### Playbook 3 — Revenue Pace Alert

**Playbook ID:** `revenue-pace-alert`
**Agent:** Pops (Analytics)
**Intent:** "Revenue above $100/hour notification"
**Schedule:** Every 15 minutes (sub-daily)
**Cron route:** `POST /api/cron/playbooks/sub-daily`

**What it does:**
- Polls every 15 minutes via sub-daily cron
- Checks orders created in the last 60 minutes
- If revenue > threshold ($100 default, configurable per org), fires alert
- Posts to Slack #thrive-syracuse-pilot and writes `inbox_notifications` doc
- **Deduplicates:** max 1 alert per hour per org (stored in `revenue_alert_dedup`)

**Threshold configuration:**
Set per org in Firestore: `tenants/org_thrive_syracuse.settings.revenueAlertThresholdUsd`
```
Default: $100/hour
Recommended for Thrive launch week: $50/hour (lower bar to build confidence)
```
Or via CEO dashboard: Settings → Notifications → Revenue Alert Threshold

**Cloud Scheduler setup:**
```bash
gcloud scheduler jobs create http playbooks-sub-daily \
  --schedule="*/15 * * * *" \
  --time-zone="America/New_York" \
  --uri="https://bakedbot.ai/api/cron/playbooks/sub-daily" \
  --http-method=POST \
  --headers="Authorization=Bearer $CRON_SECRET,Content-Type=application/json" \
  --message-body="{}" \
  --project=studio-567050101-bc6e8
```

**Slack alert sample:**
```
🚀 Revenue Pace Alert — Thrive Syracuse
$147 in the last 60 minutes
Threshold: $100 · Time: 2:45 PM ET
```

**Manual test trigger:**
```bash
# Lower threshold temporarily to $0.01 to test with any order data, then:
curl -X POST https://bakedbot.ai/api/cron/playbooks/sub-daily \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
# Expected: Slack alert if any orders in last 60 min
```

---

### Playbook 4 — Weekly Loyalty Health Report

**Playbook ID:** `weekly-loyalty-health`
**Agent:** Craig
**Intent:** "Weekly overview of loyalty program health and retention targets"
**Schedule:** Weekly, Monday 9:00 AM ET
**Cron route:** `POST /api/cron/playbooks/weekly` (included in weekly runner)

**What it does:**
- Enrolled count, tier breakdown (active/at-risk/dormant), top 5 VIPs by LTV
- Week-over-week loyalty trend, SMS/email opt-in rates
- Win-back targets with names + days inactive

*Cloud Scheduler: covered by existing `playbooks-weekly` job. No new job needed.*

---

### Playbook 5 — Daily Check-In Digest

**Playbook ID:** `daily-checkin-digest`
**Agent:** Craig
**Intent:** "End-of-day summary of tablet check-ins and consent rates"
**Schedule:** Daily, 8:00 PM ET
**Cron route:** `POST /api/cron/playbooks/daily` (included in daily runner)

**What it does:**
- Today's check-in count (new vs returning)
- Mood breakdown from loyalty tablet kiosk
- SMS/email consent rates
- Review sequence queue size
- Tomorrow's follow-up priority list

*Cloud Scheduler: covered by existing `playbooks-daily` job. No new job needed.*

---

### Cloud Scheduler Summary

| Job Name | Schedule | Endpoint | Status |
|----------|----------|----------|--------|
| `flnnstoned-competitive-analysis` | `0 9 * * 1` (Mon 9AM ET) | `/api/cron/flnnstoned-competitive-analysis` | **New — needs deploy** |
| `daily-sales-summary` | `0 20 * * *` (8PM ET daily) | `/api/cron/daily-sales-summary` | **New — needs deploy** |
| `playbooks-sub-daily` | `*/15 * * * *` (every 15 min) | `/api/cron/playbooks/sub-daily` | **New — needs deploy** |
| `playbooks-daily` | `0 7 * * *` (7AM ET daily) | `/api/cron/playbooks/daily` | Existing ✅ |
| `playbooks-weekly` | `0 9 * * 1` (Mon 9AM ET) | `/api/cron/playbooks/weekly` | Existing ✅ |

---

## 🔄 Reload = New Insights Rule

**When any briefing card is reloaded (refresh button clicked or 60s poll fires):**

1. `regenerateInsights()` runs automatically — `InventoryVelocityGenerator` + `CustomerInsightsGenerator` re-execute against live Alleaves data
2. After generators complete, `getInsights()` fetches the new Firestore-persisted cards
3. Cards replace previous cards in the grid — no stale data
4. `lastUpdated` timestamp on the card header updates to reflect the new run time

**Code path (live):**
- `use-insights.ts`: initial mount fires `fetchInsights()` immediately (shows existing data fast), then 800ms later silently runs `fetchInsights(true, true)` (regenerate + re-fetch, no spinner)
- Manual refresh button: `fetchInsights(true)` — runs generators + shows refresh spinner
- 60s poll: `fetchInsights(true)` — same as manual refresh

**Test verification:** After each loop iteration, click the refresh button on the inbox briefing panel and confirm the `lastUpdated` timestamp changes and card headlines reflect the latest Alleaves + customer data.

---

## 🔑 Pre-Flight Checklist

Run these before beginning any module testing.

| # | Check | URL / Action | Expected |
|---|-------|-------------|----------|
| 1 | Brand page resolves | `bakedbot.ai/thrivesyracuse` | Landing page renders with Thrive branding |
| 2 | Rewards page resolves | `bakedbot.ai/thrivesyracuse/rewards` | Loyalty card with QR + "Add to Home Screen" |
| 3 | Dashboard login | `bakedbot.ai/dashboard` | Redirects to login if unauth'd |
| 4 | Dispensary login works | Login with Thrive manager credentials | Lands on dispensary dashboard |
| 5 | Health endpoint | `bakedbot.ai/health` | `{ status: "ok" }` or equivalent |
| 6 | Loyalty tablet | `bakedbot.ai/loyalty-tablet` | 6-step kiosk loads, full screen |

---

## 🏪 PERSONA A: Dispensary Manager

**Account:** Thrive Syracuse manager account
**Dashboard:** `/dashboard/dispensary`

---

### Module 1: Dashboard Home

**URL:** `/dashboard/dispensary`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 1.1 | Load dispensary dashboard | KPI grid loads — Today's Revenue, Orders, New Customers, Loyalty Members | ✅ | YES |
| 1.2 | Check sidebar navigation | All nav items visible and labeled correctly | ✅ | YES |
| 1.3 | Check morning briefing / insight cards | Cards render with data (no blank/spinner states) | ✅ | YES |
| 1.4 | Click on each KPI tile | Drilldown or tooltip appears | ✅ | YES |
| 1.5 | Mobile viewport (375px) | Layout compresses cleanly, no overflow | ✅ | YES |
| 1.6 | Click refresh button on briefing cards | `lastUpdated` timestamp changes, generators re-run, cards update | ✅ | YES |
| 1.7 | Reload page → briefing cards | Cards auto-update within ~1s via background regeneration (no manual refresh needed) | ✅ | YES |

**Review Briefing Card — Module 1**
```json
{
  "id": "test-module1-loop1",
  "module": "dashboard-home",
  "agentId": "pops",
  "title": "DASHBOARD HOME",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. KPI grid loaded with live Alleaves data ]",
  "subtext": "[ e.g. All 5 KPI tiles populated, sidebar 12 items visible ]",
  "finding": "[ describe any issue, or null ]",
  "recommendation": "[ fix suggestion, or null ]",
  "uxIssue": "[ e.g. KPI tile text truncates on 375px viewport, or null ]"
}
```

---

### Module 2: Customer Check-In Flow ⭐ CRITICAL — PRIMARY LAUNCH FLOW

**URL:** `/dashboard/dispensary/checkin`
**Test Contact:** martezandco@gmail.com / 312-684-0522 / Martez

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 2.1 | Navigate to `/dashboard/dispensary/checkin` | Check-in form renders | ✅ | YES |
| 2.2 | Enter phone: `312-684-0522` | Customer lookup fires | ✅ | YES |
| 2.3 | New customer flow | If not found → new customer form appears | ✅ | YES |
| 2.4 | Enter: Name=Martez, Email=martezandco@gmail.com | Form accepts input | ✅ | YES |
| 2.5 | Submit check-in | Customer created + `checkin_visits` doc written | ✅ | YES |
| 2.6 | Welcome Playbook enrollment | Martez enrolled in Welcome Playbook automatically | ✅ | YES |
| 2.7 | Welcome email trigger | Email sent to martezandco@gmail.com | ✅ | YES |
| 2.8 | `reviewSequence` field set | `status: 'pending'` on checkin_visits doc | ✅ | YES |
| 2.9 | Re-check-in same number | Returns existing customer record, increments visit count | ✅ | YES |
| 2.10 | Check customer appears in CRM | Navigate to Customers tab, search "Martez" | ✅ | YES |

> **⚠️ Steps 2.6 and 2.7 are P0 for launch.** Welcome Playbook must fire and email must deliver.

**Review Briefing Card — Module 2**
```json
{
  "id": "test-module2-loop1",
  "module": "check-in",
  "agentId": "mrs_parker",
  "title": "CHECK-IN FLOW",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. Welcome Playbook enrolled + email delivered ✓ ]",
  "subtext": "[ e.g. martezandco@gmail.com received email in 6s, checkin_visits doc written ]",
  "metric": { "label": "Email delivery time", "value": "[ Xs ]", "trend": "[ up/down ]" },
  "finding": "[ e.g. reviewSequence.status was null on first checkin, or null ]",
  "recommendation": "[ e.g. Check captureTabletLead sets reviewSequence on all paths, or null ]",
  "uxIssue": "[ e.g. Form submit button disabled state persists after success, or null ]"
}
```

---

### Module 3: Loyalty Tablet Kiosk

**URL:** `/loyalty-tablet`
**Device:** iPad / tablet-sized viewport (1024×768)

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 3.1 | Open tablet URL | Welcome screen: "Touch to Begin" | ✅ | YES |
| 3.2 | Tap to begin | Step 1: Phone number input | ✅ | YES |
| 3.3 | Enter `312-684-0522` | Moves to Step 2: Email | ✅ | YES |
| 3.4 | Enter `martezandco@gmail.com` | Moves to Step 3: Mood selection | ✅ | YES |
| 3.5 | Select mood (e.g., "Energized") | Moves to Step 4: Recommendations loading | ✅ | YES |
| 3.6 | Claude Haiku recommendations | 3 products + 1 bundle from Alleaves inventory appear | ✅ | YES |
| 3.7 | Product cards display correctly | Image, name, THC%, price visible | ✅ | YES |
| 3.8 | Complete flow → Success screen | "You're in! Check your phone for your loyalty card." | ✅ | YES |
| 3.9 | 20-second idle reset | Timer resets back to welcome screen | ✅ | YES |
| 3.10 | Try invalid phone (too short) | Input validation error shown | ✅ | YES |

**Review Briefing Card — Module 3**
```json
{
  "id": "test-module3-loop1",
  "module": "loyalty-tablet",
  "agentId": "mrs_parker",
  "title": "LOYALTY TABLET",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. 6-step kiosk completed without error ]",
  "subtext": "[ e.g. Claude Haiku returned 3 products + 1 bundle, idle reset fired at 20s ]",
  "metric": { "label": "Haiku response time", "value": "[ Xs ]", "trend": "[ up/down ]" },
  "finding": "[ describe any issue, or null ]",
  "recommendation": "[ fix suggestion, or null ]",
  "uxIssue": "[ e.g. Product card images missing for 2/3 Haiku recs — fetchMenuProducts returning no imageUrl, or null ]"
}
```

---

### Module 4: Rewards Page (Customer-Facing)

**URL:** `bakedbot.ai/thrivesyracuse/rewards`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 4.1 | Load page | Thrive Syracuse branding, loyalty card visual | ✅ | YES |
| 4.2 | QR code renders | QR visible and scannable | ✅ | YES |
| 4.3 | "Add to Home Screen" button | Prompts PWA install on iOS/Android | ✅ | YES |
| 4.4 | "How It Works" section | Text renders correctly (no apostrophe bugs) | ✅ | YES |
| 4.5 | Points tiers display | Shows tier structure correctly | ✅ | YES |
| 4.6 | Google Wallet button | Visible; tap initiates Wallet pass flow | ✅ | YES |
| 4.7 | Mobile (iPhone SE viewport 375px) | Layout holds, no overflow | ✅ | YES |

**Review Briefing Card — Module 4**
```json
{
  "id": "test-module4-loop1",
  "module": "rewards-page",
  "agentId": "mrs_parker",
  "title": "REWARDS PAGE",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. Loyalty card renders with Thrive branding + QR ]",
  "subtext": "[ e.g. PWA install prompt fired on iOS, Google Wallet button visible ]",
  "finding": "[ describe any issue, or null ]",
  "recommendation": "[ fix suggestion, or null ]",
  "uxIssue": "[ e.g. 'Add to Home Screen' copy overlaps QR on 375px, or null ]"
}
```

---

### Module 5: Playbooks

**URL:** `/dashboard/playbooks`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 5.1 | Load playbooks page | List of active playbooks for Thrive | ✅ | YES |
| 5.2 | Find "Welcome Playbook" | Visible in list, shows enrolled count | ✅ | YES |
| 5.3 | Click Welcome Playbook | Detail view: sequence, enrolled customers | ✅ | YES |
| 5.4 | Verify Martez enrolled | Search enrolled list for martezandco@gmail.com | ✅ | YES |
| 5.5 | Manually trigger email for Martez | "Send Welcome Email" button → success toast | ✅ | YES |
| 5.6 | Check email delivery | martezandco@gmail.com receives Thrive-branded welcome | ✅ | YES |
| 5.7 | Activity Feed | Shows recent playbook events | ✅ | YES |
| 5.8 | Create new playbook (test) | "New Playbook" → setup wizard loads | ✅ | YES |

**Review Briefing Card — Module 5**
```json
{
  "id": "test-module5-loop1",
  "module": "playbooks",
  "agentId": "mrs_parker",
  "title": "PLAYBOOKS",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. Welcome Playbook active — Martez enrolled ]",
  "subtext": "[ e.g. Enrolled count: 1, Activity feed showing enrollment event ]",
  "metric": { "label": "Active playbooks", "value": "[ N ]" },
  "finding": "[ describe any issue, or null ]",
  "recommendation": "[ fix suggestion, or null ]",
  "uxIssue": "[ e.g. 'Send Welcome Email' button shows no loading state — user can double-click, or null ]"
}
```

---

### Module 6: Customers / CRM

**URL:** `/dashboard/customers`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 6.1 | Load customers page | Customer list renders | ✅ | YES |
| 6.2 | Search "Martez" | Martez Anderson appears | ✅ | YES |
| 6.3 | Open customer profile | Name, phone, email, tier, visit count shown | ✅ | YES |
| 6.4 | Loyalty points balance | Shows correct points | ✅ | YES |
| 6.5 | Check-in history | Visit(s) listed with timestamps | ✅ | YES |
| 6.6 | Filter by "New Customers" | Returns customers registered < 30 days | ✅ | YES |
| 6.7 | Filter by loyalty tier | Shows tiered members | ✅ | YES |
| 6.8 | Export customer CSV | Download triggers, file opens | ✅ | YES |

**Review Briefing Card — Module 6**
```json
{
  "id": "test-module6-loop1",
  "module": "crm",
  "agentId": "mrs_parker",
  "title": "CRM",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. Martez Anderson visible, loyalty tier assigned ]",
  "subtext": "[ e.g. 1 check-in recorded, points balance: 50, tier: new ]",
  "metric": { "label": "Total customers", "value": "[ N ]" },
  "finding": "[ describe any issue, or null ]",
  "recommendation": "[ fix suggestion, or null ]",
  "uxIssue": "[ e.g. Search results lag 3s on mobile, or null ]"
}
```

---

### Module 7: Inbox (Agent Routing)

**URL:** `/dashboard` → Inbox tab

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 7.1 | Open inbox | Inbox renders without blank state | ✅ | YES |
| 7.2 | Desktop view compact mode | Preset chips, insight cards show in condensed layout | ✅ | YES |
| 7.3 | Send: "How many customers checked in today?" | Routes to Pops → analytics answer | ✅ | YES |
| 7.4 | Send: "Send a welcome message to new customers" | Routes to Mrs. Parker → drafts message | ✅ | YES |
| 7.5 | Send: "Check compliance on our promo copy" | Routes to Deebo → compliance review | ✅ | YES |
| 7.6 | Send: "What are competitors selling this week?" | Routes to Ezal → intel response | ✅ | YES |
| 7.7 | Send: "Create an Instagram post for Friday" | Routes to Craig → social post draft | ✅ | YES |
| 7.8 | Send: "Recommend a product for a first-timer" | Routes to Smokey → product recommendation | ✅ | YES |
| 7.9 | Reply to thread | Conversation continues, agent context preserved | ✅ | YES |
| 7.10 | Preset chips work | Tap preset → pre-fills input, sends on confirm | ✅ | YES |
| 7.11 | Briefing cards on load | Cards render with Thrive data — not mock/placeholder values | ✅ | YES |
| 7.12 | Briefing card refresh | Click ↻ — `lastUpdated` changes, cards update with latest Alleaves + customer data | ✅ | YES |

**Review Briefing Card — Module 7**
```json
{
  "id": "test-module7-loop1",
  "module": "inbox",
  "agentId": "leo",
  "title": "INBOX & AGENT ROUTING",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. All 6 intent routes verified — 10/10 prompts routed correctly ]",
  "subtext": "[ e.g. Briefing cards loaded with live data, refresh updated lastUpdated in 3.2s ]",
  "metric": { "label": "Routing accuracy", "value": "[ N/10 ]" },
  "finding": "[ e.g. 'What are competitors selling' routed to Pops instead of Ezal, or null ]",
  "recommendation": "[ e.g. Add 'competitor' keyword to Ezal pattern in intent-router.ts, or null ]",
  "uxIssue": "[ e.g. Briefing cards show placeholder data on first load — background regen fires at 800ms, or null ]"
}
```

---

### Module 8: Agent Skill Tests (All 6 Agents)

#### 8A — Smokey (Budtender)

| Prompt | Expected Response | Pass/Fail |
|--------|-------------------|-----------|
| "What's a good strain for anxiety?" | Product rec with THC/CBD info from Alleaves inventory | ✅ |
| "Do you have any edibles under $20?" | Lists edibles with prices | ✅ |
| "Show me your top flower right now" | Top flower carousel with images | ✅ |
| "I want something for sleep" | Suggests indica/CBD products | ✅ |
| "Yes, add that to my cart" (after product rec) | `triggerCheckout` fires, cart opens | ✅ |

#### 8B — Craig (Marketer)

| Prompt | Expected Response | Pass/Fail |
|--------|-------------------|-----------|
| "Write an Instagram caption for our Friday sale" | Cannabis-compliant caption with no prohibited claims | ✅ |
| "Create an SMS for loyalty members about new arrivals" | Blackleaf-ready SMS ≤160 chars | ✅ |
| "Draft a Mother's Day email campaign" | Branded email HTML draft | ✅ |
| "What's our best performing segment for outreach?" | Segment analysis from CRM data | ✅ |

#### 8C — Mrs. Parker (Loyalty / Retention)

| Prompt | Expected Response | Pass/Fail |
|--------|-------------------|-----------|
| "Who are our VIP customers this month?" | Lists customers with LTV, tier, last visit | ✅ |
| "Who hasn't come in for 30+ days?" | At-risk customers list with retention scores | ✅ |
| "Send a win-back message to dormant customers" | Draft win-back campaign | ✅ |
| "Add Martez to a loyalty sequence" | Confirms enrollment or updates record | ✅ |

#### 8D — Pops (Analytics)

| Prompt | Expected Response | Pass/Fail |
|--------|-------------------|-----------|
| "What were our top 5 products last week?" | Product leaderboard with units sold | ✅ |
| "Show me the customer cohort report" | Funnel: 1 visit → 2 visit dropout % | ✅ |
| "What's our average order value?" | AOV stat from Firestore | ✅ |
| "Compare this week vs last week revenue" | % change with context | ✅ |

#### 8E — Ezal (Competitive Intel)

| Prompt | Expected Response | Pass/Fail |
|--------|-------------------|-----------|
| "What are local dispensaries selling near 13202?" | Competitor product list / pricing | ✅ |
| "What's the average price for a half-oz in Syracuse?" | Price benchmark | ✅ |
| "Any competitors running deals this weekend?" | Active promo intel | ✅ |

#### 8F — Deebo (Compliance)

| Prompt | Expected Response | Pass/Fail |
|--------|-------------------|-----------|
| "Check this copy: 'Our weed cures anxiety'" | FAIL — flags health claim | ✅ |
| "Is it okay to advertise on Facebook?" | NY-specific social ad compliance | ✅ |
| "Review our SMS template for compliance" | Line-by-line compliance audit | ✅ |

**Review Briefing Cards — Module 8 (per agent)**
```json
[
  {
    "id": "test-module8a-loop1",
    "module": "agent-smokey",
    "agentId": "smokey",
    "title": "SMOKEY SKILLS",
    "status": "[ pass | fail | partial ]",
    "headline": "[ e.g. 5/5 prompts returned Thrive inventory — no empty results ]",
    "subtext": "[ e.g. Add-to-cart flow triggered checkout on 'yes' affirmative ]",
    "finding": "[ e.g. 'Do you have anything on sale?' returned no promotions — Thrive has no active promo docs, or null ]",
    "uxIssue": "[ e.g. Product carousel images missing for pre-rolls, or null ]"
  },
  {
    "id": "test-module8b-loop1",
    "module": "agent-craig",
    "agentId": "craig",
    "title": "CRAIG SKILLS",
    "status": "[ pass | fail | partial ]",
    "headline": "[ e.g. 4/4 campaign prompts returned compliant copy ]",
    "finding": "[ e.g. SMS draft exceeded 160 chars, or null ]",
    "uxIssue": null
  },
  {
    "id": "test-module8c-loop1",
    "module": "agent-mrs-parker",
    "agentId": "mrs_parker",
    "title": "MRS. PARKER SKILLS",
    "status": "[ pass | fail | partial ]",
    "headline": "[ e.g. VIP list returned Martez + 0 others (expected for new launch) ]",
    "finding": "[ describe any issue, or null ]",
    "uxIssue": null
  },
  {
    "id": "test-module8d-loop1",
    "module": "agent-pops",
    "agentId": "pops",
    "title": "POPS SKILLS",
    "status": "[ pass | fail | partial ]",
    "headline": "[ e.g. Analytics queries returned Alleaves data, cohort report generated ]",
    "finding": "[ describe any issue, or null ]",
    "uxIssue": null
  },
  {
    "id": "test-module8e-loop1",
    "module": "agent-ezal",
    "agentId": "ezal",
    "title": "EZAL SKILLS",
    "status": "[ pass | fail | partial ]",
    "headline": "[ e.g. 3 competitor dispensaries found near 13202 ]",
    "finding": "[ e.g. CannMenus rate-limited — returned 0 price results for zip 13202, or null ]",
    "uxIssue": null
  },
  {
    "id": "test-module8f-loop1",
    "module": "agent-deebo",
    "agentId": "deebo",
    "title": "DEEBO SKILLS",
    "status": "[ pass | fail | partial ]",
    "headline": "[ e.g. Health claim flagged correctly, NY ad rules returned ]",
    "finding": "[ describe any issue, or null ]",
    "uxIssue": null
  }
]
```

---

### Module 9: Creative Center

**Location:** Dashboard → Creative Center

#### 9A — Social Media Image Generation

| Step | Action | Expected | Screenshot? |
|------|--------|----------|-------------|
| 9.1 | Open Creative Center | 5 tabs: Photo, Branded, Video (🎬), Slideshow (🎞️), Deck (📊) | YES |
| 9.2 | Select "Photo" mode | Prompt input visible | YES |
| 9.3 | Prompt: "Premium cannabis flower in a glass jar, moody dark background, dramatic studio lighting" | Image generates via FLUX.1 | YES |
| 9.4 | Prompt: "Thrive Syracuse dispensary, welcoming storefront, cannabis leaf motif, green and gold palette" | Branded store image | YES |
| 9.5 | Select "Branded" mode | Uses Thrive colors/logo automatically | YES |
| 9.6 | Prompt: "Instagram post for Friday Flower Sale, vibrant, Gen Z aesthetic" | Branded image with Thrive palette | YES |
| 9.7 | Change platform: Instagram Square (1:1) | Image crops/regenerates for 1:1 | YES |
| 9.8 | Change platform: Instagram Story (9:16) | Image regenerates for 9:16 | YES |
| 9.9 | Download generated image | `.png` downloads successfully | YES |
| 9.10 | Save to asset library | Asset appears in Drive / asset library | YES |

#### 9B — Branded Video Generation (Kling)

| Step | Action | Expected | Screenshot? |
|------|--------|----------|-------------|
| 9.11 | Select "🎬 Video" mode | Kling v2 mode active | YES |
| 9.12 | Prompt: "Close-up of cannabis flower, slow rotation, cinematic lighting, professional product shot" | Kling job queued → video URL returned | YES |
| 9.13 | Video renders in preview player | MP4 plays, no broken player | YES |
| 9.14 | Download video | `.mp4` downloads | YES |
| 9.15 | Prompt: "Dispensary storefront exterior at golden hour, welcoming vibe, 5 seconds" | Second Kling video generation | YES |

#### 9C — Remotion Slideshow

| Step | Action | Expected | Screenshot? |
|------|--------|----------|-------------|
| 9.16 | Select "🎞️ Slideshow" mode | Remotion mode active | YES |
| 9.17 | Generate with Thrive brand context | 3-scene branded slideshow: intro → product → CTA | YES |
| 9.18 | Video renders | MP4 slideshow plays | YES |
| 9.19 | Aspect ratio: 9:16 (Stories) | Renders correctly for vertical | YES |

#### 9D — PowerPoint Deck

| Step | Action | Expected | Screenshot? |
|------|--------|----------|-------------|
| 9.20 | Select "📊 Deck" mode | Purpose dropdown + slide count visible | YES |
| 9.21 | Purpose: "Menu" | Menu-specific system prompt active | YES |
| 9.22 | Slide count: 5 | Generates 5-slide deck | YES |
| 9.23 | Download `.pptx` | File downloads and opens in PowerPoint/Slides | YES |
| 9.24 | Verify 21+ disclaimer on last slide | Required by cannabis compliance | YES |

**Review Briefing Card — Module 9**
```json
{
  "id": "test-module9-loop1",
  "module": "creative-center",
  "agentId": "craig",
  "title": "CREATIVE CENTER",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. Photo + Branded + Kling Video generated — Deck downloaded ]",
  "subtext": "[ e.g. FLUX.1 returned image in 8s, Kling job completed in 42s, PPTX 5 slides with 21+ disclaimer ]",
  "metric": { "label": "Avg generation time", "value": "[ Xs ]" },
  "finding": "[ e.g. Kling returned 500 on first attempt — retry succeeded, or null ]",
  "recommendation": "[ e.g. Increase Kling timeout from 30s to 90s in fal-video.ts, or null ]",
  "uxIssue": "[ e.g. Download button not visible until scrolling past generated image — CTA below fold, or null ]",
  "generatedAssets": [
    "[ describe each generated asset: type, prompt used, quality observation ]"
  ]
}
```

---

### Module 10: Intelligence (Ezal)

**URL:** `/dashboard/intelligence`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 10.1 | Load intelligence tab | Competitor list renders | ✅ | YES |
| 10.2 | Enter zip: 13202 (Syracuse, NY) | Shows local competitor dispensaries | ✅ | YES |
| 10.3 | Price comparison chart | Chart renders with competitor pricing | ✅ | YES |
| 10.4 | Run market intel sweep | Ezal fetches live CannMenus data | ✅ | YES |

---

### Module 11: Settings & Admin

**URL:** `/dashboard/settings`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 11.1 | Brand Guide tab | Thrive brand colors/logo visible | ✅ | YES |
| 11.2 | Brand Guide — scan URL | Scanning wizard loads | ✅ | YES |
| 11.3 | Chatbot Settings | Smokey persona/archetype settings visible | ✅ | YES |
| 11.4 | Integrations | Alleaves POS shows as "Connected" | ✅ | YES |
| 11.5 | Email settings | Email warm-up status visible | ✅ | YES |
| 11.6 | Team members | Can invite/view team | ✅ | YES |
| 11.7 | Embed tab | Chatbot embed code for website | ✅ | YES |

---

### Module 12: Orders & Commerce

**URL:** `/dashboard/dispensary/orders`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 12.1 | Load orders page | Order list or empty state renders cleanly | ✅ | YES |
| 12.2 | Order status columns | New / Packed / Completed columns visible | ✅ | YES |
| 12.3 | Filter by date | Today's orders filterable | ✅ | YES |

---

## 👤 PERSONA B: Customer Experience

**As a consumer visiting Thrive Syracuse's brand page**

---

### Module 13: Consumer Brand Page

**URL:** `bakedbot.ai/thrivesyracuse`

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 13.1 | Load brand page | Thrive colors, logo, tagline visible | ✅ | YES |
| 13.2 | Product menu / carousel | Products load from Alleaves inventory | ✅ | YES |
| 13.3 | Product click | Opens product detail page | ✅ | YES |
| 13.4 | Smokey chatbot bubble | Chat icon visible bottom-right | ✅ | YES |
| 13.5 | Smokey opens | Chat overlay opens | ✅ | YES |
| 13.6 | Ask Smokey: "What's good for sleep?" | Product recommendation from Thrive inventory | ✅ | YES |
| 13.7 | Ask Smokey: "Do you have any edibles?" | Edibles list returned | ✅ | YES |
| 13.8 | Ask Smokey: "How much is an eighth?" | Pricing returned | ✅ | YES |
| 13.9 | "Add to cart" from Smokey rec | Cart opens with product | ✅ | YES |
| 13.10 | Rewards link in nav/footer | Links to `/thrivesyracuse/rewards` | ✅ | YES |
| 13.11 | Mobile view (375px iPhone SE) | Full page usable on mobile | ✅ | YES |
| 13.12 | OG social preview | Share URL shows Thrive branded OG image | ✅ | YES |

**Review Briefing Card — Module 13**
```json
{
  "id": "test-module13-loop1",
  "module": "consumer-brand-page",
  "agentId": "smokey",
  "title": "CONSUMER BRAND PAGE",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. Brand page loaded with 24 Alleaves products, Smokey functional ]",
  "subtext": "[ e.g. OG image correct, cart opened from Smokey rec, mobile layout clean ]",
  "metric": { "label": "Products displayed", "value": "[ N ]" },
  "finding": "[ describe any issue, or null ]",
  "recommendation": "[ fix suggestion, or null ]",
  "uxIssue": "[ e.g. Smokey chat bubble z-index below footer on mobile Safari, or null ]"
}
```

---

### Module 14: Loyalty Sign-Up (Consumer Flow)

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| 14.1 | Tap QR code or share link | Opens loyalty enrollment page | ✅ | YES |
| 14.2 | Enter phone: 312-684-0522 | Existing customer found → logged in | ✅ | YES |
| 14.3 | New customer: fill form | Name, email, phone accepted | ✅ | YES |
| 14.4 | Submit → confirmation screen | "Welcome to Thrive Rewards!" | ✅ | YES |
| 14.5 | Check welcome email delivery | martezandco@gmail.com receives branded email | ✅ | YES |
| 14.6 | Email content quality | Logo, colors, dispensary name, CTA link correct | ✅ | YES |
| 14.7 | "Add to Home Screen" prompt | iOS/Android PWA install prompt shown | ✅ | YES |
| 14.8 | Google Wallet card | Wallet pass shows Thrive branding + points | ✅ | YES |

**Review Briefing Card — Module 14**
```json
{
  "id": "test-module14-loop1",
  "module": "consumer-loyalty-signup",
  "agentId": "mrs_parker",
  "title": "LOYALTY SIGN-UP",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. Welcome email delivered to martezandco@gmail.com ✓ ]",
  "subtext": "[ e.g. Email arrived in 7s, logo visible, CTA link correct, PWA install prompted ]",
  "metric": { "label": "Email delivery time", "value": "[ Xs ]" },
  "finding": "[ describe any issue, or null ]",
  "recommendation": "[ fix suggestion, or null ]",
  "uxIssue": "[ e.g. Welcome email subject line missing dispensary name — shows 'Welcome to BakedBot' not 'Welcome to Thrive', or null ]"
}
```

---

### Module 15: Consumer Prompts (Smokey Full Test)

**Test from consumer-facing chatbot on brand page**

| Prompt | Expected | Screenshot? |
|--------|----------|-------------|
| "Hi, what's good today?" | Friendly greeting + featured products | YES |
| "First time here, what do you recommend?" | Beginner-friendly products (low THC, CBD options) | YES |
| "I need something for creativity" | Sativa recs | YES |
| "What's your most popular strain right now?" | Top seller from Alleaves data | YES |
| "How much do you charge for delivery?" | Delivery info or "we don't deliver" if N/A | YES |
| "What's in the Gelonade strain?" | Strain info from inventory | YES |
| "Do you have anything on sale?" | Active promotions if any | YES |
| "Can I order online?" | Order flow explanation | YES |
| "Are you 18+ or 21+?" | "21+ only. New York requires valid ID." | YES |
| "Tell me a joke" | Keeps it fun, on-brand | YES |

---

## Post-Deploy Retest Addendum

**Date:** 2026-04-02
**Purpose:** Re-test the public Thrive check-in flow after the returning-customer resolution update, `phoneLast4` backfill, and Firestore index rollout.
**Primary Surface:** `https://bakedbot.ai/thrivesyracuse/rewards#check-in`
**Operator Runbook:** `dev/testing/thrive_syracuse_postdeploy_operator_script.md`

### Production Status Snapshot

- GitHub Actions for the April 2, 2026 `main` push completed successfully: App Hosting deploy, Type Check & Lint, and E2E all passed.
- Firestore indexes for `customers.orgId + phoneLast4` and `orders.{brandId|retailerId|orgId} + phoneLast4` are `READY` in production.
- Thrive backfill completed on April 2, 2026:
  - `customers`: 15 scanned, 13 updated, 0 remaining without derived `phoneLast4`
  - `orders`: 3669 scoped docs scanned, 0 required updates

### Retest A - Returning Online-Order Customer via Full Phone

**Goal:** Confirm a known online-order customer is treated as returning before staff needs the new assisted path.

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| A.1 | Open `https://bakedbot.ai/thrivesyracuse/rewards#check-in` | Public check-in card loads | ✅ | YES |
| A.2 | Choose `Use full phone number` | Standard flow remains default and visible | ✅ | YES |
| A.3 | Enter a phone for a customer with a prior AIQ / online order | Flow resolves as returning customer, not net-new enrollment | ✅ | YES |
| A.4 | Confirm utility step | If email is already known and consented, flow skips redundant email capture and asks for categories; otherwise it asks only for the missing enrichment | ✅ | YES |
| A.5 | Finish check-in | Success state renders without requiring a duplicate signup | ✅ | YES |
| A.6 | Verify CRM / visit data | `checkin_visits` entry written, customer visit count increments, record stays unified to the existing customer or online-order identity | ✅ | YES |
| A.7 | Verify playbook behavior | No duplicate "new customer" welcome send for an already returning customer; event should behave like `customer.checkin`, not a fresh signup | ✅ | YES |

### Retest B - Staff-Assisted First Name + Last 4

**Goal:** Confirm door staff can recover a returning customer without retyping the full phone number.

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| B.1 | Open `https://bakedbot.ai/thrivesyracuse/rewards#check-in` | Public check-in card loads | ✅ | YES |
| B.2 | Choose `Use first name + last 4` | Staff-assisted lane becomes active | ✅ | YES |
| B.3 | Enter first name + last 4 for the same known online-order customer | Input accepts values and keeps full phone hidden | ✅ | YES |
| B.4 | Check the ID confirmation box | Continue action becomes valid | ✅ | YES |
| B.5 | Click `Find My Profile` | Masked candidate list appears; at least one candidate matches the intended customer | ✅ | YES |
| B.6 | Select the correct candidate | Candidate stays selected and `Continue to Check-In` is enabled | ✅ | YES |
| B.7 | Continue into the utility step | Returning context loads without browser-held full phone entry | ✅ | YES |
| B.8 | Finish check-in | Success state renders; existing record is reused | ✅ | YES |
| B.9 | Verify backend behavior | `checkin_visits` writes against the resolved customer identity, visit count increments, and no wrong-profile merge occurs | ✅ | YES |

### Retest C - Net-New Safety Check

**Goal:** Make sure the new returning-customer logic did not break the standard welcome path for brand-new visitors.

| Step | Action | Expected | Pass/Fail | Screenshot? |
|------|--------|----------|-----------|-------------|
| C.1 | Stay on the same public check-in card | Check-in card remains usable after returning-customer tests | ✅ | YES |
| C.2 | Choose `Use full phone number` | Standard lane still works | ✅ | YES |
| C.3 | Enter a brand-new phone number with no Thrive order history | Flow enters the net-new path | ✅ | YES |
| C.4 | Supply name + email and finish check-in | Customer is created, visit is written, and welcome messaging flow still fires | ✅ | YES |
| C.5 | Verify follow-up behavior | Welcome Playbook and welcome email still send for the truly net-new customer | ✅ | YES |

### Evidence to Capture

1. Returning customer full-phone result state
2. Staff-assisted candidate list with masked phone ending
3. Staff-assisted returning utility step
4. Final success state for the staff-assisted check-in
5. CRM / check-in feed proof that the visit attached to the correct customer record
6. Net-new success state proving the welcome flow still works

### Severity Rules for This Addendum

- `P0`: Wrong-customer merge, returning customer blocked from checking in, or net-new customer no longer receives the welcome flow
- `P1`: Staff-assisted lookup fails to surface a valid candidate for a known returning customer but the full-phone path still works
- `P1`: Returning customer is treated as new and receives duplicate welcome automation

---

## 🚨 P0 Bug Criteria

Any of the following = **BLOCK LAUNCH:**

1. Welcome email NOT delivered to martezandco@gmail.com after check-in
2. Welcome Playbook NOT enrolling customer at check-in
3. Loyalty tablet crashes or freezes during flow
4. Smokey returns zero products (empty inventory)
5. Brand page fails to load or shows wrong branding
6. Dashboard login fails for dispensary manager
7. Creative Center generates no content / returns API error
8. Check-in form fails to submit

---

## ⚠️ P1 Bug Criteria (Fix Within 24h)

1. Smokey recommendations are generic (not Thrive-specific Alleaves inventory)
2. OG image shows wrong branding or fails to render
3. Google Wallet button shows error
4. Rewards page apostrophe or copy bugs
5. Any agent routes to wrong persona (e.g., analytics going to Craig)
6. Creative Center Kling video fails — should fall back to Remotion
7. Mobile layout broken at 375px on any P0 page
8. Inbox blank state / no response from agents

---

## 📸 Screenshot Requirements

For each module, capture:
1. **Initial state** — page before interaction
2. **Active state** — mid-interaction (form filled, generation in progress)
3. **Result state** — final output (image generated, email sent toast, etc.)
4. **Error state** — if any error appears, screenshot immediately

Save to: `dev/testing/screenshots/thrive_golive_YYYY-MM-DD/`
Naming: `{module}_{step}_{state}.png` — e.g. `creative_center_9_3_result.png`

---

## 🔁 Loop Protocol

```
LOOP:
  1. Run all modules top-to-bottom
  2. Log all failures to dev/backlog.json:
     { id, priority, module, step, description, expected, actual, screenshot_path }
  3. Fix all P0 bugs immediately
  4. Fix P1 bugs in priority order
  5. Re-run affected modules only
  6. If 0 P0 + 0 P1 bugs: mark launch APPROVED
  7. Else: continue loop
```

---

## ✅ Launch Approval Criteria

- [ ] Module 2 (Check-In): Martez enrolled in Welcome Playbook + email delivered
- [ ] Module 3 (Loyalty Tablet): Full 6-step flow completes without error
- [ ] Module 4 (Rewards Page): Renders with correct Thrive branding
- [ ] Module 13 (Consumer Brand Page): Loads with inventory + Smokey functional
- [ ] Module 14 (Loyalty Sign-Up): Welcome email delivered to martezandco@gmail.com
- [ ] Returning online-order customer resolves correctly on public check-in via both full phone and staff first-name + last-4
- [ ] Module 9 (Creative Center): At minimum Photo + Video generate successfully
- [ ] Module 8 (Agents): All 6 agents respond on-topic to test prompts
- [ ] Module 7 (Inbox): Intent routing working for analytics, loyalty, compliance
- [ ] 3 new Cloud Scheduler jobs deployed (flnnstoned, daily-sales, sub-daily)
- [ ] 0 P0 bugs outstanding

---

## 📊 Per-Loop Summary Card Template

Fill in at the end of each full loop:

```json
{
  "id": "test-loop-summary-1",
  "loop": 1,
  "runAt": "[ ISO timestamp ]",
  "agentId": "linus",
  "agentName": "Linus",
  "title": "GO-LIVE READINESS — LOOP 1",
  "status": "[ pass | fail | partial ]",
  "severity": "[ success | warning | critical ]",
  "headline": "[ e.g. 17/20 modules passing ]",
  "subtext": "[ e.g. 3 P1 issues remain — all P0 clear ]",
  "scorecard": {
    "p0Bugs": 0,
    "p1Bugs": "[ N ]",
    "p2Bugs": "[ N ]",
    "modulesPass": "[ N ]",
    "modulesPartial": "[ N ]",
    "modulesFail": "[ N ]",
    "readyForLaunch": "[ true | false ]"
  },
  "blockers": ["[ blocker 1 ]", "[ blocker 2 ]"],
  "topRecommendation": "[ most impactful single fix ]",
  "nextLoopFocus": ["[ module IDs to re-test ]"],
  "playbooksStatus": {
    "flnnStonedCronDeployed": "[ true | false ]",
    "dailySalesCronDeployed": "[ true | false ]",
    "subDailyCronDeployed": "[ true | false ]",
    "revenueAlertThresholdSet": "[ true | false — set to $50 for launch week ]"
  },
  "briefingCardsStatus": {
    "initialLoadHadLiveData": "[ true | false ]",
    "refreshUpdatedTimestamp": "[ true | false ]",
    "backgroundRegenFiredWithin1s": "[ true | false ]"
  }
}
```

> **Briefing cards health is a first-class metric.** If `initialLoadHadLiveData` is `false`, that's a P1 — managers need real data on first login, not placeholders.

---

*Generated: 2026-03-31 | Next run: After each fix cycle*
