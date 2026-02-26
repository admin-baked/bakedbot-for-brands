# Campaign Carlos — System Architecture

> Encoded from actual source code. Read before touching campaign dispatch, Craig, or Deebo wiring.

---

## Key Files Table

| File | Lines | What It Does |
|------|-------|--------------|
| `src/types/campaign.ts` | 327 | Canonical types — `Campaign`, `CampaignStatus`, `CampaignGoal`, `CampaignContent`, `CampaignPerformance` |
| `src/server/actions/campaigns.ts` | 437 | CRUD + lifecycle: create/update/getCampaign/getCampaigns/approve/schedule/cancel/pause/updatePerformance |
| `src/server/services/campaign-sender.ts` | 425 | Main send engine: `resolveAudience()`, `personalize()`, `executeCampaign()`, `sendToRecipient()` |
| `src/server/services/campaign-compliance.ts` | 151 | Deebo gate: `runComplianceCheck(campaign)` — runs async after `submitForComplianceReview()` |
| `src/app/api/cron/campaign-sender/route.ts` | 155 | Cron endpoint — finds `status=scheduled, scheduledAt<=now`, calls `executeCampaign()`, GET+POST |
| `src/server/agents/craig.ts` | 400+ | Craig agent — loads OrgProfile, goals, benchmarks in `initialize()`, generates copy via LLM |
| `src/app/dashboard/campaigns/` | dir | Campaign wizard UI + campaign list + detail pages |
| `src/app/dashboard/campaigns/components/campaign-wizard-v2.tsx` | — | Multi-step creation wizard |

---

## 1. Full Campaign Data Flow

```
User opens /dashboard/campaigns → clicks "New Campaign"
  ↓
CampaignWizardV2 (multi-step):
  Step 1: Goal selection (drive_sales, winback, retention, loyalty, birthday, ...)
  Step 2: Audience selection (segment type: 'segment'|'custom'|'all')
           → estimatedCount shown from customer segment data
  Step 3: Channel selection ('email' | 'sms' | both)
           → confirms opt-in list for SMS (TCPA)
  Step 4: Craig generates copy
           → createCampaign() → Firestore 'campaigns' doc (status: 'draft')
           → Craig reads OrgProfile → buildCraigContextBlock()
           → Craig generates variations (SMS ≤160 chars, email subject+body)
           → User selects preferred variation or edits
  Step 5: Review & Submit for Compliance
           → submitForComplianceReview(campaignId)
               → sets status: 'compliance_review'
               → fires runComplianceCheck(campaign) async (fire-and-forget)
  ↓
runComplianceCheck() (async):
  → for each channel: buildComplianceText(channel, content)
  → deebo.checkContent('NY', channel, textToCheck)
  → ComplianceResult per channel: { status: 'pass'|'fail'|'warning', violations[], suggestions[] }
  → overallStatus: hasFailure ? 'failed' : hasWarning ? 'warning' : 'passed'
  → Campaign doc update:
      If passed → status: 'pending_approval', complianceStatus: 'passed'
      If failed → stays: 'compliance_review', complianceStatus: 'failed'
  ↓
User approves → approveCampaign(campaignId) → status: 'approved'
User schedules → scheduleCampaign(campaignId, scheduledAt) → status: 'scheduled'
  ↓
Cloud Scheduler: POST /api/cron/campaign-sender (every 5 min)
  → query: status='scheduled' AND scheduledAt <= now (limit 10)
  → check email warm-up daily limit (defer if exceeded, leave 'scheduled')
  → executeCampaign(campaignId) → status: 'sending' → 'sent'|'failed'
  → sendAgentNotification() to campaign creator
```

---

## 2. Campaign Status Lifecycle

```
draft
  ↓ submitForComplianceReview()
compliance_review
  ↓ runComplianceCheck() PASSED
pending_approval
  ↓ approveCampaign()
approved
  ↓ scheduleCampaign()
scheduled
  ↓ executeCampaign() starts
sending
  ↓ all recipients processed
sent

--- error paths ---
compliance_review ← executeCampaign() if complianceStatus !== 'passed' (safety check)
draft ← executeCampaign() if campaign limit exceeded
failed ← executeCampaign() throws
paused ← pauseCampaign()
cancelled ← cancelCampaign()
```

---

## 3. Deebo Compliance Gate — Two Layers

The gate runs in two distinct stages:

```typescript
// LAYER 1: During creation (async, fire-and-forget)
// Triggered by submitForComplianceReview()
const { runComplianceCheck } = await import('@/server/services/campaign-compliance');
runComplianceCheck(campaign).catch(err => logger.error(...));

// LAYER 2: At send time (synchronous, blocking)
// Inside executeCampaign() in campaign-sender.ts line ~188:
if (campaign.complianceStatus !== 'passed') {
  const reason = campaign.complianceStatus === 'failed'
    ? `Compliance failed: ${violations}`
    : 'Campaign has not passed compliance review. Run Deebo check before sending.';

  // Revert to compliance_review status (not failed — still recoverable)
  await firestore.collection('campaigns').doc(campaignId).update({
    status: 'compliance_review',
    updatedAt: new Date(),
  });

  return { success: false, sent: 0, failed: 0, error: reason };
}
// ONLY reaches here if complianceStatus === 'passed'
```

**`deebo.checkContent()` signature:**
```typescript
deebo.checkContent(stateCode: string, channel: 'email' | 'sms', content: string)
  → ComplianceResult { status: 'pass'|'fail'|'warning', violations: string[], suggestions: string[] }
```

Note: compliance-service maps `'pass'` → `'passed'` and `'fail'` → `'failed'` when writing to campaign doc.

---

## 4. Deduplication — 30-Day Lookback

The actual implementation in `resolveAudience()` uses **30 days**, not 7 days:

```typescript
// campaign-sender.ts ~line 89
const DEDUP_LOOKBACK_DAYS = 30;
const lookbackDate = new Date(Date.now() - DEDUP_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

// Campaign type mapping (goal → communication type):
const campaignType =
  campaign.goal === 'winback'   ? 'winback'   :
  campaign.goal === 'birthday'  ? 'birthday'  :
  campaign.goal === 'retention' || campaign.goal === 'loyalty' ? 'loyalty' :
  'campaign';

// Bulk dedup query (NOT per-recipient — one query for whole batch):
const recentCommsSnap = await firestore.collection('customer_communications')
  .where('orgId', '==', campaign.orgId)
  .where('type', '==', campaignType)
  .where('sentAt', '>=', lookbackDate)
  .get();

const recentlyContactedEmails = new Set(
  recentCommsSnap.docs.map(d => d.data().customerEmail as string).filter(Boolean)
);

// Filter recipients BEFORE sending (not per-recipient check)
const deduped = recipients.filter(r => !recentlyContactedEmails.has(r.email));
```

---

## 5. SMS and Email Dispatch

### Email via `sendGenericEmail()`
```typescript
// campaign-sender.ts sendToRecipient()
const result = await sendGenericEmail({
  to: recipient.email,
  name: recipient.firstName,
  subject: personalizedSubject,
  htmlBody: personalizedHtml || `<p>${personalizedBody.replace(/\n/g, '<br>')}</p>`,
  textBody: personalizedBody,
  orgId: campaign.orgId,
  communicationType: 'campaign',
  agentName: campaign.createdByAgent || 'craig',
  campaignId: campaign.id,
});
// sendGenericEmail checks Gmail OAuth token first, falls back to Mailjet
// Keys: MAILJET_API_KEY + MAILJET_SECRET_KEY in apphosting.yaml
```

### SMS via BlackleafService
```typescript
// campaign-sender.ts sendToRecipient()
const success = await blackleaf.sendCustomMessage(
  recipient.phone,
  personalizedBody,  // MUST include opt-out language — Deebo enforces this
  content.imageUrl,  // optional MMS
);
// BlackleafService wraps BLACKLEAF_API_KEY in apphosting.yaml
```

---

## 6. Personalization Template Variables

Available in SMS body and email subject/body via `{{variable}}` syntax:

```typescript
'{{firstName}}'        → recipient.firstName || 'there'
'{{lastName}}'         → recipient.lastName || ''
'{{segment}}'          → capitalize(recipient.segment)
'{{totalSpent}}'       → `$${recipient.totalSpent.toLocaleString()}`
'{{orderCount}}'       → String(recipient.orderCount)
'{{daysSinceLastVisit}}'  → String(recipient.daysSinceLastOrder ?? 'N/A')
'{{loyaltyPoints}}'    → String(recipient.loyaltyPoints ?? 0)
'{{orgName}}'          → orgName from tenants/{orgId} doc
```

---

## 7. Campaign Tier Limit Enforcement

Before dispatching, `executeCampaign()` checks the org's monthly campaign quota:

```typescript
const tierCheckData = (await firestore.collection('tenants').doc(campaign.orgId).get()).data();
const tierId = tierCheckData?.subscriptionTier || 'scout';

const usage = await getUsageWithLimits(campaign.orgId, tierId);
const campaignLimit = usage.metrics.customCampaigns;

if (!campaignLimit.unlimited && campaignLimit.used >= campaignLimit.limit) {
  // Revert campaign to 'draft' (so org can upgrade + retry)
  await firestore.collection('campaigns').doc(campaignId).update({ status: 'draft', ... });
  return { success: false, error: 'Campaign limit exceeded: ...' };
}
// On success: await incrementUsage(campaign.orgId, 'customCampaignsUsed', 1)
```

Tier limits: Scout = 0 campaigns/month, Pro = 3, Growth/Empire = unlimited.

---

## 8. Craig Agent Context Loading

Craig's `initialize()` runs `Promise.all` for three async data sources before building system instructions:

```typescript
// craig.ts initialize()
const [goalDirectives, orgProfile, benchmarks] = await Promise.all([
    orgId ? loadAndBuildGoalDirective(orgId) : Promise.resolve(''),
    orgId ? getOrgProfileWithFallback(orgId).catch(() => null) : Promise.resolve(null),
    orgId ? getMarketBenchmarks(orgId).catch(() => null) : Promise.resolve(null),
]);

const contextBlock = orgProfile ? buildCraigContextBlock(orgProfile) : '';
const benchmarkBlock = benchmarks ? buildBenchmarkContextBlock(benchmarks) : '';

// All three injected into system_instructions:
// ${goalDirectives}  ← active org goals with urgency indicators
// ${contextBlock}    ← OrgProfile brand voice block
// ${benchmarkBlock}  ← market benchmarks for copy grounding
```

Grounding rules baked into Craig's instructions:
- Never fabricate metrics or open rates ("say 'We'll track performance'")
- Always disclose when POS is not connected
- Check integration status before claiming SMS/email capabilities
- One variation for Scout plan, multiple for Pro/Empire

---

## 9. Firestore Schema

```
campaigns/{campaignId}
  orgId: string
  createdBy: string
  createdByAgent?: InboxAgentPersona
  threadId?: string            ← linked inbox thread
  name: string
  description?: string
  goal: CampaignGoal           ← 'drive_sales'|'winback'|'retention'|'loyalty'|'birthday'|...
  status: CampaignStatus       ← see lifecycle above
  channels: CampaignChannel[]  ← 'email'|'sms'
  audience: CampaignAudience
    type: 'segment'|'custom'|'all'
    segments?: CustomerSegment[]
    estimatedCount: number
    resolvedCount?: number       ← set at send time
  content: Partial<Record<CampaignChannel, CampaignContent>>
    email?:
      subject?: string
      body: string
      htmlBody?: string
      complianceStatus?: 'pending'|'passed'|'failed'|'warning'
      complianceViolations?: string[]
      complianceSuggestions?: string[]
    sms?:
      body: string              ← MUST include "Reply STOP to unsubscribe"
      imageUrl?: string         ← MMS
  scheduledAt?: Date
  sentAt?: Date
  completedAt?: Date
  complianceStatus?: 'passed'|'failed'|'warning'    ← aggregate
  complianceReviewedAt?: Date
  approvedAt?: Date
  approvedBy?: string
  performance?: CampaignPerformance
    totalRecipients, sent, delivered, opened, clicked
    bounced, unsubscribed, revenue
    openRate, clickRate, bounceRate, conversionRate  ← computed
    lastUpdated: Date
  tags?: string[]
  createdAt: Date
  updatedAt: Date

campaigns/{campaignId}/recipients/{recipientId}
  campaignId, customerId, email, phone?, firstName?
  segment, channel, status: 'pending'|'sent'|'delivered'|'opened'|'clicked'|'bounced'|'failed'
  sentAt?, deliveredAt?, openedAt?, clickedAt?, bouncedAt?
  error?, providerMessageId?

customer_communications/{autoId}
  orgId: string
  customerId: string
  customerEmail: string       ← keyed for dedup lookup
  type: string                ← 'winback'|'birthday'|'loyalty'|'campaign'
  channel: 'email'|'sms'
  sentAt: Timestamp
  campaignId: string
```

---

## 10. Email Warm-Up System

The cron checks warm-up daily limits before dispatching campaigns:

```typescript
// campaign-sender/route.ts
const warmup = await getWarmupStatus(orgId);
if (warmup.active && warmup.remainingToday !== undefined && warmup.remainingToday <= 0) {
  // Leave campaign as 'scheduled' — it will retry on the next cron run
  continue;
}

// After successful send, increment warm-up counter:
if (warmup.active) {
  await recordWarmupSend(orgId, result.sent);
}
```

This prevents new accounts from triggering spam filters during domain warm-up period.

---

*Architecture version: 2.0 | Updated: 2026-02-26 | Based on actual source code audit*
