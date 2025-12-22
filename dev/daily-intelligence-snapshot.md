# Daily Intelligence Snapshot MVP

## MFNY (Brand) using CannMenus + Leafly + BakedBot Market Sensors + Gmail delivery

### Product intent

Deliver a **daily intelligence snapshot** on MFNY: distribution signals, menu presence, pricing bands, promo flags, and meaningful changes. This is internal intelligence, not marketing, so the bar is **accuracy + consistency + explainability**.

We will avoid the term “scrape.” Externally and in code comments/UI copy we use:

* **Market Sensors**
* **Always-on monitoring**
* **Signal capture**
* **Intelligence pipeline**

---

## 1) What we’re shipping in MVP

### User experience (first-time user, Gmail not connected)

1. User clicks **Enable Daily Snapshot** for MFNY
2. System prompts **Connect Gmail** (permission request)
3. User completes Google OAuth (send-only scope)
4. User lands on Snapshot Setup:

   * Brand identity: MFNY domain + aliases (we prefill MFNY defaults)
   * Market scope: default **NY-only**
   * Send time: default **8:00 AM America/Chicago**
   * Recipients: default current user
5. Snapshot runs daily + sends an email + saves the run in-app

### What the email contains (MVP)

* Distribution: **# retailers carrying MFNY** (and net change vs yesterday)
* New placements / Lost placements (top 10)
* Pricing: median + range by category (where available)
* Promo signals: “was/now”, discount tags, bundles (where detected)
* Top changes (5 bullets)
* Alerts (if thresholds triggered)
* Data coverage footer (which sources contributed today)

### What we store

* Firestore: **daily summary** + pointers
* Cloud Storage: **full run details** (compressed JSON/CSV)

---

## 2) Architecture decision (recommended)

### Scheduling + compute

* **Cloud Scheduler** → Pub/Sub topic `intel-daily-snapshot`
* **Cloud Run worker** consumes and executes runs

Why:

* reliable retries
* longer runtime than Functions
* easy to scale from 1 brand to 1,000

### Storage

✅ **Firestore for summaries**
✅ **Cloud Storage for full ledgers/details** (compressed)

---

## 3) Data sources and how we use them

### A) CannMenus (first-party coverage)

We treat CannMenus as our most “structured” source:

* retailer menu pages we already index
* product occurrences (MFNY presence)
* prices by SKU/retailer (if present)
* availability flags where possible (in stock/OOS if captured)

### B) Leafly (public signal)

Leafly can provide:

* MFNY listing changes (product pages/content shifts)
* “where available” style signals (depending on structure)
* high-level placement hints

### C) BakedBot Market Sensors (always-on monitoring)

Market Sensors are our scheduled monitors that track changes on specific URLs:

* retailer menu pages
* product listing pages
* known endpoints we already watch
  They produce **diffs**: what changed since last capture.

**MVP stance:** We don’t need perfect product taxonomy. We need a stable daily “signal pack” that can produce deltas.

---

## 4) Unified signal model (normalization layer)

Everything from every source becomes a set of normalized “signals” so deltas are easy.

### `Signal` (normalized record)

* `signalType`: `PLACEMENT | SKU | PRICE | PROMO | CONTENT_CHANGE`
* `date`: `YYYY-MM-DD` (run date)
* `brandKey`: canonical MFNY identifier
* `source`: `CANNMENUS | LEAFLY | SENSORS`
* `entity`:

  * `retailerId?`
  * `retailerLocationId?`
  * `menuUrl?`
  * `productId?` (tenant canonical if known)
  * `productName?`
  * `category?`
* `value`:

  * placement: `{ present: true }`
  * price: `{ amount, currency, unit }`
  * promo: `{ promoType, value?, tag? }`
  * content: `{ field, beforeHash, afterHash }`
* `confidence`: 0–1
* `evidenceRef`: Firestore doc ref or GCS path (raw/artifact)

**Important:** even if some fields are missing, signals still work. We prioritize “presence + price + promo + deltas.”

---

## 5) Delta computation (the daily intelligence)

Given signals for `today` and `yesterday`, compute:

### Placement deltas

* `newRetailers = todayRetailers - yesterdayRetailers`
* `lostRetailers = yesterdayRetailers - todayRetailers`

### SKU deltas (optional if we can extract SKU lists reliably)

* `newSkus`, `lostSkus`

### Price deltas

* per category: median + IQR (or min/max) shift
* detect “major price moves” (threshold, e.g. > 10% change in median)

### Promo deltas

* new promo tags detected
* promo count changes by retailer/category

### Alerts (MVP thresholds)

* `NEW_RETAILER`: any new placement from “high priority retailer list” (optional)
* `LOST_RETAILER`: loss of a key retailer
* `PRICE_SHIFT`: category median moves beyond threshold
* `NEW_SKU`: new SKU appears across 3+ retailers (optional)
* `PROMO_DETECTED`: promo on a key SKU/category

---

## 6) Firestore + Storage schema (MVP)

### A) Brand definition

`tenants/{tenantId}/intel/brands/{brandId}`

* `name`: "MFNY"
* `brandKey`: `"mfny"` (slug or hashed canonical key)
* `domains`: `["mfny.com"]` (prefill)
* `aliases`: `["MFNY", "MF New York"]` (prefill)
* `scope`: `{ mode: "NY_ONLY" | "NATIONWIDE", states?: ["NY"] }`
* `createdAt`, `updatedAt`

### B) Snapshot configuration

`tenants/{tenantId}/intel/snapshots/configs/{configId}`

* `type`: `"DAILY_BRAND_SNAPSHOT"`
* `brandId`
* `schedule`: `{ freq: "DAILY", hour: 8, tz: "America/Chicago" }`
* `recipients`: `[{ email, name? }]`
* `delivery`: `{ provider: "GMAIL", connectedUserId }`
* `enabled`: boolean
* `lastRunAt`, `nextRunAt`
* `createdAt`, `updatedAt`

### C) Run summary

`tenants/{tenantId}/intel/snapshots/runs/{runId}`

* `configId`, `brandId`, `date`
* `status`: `queued | running | completed | failed`
* `metrics`:

  * `retailersCarrying`, `retailersDelta`
  * `newPlacements`, `lostPlacements`
  * `skuCount?`, `skuDelta?`
  * `medianPriceByCategory?` (map)
  * `promoSignals`
* `topDeltas`: string[]
* `alerts`: `{type,severity,summary,evidenceRefs[]}[]`
* `artifacts`:

  * `detailsRef` (GCS path)
  * `rawRefs?` (GCS paths)
* `email`:

  * `sent`, `messageId?`, `sentAt?`
* `warnings`: string[]
* `createdAt`, `completedAt`

### D) Storage artifacts (compressed)

* `gs://.../tenants/{tenantId}/intel/brands/mfny/runs/{runId}/details.json.gz`
* `.../placements.csv` (optional)
* `.../raw/cannmenus.json.gz` (optional)
* `.../raw/leafly.json.gz` (optional)
* `.../raw/sensors.json.gz` (optional)

---

## 7) Gmail integration (first-time permission flow)

### OAuth requirements

* Implement “Connect Gmail” UI
* Use Google OAuth with **send-only** scope (minimal access)
* Store refresh token securely (encrypted)

### Token storage

`tenants/{tenantId}/integrations/gmail/{userId}`

* `scopes[]`
* `refreshTokenEncrypted`
* `tokenMeta` (expiry, createdAt, updatedAt)

### Sending

* Use Gmail API send endpoint
* Store send logs:
  `.../sendLogs/{logId}` → `{ runId, to[], subject, messageId, status, sentAt, error? }`

### Product copy (permission request)

“Connect Gmail to receive your daily snapshot. We use this connection only to send reports you configure. Inbox reading is not required.”

---

## 8) Cloud Run worker: run lifecycle

### Trigger

Cloud Scheduler publishes daily jobs (and manual run triggers publish too).

Pub/Sub message:

* `{ tenantId, configId, date }`

### Worker algorithm (MVP)

1. Load config + brand definition
2. Resolve market scope (NY-only default)
3. Collect signals:

   * CannMenus signals for MFNY
   * Leafly signals for MFNY
   * Market Sensor diffs relevant to MFNY & scope
4. Normalize into `Signal[]`
5. Load yesterday’s run (if exists) and compute deltas
6. Build summary + alerts
7. Write:

   * Firestore run summary (status updates)
   * GCS `details.json.gz`
8. Render email HTML
9. Send via Gmail API (using connectedUserId token)
10. Mark run `completed`

### Failure behavior (MVP)

* If one source fails:

  * continue with partial data
  * include warning + coverage footer
* If Gmail send fails:

  * snapshot still saved in-app
  * run marked completed with `email.sent=false` + error logged

---

## 9) Report template (HTML email skeleton)

**Subject:** `MFNY Daily Intelligence Snapshot — {YYYY-MM-DD}`

**Sections:**

1. Headline metrics (distribution, deltas)
2. New placements (top 10)
3. Lost placements (top 10)
4. Pricing overview by category (median + range)
5. Promo signals (top 10)
6. Top changes (5 bullets)
7. Alerts (if any)
8. Data coverage footer (sources used + warnings)

Include a “View full report” link to:
`/intel/snapshots/runs/{runId}`

---

## 10) Agent tools (optional in MVP, but easy)

Thin wrappers around server actions:

* `intel.enableDailySnapshot(brandId, recipients?, schedule?)`
* `intel.sendSnapshotNow(configId)`
* `intel.getLatestSnapshot(brandId)`
* `intel.updateBrandDefinition(brandId, aliases/scope/domains)`
* `intel.updateSnapshotConfig(configId, enabled/schedule/recipients)`

All tools must log:
`tenants/{tenantId}/audit/actions/{actionId}`

---

## 11) File structure (MVP)

### Server (API + actions)

* `src/server/intel/snapshot-actions.ts`
* `src/server/integrations/gmail/oauth.ts`
* `src/server/integrations/gmail/send.ts`

### Worker

* `src/workers/intel-daily-snapshot/handler.ts`
* `src/workers/intel-daily-snapshot/sources/cannmenus.ts`
* `src/workers/intel-daily-snapshot/sources/leafly.ts`
* `src/workers/intel-daily-snapshot/sources/market-sensors.ts`
* `src/workers/intel-daily-snapshot/normalize.ts`
* `src/workers/intel-daily-snapshot/diff.ts`
* `src/workers/intel-daily-snapshot/render-email.ts`
* `src/workers/intel-daily-snapshot/write-artifacts.ts`

### UI

* `src/app/intel/page.ts` (hub)
* `src/app/intel/snapshots/setup/page.ts` (wizard)
* `src/app/intel/snapshots/runs/[runId]/page.ts` (results viewer)
* `src/app/integrations/gmail/page.ts` (connect flow)

### Docs + fixtures

* `docs/intel/mfny-daily-snapshot.md`
* `docs/intel/fixtures/mfny-brand-definition.json`
* `docs/intel/fixtures/sample-run-details.json`

---

# Firestore Security Rules (MVP-safe)

## Goals

* **Tenant isolation**: users can only read/write inside their tenant.
* **Server-only writes** for sensitive system artifacts:
  * snapshot runs (`runs/*`)
  * Gmail tokens
* **Users can manage their own configs** (enable/disable, recipients, schedule).
* **Users can read runs + results** (so they can view history), but **can’t edit them**.

## Assumptions

* You’re using Firebase Auth with custom claims:
  * `request.auth.token.tenantId`
  * `request.auth.token.role` (e.g., `SUPER_ADMIN`, `BRAND_ADMIN`, `DISPENSARY_ADMIN`, `STAFF`)
* Cloud Run uses Firebase Admin SDK, so it bypasses these rules.

## Rules (sample)

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function tenantId() {
      return request.auth.token.tenantId;
    }

    function isTenant(tenant) {
      return isSignedIn() && tenantId() == tenant;
    }

    function hasRole(roles) {
      return isSignedIn() && (request.auth.token.role in roles);
    }

    // --- Tenants root ---
    match /tenants/{tenantId}/{

      // Default deny; allow explicitly per collection
      match /{document=**} {
        allow read, write: if false;
      }

      // Brand definitions: user-editable (scoped), limited roles
      match /intel/brands/{brandId} {
        allow read: if isTenant(tenantId);
        allow create, update, delete: if isTenant(tenantId)
          && hasRole(['SUPER_ADMIN', 'BRAND_ADMIN', 'DISPENSARY_ADMIN']);
      }

      // Snapshot configs: user-editable, limited roles
      match /intel/snapshots/configs/{configId} {
        allow read: if isTenant(tenantId);
        allow create, update, delete: if isTenant(tenantId)
          && hasRole(['SUPER_ADMIN', 'BRAND_ADMIN', 'DISPENSARY_ADMIN']);
      }

      // Snapshot runs: user-readable, server-writable only
      match /intel/snapshots/runs/{runId} {
        allow read: if isTenant(tenantId);
        allow create, update, delete: if false;
      }

      // Optional: if you store per-run subcollections later (e.g. /signals)
      match /intel/snapshots/runs/{runId}/{sub=**} {
        allow read: if isTenant(tenantId);
        allow write: if false;
      }

      // Gmail integration tokens: server-only (never writable by clients)
      match /integrations/gmail/{userId} {
        allow read: if isTenant(tenantId) && request.auth.uid == userId;
        allow create, update, delete: if false;

        match /sendLogs/{logId} {
          allow read: if isTenant(tenantId) && request.auth.uid == userId;
          allow write: if false;
        }
      }

      // Approvals or audit logs if you add later
      match /audit/actions/{actionId} {
        allow read: if isTenant(tenantId) && hasRole(['SUPER_ADMIN']);
        allow write: if false;
      }
    }
  }
}
```

## Notes (important)

* Clients **never write** `runs/*` or Gmail tokens; only Cloud Run / Admin SDK does.
* If you need non-admin staff to view snapshots, add role(s) to read permissions. Keep writes tight.

---

# Pub/Sub message schema + worker retry policy

## Message schema (v1)

Topic: `intel-daily-snapshot`

```json
{
  "version": "1.0",
  "jobType": "DAILY_BRAND_SNAPSHOT",
  "tenantId": "tnt_123",
  "configId": "cfg_abc",
  "brandId": "br_mfny",
  "runDate": "2026-12-22",
  "idempotencyKey": "tnt_123|cfg_abc|2026-12-22",
  "requestedBy": {
    "type": "scheduler",
    "userId": null
  },
  "force": false
}
```

## Worker idempotency contract (must-have)

### Rule

If a job is delivered twice (it will happen), **you must not send two emails** or generate two conflicting runs for the same date/config.

### Implementation pattern (simple and robust)

1. Before creating a run, query Firestore for an existing run with same `(configId, runDate)`.
2. If exists and `status in (running|completed)` and `force=false`:
   * **ACK message** and exit (idempotent success).
3. Otherwise create a new run with deterministic uniqueness:
   * Store `idempotencyKey` on the run doc.
   * Maintain a separate “dedupe index” doc.

#### Dedupe index (recommended)

`tenants/{tenantId}/intel/snapshots/dedupe/{idempotencyKey}`

* `runId`
* `createdAt`
* `status`

Create this doc in a Firestore transaction so two workers can’t both claim it.

## Retry policy

### Recommended Pub/Sub subscription settings

Create a subscription: `intel-daily-snapshot-sub`

* **Ack deadline**: 60–120 seconds (extend via client if needed)
* **Message retention**: 7 days
* **Dead-letter topic**: `intel-daily-snapshot-dlq`
* **Max delivery attempts**: 5 (MVP) or 10 (later)

### Worker retry behavior (application-level)

Split errors into 3 categories:

#### A) Transient errors (retry)

Examples:
* timeouts fetching Leafly
* temporary network errors
* 429s rate limiting

Behavior:
* throw / non-ACK so Pub/Sub retries
* but also implement **source-level fallbacks** (see below) so we *don’t* fail the whole run unless we must.

#### B) Partial source failures (do not retry the whole job)

Examples:
* Leafly fetch fails but CannMenus succeeds
* Market Sensors temporarily missing

Behavior:
* continue run with remaining sources
* add warning: `"Leafly unavailable today"`
* still send email (unless user config says “all sources required”)

#### C) Permanent errors (send to DLQ)

Examples:
* config not found / disabled
* invalid brand definition
* missing Gmail token for connected user
* schema violations

Behavior:
* mark run failed with reason
* ACK the message (or explicitly publish to DLQ with details)
* don’t retry forever
