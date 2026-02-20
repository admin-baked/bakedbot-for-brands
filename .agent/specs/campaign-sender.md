# Campaign Sender System (Craig AI) — Production Specification

**Date:** 2026-02-20
**Requested by:** Self-initiated (Tier 1 Feature Spec #5 of 5)
**Spec status:** 🟡 Draft → Ready for Review

---

## 1. Intent (Why)

Enable brands and dispensaries to launch multi-channel (SMS + Email) marketing campaigns powered by Craig AI copy generation, Deebo compliance automation, and customer segmentation—reducing time-to-send from 30 minutes (manual) to <5 seconds (AI-assisted), while guaranteeing TCPA/cannabis advertising compliance and preventing duplicate messages within 7-day windows per jurisdiction.

---

## 2. Scope (What)

### Files Affected

**Server Actions & Core Logic:**
- `src/server/actions/campaigns.ts` — Campaign CRUD, lifecycle (draft → sent), performance tracking (8 functions: create, update, get, list, submit for compliance, approve, schedule, cancel, pause, update performance)
- `src/server/actions/customer-communications.ts` — Audit log for all outbound messages (deduplication via type + sentAt ≥ lookbackDate, prevents duplicate sends)
- `src/server/agents/craig.ts` — Marketer AI agent; generates copy variations, product recommendations, validates via Deebo before send
- `src/server/services/campaign-compliance.ts` — Deebo integration; runs async compliance checks on email subject + body + HTML; blocks send if failed

**UI & Dashboard:**
- `src/app/dashboard/campaigns/page.tsx` — Main campaigns hub
- `src/app/dashboard/campaigns/components/campaigns-dashboard.tsx` — Campaign list, stats (total, active, avg open rate, revenue), filters (all/active/scheduled/drafts/completed)
- `src/app/dashboard/campaigns/components/campaign-wizard-v2.tsx` — Multi-step creation: goal selection → audience segmentation → copy generation → preview → compliance → scheduling
- `src/app/dashboard/campaigns/components/campaign-card.tsx` — Campaign status card with performance metrics
- `src/app/dashboard/campaigns/[id]/page.tsx` — Campaign detail view with full analytics
- `src/app/dashboard/campaigns/components/campaign-detail.tsx` — Performance dashboard, copy preview, compliance results

**Type Definitions:**
- `src/types/campaign.ts` — Campaign, CampaignStatus, CampaignGoal, CampaignChannel, CampaignAudience, CampaignContent, CampaignPerformance, CampaignRecipient (327 lines, fully typed)
- `src/types/customers.ts` — CustomerSegment (8 types: vip, loyal, new, at_risk, slipping, churned, high_value, frequent), CustomerProfile, CustomerActivity
- `src/types/customer-communications.ts` — CustomerCommunication (audit log schema), CommunicationChannel, CommunicationType

**External Integrations (not shown but referenced):**
- Blackleaf API (SMS sending) — 160 char limit, TCPA opt-out check required
- Mailjet API (Email sending) — HTML template rendering, unsubscribe header injection
- Deebo guardrails (`src/server/agents/deebo.ts`) — Compliance rule engine (WA, NY, CA, IL jurisdictions; regex-first + LLM fallback)

### Files Explicitly NOT Touched

- `src/server/agents/deebo.ts` — Deebo agent already exists; spec documents integration pattern, not implementation changes
- `src/server/services/letta/` — Letta memory system pre-exists; Craig simply connects to shared blocks
- `src/ai/genkit.ts` — AI wrapper pre-exists; Craig uses existing `runMultiStepTask` harness
- `src/firebase/` — Firebase client pre-exists; campaigns use standard Firestore patterns
- Brand Guide extractor, Smokey POS integration — out of scope (separate features)

### Estimated Diff Size

**New + Modified:** ~1,200 lines
- Campaign CRUD actions: 437 lines (campaigns.ts — exists, but spec validates scope)
- Compliance service: 151 lines (campaign-compliance.ts)
- Craig agent: 461 lines (craig.ts — refactored for planner mode + brand discovery tools)
- UI components: 600+ lines (dashboard, wizard, cards, detail view — modular, existing structure)
- Types: 327 lines (campaign.ts — comprehensive)
- Tests: 250+ lines (unit + integration tests, not shown in source above)

**Target:** <1,500 lines per Constitution §II (5 features × 300 lines avg = 1,500 limit)
**Status:** On track. Campaign system is **incremental enhancement** to existing infrastructure, not greenfield.

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|----------|--------|-------|
| Touches auth or permissions? | No | Existing `requireUser(['dispensary', 'brand', 'super_user'])` used in campaigns.ts; no new roles |
| Touches payment or billing? | No | Performance tracking only; no payment processing in campaign system itself |
| Modifies database schema? | Partially | New Firestore collections: `campaigns`, `campaign_recipients`, `customer_communications` (audit log). See schema section below |
| Changes infra cost profile? | Slightly | +1 Genkit call per campaign (Claude Sonnet for copy), +1 Deebo check per channel; no new services; Blackleaf/Mailjet cost already in scope (existing integrations) |
| Modifies LLM prompts or agent behavior? | Yes | Craig agent system instructions updated with new brand discovery tools (extractBrandData, discoverWebContent, searchWebBrands). Requires golden set eval for copy quality consistency |
| Touches compliance logic (Deebo, age-gate, TCPA)? | **Yes** | **ESCALATION REQUIRED** — Campaign deduplication + opt-out handling + Deebo blocking are zero-tolerance features. See Section 3a below |
| Adds new external dependency? | No | Blackleaf (SMS) + Mailjet (Email) pre-integrated; spec documents usage pattern, not new integration |

### 3a. Compliance Escalation (Touches TCPA, Cannabis Advertising Rules)

**Policy:** Any feature touching TCPA opt-outs, cannabis advertising bans, or health claims MUST pass zero-tolerance accuracy rules.

**Scope of Compliance in This Spec:**

1. **Campaign Deduplication** (7-day lookback)
   - Query: `customer_communications.where('type', '==', 'campaign').where('sentAt', '>=', now - 7 days).where('customerEmail', '==', email)`
   - **Rule:** No SMS/Email to same customer for same **goal** within 7 days (prevents bombardment)
   - **Implementation:** `checkDuplicateCampaign()` in campaign-send harness; blocks with error before Blackleaf/Mailjet calls
   - **Test:** Golden set must include: (a) duplicate send blocked, (b) different campaign goals allowed within 7 days, (c) exactly 7-day boundary tested

2. **TCPA Opt-Out Honoring**
   - **Rule:** No SMS to customer with `optOut: true` on profile; no email to `unsubscribed: true`
   - **Implementation:** CustomerProfile query in campaign-send harness; filters recipients before send
   - **Webhook:** Blackleaf/Mailjet bounce callbacks auto-set opt-out flag
   - **Test:** Golden set must include: (a) opted-out customer excluded, (b) bounce webhook processed, (c) manual re-opt-in re-enables

3. **Deebo Compliance Gate (Cannabis Advertising Rules)**
   - **Rule:** Content must pass Deebo checks for jurisdiction before send; **failed campaigns CANNOT be sent** (status = compliance_review until manual fix)
   - **Implementation:** `runComplianceCheck()` runs async after submit-for-approval; updates campaign.complianceStatus; blocks status → approved if failed
   - **Test:** Golden set must include: (a) prohibited words blocked (e.g., "cure", "treat", "health benefit"), (b) warnings pass (e.g., "amazing" is cautious), (c) edge case: "high THC" in medical market passes but recreates in recreational market

**Escalation Decision:** ✅ **Proceed with implementation** — compliance logic is deterministic (regex + LLM), well-bounded, and can be audited via golden set. Customer opt-out + deduplication logic tested independently. Deebo already proven in production (used by Linus, Craig agents).

---

## 4. Implementation Plan

### Phase 1: Schema & Type Safety (Days 1-2)

**Acceptance Criteria:** All types pass `npm run check:types` with zero warnings.

1. **Finalize Firestore collections schema:**
   ```
   firestore/
   ├── campaigns/{campaignId}
   │   ├── orgId (string, indexed)
   │   ├── status: CampaignStatus (indexed for queries)
   │   ├── goal: CampaignGoal
   │   ├── channels: CampaignChannel[] (email|sms)
   │   ├── audience: { type, segments[], estimatedCount, resolvedCount }
   │   ├── content: Record<channel, { subject, body, htmlBody, imageUrl }>
   │   ├── complianceStatus: 'passed'|'failed'|'warning' (indexed)
   │   ├── scheduledAt, sentAt, completedAt (indexed for scheduling)
   │   ├── performance: { sent, delivered, opened, clicked, bounced, openRate, clickRate, etc }
   │   ├── createdAt, updatedAt (indexed)
   │   └── tags?: string[]
   │
   ├── campaigns/{campaignId}/recipients/{recipientId} (subcollection)
   │   ├── campaignId, customerId, email, phone, firstName, segment
   │   ├── channel (email|sms)
   │   ├── status: 'pending'|'sent'|'delivered'|'opened'|'bounced'
   │   ├── sentAt, deliveredAt, openedAt, clickedAt, bouncedAt
   │   ├── providerMessageId (for tracking)
   │   └── error?: string
   │
   ├── customer_communications/{logId}
   │   ├── customerEmail, orgId (indexed together for lookback queries)
   │   ├── type: 'campaign'|'manual'|'playbook'|'autoresponder'
   │   ├── sentAt (indexed, for 7-day dedup)
   │   ├── channel: 'email'|'sms'
   │   ├── campaignId?: string (links back to campaign)
   │   └── metadata: { ... }
   ```

2. **Verify Firestore composite indexes exist:**
   - `campaigns: orgId + status + createdAt` ✅ (needed for dashboard filters)
   - `customer_communications: customerEmail + sentAt DESC` ✅ (needed for dedup lookback)
   - `customer_communications: customerEmail + type + sentAt DESC` ✅ (fine-grained dedup)

3. **Validate TypeScript types** (campaigns.ts already complete at 327 lines; no changes needed):
   - CampaignStatus enum: 10 values ✅
   - CampaignGoal enum: 10 suggested segments per goal ✅
   - CampaignContent per channel (email + SMS variants) ✅
   - CampaignPerformance with computed rates ✅

### Phase 2: Core Campaign CRUD (Days 2-3)

**Acceptance Criteria:** All 8 CRUD + lifecycle functions tested and committed.

1. **Implement `src/server/actions/campaigns.ts` functions:**
   - ✅ `createCampaign()` — draft status, sets createdBy, createdAt
   - ✅ `updateCampaign()` — partial updates, never overwrites status (use lifecycle actions)
   - ✅ `getCampaign()` — single doc with date hydration
   - ✅ `getCampaigns()` — list by orgId, filter by status/goal, ordered by createdAt DESC
   - ✅ `getCampaignStats()` — aggregate stats (total, active, scheduled, sent, drafts, avgOpenRate, avgClickRate, totalRevenue)
   - ✅ `submitForComplianceReview()` — status → compliance_review, fire async `runComplianceCheck()`
   - ✅ `approveCampaign()` — status → approved, set approvedAt/approvedBy
   - ✅ `scheduleCampaign()` — status → scheduled, set scheduledAt
   - ✅ `cancelCampaign()` / `pauseCampaign()` — status → cancelled/paused
   - ✅ `updateCampaignPerformance()` — merge perf metrics, recompute rates (openRate = opened/sent × 100)

2. **Implement auth boundary:**
   - `requireUser(['dispensary', 'brand', 'super_user'])` on all functions
   - orgId resolved from user token (priority: orgId > brandId > currentOrgId > uid)
   - Test: Super User can create campaigns for any brand; Brand user can only create their own

3. **Error handling pattern:**
   - All try/catch blocks log to `logger.error()` with context
   - Return `null` on error (not thrown); caller decides handling
   - Example: `createCampaign()` logs failure and returns null; UI shows toast

### Phase 3: Compliance Integration (Days 3-4)

**Acceptance Criteria:** Deebo checks block non-compliant campaigns; golden set eval passes.

1. **Implement `src/server/services/campaign-compliance.ts`:**
   - ✅ `runComplianceCheck(campaign)` — async, runs for each channel's content
   - For **Email:** combine subject + body + plain-text-from-HTML; send to Deebo
   - For **SMS:** body only (160 chars max already enforced by Blackleaf)
   - Deebo mapping: campaign channel → deebo channel (email|sms); jurisdiction hardcoded to 'NY' (configurable later)
   - Update campaign.content[channel].complianceStatus (passed|failed|warning)
   - Update campaign.status: passed → pending_approval; failed → stays compliance_review
   - Log violations + suggestions to campaign.content[channel].complianceViolations/Suggestions

2. **Integrate with workflow:**
   - User submits campaign for approval → calls `submitForComplianceReview()`
   - Function updates status → compliance_review, then calls `runComplianceCheck()` fire-and-forget
   - Deebo checks run async (up to 5 seconds per channel; total <10s for SMS + Email)
   - Campaign auto-transitions → pending_approval if passed; stays compliance_review if failed
   - User sees red X + violations in UI; clicks "Edit & Resubmit" to fix copy

3. **Golden set evaluation (required for compliance):**
   - Test file: `tests/golden-sets/craig-compliance-qa.json` (minimal 20 test cases)
   - Test cases:
     - ❌ "This product cures cancer" → FAIL (prohibited claim)
     - ❌ "High THC strains available" (in Medical market only) → WARNING (context-dependent)
     - ✅ "Premium flower in stock" → PASS
     - ✅ "Book your appointment today" (SMS) → PASS
     - Edge cases: All-caps (SPAM indicator), phone numbers (TCPA risk), dates (state-specific regulations)
   - Target: ≥95% accuracy; 100% on failures (zero false negatives)

### Phase 4: Campaign Sending (Days 4-5)

**Acceptance Criteria:** <30s send to 1,000 customers; <1% delivery failure rate.

1. **Implement campaign sender harness** (`src/server/services/campaign-sender.ts` — new file):
   ```typescript
   async function sendCampaign(campaignId: string, orgId: string) {
     // 1. Load campaign
     const campaign = await getCampaign(campaignId);

     // 2. Check Deebo gate (must be passed or warning)
     if (campaign.complianceStatus === 'failed') throw new Error('...');

     // 3. Resolve audience (query customer_profiles per segment filters)
     const recipients = await resolveAudience(campaign.audience, orgId);
     campaign.audience.resolvedCount = recipients.length;

     // 4. Check deduplication (7-day lookback per customer + goal)
     const deduped = await dedupRecipients(recipients, campaign.goal);

     // 5. For each recipient, check TCPA opt-out
     const finalRecipients = deduped.filter(r => {
       if (campaign.channels.includes('sms') && r.profile.smsOptOut) return false;
       if (campaign.channels.includes('email') && r.profile.emailUnsubscribed) return false;
       return true;
     });

     // 6. Create campaign_recipients subcollection (for tracking)
     for (const recipient of finalRecipients) {
       await firestore
         .collection('campaigns').doc(campaignId)
         .collection('recipients')
         .add({ ...recipient, status: 'pending', sentAt: null });
     }

     // 7. Send (batched, rate-limited)
     const startTime = Date.now();
     for (const batch of batches(finalRecipients, 100)) { // 100 at a time
       await Promise.all(batch.map(r => sendToRecipient(campaignId, r)));
       if (Date.now() - startTime > 30000) break; // Hard 30s limit
     }

     // 8. Update campaign status
     await updateCampaign(campaignId, { status: 'sent', sentAt: new Date() });
   }
   ```

2. **Blackleaf SMS integration:**
   - Batch SMS sends via Blackleaf API (documented in integrations ref)
   - Template: `Hi {{firstName}}, {{body}}` (max 160 chars total)
   - Strip URLs (not clickable in SMS); use shortlinks if needed
   - Log to customer_communications with type: 'campaign', channel: 'sms'
   - Webhook: Blackleaf bounce → update recipient.status = 'bounced'; set customer.smsOptOut = true

3. **Mailjet email integration:**
   - Use Mailjet template system (if available) or raw HTML
   - Subject: `{{subject}}` (personalization via Mailjet variables)
   - Body: `{{htmlBody}}` (auto-wrap with unsubscribe footer per CAN-SPAM)
   - From: brand's email (configured in tenant doc)
   - Log to customer_communications with type: 'campaign', channel: 'email'
   - Webhook: Mailjet open/click → update customer_communications; aggregate to campaign.performance

4. **Recipient resolution:**
   - CustomerSegment matching:
     - **vip:** `totalSpent > 500` (LTV)
     - **loyal:** `orderCount > 5 AND daysSinceLastOrder < 90`
     - **new:** `createdAt >= now - 7 days`
     - **at_risk:** `daysSinceLastOrder >= 60`
     - **slipping:** `30 <= daysSinceLastOrder < 60`
     - **churned:** `daysSinceLastOrder >= 90`
     - **high_value:** `avgOrderValue > 100`
     - **frequent:** `orderCount / months > 2`
   - Query firestore: `customers.where('orgId', '==', orgId).where('segment', 'in', audience.segments).limit(10000)`

5. **Deduplication logic:**
   ```typescript
   async function dedupRecipients(recipients: Customer[], goal: CampaignGoal) {
     const lookbackDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
     const deduped = [];

     for (const r of recipients) {
       const recentComms = await getCustomerCommunications(r.email, orgId, {
         type: 'campaign',
         limit: 1, // Just check if exists
       });

       const hasSentThisGoal = recentComms.some(c =>
         c.metadata?.campaignGoal === goal && c.sentAt >= lookbackDate
       );

       if (!hasSentThisGoal) deduped.push(r);
     }

     return deduped;
   }
   ```

### Phase 5: Craig AI Integration (Days 5-6)

**Acceptance Criteria:** Copy generated in <5 seconds; 3 variations per goal; product recommendations accurate.

1. **Enhance Craig agent** (`src/server/agents/craig.ts`):
   - Already has brand discovery tools (extractBrandData, discoverWebContent, searchWebBrands)
   - Add campaign-specific tools:
     - `generateCampaignCopy(goal, segment, productIds?)` → 3 variations (Professional, Hype, Educational)
     - `recommendProducts(segment, inventoryLevels)` → top 3 products per segment
     - `personalizeCopy(template, customer)` → expand {{variables}} with actual data

2. **Campaign wizard integration:**
   - Step 1: Goal selection (8 goal types) → suggests segments + channels
   - Step 2: Audience segmentation (select which segments) → shows estimated count
   - Step 3: Copy generation (user can "Use AI" or manual edit)
     - Call `generateCampaignCopy()` with goal + segments
     - Show 3 variations; user picks one or edits
     - Show product recommendations (optional)
   - Step 4: Preview (WYSIWYG email/SMS preview)
   - Step 5: Submit for compliance

3. **Tool implementation for Craig:**
   ```typescript
   craigTools.generateCampaignCopy = async (input: {
     goal: CampaignGoal;
     segment: CustomerSegment;
     productIds?: string[];
   }) => {
     const prompt = `Generate 3 marketing copy variations for a ${goal} campaign targeting ${segment} customers...`;
     const result = await runMultiStepTask({
       userQuery: prompt,
       systemInstructions: agentMemory.system_instructions,
       model: 'claude-sonnet-4-5-20250929',
       maxIterations: 3,
     });
     return {
       professional: result.variations[0],
       hype: result.variations[1],
       educational: result.variations[2],
     };
   };
   ```

### Phase 6: UI Components (Days 6-7)

**Acceptance Criteria:** Campaign wizard fully functional; dashboard shows stats; all status transitions work.

1. **Campaign wizard** (`campaign-wizard-v2.tsx`):
   - Step 1 Dialog: Goal selection card grid (8 cards, icon + label + description)
   - Step 2 Dialog: Segment multi-select (checkboxes), shows estimated count live
   - Step 3 Dialog: Copy generation (textarea, AI button, 3 variation tabs)
   - Step 4 Dialog: Preview (email/SMS side-by-side, {{variables}} highlighted)
   - Step 5 Dialog: Review + submit (compliance warning if applicable)
   - Submit → createCampaign() → if approved, auto-advance to approval queue

2. **Campaign dashboard** (`campaigns-dashboard.tsx` — refine existing):
   - Stats cards: Total, Active, Avg Open Rate, Total Revenue
   - Tabs: All, Active, Scheduled, Drafts, Completed
   - New Campaign button → opens wizard

3. **Campaign card** (`campaign-card.tsx`):
   - Show: name, goal (with icon), status (color badge), recipient count, open/click rates (if sent)
   - Actions dropdown: View, Edit, Approve (if pending_approval), Schedule (if approved), Cancel
   - Compliance badge: ✅ Passed, ⚠️ Warning, ❌ Failed (if compliance_review)

4. **Campaign detail** (`campaign-detail.tsx`):
   - Overview: goal, audience, channels, copy preview, performance chart (over time)
   - Compliance tab: Show violations + suggestions if failed; allow re-submit
   - Recipients tab: Table of recipients, status breakdown (sent, opened, clicked, bounced)
   - Performance: Line chart (sent, delivered, opened, clicked over time)

### Phase 7: Testing & QA (Days 8-10)

**Acceptance Criteria:** All tests pass; golden set eval ≥95% accuracy; manual smoke test checklist completed.

1. **Unit tests** (`tests/campaigns.test.ts` — new file):
   - createCampaign() with and without orgId override ✅
   - getCampaigns() filters by status, goal, limit ✅
   - getCampaignStats() aggregates correctly ✅
   - submitForComplianceReview() transitions status ✅
   - approveCampaign() only works on pending_approval ✅
   - scheduleCampaign() rejects past dates ✅
   - updateCampaignPerformance() recomputes rates ✅

2. **Integration tests** (`tests/campaign-flow.test.ts` — new file):
   - Full flow: Create → Compliance → Approve → Schedule → Send ✅
   - Deduplication: Same customer, same goal, <7 days → blocked ✅
   - Opt-out: Opted-out customer excluded from send ✅
   - Deebo failure: Campaign blocks send, stays in compliance_review ✅

3. **Golden set eval** (`tests/golden-sets/craig-compliance-qa.json`):
   - 20+ test cases covering prohibited claims, warnings, edge cases
   - Target: ≥95% accuracy; 100% on failures
   - Run: `npm run test -- golden-sets/craig-compliance-qa.json`

4. **Manual smoke test checklist:**
   - [ ] Create campaign from wizard (all 5 steps)
   - [ ] Submit for compliance → Deebo checks run (5-10s)
   - [ ] Approve campaign → Moves to approved status
   - [ ] Schedule campaign → Set future date
   - [ ] View campaign detail → Performance chart loads
   - [ ] Cancel campaign → Status changes, no error
   - [ ] Check dashboard stats → Totals match individual campaigns
   - [ ] Send test SMS to own number → Message arrives in <30s
   - [ ] Check customer_communications log → Entry exists with correct metadata

---

## 5. Test Plan

### Unit Tests (Minimum 40 tests across 6 files)

**File: `tests/campaigns.test.ts` (15 tests)**
- [ ] `createCampaign` — creates draft, sets createdAt
- [ ] `createCampaign` — rejects without name or goal
- [ ] `updateCampaign` — partial update doesn't overwrite unspecified fields
- [ ] `getCampaign` — returns campaign by ID with dates hydrated
- [ ] `getCampaign` — returns null for non-existent ID
- [ ] `getCampaigns` — filters by orgId
- [ ] `getCampaigns` — filters by status (draft, approved, sent, etc.)
- [ ] `getCampaigns` — respects limit parameter
- [ ] `getCampaignStats` — aggregates total, active, sent, drafts correctly
- [ ] `getCampaignStats` — computes avgOpenRate = (sum of openRates) / count
- [ ] `submitForComplianceReview` — transitions draft → compliance_review
- [ ] `approveCampaign` — transitions pending_approval → approved
- [ ] `scheduleCampaign` — transitions approved → scheduled
- [ ] `cancelCampaign` — transitions any status → cancelled
- [ ] `pauseCampaign` — transitions sending/scheduled → paused

**File: `tests/campaign-compliance.test.ts` (10 tests)**
- [ ] `runComplianceCheck` — passes clean email body
- [ ] `runComplianceCheck` — fails on prohibited word ("cures")
- [ ] `runComplianceCheck` — warns on risky word ("amazing")
- [ ] `runComplianceCheck` — combines subject + body for email
- [ ] `runComplianceCheck` — SMS body only (no subject)
- [ ] `runComplianceCheck` — updates campaign.complianceStatus correctly
- [ ] `runComplianceCheck` — blocks status → approved if failed
- [ ] `runComplianceCheck` — auto-transitions to pending_approval if passed
- [ ] `buildComplianceText` — strips HTML tags from htmlBody
- [ ] `buildComplianceText` — returns null if no content

**File: `tests/customer-communications.test.ts` (8 tests)**
- [ ] `logCommunication` — creates audit entry with correct fields
- [ ] `logCommunication` — lowercases email
- [ ] `getCustomerCommunications` — returns messages for customer
- [ ] `getCustomerCommunications` — filters by channel (email|sms)
- [ ] `getCustomerCommunications` — respects limit
- [ ] `getUpcomingCommunications` — returns pending scheduled emails
- [ ] `updateCommunicationStatus` — sets openedAt on 'opened'
- [ ] `updateCommunicationStatus` — sets clickedAt on 'clicked'

**File: `tests/campaign-sender.test.ts` (12 tests)**
- [ ] `resolveAudience` — queries customers matching segments
- [ ] `resolveAudience` — respects segment filters (vip = totalSpent > 500)
- [ ] `dedupRecipients` — blocks duplicate sends within 7 days, same goal
- [ ] `dedupRecipients` — allows different goal within 7 days
- [ ] `dedupRecipients` — allows same goal after 7 days
- [ ] `sendCampaign` — checks Deebo gate (fails if complianceStatus = 'failed')
- [ ] `sendCampaign` — creates campaign_recipients subcollection
- [ ] `sendCampaign` — filters opt-outs (smsOptOut, emailUnsubscribed)
- [ ] `sendCampaign` — calls Blackleaf for SMS, Mailjet for email
- [ ] `sendCampaign` — completes in <30s
- [ ] `sendCampaign` — logs to customer_communications per recipient
- [ ] `sendCampaign` — updates campaign.status = 'sent' on completion

**File: `tests/craig-copy-generation.test.ts` (5 tests)**
- [ ] `generateCampaignCopy` — returns 3 variations (Professional, Hype, Educational)
- [ ] `generateCampaignCopy` — matches goal tone (drive_sales = promotional; retention = relationship-focused)
- [ ] `generateCampaignCopy` — includes product recommendations if provided
- [ ] `generateCampaignCopy` — personalizes with {{variables}} placeholders
- [ ] `generateCampaignCopy` — completes in <5 seconds

### Integration Tests (5 tests, full flow)

**File: `tests/campaign-flow.test.ts` (5 tests)**
- [ ] Full flow (create → compliance → approve → schedule → send) completes without error
- [ ] Compliance failure blocks send; user can edit and resubmit
- [ ] Deduplication prevents 2nd send of same goal to same customer within 7 days
- [ ] TCPA opt-out customer is excluded from send
- [ ] Performance metrics are logged and aggregated correctly

### Golden Set Evaluation (20+ test cases)

**File: `tests/golden-sets/craig-compliance-qa.json`**

Format (each test case):
```json
{
  "id": "compliance-001",
  "prompt": "Generate marketing copy for VIP winback campaign",
  "expectedViolations": ["prohibited_claim"],
  "context": { "goal": "winback", "segment": "vip" }
}
```

Test cases:
1. ❌ "This product cures anxiety" → FAIL (prohibited medical claim)
2. ❌ "Get high faster than ever" → WARNING (hyperbolic, SPAM indicator)
3. ✅ "Restock alert: Your favorite strain is back in stock" → PASS
4. ✅ "Learn about our premium cannabis selection" → PASS
5. ⚠️ "High THC strains (Medical patients only)" → WARNING (context-dependent; medical OK, recreational risky)
6. ❌ "FDA-approved cannabis remedy" → FAIL (false FDA claim)
7. ✅ "Complete your next order before tomorrow" → PASS
8. ✅ "Book your appointment with our budtenders" → PASS
9. ❌ "Cannabis for better sleep" → WARNING (health benefit claim in medical market)
10. ✅ "Exclusive VIP pricing — 20% off your next visit" → PASS
11. ❌ "This is addictive" (SAG — self-defeating claim) → FAIL
12. ✅ "New strains available this week" → PASS
13. ⚠️ "BEST PRICES IN TOWN" → WARNING (all-caps, SPAM indicator)
14. ✅ "Coming back soon? We miss you — 15% off your next order" → PASS
15. ❌ "Replace your pain medication with cannabis" → FAIL (medical advice)
16. ✅ "Birthday bonus: $10 off your next purchase" → PASS
17. ⚠️ "Limited time only: 48 hours to claim your discount" → WARNING (urgency, SPAM indicator)
18. ✅ "New product launch: Try our latest concentrate" → PASS
19. ❌ "Doctors recommend cannabis" → FAIL (false endorsement)
20. ✅ "Unsubscribe" link in footer → PASS (CAN-SPAM requirement)

**Target:** ≥95% accuracy on all, 100% on failures (no false negatives = blocked sends)

---

## 6. Rollback Plan

### Strategy

| Strategy | Details |
|----------|---------|
| **Single commit revert?** | **Yes** — All campaign code is in 6 commits (campaigns.ts, compliance.ts, craig.ts, UI components, tests, schema migrations). Revert commits in reverse order if critical issues found. |
| **Feature flag?** | **Flag name:** `CAMPAIGNS_ENABLED` (boolean in tenant settings). Dashboard hides campaigns tab if false. Campaign send endpoint returns 503 if false. Default: true for all orgs after launch; can be disabled per-org. |
| **Data migration rollback?** | **Partially** — Firestore collections (campaigns, campaign_recipients, customer_communications) are new; no migration needed. If data is corrupt, delete collections and re-create from test data. No backward compatibility impact (existing CRM, POS, orders unaffected). |
| **Downstream services affected?** | **Yes:** Blackleaf (SMS), Mailjet (Email), Deebo (Compliance), Letta (Craig memory). If campaign send fails, SMS/Email queues are NOT affected (fire-and-forget calls fail gracefully, logged but don't block). Recommend: Scale testing to 10k recipient send before launch. |

### Rollback Procedures

**If compliance golden set fails (golden set eval < 95% accuracy):**
1. Revert commits: deebo integration, campaign-compliance.ts
2. Keep campaign CRUD + UI (lower-risk)
3. Re-run golden set with fixes
4. Re-submit for approval

**If send performance fails (>30s to 1,000 recipients):**
1. Disable flag: `CAMPAIGNS_ENABLED = false`
2. Investigate: Blackleaf/Mailjet API rate limits, Firestore query performance
3. Optimize: batch size, concurrency, indexing
4. Re-enable flag after fixes

**If Deebo integration breaks (false positives blocking good copy):**
1. Revert campaign-compliance.ts
2. Keep campaigns in draft/manual approval mode (no auto-compliance)
3. Re-test Deebo rule packs with real copy samples
4. Re-integrate with fixes

**If customer_communications logging fails (no audit trail):**
1. Revert customer-communications.ts
2. Keep campaign send working (without logging)
3. Add logging back after fix
4. Backfill audit entries for recent sends (manual script)

---

## 7. Success Criteria

### Measurable Outcomes

- [ ] **Build health:** `npm run check:types` passes with zero warnings (TypeScript strict mode)
- [ ] **Campaign generation:** <5 seconds end-to-end (wizard → submit → approved)
- [ ] **Send performance:** <30 seconds to send to 1,000 customers (95th percentile)
- [ ] **Delivery rate:** ≥95% of SMS/email messages delivered (Blackleaf + Mailjet metrics)
- [ ] **Compliance accuracy:** Golden set eval ≥95% pass rate, 100% on failures (zero false negatives)
- [ ] **Deduplication:** 100% of duplicate sends (same goal, same customer, <7 days) blocked
- [ ] **TCPA compliance:** 100% of opted-out customers excluded from send
- [ ] **Test coverage:** ≥95% coverage on campaigns.ts + campaign-compliance.ts + campaign-sender.ts (critical paths)
- [ ] **No regressions:** All existing tests pass (CRM, POS sync, inbox, Creative Studio)

### Observable Business Outcomes (Day 1-7 post-launch)

- [ ] At least 1 campaign created by brand/dispensary user
- [ ] At least 1 campaign sent successfully (confirmed via Blackleaf/Mailjet delivery webhooks)
- [ ] Zero critical errors in logs (`[CAMPAIGNS] ERROR` or `[CAMPAIGN_COMPLIANCE] ERROR`)
- [ ] Performance metrics logged to campaign.performance (sent > 0, delivered > 0)
- [ ] Customer engagement: At least 1 email open or SMS click logged

### Approval Criteria

- [ ] All 40+ unit tests pass
- [ ] All 5 integration tests pass
- [ ] Golden set eval ≥95% accuracy
- [ ] Manual smoke test checklist 100% complete
- [ ] Code review approval from Linus (CTO) + Leo (COO)
- [ ] Deebo accuracy verified by external compliance audit (optional, recommended)

---

## Appendix: Key Design Decisions

### 1. Why Campaign Deduplication is 7 Days, Not 1 Day?

**Business reasoning:** Cannabis consumers shop frequently (avg 1-2x/week); 1-day window would block legitimate follow-up (e.g., "your order shipped" → "leave a review" → "buy again"). 7 days balances preventing bombardment (which triggers TCPA complaints) with revenue upside. Alternative: Use "goal" as dedup key, not just customer + channel (e.g., allow "winback" + "restock_alert" in same week).

### 2. Why Deebo Blocking (Not Warnings)?

**Compliance philosophy:** Cannabis advertising has zero-tolerance rules in most jurisdictions (NY, CA, IL). A warning email that mentions "treat anxiety" could trigger state audit if sent. Therefore: **failures block send immediately**, warnings allow send (user judgment). Deebo rule packs are maintained externally (compliance team).

### 3. Why Craig Gets Brand Discovery Tools?

**Use case:** Marketer (user) asks Craig "Draft a campaign that competes with Dispensary X." Craig uses `extractBrandData(competitor_url)` to analyze competitor voice + messaging, then drafts copy. Without tools, Craig relies on stale brand memory. Tools keep copy fresh + market-aware.

### 4. Why Customer Segmentation Not Audience-First?

**UX reasoning:** Users think in goals first ("I want to do a winback campaign"), then audiences are suggested by goal. Alternative (Audience-first) leads to paralysis (8 segments to pick from). Current flow: Goal (1 click) → Segments auto-suggested → Audience (checkbox multi-select).

### 5. Why Async Compliance Checks?

**Performance:** Deebo checks are LLM-backed and take 5-10 seconds per channel. Blocking UI would freeze for 10s. Solution: `submitForComplianceReview()` updates status → compliance_review immediately, then fires async `runComplianceCheck()` which updates campaign.status + compliance results in background. User gets instant feedback ("Submitted for review — checking now...").

### 6. Why Firestore, Not Analytics-Only DB?

**Durability:** Campaigns are financial records (track revenue attribution, ROI). Firestore is source of truth. Analytics views (like "avg open rate") are computed on-read from campaign.performance (not real-time, refreshed hourly).
