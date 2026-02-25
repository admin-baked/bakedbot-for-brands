# Spec: Dispensary Intent Profile Framework (DIPF) — Phase 1

**Date:** 2026-02-24
**Requested by:** Product (PRD — DIPF Phase 1)
**Spec status:** 🟡 Draft

---

## 1. Intent (Why)

Replace generic agent behavior with org-specific strategic intelligence by giving Smokey and Craig a persistent "intent profile" — a structured configuration of business archetype, weighted objectives, and value trade-offs — so that every recommendation, campaign, and upsell reflects the dispensary's actual strategy rather than a one-size-fits-all default.

---

## 2. Scope (What)

### Files to Create

| Path | Purpose |
|---|---|
| `src/types/dispensary-intent-profile.ts` | Full type system — all enums, interfaces, the main `DispensaryIntentProfile` type |
| `src/server/services/intent-profile.ts` | Service layer — cache, CRUD, block builders, defaults, completeness calc |
| `src/server/actions/intent-profile.ts` | Server actions — auth-gated CRUD for UI and agents |
| `src/app/dashboard/settings/intent-profile/page.tsx` | Settings page (server component) |
| `src/app/dashboard/settings/intent-profile/intent-profile-client.tsx` | Client component — sliders, enum selectors, save |
| `src/components/dashboard/intent-profile/trade-off-slider.tsx` | Reusable slider component (0.0–1.0 with named poles) |
| `src/components/dashboard/intent-profile/archetype-selector.tsx` | 5-card archetype picker |
| `tests/intent-profile.test.ts` | 16 unit tests covering service, block builders, defaults, completeness |

### Files to Modify

| Path | Change |
|---|---|
| `src/server/agents/smokey.ts` | Add `getIntentProfile` + `buildSmokeyIntentBlock` call in `initialize()` |
| `src/server/agents/craig.ts` | Add `getIntentProfile` + `buildCraigIntentBlock` call in `initialize()` |
| `src/app/dashboard/settings/page.tsx` | Add "Intent Profile" tab with link to `/dashboard/settings/intent-profile` |
| `firestore.indexes.json` | Add 1 composite index on `org_intent_profiles` |

### Files Explicitly NOT Touched

| Path | Reason |
|---|---|
| `src/server/agents/deebo.ts` | Phase 2 scope |
| `src/server/agents/pops.ts` | Phase 2 scope |
| `src/server/agents/ezal.ts` | Phase 2 scope |
| `src/server/agents/linus.ts` | Out of scope entirely |
| `src/server/services/letta/` | Cross-agent coordination is Phase 3 |
| Any delivery or POS sync files | Not related |

**Estimated diff size:** ~650 lines new code, ~30 lines modified in existing agents and settings page.

---

## 3. Boundary Check

| Boundary | Yes/No | Notes |
|---|---|---|
| Touches auth or permissions? | Yes | Server actions use `requireUser()` + org membership check — same pattern as `src/server/actions/goals.ts` |
| Touches payment or billing? | No | — |
| Modifies database schema? | Yes | New top-level collection `org_intent_profiles` + history subcollection |
| Changes infra cost profile? | No | New Firestore collection costs <$0.01/mo at current org count |
| Modifies LLM prompts or agent behavior? | Yes | Golden set eval required for Smokey and Craig after injection |
| Touches compliance logic (Deebo, age-gate, TCPA)? | No | DIPF does not change Deebo gate; compliance posture is advisory guidance only |
| Adds new external dependency? | No | No new npm packages; uses existing Firestore admin SDK |

**Escalation needed?** Yes — LLM prompt modification requires golden set eval before merge.
**Golden set target:** ≥90% Smokey overall, 100% compliance cases; ≥90% Craig overall, 100% compliance cases.

---

## 4. Implementation Plan

Execute in this exact order. Run `npm run check:types` after each step.

### Step 1 — Type System

Create `src/types/dispensary-intent-profile.ts` with the complete type system defined in Section 5 below. No implementation logic in this file — types only.

### Step 2 — Service Layer

Create `src/server/services/intent-profile.ts` with:
- In-memory 5-minute cache (`Map<string, IntentProfileCache>`)
- `getIntentProfile(orgId)` — reads from cache or Firestore
- `upsertIntentProfile(orgId, updates, updatedBy)` — writes to Firestore + history subcollection + invalidates cache
- `getDefaultProfile(archetype, orgId)` — returns hardcoded defaults per archetype (Section 7)
- `buildSmokeyIntentBlock(profile)` — returns formatted string (Section 8)
- `buildCraigIntentBlock(profile)` — returns formatted string (Section 9)
- `calculateCompletionPct(profile)` — returns 0–100 integer (Section 10)
- `invalidateCache(orgId)` — deletes cache entry

### Step 3 — Server Actions

Create `src/server/actions/intent-profile.ts` with `'use server'` directive. Auth pattern: call `requireUser()`, verify `user.orgId === orgId || user.role === 'super_user'`. Three exported async functions (signatures in Section 11).

### Step 4 — Smokey Agent Modification

In `src/server/agents/smokey.ts`, `initialize()` method:

After the existing `const [activeGoals, brandGuideResult, vendorBrands] = await Promise.all([...])` block (line ~84), add the intent profile fetch. Add import at top of file. Inject `intentBlock` into `system_instructions` immediately before the `=== AGENT SQUAD` section.

### Step 5 — Craig Agent Modification

In `src/server/agents/craig.ts`, `initialize()` method:

After the existing `const [goalDirectives, brandGuideResult] = await Promise.all([...])` block (line ~58), add the intent profile fetch. Add import at top of file. Inject `intentBlock` into `system_instructions` immediately before `=== AGENT SQUAD`.

### Step 6 — UI Components

Create `src/components/dashboard/intent-profile/trade-off-slider.tsx` (Section 12).
Create `src/components/dashboard/intent-profile/archetype-selector.tsx` (Section 13).

### Step 7 — Settings Page

Create `src/app/dashboard/settings/intent-profile/page.tsx` (server component, Section 14).
Create `src/app/dashboard/settings/intent-profile/intent-profile-client.tsx` (client component, Section 15).

### Step 8 — Settings Tab Link

Modify `src/app/dashboard/settings/page.tsx`: add a new `TabsTrigger` with value `"intent"` labeled "Intent Profile" with `Target` icon from lucide-react. The corresponding `TabsContent` renders a `<Link href="/dashboard/settings/intent-profile">` card with a description and "Configure" button. This approach avoids embedding the full client in the already-heavy settings page.

### Step 9 — Firestore Index

Add the composite index to `firestore.indexes.json` (Section 16).

### Step 10 — Tests

Create `tests/intent-profile.test.ts` with all 16 test cases from Section 17.

### Step 11 — Golden Set Eval

Run `node scripts/run-golden-eval.mjs --agent smokey --full` and `node scripts/run-golden-eval.mjs --agent craig --full`. Both must pass before merging. Document before/after scores.

---

## 5. Complete TypeScript Type System

**File:** `src/types/dispensary-intent-profile.ts`

```typescript
// src/types/dispensary-intent-profile.ts
// Dispensary Intent Profile Framework (DIPF) — Phase 1 Types

// ─────────────────────────────────────────────────────────────────────────────
// Enumerations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The five core archetypes that define a dispensary's market positioning.
 * Used to seed default ValueHierarchies and AgentConfigs.
 */
export type BusinessArchetype =
  | 'premium_boutique'   // Elevated experience, quality over volume, education-first
  | 'value_leader'       // High-volume, competitive pricing, transaction-optimized
  | 'community_hub'      // Relationship-driven, local loyalty, culture-first
  | 'medical_focus'      // Patient-first, clinical tone, condition-based guidance
  | 'lifestyle_brand';   // Cannabis culture, creativity, brand identity as product

/**
 * What the dispensary is primarily trying to achieve right now.
 * Multiple can be active simultaneously via WeightedObjective[].
 */
export type PrimaryObjective =
  | 'increase_foot_traffic'      // Drive more first-time and return visits
  | 'boost_average_order_value'  // Increase spend per transaction via upsells/bundles
  | 'improve_retention'          // Reduce churn; maximize repeat purchase rate
  | 'grow_loyalty_enrollment'    // Increase loyalty program membership
  | 'launch_new_products'        // Drive awareness and trial of new SKUs
  | 'clear_aging_inventory'      // Move slow-moving stock before expiry/markdown
  | 'build_brand_authority';     // Establish reputation, education, community trust

/** Where the dispensary is in its business lifecycle. */
export type GrowthStage =
  | 'startup'      // <12 months open; focus on customer acquisition and awareness
  | 'growth'       // 12-36 months; scaling systems and growing loyal base
  | 'established'  // 36+ months; optimizing retention and defending market share
  | 'expansion';   // Multi-location or entering new markets

/** How the dispensary positions itself relative to competitors. */
export type CompetitivePosture =
  | 'aggressive'   // Actively competes on price; monitors and matches competitor moves
  | 'defensive'    // Protects existing customers; avoids price wars
  | 'differentiator'; // Competes on unique value (experience, brand, education)

/** Where the dispensary focuses its customer growth efforts geographically. */
export type GeographicStrategy =
  | 'hyperlocal'      // <5 mile radius; neighborhood-first marketing
  | 'regional'        // City/metro-wide; 5-25 mile marketing reach
  | 'multi_location'  // Multiple physical locations with shared brand
  | 'delivery_first'; // Delivery radius is primary acquisition geography

// ─────────────────────────────────────────────────────────────────────────────
// Core Value Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A weighted business objective. All weights in a dispensary's objectives array
 * should sum to 1.0. Enforced by UI but not validated at the service layer
 * to allow partial saves.
 */
export interface WeightedObjective {
  objective: PrimaryObjective;
  /** 0.0–1.0. Sum of all WeightedObjective.weight values should equal 1.0 */
  weight: number;
}

/**
 * Six sliding-scale trade-offs that define how agents behave in ambiguous situations.
 * All values are 0.0 (left pole) to 1.0 (right pole).
 * 0.5 = perfectly balanced / neutral.
 */
export interface ValueHierarchies {
  /**
   * 0.0 = Speed and efficiency (resolve quickly, minimal back-and-forth)
   * 1.0 = Education-first (explain options thoroughly before recommending)
   */
  speedVsEducation: number;

  /**
   * 0.0 = Maximize transaction count (favor high-velocity affordable items)
   * 1.0 = Maximize margin per transaction (favor premium products and upsells)
   */
  volumeVsMargin: number;

  /**
   * 0.0 = Acquisition-first (prioritize converting new customers)
   * 1.0 = Retention-first (prioritize existing loyal customers)
   */
  acquisitionVsRetention: number;

  /**
   * 0.0 = Marketing-forward (bold claims, frequent contact, aggressive promotion)
   * 1.0 = Maximum compliance conservatism (conservative language, infrequent contact)
   */
  complianceConservatism: number;

  /**
   * 0.0 = Full automation (let AI handle everything, maximize throughput)
   * 1.0 = Human-in-the-loop (escalate edge cases, prefer human sign-off)
   */
  automationVsHumanTouch: number;

  /**
   * 0.0 = Casual and friendly (conversational, emoji-ok, slang-ok)
   * 1.0 = Clinical and professional (formal language, medical framing)
   */
  brandVoiceFormality: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent-Specific Configurations
// ─────────────────────────────────────────────────────────────────────────────

/** How Smokey (budtender AI) should approach recommendations and conversations. */
export interface SmokeyIntentConfig {
  /**
   * The primary lens Smokey uses when ranking recommendations.
   * 'chemistry_first'  — leads with terpenes, cannabinoids, and entourage effect
   * 'effect_first'     — leads with customer-stated desired effect (relax, focus, sleep)
   * 'price_first'      — leads with best value for budget
   * 'popularity_first' — leads with what other customers are buying
   */
  recommendationPhilosophy: 'chemistry_first' | 'effect_first' | 'price_first' | 'popularity_first';

  /**
   * How aggressively Smokey suggests add-ons and upsells.
   * 0.0 = Never upsell (answer the question and stop)
   * 0.5 = Gentle suggestion (one upsell, then respect "no")
   * 1.0 = Active upsell (multiple suggestions, frame urgency)
   * Behavioral thresholds: <0.4 = low, 0.4–0.7 = medium, >0.7 = high
   */
  upsellAggressiveness: number;

  /**
   * Protocol for first-time or unknown customers.
   * 'guided'   — ask 2-3 intake questions before recommending
   * 'express'  — go straight to top picks; minimal friction
   * 'discover' — invite customer to describe themselves; conversational discovery
   */
  newUserProtocol: 'guided' | 'express' | 'discover';

  /**
   * How much product education Smokey provides per recommendation.
   * 'minimal'       — product name, price, and one-line benefit
   * 'moderate'      — name, price, key effects, main terpene
   * 'comprehensive' — full terpene profile, cannabinoid breakdown, use-case scenarios
   */
  productEducationDepth: 'minimal' | 'moderate' | 'comprehensive';
}

/** How Craig (marketer AI) should approach campaigns and messaging. */
export interface CraigIntentConfig {
  /**
   * Maximum campaigns Craig should send to the same customer per week.
   * Prevents fatigue. Range: 1–7.
   */
  campaignFrequencyCap: number;

  /**
   * Ordered list of preferred delivery channels. Craig selects the first
   * available configured channel from this list.
   * Valid values: 'sms' | 'email' | 'push'
   */
  preferredChannels: Array<'sms' | 'email' | 'push'>;

  /**
   * The brand voice archetype Craig uses when writing copy.
   * Maps to distinct writing styles:
   * 'sage'    — wise, educational, trusted advisor
   * 'hero'    — empowering, community-champion, we're-in-this-together
   * 'rebel'   — disruptive, bold, anti-establishment
   * 'creator' — creative, innovative, trend-setting
   * 'jester'  — playful, fun, light-hearted
   */
  toneArchetype: 'sage' | 'hero' | 'rebel' | 'creator' | 'jester';

  /**
   * Campaign strategy Craig defaults to when no explicit goal overrides it.
   * 'education_led'  — campaigns lead with information; product as secondary CTA
   * 'value_led'      — campaigns lead with community/loyalty angle
   * 'discount_led'   — campaigns lead with price, deal, or limited-time offer
   * 'story_led'      — campaigns lead with brand narrative or customer story
   */
  promotionStrategy: 'education_led' | 'value_led' | 'discount_led' | 'story_led';
}

/** Container for all agent-specific configuration. */
export interface AgentConfigs {
  smokey: SmokeyIntentConfig;
  craig: CraigIntentConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Boundaries and Feedback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Absolute limits that no agent should ever cross, regardless of other settings.
 * These are injected verbatim into system prompts as hard rules.
 */
export interface HardBoundaries {
  /**
   * List of things agents must NEVER do. Plain English.
   * Example: "Never mention competitor dispensary names", "Never offer delivery below $50 minimum"
   */
  neverDoList: string[];

  /**
   * Conditions that should cause agents to pause and ask a human.
   * Example: "Customer mentions a medical condition we haven't seen before"
   */
  escalationTriggers: string[];
}

/** Configuration for how agent feedback improves the profile over time. */
export interface FeedbackConfig {
  /** If true, thumbs-down interactions are logged to Firestore for future analysis */
  captureNegativeFeedback: boolean;

  /** If true, agents will ask for brief feedback after each extended conversation */
  requestExplicitFeedback: boolean;

  /**
   * Minimum number of interactions before any profile adjustment is suggested.
   * Phase 2 feature — stored here for forward-compatibility.
   */
  minimumInteractionsForAdjustment: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategic Foundation
// ─────────────────────────────────────────────────────────────────────────────

/** The high-level strategic context that frames all agent behavior. */
export interface StrategicFoundation {
  archetype: BusinessArchetype;
  growthStage: GrowthStage;
  competitivePosture: CompetitivePosture;
  geographicStrategy: GeographicStrategy;

  /**
   * 1–5 weighted objectives that define what the dispensary is trying to achieve.
   * Total weights should sum to 1.0 (UI enforces this, service layer is lenient).
   */
  weightedObjectives: WeightedObjective[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Document Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete Dispensary Intent Profile document.
 * Stored at: org_intent_profiles/{orgId}
 */
export interface DispensaryIntentProfile {
  /** Firestore document ID — equals orgId */
  id: string;

  /** The org this profile belongs to */
  orgId: string;

  /** Semantic version of the profile schema. Current: '1.0.0' */
  version: string;

  /** Whether this is a system-generated default (true) or user-customized (false) */
  isDefault: boolean;

  /** User UID who last modified this profile */
  lastModifiedBy: string;

  /** ISO timestamp of creation */
  createdAt: string;

  /** ISO timestamp of last update */
  updatedAt: string;

  // Core sections — all required for a "complete" profile
  strategicFoundation: StrategicFoundation;
  valueHierarchies: ValueHierarchies;
  agentConfigs: AgentConfigs;
  hardBoundaries: HardBoundaries;
  feedbackConfig: FeedbackConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// History Subcollection Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Immutable version record stored in the history subcollection.
 * Path: org_intent_profiles/{orgId}/history/{versionId}
 * versionId format: ISO timestamp — e.g. "2026-02-24T10:30:00.000Z"
 */
export interface IntentProfileVersion {
  /** ISO timestamp — doubles as document ID */
  versionId: string;

  /** UID of the user who saved this version */
  savedBy: string;

  /** ISO timestamp */
  savedAt: string;

  /** Human-readable description of what changed — auto-generated or user-provided */
  changeNote: string;

  /** Complete snapshot of the profile at this point in time */
  snapshot: DispensaryIntentProfile;
}
```

---

## 6. Firestore Schema

### Primary Collection

**Collection path:** `org_intent_profiles`
**Document ID:** `{orgId}` (e.g., `org_thrive_syracuse`)

**Fields:**

```
id: string                           // == orgId
orgId: string                        // organization identifier
version: string                      // '1.0.0'
isDefault: boolean                   // true if system-generated, false if user-modified
lastModifiedBy: string               // Firebase Auth UID
createdAt: string                    // ISO 8601 timestamp
updatedAt: string                    // ISO 8601 timestamp

strategicFoundation: {
  archetype: string                  // BusinessArchetype enum value
  growthStage: string                // GrowthStage enum value
  competitivePosture: string         // CompetitivePosture enum value
  geographicStrategy: string         // GeographicStrategy enum value
  weightedObjectives: Array<{
    objective: string                // PrimaryObjective enum value
    weight: number                   // 0.0–1.0
  }>
}

valueHierarchies: {
  speedVsEducation: number           // 0.0–1.0
  volumeVsMargin: number             // 0.0–1.0
  acquisitionVsRetention: number     // 0.0–1.0
  complianceConservatism: number     // 0.0–1.0
  automationVsHumanTouch: number     // 0.0–1.0
  brandVoiceFormality: number        // 0.0–1.0
}

agentConfigs: {
  smokey: {
    recommendationPhilosophy: string // enum value
    upsellAggressiveness: number     // 0.0–1.0
    newUserProtocol: string          // enum value
    productEducationDepth: string    // enum value
  }
  craig: {
    campaignFrequencyCap: number     // integer 1–7
    preferredChannels: string[]      // ['sms', 'email', 'push']
    toneArchetype: string            // enum value
    promotionStrategy: string        // enum value
  }
}

hardBoundaries: {
  neverDoList: string[]              // plain-English prohibitions
  escalationTriggers: string[]       // plain-English escalation conditions
}

feedbackConfig: {
  captureNegativeFeedback: boolean
  requestExplicitFeedback: boolean
  minimumInteractionsForAdjustment: number
}
```

### History Subcollection

**Collection path:** `org_intent_profiles/{orgId}/history`
**Document ID:** ISO timestamp string (e.g., `2026-02-24T10:30:00.000Z`)

```
versionId: string                    // == document ID (ISO timestamp)
savedBy: string                      // Firebase Auth UID
savedAt: string                      // ISO 8601 timestamp
changeNote: string                   // auto or user description
snapshot: { ...DispensaryIntentProfile } // full document snapshot
```

### Composite Index

```json
{
  "collectionGroup": "org_intent_profiles",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "orgId", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
}
```

This index supports the query: `where('orgId', '==', orgId).orderBy('updatedAt', 'desc').limit(1)` used in a potential multi-org admin view. The primary `getIntentProfile` query uses `doc(orgId)` directly and does not require an index.

---

## 7. IntentProfileService — Complete Implementation Contract

**File:** `src/server/services/intent-profile.ts`

### Cache Structure

```typescript
interface IntentProfileCache {
  profile: DispensaryIntentProfile;
  fetchedAt: number; // Date.now() timestamp
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, IntentProfileCache>();
```

### Function Signatures and Behavior

```typescript
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
  DispensaryIntentProfile,
  BusinessArchetype,
  IntentProfileVersion,
} from '@/types/dispensary-intent-profile';

const COLLECTION = 'org_intent_profiles';

/**
 * Fetch the intent profile for an org.
 * Returns null if no profile exists (org hasn't configured one yet).
 * Reads from in-memory cache if entry is <5 minutes old.
 */
export async function getIntentProfile(orgId: string): Promise<DispensaryIntentProfile | null>

/**
 * Create or update an intent profile.
 * - Merges `updates` into existing document (partial update semantics)
 * - Writes a version snapshot to the history subcollection
 * - Sets isDefault=false on any user-initiated update
 * - Invalidates the in-memory cache entry
 * - Sets updatedAt to current ISO timestamp
 */
export async function upsertIntentProfile(
  orgId: string,
  updates: Partial<DispensaryIntentProfile>,
  updatedBy: string
): Promise<void>

/**
 * Return a fully-populated DispensaryIntentProfile pre-filled with defaults
 * for the given archetype. Does NOT write to Firestore.
 * The returned profile has isDefault=true, version='1.0.0'.
 */
export function getDefaultProfile(
  archetype: BusinessArchetype,
  orgId: string
): DispensaryIntentProfile

/**
 * Build the Smokey system prompt injection block.
 * Returns an empty string if profile is null.
 * See Section 8 for exact output format.
 */
export function buildSmokeyIntentBlock(profile: DispensaryIntentProfile): string

/**
 * Build the Craig system prompt injection block.
 * Returns an empty string if profile is null.
 * See Section 9 for exact output format.
 */
export function buildCraigIntentBlock(profile: DispensaryIntentProfile): string

/**
 * Calculate what percentage of the profile has been meaningfully configured.
 * Scoring logic defined in Section 10.
 * Returns integer 0–100.
 */
export function calculateCompletionPct(profile: Partial<DispensaryIntentProfile>): number

/**
 * Remove the cached entry for an org so the next getIntentProfile call
 * fetches fresh data from Firestore.
 */
export function invalidateCache(orgId: string): void
```

### getIntentProfile — Implementation Detail

```typescript
export async function getIntentProfile(orgId: string): Promise<DispensaryIntentProfile | null> {
  const cached = cache.get(orgId);
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.profile;
  }

  const db = getAdminFirestore();
  const snap = await db.collection(COLLECTION).doc(orgId).get();

  if (!snap.exists) {
    return null;
  }

  const profile = snap.data() as DispensaryIntentProfile;
  cache.set(orgId, { profile, fetchedAt: Date.now() });
  return profile;
}
```

### upsertIntentProfile — Implementation Detail

```typescript
export async function upsertIntentProfile(
  orgId: string,
  updates: Partial<DispensaryIntentProfile>,
  updatedBy: string
): Promise<void> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();
  const ref = db.collection(COLLECTION).doc(orgId);

  const existing = (await ref.get()).data() as DispensaryIntentProfile | undefined;

  const merged: Partial<DispensaryIntentProfile> = {
    ...existing,
    ...updates,
    id: orgId,
    orgId,
    updatedAt: now,
    lastModifiedBy: updatedBy,
    isDefault: false,
    version: '1.0.0',
    createdAt: existing?.createdAt ?? now,
  };

  // Write main document
  await ref.set(merged, { merge: true });

  // Write history snapshot
  const historyRef = ref.collection('history').doc(now);
  const historyEntry: IntentProfileVersion = {
    versionId: now,
    savedBy: updatedBy,
    savedAt: now,
    changeNote: 'User update',
    snapshot: merged as DispensaryIntentProfile,
  };
  await historyRef.set(historyEntry);

  // Invalidate cache
  invalidateCache(orgId);

  logger.info(`[IntentProfile] Upserted profile for org ${orgId} by ${updatedBy}`);
}
```

---

## 8. Default Archetype Profiles — Exact Values

`getDefaultProfile(archetype, orgId)` must return exactly these values for each archetype.

### premium_boutique

```typescript
{
  id: orgId,
  orgId,
  version: '1.0.0',
  isDefault: true,
  lastModifiedBy: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  strategicFoundation: {
    archetype: 'premium_boutique',
    growthStage: 'established',
    competitivePosture: 'differentiator',
    geographicStrategy: 'hyperlocal',
    weightedObjectives: [
      { objective: 'boost_average_order_value', weight: 0.35 },
      { objective: 'build_brand_authority', weight: 0.35 },
      { objective: 'improve_retention', weight: 0.30 },
    ],
  },
  valueHierarchies: {
    speedVsEducation: 0.8,
    volumeVsMargin: 0.7,
    acquisitionVsRetention: 0.6,
    complianceConservatism: 0.8,
    automationVsHumanTouch: 0.6,
    brandVoiceFormality: 0.7,
  },
  agentConfigs: {
    smokey: {
      recommendationPhilosophy: 'chemistry_first',
      upsellAggressiveness: 0.3,
      newUserProtocol: 'guided',
      productEducationDepth: 'comprehensive',
    },
    craig: {
      campaignFrequencyCap: 2,
      preferredChannels: ['email'],
      toneArchetype: 'sage',
      promotionStrategy: 'education_led',
    },
  },
  hardBoundaries: {
    neverDoList: [],
    escalationTriggers: [],
  },
  feedbackConfig: {
    captureNegativeFeedback: true,
    requestExplicitFeedback: false,
    minimumInteractionsForAdjustment: 50,
  },
}
```

### community_hub

```typescript
{
  id: orgId,
  orgId,
  version: '1.0.0',
  isDefault: true,
  lastModifiedBy: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  strategicFoundation: {
    archetype: 'community_hub',
    growthStage: 'growth',
    competitivePosture: 'defensive',
    geographicStrategy: 'hyperlocal',
    weightedObjectives: [
      { objective: 'improve_retention', weight: 0.40 },
      { objective: 'grow_loyalty_enrollment', weight: 0.35 },
      { objective: 'build_brand_authority', weight: 0.25 },
    ],
  },
  valueHierarchies: {
    speedVsEducation: 0.5,
    volumeVsMargin: 0.3,
    acquisitionVsRetention: 0.4,
    complianceConservatism: 0.6,
    automationVsHumanTouch: 0.7,
    brandVoiceFormality: 0.2,
  },
  agentConfigs: {
    smokey: {
      recommendationPhilosophy: 'effect_first',
      upsellAggressiveness: 0.5,
      newUserProtocol: 'guided',
      productEducationDepth: 'moderate',
    },
    craig: {
      campaignFrequencyCap: 3,
      preferredChannels: ['sms', 'email'],
      toneArchetype: 'hero',
      promotionStrategy: 'value_led',
    },
  },
  hardBoundaries: {
    neverDoList: [],
    escalationTriggers: [],
  },
  feedbackConfig: {
    captureNegativeFeedback: true,
    requestExplicitFeedback: true,
    minimumInteractionsForAdjustment: 30,
  },
}
```

### value_leader

```typescript
{
  id: orgId,
  orgId,
  version: '1.0.0',
  isDefault: true,
  lastModifiedBy: 'system',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  strategicFoundation: {
    archetype: 'value_leader',
    growthStage: 'growth',
    competitivePosture: 'aggressive',
    geographicStrategy: 'regional',
    weightedObjectives: [
      { objective: 'increase_foot_traffic', weight: 0.40 },
      { objective: 'boost_average_order_value', weight: 0.35 },
      { objective: 'clear_aging_inventory', weight: 0.25 },
    ],
  },
  valueHierarchies: {
    speedVsEducation: 0.2,
    volumeVsMargin: 0.2,
    acquisitionVsRetention: 0.3,
    complianceConservatism: 0.5,
    automationVsHumanTouch: 0.2,
    brandVoiceFormality: 0.3,
  },
  agentConfigs: {
    smokey: {
      recommendationPhilosophy: 'price_first',
      upsellAggressiveness: 0.7,
      newUserProtocol: 'express',
      productEducationDepth: 'minimal',
    },
    craig: {
      campaignFrequencyCap: 4,
      preferredChannels: ['sms'],
      toneArchetype: 'rebel',
      promotionStrategy: 'discount_led',
    },
  },
  hardBoundaries: {
    neverDoList: [],
    escalationTriggers: [],
  },
  feedbackConfig: {
    captureNegativeFeedback: true,
    requestExplicitFeedback: false,
    minimumInteractionsForAdjustment: 100,
  },
}
```

**Note:** `medical_focus` and `lifestyle_brand` archetypes do not have Phase 1 defaults. `getDefaultProfile` called with these values should fall back to `community_hub` defaults with `archetype` field overridden. This is acceptable for Phase 1 since no current customers use these archetypes. A TODO comment should be added in the service file.

---

## 9. buildSmokeyIntentBlock — Exact Output Format

The function must produce this exact structure. All bracketed values are computed from the profile.

```
=== DISPENSARY INTENT PROFILE ===
Archetype: [ARCHETYPE_LABEL] — [ARCHETYPE_DESCRIPTION]
Growth Stage: [growthStage] | Competitive Posture: [competitivePosture]

TOP PRIORITIES:
[for each weightedObjective, sorted by weight descending, rendered as:]
• [OBJECTIVE_LABEL] ([weight_as_pct]%)
[example: • Boost Average Order Value (35%)]

RECOMMENDATION APPROACH:
Philosophy: [recommendationPhilosophy] — [PHILOSOPHY_DESCRIPTION]
Education Depth: [productEducationDepth] — [DEPTH_DESCRIPTION]
New Customer Protocol: [newUserProtocol] — [PROTOCOL_DESCRIPTION]
Upsell Guidance: [UPSELL_LABEL] — [UPSELL_DESCRIPTION]

VALUE TRADE-OFFS:
Speed vs Education: [SPEED_EDU_POLE_DESCRIPTION]
Voice Formality: [FORMALITY_POLE_DESCRIPTION]
Compliance Posture: [COMPLIANCE_POLE_DESCRIPTION]

[RENDER ONLY IF neverDoList.length > 0:]
HARD BOUNDARIES — NEVER DO:
[for each item in neverDoList:]
• [item]

[RENDER ONLY IF escalationTriggers.length > 0:]
ESCALATE TO HUMAN WHEN:
[for each item in escalationTriggers:]
• [item]
=== END INTENT PROFILE ===
```

### Computed Label Mappings for buildSmokeyIntentBlock

**ARCHETYPE_LABEL and ARCHETYPE_DESCRIPTION:**
```
premium_boutique  → "Premium Boutique" — "Elevated experience; quality, education, and curation are the product"
value_leader      → "Value Leader" — "High-volume, accessible cannabis; competitive pricing drives every decision"
community_hub     → "Community Hub" — "Cannabis as community; relationships and local loyalty come before transactions"
medical_focus     → "Medical Focus" — "Patient-first dispensary; clinical accuracy and condition-based guidance"
lifestyle_brand   → "Lifestyle Brand" — "Cannabis culture and creativity; brand identity is the product"
```

**PHILOSOPHY_DESCRIPTION (for recommendationPhilosophy):**
```
chemistry_first   → "Lead every recommendation with terpene profiles and cannabinoid ratios. Explain the entourage effect."
effect_first      → "Ask about desired effect first (relax, focus, sleep, pain). Build recommendation around stated need."
price_first       → "Anchor recommendations on value and price. Best-bang-for-buck framing always."
popularity_first  → "Lead with what other customers are buying. Social proof and trending items first."
```

**DEPTH_DESCRIPTION (for productEducationDepth):**
```
minimal       → "Name, price, and one key benefit only. Keep it fast."
moderate      → "Name, price, main effect, and primary terpene. Two sentences max."
comprehensive → "Full terpene profile, cannabinoid breakdown, use-case scenarios. Take the time to educate."
```

**PROTOCOL_DESCRIPTION (for newUserProtocol):**
```
guided   → "Ask 2–3 intake questions (experience level, desired effect, consumption preference) before recommending."
express  → "Skip intake; go straight to top-3 picks. Respect the customer's time."
discover → "Invite the customer to describe themselves and their relationship with cannabis. Let the conversation unfold naturally."
```

**UPSELL_LABEL and UPSELL_DESCRIPTION (for upsellAggressiveness):**
```
value < 0.4  → label="Low" — "Mention one complementary item only if it's a clear, natural fit. Accept 'no' immediately."
value 0.4–0.7 → label="Medium" — "Suggest one upsell per interaction. Frame with value (savings, entourage effect). Drop it if declined."
value > 0.7  → label="High" — "Actively suggest add-ons and bundles. Use urgency framing. Offer alternatives if first upsell is declined."
```

**SPEED_EDU_POLE_DESCRIPTION (for speedVsEducation):**
```
value < 0.33  → "Efficiency-first: resolve the customer's need as quickly as possible. Minimal explanation."
value 0.33–0.67 → "Balanced: answer the question, then offer to go deeper if the customer wants it."
value > 0.67  → "Education-first: take the time to explain options before recommending. Curiosity over convenience."
```

**FORMALITY_POLE_DESCRIPTION (for brandVoiceFormality):**
```
value < 0.33  → "Casual and conversational: friendly tone, light humor acceptable, contractions welcome."
value 0.33–0.67 → "Professional but approachable: clear language, no jargon, warm but not informal."
value > 0.67  → "Clinical and formal: precise terminology, avoid slang, professional register throughout."
```

**COMPLIANCE_POLE_DESCRIPTION (for complianceConservatism):**
```
value < 0.33  → "Standard compliance: follow regulations; marketing can be bold and promotional."
value 0.33–0.67 → "Balanced: promotional messaging with appropriate disclaimers."
value > 0.67  → "Conservative: err on the side of caution; prefer understated claims; add disclaimers liberally."
```

**OBJECTIVE_LABEL (for PrimaryObjective):**
```
increase_foot_traffic      → "Increase Foot Traffic"
boost_average_order_value  → "Boost Average Order Value"
improve_retention          → "Improve Customer Retention"
grow_loyalty_enrollment    → "Grow Loyalty Enrollment"
launch_new_products        → "Launch New Products"
clear_aging_inventory      → "Clear Aging Inventory"
build_brand_authority      → "Build Brand Authority"
```

---

## 10. buildCraigIntentBlock — Exact Output Format

```
=== CAMPAIGN INTENT PROFILE ===
Archetype: [ARCHETYPE_LABEL] | Growth Stage: [growthStage]
Strategy: [promotionStrategy] | Tone: [toneArchetype]
Preferred Channels: [channels joined with ' > '] | Max campaigns/week: [campaignFrequencyCap]

BUSINESS FOCUS:
[for each weightedObjective, sorted by weight descending:]
• [OBJECTIVE_LABEL] ([weight_as_pct]%)

CUSTOMER FOCUS: [ACQUISITION_RETENTION_DESCRIPTION]
COMPLIANCE STANCE: [COMPLIANCE_STANCE_DESCRIPTION]

[RENDER ONLY IF neverDoList.length > 0:]
HARD LIMITS — NEVER DO:
[for each item in neverDoList:]
• [item]
=== END CAMPAIGN INTENT ===
```

### Computed Label Mappings for buildCraigIntentBlock

**ACQUISITION_RETENTION_DESCRIPTION (for acquisitionVsRetention):**
```
value < 0.33  → "Acquisition-first: prioritize new customer acquisition. Budget and messaging should skew toward getting first purchases."
value 0.33–0.67 → "Balanced: split effort between winning new customers and rewarding existing loyal ones."
value > 0.67  → "Retention-first: existing customers are the primary audience. Loyalty, re-engagement, and VIP treatment take priority."
```

**COMPLIANCE_STANCE_DESCRIPTION (for complianceConservatism):**
```
value < 0.33  → "Standard: follow state regulations. Promotions can be bold and sales-forward."
value 0.33–0.67 → "Balanced: promotional but measured. Include standard disclaimers."
value > 0.67  → "Conservative: understated messaging, extensive disclaimers, avoid anything that could draw regulatory attention."
```

---

## 11. calculateCompletionPct — Scoring Logic

Completion is scored out of 100 points across 4 sections:

| Section | Points | Condition for "complete" |
|---|---|---|
| `strategicFoundation` | 30 | Object exists AND `archetype` is set AND `weightedObjectives.length >= 1` |
| `valueHierarchies` | 30 | Object exists AND all 6 slider fields are present (any value including 0) |
| `agentConfigs` | 25 | Object exists AND both `smokey` and `craig` sub-objects exist with all required fields |
| `hardBoundaries` | 15 | Object exists (even if neverDoList is empty — having the object means user visited this section) |

Returns `Math.round(totalPoints)` as an integer. If `profile` is `{}` or `undefined`, returns `0`.

---

## 12. Smokey Agent Modification — Exact Code

**File:** `src/server/agents/smokey.ts`

**Add import at top of file (after existing imports):**

```typescript
import { getIntentProfile, buildSmokeyIntentBlock } from '@/server/services/intent-profile';
```

**In the `initialize()` method, after the existing `const [activeGoals, brandGuideResult, vendorBrands] = await Promise.all([...])` block, add:**

```typescript
// Load Dispensary Intent Profile for strategic behavioral context
const intentProfile = await getIntentProfile(orgId).catch(() => null);
const intentBlock = intentProfile ? buildSmokeyIntentBlock(intentProfile) : '';
```

**In `agentMemory.system_instructions`, inject `intentBlock` immediately before the `=== AGENT SQUAD` section:**

```typescript
agentMemory.system_instructions = `
    You are Smokey, the Digital Budtender & Product Expert.
    You are also the **Front Desk Greeter**. If a user asks for something outside your expertise (like "Audit my competition", "Check compliance", "Draft email"), YOU MUST DELEGATE IT.

    CORE PRINCIPLES:
    1. **Empathy First**: Understand the "vibe" or medical need before recommending.
    2. **Strain Science**: Know your terps and cannabinoids.
    3. **Inventory Aware**: Don't recommend out-of-stock items.
    4. **Team Player**: Delegate tasks to specialists (see squad below).
    5. **Carousel Creator**: When asked to create featured product carousels, use the createCarouselArtifact tool to generate a structured artifact for user approval.
    ${goalDirectives}
    ${marginProductContext}

    ${brandVoiceBrief}
    ${vendorBrandsSection}

    ${intentBlock}

    === AGENT SQUAD (For Delegation) ===
    ${squadRoster}
    ...
`;
```

The `intentBlock` string is empty string when no profile exists, so this is fully backward-compatible — existing behavior is unchanged for orgs without a profile.

---

## 13. Craig Agent Modification — Exact Code

**File:** `src/server/agents/craig.ts`

**Add import at top of file (after existing imports):**

```typescript
import { getIntentProfile, buildCraigIntentBlock } from '@/server/services/intent-profile';
```

**In the `initialize()` method, after the existing `const [goalDirectives, brandGuideResult] = await Promise.all([...])` block, add:**

```typescript
// Load Dispensary Intent Profile for campaign strategy context
const intentProfile = orgId ? await getIntentProfile(orgId).catch(() => null) : null;
const intentBlock = intentProfile ? buildCraigIntentBlock(intentProfile) : '';
```

**In `agentMemory.system_instructions`, inject `intentBlock` immediately before `=== AGENT SQUAD`:**

```typescript
agentMemory.system_instructions = `
    You are Craig, the "Growth Engine" and Marketer for ${brandMemory.brand_profile.name}. ...
    ${goalDirectives}

    ${brandBrief}

    ${intentBlock}

    === AGENT SQUAD (For Collaboration) ===
    ${squadRoster}
    ...
`;
```

Same backward-compatibility guarantee: empty string when no profile exists.

---

## 14. Server Actions — Complete Implementation Contract

**File:** `src/server/actions/intent-profile.ts`

```typescript
'use server';

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
  getIntentProfile,
  upsertIntentProfile,
  getDefaultProfile,
  invalidateCache,
} from '@/server/services/intent-profile';
import type {
  DispensaryIntentProfile,
  BusinessArchetype,
} from '@/types/dispensary-intent-profile';

/**
 * Fetch the intent profile for an org.
 * Returns null if no profile has been configured.
 * Auth: user must belong to orgId, or be a super_user.
 */
export async function getOrgIntentProfile(
  orgId: string
): Promise<DispensaryIntentProfile | null> {
  const user = await requireUser();
  if (user.role !== 'super_user' && user.orgId !== orgId) {
    throw new Error('Unauthorized: org mismatch');
  }

  try {
    return await getIntentProfile(orgId);
  } catch (err) {
    logger.error(`[IntentProfile] getOrgIntentProfile failed for ${orgId}: ${String(err)}`);
    return null;
  }
}

/**
 * Partial update to an org's intent profile.
 * Merges supplied fields; does not overwrite fields not included in updates.
 * Sets isDefault=false automatically.
 * Auth: user must belong to orgId, or be a super_user.
 */
export async function updateOrgIntentProfile(
  orgId: string,
  updates: Partial<
    Pick<
      DispensaryIntentProfile,
      | 'strategicFoundation'
      | 'valueHierarchies'
      | 'agentConfigs'
      | 'hardBoundaries'
      | 'feedbackConfig'
    >
  >
): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  if (user.role !== 'super_user' && user.orgId !== orgId) {
    return { success: false, error: 'Unauthorized: org mismatch' };
  }

  try {
    await upsertIntentProfile(orgId, updates, user.uid);
    return { success: true };
  } catch (err) {
    logger.error(`[IntentProfile] updateOrgIntentProfile failed for ${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}

/**
 * Initialize a new intent profile from an archetype default.
 * If a profile already exists, it is OVERWRITTEN with default values.
 * Use only during onboarding or when user explicitly requests a reset.
 * Auth: user must belong to orgId, or be a super_user.
 */
export async function createOrgIntentProfileFromArchetype(
  orgId: string,
  archetype: BusinessArchetype
): Promise<{ success: boolean; profile?: DispensaryIntentProfile; error?: string }> {
  const user = await requireUser();
  if (user.role !== 'super_user' && user.orgId !== orgId) {
    return { success: false, error: 'Unauthorized: org mismatch' };
  }

  try {
    const defaultProfile = getDefaultProfile(archetype, orgId);
    // Mark as default initially; will be flipped to false on first user edit
    await upsertIntentProfile(orgId, { ...defaultProfile, isDefault: true }, user.uid);
    // Force cache refresh so agents pick up the new profile immediately
    invalidateCache(orgId);
    const freshProfile = await getIntentProfile(orgId);
    return { success: true, profile: freshProfile ?? defaultProfile };
  } catch (err) {
    logger.error(`[IntentProfile] createFromArchetype failed for ${orgId}: ${String(err)}`);
    return { success: false, error: String(err) };
  }
}
```

---

## 15. UI Components — Complete Contracts

### 15a. TradeOffSlider

**File:** `src/components/dashboard/intent-profile/trade-off-slider.tsx`

```typescript
'use client';

import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface TradeOffSliderProps {
  /** Short label shown above the slider e.g. "Speed vs Education" */
  label: string;
  /** Text shown left of the slider (0.0 pole) e.g. "Fast Resolution" */
  leftPoleLabel: string;
  /** Text shown right of the slider (1.0 pole) e.g. "Deep Education" */
  rightPoleLabel: string;
  /** One-sentence description of the left pole behavior */
  leftPoleDescription: string;
  /** One-sentence description of the right pole behavior */
  rightPoleDescription: string;
  /** Current value 0.0–1.0 */
  value: number;
  /** Called with the new value when user drags. Value is 0.0–1.0 */
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}
```

**Rendering requirements:**
- Label row: `label` text in `text-sm font-medium text-foreground`
- Below label: ShadCN `<Slider>` with `min={0}`, `max={100}`, `step={5}` — internally multiply by 100 for display, divide by 100 on onChange to maintain 0.0–1.0 external contract
- Below slider: Two-column row — left pole label (`text-xs text-muted-foreground text-left`) and right pole label (`text-xs text-muted-foreground text-right`)
- Tooltip on hover of slider thumb: shows the active pole description based on which half the value falls in (< 0.5 = leftPoleDescription, ≥ 0.5 = rightPoleDescription)
- When `disabled`, slider is visually grayed out and non-interactive

### 15b. ArchetypeSelector

**File:** `src/components/dashboard/intent-profile/archetype-selector.tsx`

```typescript
'use client';

interface ArchetypeSelectorProps {
  value: BusinessArchetype | null;
  onChange: (archetype: BusinessArchetype) => void;
  disabled?: boolean;
}
```

**Rendering requirements:**
- Renders a responsive grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
- Each archetype is a card (`<button type="button">`) with:
  - Icon: 32px emoji or lucide icon (see icon mapping below)
  - Title: archetype name in title case
  - Description: exactly 2 sentences from the label mappings
  - Selected state: `border-primary bg-primary/5 ring-2 ring-primary`
  - Unselected state: `border border-border hover:border-primary/50`
- Clicking a card calls `onChange(archetype)`

**Archetype icon mapping:**
```
premium_boutique  → Gem (lucide-react)
value_leader      → TrendingUp (lucide-react)
community_hub     → Users (lucide-react)
medical_focus     → Heart (lucide-react)
lifestyle_brand   → Sparkles (lucide-react)
```

**Archetype card descriptions (exactly 2 sentences each):**
```
premium_boutique:
  "Elevated cannabis retail — quality, curation, and education are the product. You serve discerning customers who expect a premium experience and are willing to pay for it."

value_leader:
  "High-volume, accessible cannabis for everyone. Competitive pricing drives your foot traffic and transaction count is how you win."

community_hub:
  "Cannabis as community — relationships, local loyalty, and culture come before transactions. Your customers feel like regulars, not just customers."

medical_focus:
  "Patient-first dispensary with a clinical approach. You prioritize accurate dosing guidance, medical conditions, and trustworthy information over promotional marketing."

lifestyle_brand:
  "Cannabis lifestyle, creativity, and brand identity are the product. Your customers are fans of the brand as much as the products."
```

### 15c. Intent Profile Settings Page

**File:** `src/app/dashboard/settings/intent-profile/page.tsx` (server component)

```typescript
import { getOrgIntentProfile } from '@/server/actions/intent-profile';
import { requireUser } from '@/server/auth/auth';
import { IntentProfileClient } from './intent-profile-client';

export default async function IntentProfilePage() {
  const user = await requireUser();
  const orgId = user.orgId || user.uid;
  const profile = await getOrgIntentProfile(orgId);

  return (
    <IntentProfileClient
      orgId={orgId}
      initialProfile={profile}
    />
  );
}
```

**File:** `src/app/dashboard/settings/intent-profile/intent-profile-client.tsx` (client component)

```typescript
'use client';
// Props:
interface IntentProfileClientProps {
  orgId: string;
  initialProfile: DispensaryIntentProfile | null;
}
```

**Page structure and behavior:**

1. **Header row:** Title "Intent Profile" + subtitle "Configure how AI agents behave for your dispensary"

2. **Completion progress bar:** `calculateCompletionPct(profile)` as a percentage. Renders as: `<Progress value={completionPct} className="h-2" />` with label "Profile {pct}% complete" — color-coded: <40% = red, 40–79% = amber, ≥80% = green

3. **Archetype bootstrap banner:** Shown ONLY when `profile === null` OR `profile.isDefault === true`. Card with title "Start with an archetype" and renders `<ArchetypeSelector>`. Clicking an archetype calls `createOrgIntentProfileFromArchetype(orgId, archetype)`, then updates local state with returned profile. This section disappears once user has customized any value (i.e., `isDefault` becomes false).

4. **Three-section accordion or tabs:**
   - **Foundation** (always expanded by default):
     - `<ArchetypeSelector>` — selected archetype shown
     - Growth Stage: `<Select>` with options for all 4 `GrowthStage` values
     - Competitive Posture: `<Select>` with options for all 3 `CompetitivePosture` values
     - Geographic Strategy: `<Select>` with options for all 4 `GeographicStrategy` values
     - Weighted Objectives: up to 5 rows, each row = `<Select objective>` + `<Input type="number" weight 0-100>`. A running total shows current weight sum (must equal 100 to save). "Add Objective" button adds a row (disabled if 5 already exist). Remove button on each row.

   - **Values** (collapsed by default):
     - 6 `<TradeOffSlider>` components, one per `ValueHierarchies` field
     - Pole labels per the label mapping in Section 12

   - **Agents** (collapsed by default):
     - **Smokey sub-section:**
       - Recommendation Philosophy: `<RadioGroup>` with all 4 options
       - Upsell Aggressiveness: `<TradeOffSlider leftPoleLabel="Never Upsell" rightPoleLabel="Actively Upsell">`
       - New Customer Protocol: `<RadioGroup>` with all 3 options
       - Product Education Depth: `<RadioGroup>` with all 3 options
     - **Craig sub-section:**
       - Campaign Frequency Cap: `<Slider min={1} max={7} step={1}>` with value display "Max [n] per week"
       - Preferred Channels: multi-select checkboxes for sms, email, push (ordered by selection — first checked = highest priority)
       - Tone Archetype: `<RadioGroup>` with all 5 options plus a brief description of each
       - Promotion Strategy: `<RadioGroup>` with all 4 options plus a brief description of each
     - **Hard Boundaries sub-section:**
       - "Never Do" list: multi-line textarea where each line = one item. Placeholder: "Enter one rule per line e.g. 'Never mention competitor names by name'"
       - "Escalation Triggers" list: same multi-line textarea pattern

5. **Save button:** Fixed to bottom or at end of form. On click, calls `updateOrgIntentProfile(orgId, changes)`. Shows toast on success ("Intent profile saved") or error ("Save failed — [error]"). Button is disabled when no unsaved changes exist.

6. **Unsaved changes indicator:** Subtle "Unsaved changes" badge near save button when form state differs from `initialProfile`.

---

## 16. Settings Page Tab Addition

**File:** `src/app/dashboard/settings/page.tsx`

Add after the existing `<TabsTrigger value="ai">` tab trigger:

```tsx
<TabsTrigger value="intent" className="flex items-center gap-2">
  <Target className="h-4 w-4" />
  Intent Profile
</TabsTrigger>
```

Add `Target` to the lucide-react import line.

Add the corresponding `TabsContent`:

```tsx
<TabsContent value="intent">
  <Card>
    <CardHeader>
      <CardTitle>Dispensary Intent Profile</CardTitle>
      <CardDescription>
        Configure how AI agents behave for your business — recommendation philosophy, campaign strategy, and value trade-offs.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Link href="/dashboard/settings/intent-profile">
        <Button variant="default">
          Configure Intent Profile
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </CardContent>
  </Card>
</TabsContent>
```

---

## 17. Firestore Index Addition

**File:** `firestore.indexes.json`

Add to the `"indexes"` array:

```json
{
  "collectionGroup": "org_intent_profiles",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "orgId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "updatedAt",
      "order": "DESCENDING"
    }
  ]
}
```

---

## 18. Test Cases — Complete Specification

**File:** `tests/intent-profile.test.ts`

All tests use pure function imports from `src/server/services/intent-profile.ts`. No Firestore mocking is required for the pure function tests (getDefaultProfile, buildSmokeyIntentBlock, buildCraigIntentBlock, calculateCompletionPct). Tests that call `getIntentProfile` or `upsertIntentProfile` require a Firestore mock.

```typescript
import {
  getDefaultProfile,
  buildSmokeyIntentBlock,
  buildCraigIntentBlock,
  calculateCompletionPct,
} from '@/server/services/intent-profile';
import type { DispensaryIntentProfile } from '@/types/dispensary-intent-profile';

// Helper: build a fully-populated profile for testing block builders
function buildFullProfile(overrides: Partial<DispensaryIntentProfile> = {}): DispensaryIntentProfile {
  return {
    ...getDefaultProfile('premium_boutique', 'org_test'),
    ...overrides,
  };
}
```

**Test case 1: premium_boutique default — speedVsEducation**
```
input: getDefaultProfile('premium_boutique', 'org_test')
assert: profile.valueHierarchies.speedVsEducation === 0.8
```

**Test case 2: value_leader default — productEducationDepth**
```
input: getDefaultProfile('value_leader', 'org_test')
assert: profile.agentConfigs.smokey.productEducationDepth === 'minimal'
```

**Test case 3: community_hub default — Craig toneArchetype**
```
input: getDefaultProfile('community_hub', 'org_test')
assert: profile.agentConfigs.craig.toneArchetype === 'hero'
```

**Test case 4: calculateCompletionPct — partial profile returns ≥50**
```
input: { strategicFoundation: fullFoundation, valueHierarchies: fullHierarchies }
  where fullFoundation = getDefaultProfile('premium_boutique', 'org_test').strategicFoundation
  where fullHierarchies = getDefaultProfile('premium_boutique', 'org_test').valueHierarchies
assert: calculateCompletionPct(input) >= 50
// strategicFoundation=30pts + valueHierarchies=30pts = 60
```

**Test case 5: calculateCompletionPct — empty object returns 0**
```
input: {}
assert: calculateCompletionPct({}) === 0
```

**Test case 6: calculateCompletionPct — all 4 sections returns 100**
```
input: full profile from getDefaultProfile('premium_boutique', 'org_test')
  with hardBoundaries present (even if neverDoList is [])
assert: calculateCompletionPct(input) === 100
```

**Test case 7: buildSmokeyIntentBlock — contains header**
```
input: getDefaultProfile('premium_boutique', 'org_test')
assert: buildSmokeyIntentBlock(input).includes('=== DISPENSARY INTENT PROFILE ===')
```

**Test case 8: buildSmokeyIntentBlock — contains philosophy for premium_boutique**
```
input: getDefaultProfile('premium_boutique', 'org_test')
assert: buildSmokeyIntentBlock(input).includes('chemistry_first')
```

**Test case 9: buildSmokeyIntentBlock — contains philosophy for value_leader**
```
input: getDefaultProfile('value_leader', 'org_test')
assert: buildSmokeyIntentBlock(input).includes('price_first')
```

**Test case 10: buildCraigIntentBlock — contains promotionStrategy for premium_boutique**
```
input: getDefaultProfile('premium_boutique', 'org_test')
assert: buildCraigIntentBlock(input).includes('education_led')
```

**Test case 11: buildCraigIntentBlock — contains toneArchetype for community_hub**
```
input: getDefaultProfile('community_hub', 'org_test')
assert: buildCraigIntentBlock(input).includes('hero')
```

**Test case 12: buildSmokeyIntentBlock — renders NEVER DO when neverDoList non-empty**
```
input: buildFullProfile({
  hardBoundaries: {
    neverDoList: ['Never mention competitor dispensary names'],
    escalationTriggers: [],
  }
})
assert: buildSmokeyIntentBlock(input).includes('NEVER DO')
assert: buildSmokeyIntentBlock(input).includes('Never mention competitor dispensary names')
```

**Test case 13: buildSmokeyIntentBlock — omits HARD BOUNDARIES when neverDoList is empty**
```
input: buildFullProfile({
  hardBoundaries: { neverDoList: [], escalationTriggers: [] }
})
assert: NOT buildSmokeyIntentBlock(input).includes('HARD BOUNDARIES')
```

**Test case 14: calculateCompletionPct — missing valueHierarchies drops score by exactly 30**
```
const full = getDefaultProfile('premium_boutique', 'org_test');
const withoutHierarchies = { ...full, valueHierarchies: undefined as any };
const fullScore = calculateCompletionPct(full);         // should be 100
const partialScore = calculateCompletionPct(withoutHierarchies); // should be 70
assert: fullScore - partialScore === 30
```

**Test case 15: getDefaultProfile — isDefault is true**
```
input: getDefaultProfile('value_leader', 'org_test')
assert: profile.isDefault === true
```

**Test case 16: getDefaultProfile — version is '1.0.0'**
```
input: getDefaultProfile('community_hub', 'org_test')
assert: profile.version === '1.0.0'
```

---

## 19. Slider Pole Label Mapping (for UI — referenced in Section 15c)

These are the exact strings to pass as `leftPoleLabel`, `rightPoleLabel`, `leftPoleDescription`, and `rightPoleDescription` to each `<TradeOffSlider>`.

| Field | leftPoleLabel | rightPoleLabel | leftPoleDescription | rightPoleDescription |
|---|---|---|---|---|
| speedVsEducation | "Fast Resolution" | "Deep Education" | "Resolve the customer's need as quickly as possible with minimal explanation." | "Take time to explain all options thoroughly before making a recommendation." |
| volumeVsMargin | "Maximize Transactions" | "Maximize Margin" | "Favor affordable, high-velocity items to maximize transaction count." | "Favor premium products and upsells to maximize margin per transaction." |
| acquisitionVsRetention | "New Customers First" | "Loyalty First" | "Budget and messaging skew toward converting first-time visitors." | "Prioritize rewarding and retaining your existing loyal customer base." |
| complianceConservatism | "Aggressive Marketing" | "Maximum Caution" | "Bold, sales-forward promotion — follow regulations but don't hold back." | "Understated messaging with liberal disclaimers — minimize regulatory risk." |
| automationVsHumanTouch | "Full Automation" | "Human-in-the-Loop" | "Let AI handle everything end-to-end. Maximize throughput." | "Escalate edge cases and prefer human sign-off on important decisions." |
| brandVoiceFormality | "Casual & Friendly" | "Clinical & Professional" | "Conversational, warm, and approachable. Light humor and contractions are welcome." | "Precise, formal language. Medical framing. No slang or casual phrasing." |

---

## 5. Test Plan

**Unit tests:**
- [x] 16 test cases in `tests/intent-profile.test.ts` (see Section 18 above)
- [x] `getDefaultProfile` — all 3 implemented archetypes return correct field values
- [x] `calculateCompletionPct` — returns correct score for empty, partial, and full profiles
- [x] `buildSmokeyIntentBlock` — correct formatting and conditional HARD BOUNDARIES section
- [x] `buildCraigIntentBlock` — correct formatting per archetype

**Integration tests:**
- [x] Run `npm run check:types` after all files are created — must pass with 0 errors
- [x] Manual smoke: create a profile for `org_thrive_syracuse` via the settings UI, verify `org_intent_profiles/org_thrive_syracuse` document appears in Firestore console with all fields populated
- [x] Manual smoke: open a Smokey conversation for Thrive, verify `=== DISPENSARY INTENT PROFILE ===` appears in the system prompt (use Linus Dev Tools or console logging to inspect)

**Golden set eval (LLM/prompt change — required before merge):**
- [x] Run `node scripts/run-golden-eval.mjs --agent smokey --full`
  - Target: ≥90% overall accuracy, 100% on compliance cases
  - Document baseline score (before injection) and post-injection score
- [x] Run `node scripts/run-golden-eval.mjs --agent craig --full`
  - Same thresholds
- [x] If either eval drops below threshold, the intent block is the likely cause — review the formatting of `buildSmokeyIntentBlock` / `buildCraigIntentBlock` and simplify

**Manual smoke tests (UI):**
- [x] Navigate to `/dashboard/settings/intent-profile` — page loads without error
- [x] Page shows 0% completion for an org with no profile
- [x] Selecting archetype card triggers `createOrgIntentProfileFromArchetype` and progress bar updates to ≥30%
- [x] Moving a slider and saving updates the Firestore document and the progress bar
- [x] isDefault flips to false after first user save
- [x] Completion progress bar reaches 100% when all 4 sections are filled

---

## 6. Rollback Plan

| Strategy | Details |
|---|---|
| Single commit revert? | Yes — all 8 new files can be deleted and the 4 modified files reverted in a single commit. No migration needed. |
| Feature flag? | Not implemented in Phase 1. The injection is a no-op (empty string) when no profile exists, so it is safe to deploy without a flag. Rollback is delete-the-files. |
| Data migration rollback needed? | No — `org_intent_profiles` is a new collection. Rolling back does not affect any existing data. The collection can be left in place (no side effects) or manually deleted from Firestore console. |
| Downstream services affected? | Smokey agent behavior changes when a profile exists. If Smokey behavior regresses (golden set fails), revert the `initialize()` modification in `smokey.ts` only — the rest of the Phase 1 code can remain. Same for Craig. |
| Specific rollback steps: | (1) `git revert <commit hash>` → `git push origin main`; (2) confirm Firestore collection `org_intent_profiles` exists but is not causing errors (it won't be read if service file is reverted); (3) re-run golden set eval to confirm agent behavior is restored |

---

## 7. Success Criteria

- [x] `npm run check:types` passes with 0 new errors after all files are created and modified
- [x] All 16 unit tests in `tests/intent-profile.test.ts` pass
- [x] Golden set eval passes for both Smokey and Craig (≥90% overall, 100% compliance)
- [x] Thrive Syracuse (`org_thrive_syracuse`) can create an intent profile from the `value_leader` archetype via the settings UI within 60 seconds
- [x] Intent block appears in Smokey and Craig system prompts for orgs with a profile; no change to prompt for orgs without a profile
- [x] Profile completion reaches 100% and progress bar shows green after all 4 sections are filled
- [x] No new errors in Firebase App Hosting logs within 24h of deployment
- [x] History subcollection records one version entry per save operation

---

## Approval

- [ ] **Spec reviewed by:** _______________
- [ ] **Approved to implement:** Yes / No
- [ ] **Modifications required:** none

---

*After approval, proceed to implementation per `.agent/prime.md` Workflow Protocol. Run `npm run check:types` after each step. Commit after each step passes.*
