# Campaign Carlos — Patterns & Gotchas

> Encoded knowledge from production fixes and source code audits. Read before touching campaign dispatch.

---

## Critical Rules

### Rule 1: Deebo gate runs at TWO layers — Layer 2 checks `complianceStatus` field

The compliance gate is not just a function call — it's a field check in `executeCampaign()`. Layer 1 runs async after submission (sets the field). Layer 2 reads the field at send time.

```typescript
// ✅ CORRECT — both layers must be intact

// Layer 1: submitForComplianceReview() fires async check
export async function submitForComplianceReview(campaignId: string) {
  await firestore.collection('campaigns').doc(campaignId).update({
    status: 'compliance_review',
    updatedAt: new Date(),
  });
  // Fire-and-forget — sets campaign.complianceStatus when done
  runComplianceCheck(campaign).catch(err => logger.error(...));
}

// Layer 2: executeCampaign() reads the field before dispatch
if (campaign.complianceStatus !== 'passed') {
  await firestore.collection('campaigns').doc(campaignId).update({
    status: 'compliance_review',  // revert, not 'failed'
    updatedAt: new Date(),
  });
  return { success: false, sent: 0, failed: 0, error: reason };
}

// ❌ WRONG — short-circuiting the field check
if (campaign.status === 'approved') {
  await dispatch(campaign);  // can send non-compliant content
}
```

---

### Rule 2: `complianceStatus` values differ between `ComplianceResult` and the Campaign doc

Deebo returns `'pass'`/`'fail'`/`'warning'`. The campaign doc stores `'passed'`/`'failed'`/`'warning'`. The compliance service maps them. The send engine checks for `'passed'` (not `'pass'`).

```typescript
// In deebo.ts (ComplianceResult interface):
status: 'pass' | 'fail' | 'warning'

// In campaign-compliance.ts — mapping when writing to Firestore:
complianceStatus: result.status === 'pass' ? 'passed'
                : result.status === 'fail' ? 'failed'
                : 'warning'

// In campaign-sender.ts — the check at send time:
if (campaign.complianceStatus !== 'passed') { ... }

// ❌ WRONG — checking for 'pass' instead of 'passed'
if (campaign.complianceStatus !== 'pass') { ... }
```

---

### Rule 3: Campaign sender cron MUST have both GET and POST handlers

Cloud Scheduler sends POST. The cron logic lives in GET. POST delegates to GET. This caused 405 errors that silently dropped campaigns in production.

```typescript
// ✅ CORRECT — both handlers in route.ts
export async function GET(request: NextRequest) {
  // all logic here
  const campaignsSnapshot = await db.collection('campaigns')
    .where('status', '==', 'scheduled')
    .where('scheduledAt', '<=', now)
    .limit(10)
    .get();
  // ...
}

export async function POST(request: NextRequest) {
  return GET(request);  // delegate
}

// ❌ WRONG — only GET, Cloud Scheduler gets 405
export async function GET(request: NextRequest) { /* logic */ }
// POST is missing → campaigns never send from scheduler
```

---

### Rule 4: Dedup is a bulk pre-filter, not a per-recipient check

The implementation loads the entire recently-contacted set ONCE, then filters the recipient list. It does NOT query per recipient in a loop.

```typescript
// ✅ CORRECT — bulk dedup (actual implementation in resolveAudience())
const DEDUP_LOOKBACK_DAYS = 30;  // NOTE: 30 days, not 7!
const lookbackDate = new Date(Date.now() - DEDUP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

const recentCommsSnap = await firestore.collection('customer_communications')
  .where('orgId', '==', campaign.orgId)
  .where('type', '==', campaignType)
  .where('sentAt', '>=', lookbackDate)
  .get();

const recentlyContactedEmails = new Set(
  recentCommsSnap.docs.map(d => d.data().customerEmail as string).filter(Boolean)
);

const deduped = recipients.filter(r => !recentlyContactedEmails.has(r.email));

// ❌ WRONG — per-recipient query inside loop (N+1 problem)
for (const recipient of recipients) {
  const recent = await db.collection('customer_communications')
    .where('customerId', '==', recipient.customerId)
    .where('sentAt', '>=', lookbackDate)
    .limit(1)
    .get();
  if (!recent.empty) continue;
}
```

---

### Rule 5: Campaign goal maps to `customer_communications.type` — mapping is NOT 1:1

The `campaign.goal` field does not directly equal the dedup type. There's a mapping:

```typescript
// campaign-sender.ts resolveAudience()
const campaignType =
  campaign.goal === 'winback'                           ? 'winback'  :
  campaign.goal === 'birthday'                          ? 'birthday' :
  campaign.goal === 'retention' || campaign.goal === 'loyalty' ? 'loyalty'  :
  'campaign';  // default for drive_sales, product_launch, awareness, etc.

// This means: 'drive_sales', 'vip_appreciation', 'product_launch', 'event_promo', 'awareness',
// 'restock_alert' → all map to 'campaign' type in dedup
// They compete with each other in dedup window!
```

---

### Rule 6: `runComplianceCheck()` writes the campaign doc — never call it with an unsaved campaign

The compliance service updates the campaign document as a side effect. The campaign must already exist in Firestore before the check runs.

```typescript
// ✅ CORRECT — campaign exists before compliance runs
const campaign = await getCampaign(campaignId);  // load from Firestore
if (!campaign) return false;

// runComplianceCheck updates campaign doc internally:
await firestore.collection('campaigns').doc(campaign.id).update({
  content: updatedContent,
  complianceStatus: overallStatus,
  complianceReviewedAt: now,
  status: nextStatus,    // 'pending_approval' if passed, 'compliance_review' if failed
  updatedAt: now,
});

// ❌ WRONG — passing unsaved in-memory campaign object
const fakeCampaign = { id: 'nonexistent', ... };
await runComplianceCheck(fakeCampaign);  // will fail on Firestore update
```

---

### Rule 7: Craig agent never dispatches — it only generates copy

Craig's role ends when it returns copy variations. The campaign wizard UI and `executeCampaign()` own the actual send path. Never add send logic to Craig.

```typescript
// ✅ CORRECT — Craig generates, Carlos sends
// Craig returns:
{ smsBody: 'Get 20% off today...', emailSubject: 'A treat for you', emailBody: '...' }

// Campaign wizard saves to campaign.content
// executeCampaign() reads campaign.content and dispatches

// ❌ WRONG — Craig calling Blackleaf/Mailjet directly
// (would bypass compliance gate + dedup)
const success = await blackleaf.sendCustomMessage(phone, body);
```

---

### Rule 8: Email warm-up deferral keeps campaign as 'scheduled' — it does NOT fail it

If the warm-up daily limit is reached, the campaign should stay `'scheduled'` so it retries on the next cron run (not fail or revert to draft).

```typescript
// ✅ CORRECT — defer, don't fail
if (warmup.active && warmup.remainingToday <= 0) {
  logger.warn('[CRON] Warm-up limit reached, deferring campaign', { campaignId });
  continue;  // leave status as 'scheduled' — retries next cron run
}

// ❌ WRONG — marking as failed when warm-up limit hit
await db.collection('campaigns').doc(doc.id).update({ status: 'failed' });
// Now the campaign is permanently failed — can't be recovered automatically
```

---

## Common Mistakes

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| Cloud Scheduler returns 405 | Endpoint only has GET handler | Add `export async function POST(req) { return GET(req) }` |
| Campaign sends despite compliance failure | Layer 2 check reads wrong field name (`'pass'` vs `'passed'`) | Check `complianceStatus !== 'passed'` in `executeCampaign()` |
| Same customer receives same campaign type twice in a month | Dedup query uses wrong field for email lookup | Use `customerEmail` field in `customer_communications`, not `customerId` |
| Compliance check runs but never updates status | `submitForComplianceReview` never loaded campaign before calling check | Load campaign doc first, then call `runComplianceCheck(campaign)` |
| Campaign stays in 'sending' forever | `executeCampaign()` threw before updating status to 'sent' | Outer try/catch in cron handler updates to 'failed' |
| All campaigns with different goals hit same dedup bucket | Goals like 'drive_sales' and 'product_launch' both map to type 'campaign' | Be explicit about goal→type mapping; consider adding more buckets |
| Craig generates wrong brand voice | OrgProfile not loaded in `initialize()` | Check `getOrgProfileWithFallback(orgId)` is called and `buildCraigContextBlock()` injected |
| Campaign sends to org that hit plan limit | Tier check skipped | `getUsageWithLimits()` + `campaignLimit.unlimited` check must remain in `executeCampaign()` |
| `InboxArtifactType` TypeScript error | Used `'campaign'` (not valid) | Use exact type from `src/types/inbox.ts` — `'campaign_draft'` or similar union value |

---

## Campaign Goal → Dedup Type Reference

```
drive_sales      → 'campaign'
winback          → 'winback'
retention        → 'loyalty'
loyalty          → 'loyalty'
birthday         → 'birthday'
restock_alert    → 'campaign'
vip_appreciation → 'campaign'
product_launch   → 'campaign'
event_promo      → 'campaign'
awareness        → 'campaign'
```

Goals that share the 'campaign' dedup type compete: a customer who received a product launch email
is blocked from a restock alert email for 30 days (same type bucket).

---

## Craig Copy Length Hard Limits

```
SMS body (before opt-out): ≤160 characters
  + "Reply STOP to unsubscribe" = 29 chars minimum
  → Safe total: ≤189 chars (fits in 1 SMS unit)
  → 190+ chars splits into 2 messages (double cost)

Email subject: 40-60 chars target
  <40 chars: too vague (low open rate)
  >60 chars: truncated in Gmail/iOS

Email body: 100-300 words for promotional
            50-100 words for transactional/alert
```

---

## Diagnosing Campaign Send Failures

Check in this order:

1. **Is `complianceStatus` set to `'passed'`?** — If not, that's Layer 2 blocking it
2. **Is `status` set to `'scheduled'`?** — Cron only picks up `scheduled` status
3. **Is `scheduledAt <= now`?** — Future-dated campaigns won't fire yet
4. **Did the warm-up limit hit?** — Check `getWarmupStatus(orgId).remainingToday`
5. **Did the tier limit hit?** — Check `getUsageWithLimits(orgId, tierId)`
6. **Is `audience.resolvedCount` 0?** — All customers may have been deduped
7. **Check `campaigns/{id}/recipients` subcollection** — Each recipient has status + error field

---

*Patterns version: 2.0 | Updated: 2026-02-26 | Based on actual source code audit*
