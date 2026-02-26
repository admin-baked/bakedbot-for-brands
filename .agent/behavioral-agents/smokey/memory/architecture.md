# Smokey — System Architecture

> Budtender, product expert, front-desk greeter. Persona ID: `smokey`.
> Source: `src/server/agents/smokey.ts`

---

## Role

Smokey is the **Digital Budtender & Product Expert**. She is also the **Front Desk Greeter** —
the first line of contact. If a user asks for something outside her expertise
(competitive intel, compliance, campaigns), she delegates to the appropriate specialist.

Key distinction from Craig: Smokey serves customers (product questions, recommendations,
upsells) while Craig serves operators (campaigns, marketing strategy). They share the
same harness but have opposite audience orientations.

---

## initialize() Context Loads

Loaded in a single `Promise.all` (non-blocking, `.catch(() => null)` on all):

```typescript
const [activeGoals, orgProfile, vendorBrands, benchmarks] = await Promise.all([
    loadActiveGoals(orgId),
    getOrgProfileWithFallback(orgId).catch(() => null),
    getVendorBrandSummary(orgId),
    getMarketBenchmarks(orgId).catch(() => null),
]);
```

| Context | Source | How Used |
|---------|--------|----------|
| `activeGoals` | `goal-directive-builder.ts` | `buildGoalDirectives()` → directive block injected before Agent Squad |
| `orgProfile` | `getOrgProfileWithFallback(orgId)` | `buildSmokeyContextBlock(orgProfile)` → BUDTENDER CONTEXT block |
| `vendorBrands` | `getVendorBrandSummary(orgId)` | `=== BRANDS WE CARRY ===` block (only when brands.length > 0) |
| `benchmarks` | `getMarketBenchmarks(orgId)` | `buildBenchmarkContextBlock()` → financial benchmarks |

### Conditional: Margin Product Context

After the parallel load, if a margin goal is active:

```typescript
const marginGoal = activeGoals.find(g => g.category === 'margin');
const marginProductContext = marginGoal && marginGoal.metrics[0]
    ? await fetchMarginProductContext(orgId, marginGoal.metrics[0].targetValue).catch(() => '')
    : '';
```

This injects per-product cost/margin data so Smokey can prioritize high-margin products
in recommendations and upsell flows. `fetchMarginProductContext` is a sequential load
after the parallel block.

### Ground Truth (Dispensary QA Pairs)

```typescript
const groundTruth = await loadGroundTruth(brandId);
if (groundTruth) {
    groundingSection = buildGroundingInstructions(groundTruth).full;
}
```

Ground truth is Firestore-first, falls back to code. Used for exact Q&A pairs about
hours, location, payment methods, etc. for specific dispensaries.

---

## buildSmokeyContextBlock()

Source: `src/server/services/org-profile.ts`

Builds `=== {NAME} — BUDTENDER CONTEXT ===` block from the unified OrgProfile:

```
- Brand header (name, city, state, dispensary type)
- Voice guidance (tone adjectives, vocabulary, formality level)
- Recommendation approach:
    - Philosophy (educational / effects-focused / value-focused)
    - Education depth (overview / detailed / expert)
    - New user protocol (gentle-intro / standard / advanced)
    - Upsell aggressiveness (0.0–1.0 scale)
- Business context (archetype, growth stage, top 2 objectives)
- Behavioral guidelines (acquisition vs retention, compliance conservatism)
- Hard boundaries (never-do list from org profile)
```

Returns empty string if no org profile — agent falls back to default behavior.

---

## BRANDS WE CARRY Block

```typescript
const vendorBrandsSection = vendorBrands.length > 0
    ? `\n=== BRANDS WE CARRY (${vendorBrands.length}) ===\n...`
    : '';
```

Built from `getVendorBrandSummary(orgId)` which reads `tenants/{orgId}/vendor_brands/`.
Each brand entry includes: name, description (up to 3 chars), voice keywords (up to 3),
product lines (up to 3). Allows Smokey to speak knowledgeably about specific vendor brands.

---

## Tools Available to Smokey

### Core Tools (act() phase)

| Tool | Description |
|------|-------------|
| `searchMenu` | Search dispensary menu by name, category, or effect. Always called before recommending. |
| `rankProductsForSegment` | Rank products for a customer segment (Genkit semantic matching). |
| `suggestUpsells` | Get ONE complementary upsell after recommending a product. |
| `analyzeExperimentResults` | Check A/B test status. |
| `triggerCheckout` | Initiate checkout for specific product IDs. |

### Shared Jina Tools (web search)

| Tool | Description |
|------|-------------|
| `jina_search` | Search the web (primary). Fires BEFORE answering trend/news questions. |
| `jina_read_url` | Read full content from a URL. |
| `jina_rerank` | Rerank search results by relevance. |

### YouTube Tools

| Tool | Description |
|------|-------------|
| `get_youtube_transcript` | Extract transcript + metadata from YouTube URL. Auto-saves to Drive when orgId provided. |

### Letta / Context OS (shared)

`lettaSaveFact`, `lettaAsk`, `lettaUpdateCoreMemory`, `lettaMessageAgent`,
`context_read`, `context_write` — memory persistence and inter-agent messaging.

### Inbox + CRM Tools

`smokeyInboxToolDefs`, `smokeyCrmToolDefs` — thread creation, customer lookup, inbox artifact creation.

---

## System Prompt Structure

```
You are Smokey, the Digital Budtender & Product Expert.
[FRONT DESK GREETER role]
CORE PRINCIPLES (1-5)
[GOAL DIRECTIVES]            ← from buildGoalDirectives(activeGoals)
[MARGIN PRODUCT CONTEXT]     ← if marginGoal active
[ORG PROFILE CONTEXT BLOCK]  ← buildSmokeyContextBlock(orgProfile)
[VENDOR BRANDS WE CARRY]     ← if vendorBrands.length > 0
[BENCHMARK CONTEXT]          ← if benchmarks available
=== AGENT SQUAD ===          ← buildSquadRoster('smokey')
DELEGATION ROUTING           ← Market→Ezal, Compliance→Deebo, Marketing→Craig, etc.
[DISPENSARY GROUND TRUTH]    ← if loadGroundTruth returns data
=== GROUNDING RULES ===      ← 5 rules (see patterns.md)
=== UPSELL BEHAVIOR ===
OUTPUT RULES
```

---

## Routing: How Smokey Is Invoked

Smokey is included in `SKIP_ROUTING_PERSONAS` (`agent-runner.ts` line 813):

```typescript
const SKIP_ROUTING_PERSONAS = ['...', 'smokey', ...];
const useForcePersona = personaId && SKIP_ROUTING_PERSONAS.includes(personaId);
```

When `personaId === 'smokey'`, routing via `AgentRouter` is skipped. The message goes
directly to Smokey's `runMultiStepTask()` call. This is the primary path — Smokey is
almost always explicitly selected in the inbox UI, not auto-routed.

Auto-routing to Smokey does happen when `AgentRouter.route()` matches product/menu
keywords and returns Smokey with confidence > 0.6 (but explicit selection is far more common).

---

## orient() Logic

```typescript
orient(brandMemory, agentMemory, stimulus) {
    if (stimulus && typeof stimulus === 'string') return 'user_request';
    // Priority 1: Running UX experiment near decision (> 100 sessions)
    // Priority 2: Experimental rec policy
    // Priority 3: Queued UX experiment
    return null;
}
```

For inbox usage, `stimulus` is always the user's message string, so orient() always
returns `'user_request'`. The UX experiment priority ordering is for future automated
scheduling use.

---

## Test Mock Isolation

When testing Smokey, mock ALL of these in `initialize()`:

```typescript
jest.mock('@/server/agents/goal-directive-builder');    // loadActiveGoals, fetchMarginProductContext
jest.mock('@/server/actions/vendor-brands');            // getVendorBrandSummary
jest.mock('@/server/services/org-profile');             // getOrgProfileWithFallback
jest.mock('@/server/services/market-benchmarks');       // getMarketBenchmarks
jest.mock('@/server/grounding');                        // loadGroundTruth
```

Missing mocks cause real Firestore calls → test timeout (15s+).
See MEMORY.md session 2026-02-25 (OrgProfile Phases 5-7 + Test Fixes).

---

## Key Files

| File | Purpose |
|------|---------|
| `src/server/agents/smokey.ts` | Agent implementation |
| `src/server/services/org-profile.ts` | `buildSmokeyContextBlock()` |
| `src/server/agents/goal-directive-builder.ts` | `loadActiveGoals()`, `fetchMarginProductContext()` |
| `src/server/actions/vendor-brands.ts` | `getVendorBrandSummary()` |
| `src/lib/brand-guide-prompt.ts` | `buildBrandVoiceBrief()` (lighter version, legacy) |
| `src/server/grounding/index.ts` | `loadGroundTruth()`, `buildGroundingInstructions()` |
| `src/server/tools/jina-tools.ts` | `jinaToolDefs`, `makeJinaToolsImpl()` |
| `src/server/tools/youtube-tools.ts` | `youtubeToolDefs`, `makeYouTubeToolsImpl()` |
| `.agent/golden-sets/smokey-qa.json` | 27 golden set cases (10 compliance-critical) |
