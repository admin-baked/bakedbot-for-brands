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
  | 'aggressive'      // Actively competes on price; monitors and matches competitor moves
  | 'defensive'       // Protects existing customers; avoids price wars
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
   */
  preferredChannels: Array<'sms' | 'email' | 'push'>;

  /**
   * The brand voice archetype Craig uses when writing copy.
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
   * 'discount_led'   — campaigns lead with price promotions and deals
   */
  promotionStrategy: 'education_led' | 'value_led' | 'discount_led';
}

/** Container for all per-agent intent configurations. */
export interface AgentConfigs {
  smokey: SmokeyIntentConfig;
  craig: CraigIntentConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategic Foundation
// ─────────────────────────────────────────────────────────────────────────────

export interface StrategicFoundation {
  archetype: BusinessArchetype;
  growthStage: GrowthStage;
  competitivePosture: CompetitivePosture;
  geographicStrategy: GeographicStrategy;
  /**
   * Top 3 weighted objectives. Weights should sum to 1.0.
   * Sorted descending by weight.
   */
  weightedObjectives: WeightedObjective[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hard Boundaries & Feedback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Things agents must never do on behalf of this dispensary.
 * Free-text; interpreted by LLM at runtime.
 */
export interface HardBoundaries {
  /** Free-text list of absolute prohibitions. E.g. "Never compare prices to competitors by name." */
  neverDoList: string[];
  /** Conditions that must trigger a human handoff. E.g. "Customer mentions medical emergency." */
  escalationTriggers: string[];
}

export interface FeedbackConfig {
  /** Whether Smokey should passively track thumbs-down responses for alignment scoring. */
  captureNegativeFeedback: boolean;
  /** Whether Smokey should ask "Was this helpful?" after recommendations. */
  requestExplicitFeedback: boolean;
  /** Minimum number of interactions before the profile can be auto-adjusted (Phase 2). */
  minimumInteractionsForAdjustment: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Profile Type
// ─────────────────────────────────────────────────────────────────────────────

export interface DispensaryIntentProfile {
  /** Document ID in Firestore — equals orgId */
  id: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// UI Helper Types
// ─────────────────────────────────────────────────────────────────────────────

/** Human-readable metadata for each archetype — used in archetype selector cards. */
export interface ArchetypeMetadata {
  archetype: BusinessArchetype;
  label: string;
  description: string;
  icon: string; // lucide-react icon name
  defaultHighlights: string[]; // 3 bullet points shown on card
}

export const ARCHETYPE_METADATA: Record<BusinessArchetype, ArchetypeMetadata> = {
  premium_boutique: {
    archetype: 'premium_boutique',
    label: 'Premium Boutique',
    description: 'Elevated experience; quality, education, and curation are the product',
    icon: 'Gem',
    defaultHighlights: ['Chemistry-first recommendations', 'Deep product education', 'Low-pressure, high-quality upsells'],
  },
  value_leader: {
    archetype: 'value_leader',
    label: 'Value Leader',
    description: 'High-volume, accessible cannabis; competitive pricing drives every decision',
    icon: 'Tag',
    defaultHighlights: ['Price-first recommendations', 'Fast, frictionless service', 'Active promotions and deals'],
  },
  community_hub: {
    archetype: 'community_hub',
    label: 'Community Hub',
    description: 'Cannabis as community; relationships and local loyalty come before transactions',
    icon: 'Users',
    defaultHighlights: ['Effect-first recommendations', 'Loyalty-focused campaigns', 'Warm, casual voice'],
  },
  medical_focus: {
    archetype: 'medical_focus',
    label: 'Medical Focus',
    description: 'Patient-first dispensary; clinical accuracy and condition-based guidance',
    icon: 'HeartPulse',
    defaultHighlights: ['Condition-based recommendations', 'Clinical, professional tone', 'Conservative compliance posture'],
  },
  lifestyle_brand: {
    archetype: 'lifestyle_brand',
    label: 'Lifestyle Brand',
    description: 'Cannabis culture and creativity; brand identity is the product',
    icon: 'Sparkles',
    defaultHighlights: ['Trend-driven recommendations', 'Creative, bold campaigns', 'Culture-first messaging'],
  },
};

/** Labels for trade-off slider poles — used in the UI. */
export const SLIDER_METADATA: Record<
  keyof ValueHierarchies,
  { leftLabel: string; rightLabel: string; leftDescription: string; rightDescription: string }
> = {
  speedVsEducation: {
    leftLabel: 'Fast Resolution',
    rightLabel: 'Deep Education',
    leftDescription: 'Resolve requests quickly; minimal back-and-forth',
    rightDescription: 'Take time to explain options thoroughly before recommending',
  },
  volumeVsMargin: {
    leftLabel: 'Maximize Transactions',
    rightLabel: 'Maximize Margin',
    leftDescription: 'Prioritize high-velocity, accessible products',
    rightDescription: 'Prioritize premium products and upsells for higher margin',
  },
  acquisitionVsRetention: {
    leftLabel: 'New Customers First',
    rightLabel: 'Loyalty First',
    leftDescription: 'Budget and messaging skew toward acquiring first-time buyers',
    rightDescription: 'Existing loyal customers are the primary audience',
  },
  complianceConservatism: {
    leftLabel: 'Aggressive Marketing',
    rightLabel: 'Maximum Caution',
    leftDescription: 'Bold promotions; follow regulations but push the envelope',
    rightDescription: 'Conservative language; extensive disclaimers; avoid borderline claims',
  },
  automationVsHumanTouch: {
    leftLabel: 'Full Automation',
    rightLabel: 'Human-in-the-Loop',
    leftDescription: 'Let AI handle everything; maximize throughput',
    rightDescription: 'Escalate edge cases; prefer human sign-off on important decisions',
  },
  brandVoiceFormality: {
    leftLabel: 'Casual & Friendly',
    rightLabel: 'Clinical & Professional',
    leftDescription: 'Conversational, emoji-friendly, light humor acceptable',
    rightDescription: 'Precise terminology, formal register, no slang',
  },
};
