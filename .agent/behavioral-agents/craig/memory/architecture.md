# Craig — System Architecture

> Growth engine, marketer, campaign strategist. Persona ID: `craig`.
> Source: `src/server/agents/craig.ts`

---

## Role

Craig is the **"Growth Engine"** and marketing/campaign strategist. He turns customer
conversations into automated revenue and Playbooks. High-energy, creative, data-driven.

Key distinction from Smokey: Craig serves the **dispensary operator** (marketing strategy,
campaign creation, SMS/email dispatch) while Smokey serves **customers** (product questions).
Craig never directly sells to customers — he builds the machinery that does.

---

## initialize() Context Loads

```typescript
const orgId = (brandMemory.brand_profile as any)?.orgId || (brandMemory.brand_profile as any)?.id;

const [goalDirectives, orgProfile, benchmarks] = await Promise.all([
    orgId ? loadAndBuildGoalDirective(orgId) : Promise.resolve(''),
    orgId ? getOrgProfileWithFallback(orgId).catch(() => null) : Promise.resolve(null),
    orgId ? getMarketBenchmarks(orgId).catch(() => null) : Promise.resolve(null),
]);

const contextBlock = orgProfile ? buildCraigContextBlock(orgProfile) : '';
const benchmarkBlock = benchmarks ? buildBenchmarkContextBlock(benchmarks) : '';
```

| Context | Source | How Used |
|---------|--------|----------|
| `goalDirectives` | `loadAndBuildGoalDirective(orgId)` | Combined load+build in one call (vs Smokey's separate load+build) |
| `orgProfile` | `getOrgProfileWithFallback(orgId)` | `buildCraigContextBlock(orgProfile)` → CAMPAIGN CONTEXT block |
| `benchmarks` | `getMarketBenchmarks(orgId)` | `buildBenchmarkContextBlock()` → financial benchmarks |

### Conditional: Margin Product Context (sequential, post-parallel)

```typescript
const activeGoals = await loadActiveGoals(orgId);
const marginGoal = activeGoals.find(g => g.category === 'margin');
if (marginGoal && marginGoal.metrics[0]) {
    const marginContext = await fetchMarginProductContext(orgId, targetMarginPct);
    agentMemory.system_instructions += marginContext;
}
```

Craig also injects margin product context when a margin goal is active, so campaigns
avoid promoting low-margin products without surfacing the cost impact.

### Hive Mind Init (Letta)

```typescript
const { lettaBlockManager } = await import('@/server/services/letta/block-manager');
await lettaBlockManager.attachBlocksForRole(brandId, agentMemory.agent_id, 'brand');
```

Craig connects to shared Letta "brand" memory blocks — persistent knowledge shared
across Craig sessions. Fails gracefully with a warn log.

### Role-Based Ground Truth (v2.0)

```typescript
const roleGT = await loadRoleGroundTruth(roleContext, tenantId);
if (roleGT) {
    const rolePrompt = buildRoleSystemPrompt(roleGT, 'craig', 'full');
    agentMemory.system_instructions += `\n\n${rolePrompt}`;
}
```

Craig loads role-specific Q&A pairs and workflow guides based on the user's role
(`brand`, `dispensary`, `super_user`, `customer`). Injected after all other context.

---

## buildCraigContextBlock()

Source: `src/server/services/org-profile.ts`

Builds `=== {NAME} — CAMPAIGN CONTEXT ===` block from the unified OrgProfile:

```
- Brand header (name, city, state, dispensary type)
- Voice guidance (tone, vocabulary)
- Messaging block: tagline, positioning, key messages (if populated)
- Compliance requirements: age disclaimer, content restrictions, medical claims guidance
- Campaign strategy:
    - Archetype + growth stage
    - Tone archetype (e.g., 'playful', 'authoritative')
    - Promotion strategy (e.g., 'discount-led', 'education-first', 'loyalty-driven')
    - Preferred channels (ordered: sms > email > social etc.)
    - Frequency cap (max N campaigns/week per customer)
- Business priorities (top 2 objectives from org profile)
- Hard boundaries
```

---

## buildBrandBrief() (Legacy)

Source: `src/lib/brand-guide-prompt.ts`

```typescript
export function buildBrandBrief(brandGuide: BrandGuide | null | undefined): string
```

Legacy function that reads the old `BrandGuide` type from the `brands/` collection.
Used in earlier sessions before unified OrgProfile. Still exists for backward compat.

`buildBrandVoiceBrief()` is an even lighter version — just voice + vocabulary. Craig
historically used this for Smokey-like contexts. Current Craig uses `buildCraigContextBlock()`.

---

## Tools Available to Craig

### Campaign Tools

| Tool | Description |
|------|-------------|
| `createCampaign` | Create a new campaign record in Firestore |
| `sendSmsCampaign` | Dispatch SMS via Blackleaf integration (TCPA-gated) |
| `sendEmailCampaign` | Dispatch email via Mailjet or Gmail |
| `getCampaignMetrics` | Retrieve KPIs for an existing campaign |
| `promotion_scorecard` | Review last comparable promotion (GP delta, discount rate) |

### Compliance

Craig always calls the Deebo compliance gate before any send. Handled via:
1. `validateCompliance(content, jurisdictions)` tool call
2. Or explicit `deebo.checkContent()` in the dispatch flow

### Brand Discovery Tools

| Tool | Description |
|------|-------------|
| `extractBrandData(url)` | Extract competitor's full brand identity (colors, fonts, voice, positioning) |
| `discoverWebContent(url)` | Read full content from any URL |
| `searchWebBrands(query)` | Search the web for brands, competitors, market trends |

Craig is instructed to **proactively use these tools** before answering strategy questions:
- "draft me a campaign" → `searchWebBrands` for competitor messaging first
- "how should I position my brand" → `extractBrandData` on top competitors
- User shares URL → `discoverWebContent` then extract insights

### Artifact Creation

| Tool | Description |
|------|-------------|
| `createCreativeArtifact` | Generate social media post artifact (caption, hashtags, compliance notes) |
| `createQRCodeArtifact` | Generate QR code artifact with analytics tracking |

### Shared Tools

`contextOsToolDefs`, `lettaToolDefs`, `craigInboxToolDefs`, `craigCrmToolDefs`,
`dispensaryAnalyticsToolDefs` (via `makeAnalyticsToolsImpl`).

---

## Campaign Creation Flow

```
1. User requests campaign
2. Craig generates copy (3 variations: Professional, Hype, Educational)
   OR 1 variation if user is scout/public role (Interview Mode)
3. Before any send:
   a. deebo.checkContent(stateCode, channel, content) — MANDATORY compliance gate
   b. Check integration status (SMS configured? Email configured?)
   c. Check dedup window: customer_communications collection (7-day lookback)
4. If compliance passes:
   a. SMS: sendSmsCampaign() → Blackleaf API (check opt-out list first!)
   b. Email: sendGenericEmail() → tries Gmail token first, falls back to Mailjet/SendGrid
5. Record in customer_communications for dedup
```

---

## TCPA Compliance Pattern

Every SMS must include opt-out language:

```
"Reply STOP to opt-out"  (or equivalent)
```

The 7-day dedup check uses `customer_communications` collection:
```
collection('customer_communications')
    .where('customerId', '==', id)
    .where('type', '==', 'sms')
    .where('sentAt', '>=', lookbackDate)
```

If a customer received an SMS within 7 days, skip them. This prevents spam and TCPA violations.

---

## sendGenericEmail() Dispatch Order

```typescript
sendGenericEmail(to, subject, body, userId?)
    1. If userId: check users/{uid}/integrations/gmail for access_token
       → if found: send via Gmail OAuth (user's own account)
    2. Fallback: Mailjet API (or SendGrid)
```

Gmail-first dispatch means operators who connected their Gmail account send from their
own address — much higher deliverability and personal brand value.

Key: Gmail keyword detection in `agent-runner.ts` fires **BEFORE** Craig's `runMultiStepTask`.
So "send email" requests always hit the gmail path first — Craig's planner does not need
a `send_gmail` tool because the keyword routing handles it upstream.

---

## Interview Mode Protocol (Scout/Public Role)

```
If the user has the role 'scout' or 'public', you are "Auditioning".
- Write ONE copy variation (e.g., just the Email Subject Line + Hook).
- Ask: "Want the full campaign sequence? Upgrade to unlock the full automation."
- Do NOT write the full campaign for free.
```

Standard output for brand/dispensary users: 3 full variations (Professional, Hype, Educational).
Interview mode is gated by `brandMemory.user_context.role`.

---

## Promotion Discipline (MANDATORY)

```
Before recommending any new promotion, use promotion_scorecard to review
the last comparable promotion. Show the GP delta and discount rate impact.
Apply the -0.4% GM elasticity rule in every recommendation.
A campaign that generates revenue but destroys gross profit is a failure.
Report both metrics, always.
```

Craig is explicitly configured to prevent margin destruction through promotions.
This is a business safeguard — not a compliance rule.

---

## orient() Logic

```typescript
orient(brandMemory, agentMemory, stimulus) {
    if (stimulus && typeof stimulus === 'string') return 'user_request';
    // Sort failing/queued/running campaigns by algorithmic priority
    // calculateCampaignPriority() scores by impact + urgency
    return highestPriorityCampaign.id || null;
}
```

In inbox usage, `stimulus` is always the user message, so `'user_request'` is always returned.
The campaign priority ordering is for proactive/scheduled usage.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/server/agents/craig.ts` | Agent implementation |
| `src/server/services/org-profile.ts` | `buildCraigContextBlock()` |
| `src/lib/brand-guide-prompt.ts` | `buildBrandBrief()` (legacy), `buildBrandVoiceBrief()` |
| `src/server/agents/goal-directive-builder.ts` | `loadAndBuildGoalDirective()` (Craig uses combined fn) |
| `src/server/tools/campaign-tools.ts` | Craig's campaign tool definitions |
| `src/server/services/letta/block-manager.ts` | Hive mind memory blocks |
| `src/server/grounding/role-loader.ts` | `loadRoleGroundTruth()`, `buildRoleSystemPrompt()` |
| `.agent/golden-sets/craig-campaigns.json` | 15 golden set cases |
