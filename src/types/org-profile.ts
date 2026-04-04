// src/types/org-profile.ts
// Unified OrgProfile — single source of truth combining Brand Guide + Intent Profile.
// Stored at: org_profiles/{orgId}
// History:   org_profiles/{orgId}/history/{versionId}

import type {
  BusinessArchetype,
  StrategicFoundation,
  ValueHierarchies,
  AgentConfigs,
  HardBoundaries,
  FeedbackConfig,
} from './dispensary-intent-profile';
import type {
  BrandBusinessModel,
  BrandOrganizationType,
} from './brand-guide';

// Re-export intent types so consumers only need one import
export type {
  BusinessArchetype,
  StrategicFoundation,
  ValueHierarchies,
  AgentConfigs,
  HardBoundaries,
  FeedbackConfig,
  SmokeyIntentConfig,
  CraigIntentConfig,
  WeightedObjective,
  PrimaryObjective,
  GrowthStage,
  CompetitivePosture,
  GeographicStrategy,
} from './dispensary-intent-profile';

export { ARCHETYPE_METADATA, SLIDER_METADATA } from './dispensary-intent-profile';

// ─────────────────────────────────────────────────────────────────────────────
// Brand Section
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgProfileColor {
  hex: string;
  name: string;
  usage: string;
}

export interface OrgProfileVisualIdentity {
  colors: {
    primary: OrgProfileColor;
    secondary?: OrgProfileColor;
    accent?: OrgProfileColor;
  };
  logo?: {
    primary: string;   // URL
    dark?: string;     // Dark-background variant
    light?: string;    // Light-background variant
  };
}

export interface OrgProfileVoice {
  /** e.g. ['Casual', 'Educational'] — max 3 */
  tone: string[];
  /** e.g. ['Friendly', 'Trustworthy'] — max 4 */
  personality: string[];
  /** Writing guidelines: do these things */
  doWrite: string[];
  /** Writing guidelines: never do these */
  dontWrite: string[];
  /** Preferred and avoided cannabis vocabulary */
  vocabulary?: {
    preferred: string[]; // e.g. ['flower', 'cannabis', 'budtender']
    avoid: string[];     // e.g. ['marijuana', 'weed', 'drug']
  };
}

export interface OrgProfileMessaging {
  tagline?: string;
  positioning?: string;
  mission?: string;
  keyMessages?: string[];
  valuePropositions?: string[];
}

export interface OrgProfileCompliance {
  /** Two-letter state code, e.g. 'NY', 'CA' */
  state?: string;
  /** Required age disclaimer text */
  ageDisclaimer?: string;
  /** Guidance for medical claims — how restrictive to be */
  medicalClaimsGuidance?: string;
  /** List of prohibited content categories */
  restrictions?: string[];
}

export interface OrgProfileAssets {
  /** URLs of hero banner images */
  heroImages?: string[];
  /** Keyed by type: hero / product_bg / ambient / texture */
  brandImages?: Record<string, string>;
}

/**
 * Brand identity section — who the organization is (visual, voice, messaging, compliance).
 * Sourced from: website scan + manual entry in onboarding wizard (Steps 1-4).
 */
export interface OrgProfileBrand {
  name: string;
  tagline?: string;
  city?: string;
  state?: string;
  organizationType?: BrandOrganizationType;
  businessModel?: BrandBusinessModel;
  dispensaryType?: 'recreational' | 'medical' | 'both';
  instagramHandle?: string;
  facebookHandle?: string;
  websiteUrl?: string;

  visualIdentity: OrgProfileVisualIdentity;
  voice: OrgProfileVoice;
  messaging: OrgProfileMessaging;
  compliance: OrgProfileCompliance;
  assets?: OrgProfileAssets;
}

// ─────────────────────────────────────────────────────────────────────────────
// Operations Section — Operational brand truth consumed by agents at runtime
// ─────────────────────────────────────────────────────────────────────────────

export interface HeroProduct {
  skuId: string;
  name: string;
  role: 'flagship' | 'seasonal' | 'clearance' | 'campaign_anchor';
  reason?: string;
  /** 1 = highest priority */
  priority: number;
  /** ISO date — auto-expire seasonal/clearance picks */
  validUntil?: string;
}

export interface CampaignCalendarEntry {
  id: string;
  name: string;
  /** ISO date */
  startDate: string;
  /** ISO date */
  endDate: string;
  channels: string[];
  theme: string;
  expectedLiftPct?: number;
}

export interface ChannelRule {
  /** e.g. 'sms', 'email', 'push', 'instagram', 'tiktok' */
  channel: string;
  enabled: boolean;
  /** Max sends per customer per week */
  frequencyCap?: number;
  /** Allowed content types for this channel */
  contentTypes?: string[];
  /** Platform-specific tone adjustment */
  voiceOverride?: string;
}

export interface RetailerTier {
  retailerId: string;
  name: string;
  tier: 'gold' | 'silver' | 'bronze';
}

export interface PricingPolicy {
  marginFloorPct: number;
  maxDiscountPct: number;
  elasticity?: { discountPct: number; gmImpactPct: number }[];
}

export interface CustomerSegmentDef {
  id: string;
  name: string;
  description: string;
  criteria: { field: string; operator: string; value: string }[];
  /** Estimated segment size */
  size?: number;
}

export interface VendorPartnership {
  vendorId: string;
  vendorName: string;
  coMarketingRules?: string[];
  coopBudget?: number;
}

export interface ContentLibrary {
  approvedPhrases?: { category: string; phrases: string[] }[];
  smsTemplates?: { id: string; name: string; body: string }[];
  emailTemplates?: { id: string; name: string; subject: string; body: string }[];
}

export interface PerformanceBaselines {
  conversionRate?: number;
  averageOrderValue?: number;
  repeatPurchaseRate?: number;
  loyaltyEnrollmentRate?: number;
  churnRate?: number;
  /** ISO date — stale if > 7 days */
  lastUpdated?: string;
}

/**
 * Operational brand truth — the runtime "Brand Brain" that agents hydrate from.
 * Extends identity (brand) and strategy (intent) with operational fields.
 * All fields optional for backward compatibility.
 */
export interface OrgProfileOperations {
  /** Flagship products, seasonal picks, campaign anchors */
  heroProducts?: HeroProduct[];

  /** Planned campaigns with dates and channels */
  campaignCalendar?: CampaignCalendarEntry[];
  /** Dates when no campaigns should run */
  blackoutDates?: { date: string; reason: string }[];

  /** Per-channel rules: enabled, frequency caps, voice overrides */
  channelRules?: ChannelRule[];

  /** Retailer routing: preferred dispensaries by tier */
  retailerRouting?: {
    retailers: RetailerTier[];
    exclusivityRules?: string[];
    coopPolicies?: string[];
  };

  /** Pricing guardrails */
  pricingPolicy?: PricingPolicy;

  /** Inventory strategy thresholds */
  inventoryStrategy?: {
    clearanceThresholdDays?: number;
    lowStockAlertThreshold?: number;
  };

  /** Structured customer segments */
  customerSegments?: CustomerSegmentDef[];

  /** Vendor partnership rules */
  vendorPartnerships?: VendorPartnership[];

  /** Pre-approved messaging templates and phrases */
  contentLibrary?: ContentLibrary;

  /** Cached performance baselines — refreshed nightly */
  performanceBaselines?: PerformanceBaselines;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intent Section
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Business intent section — how the organization operates (strategy, agent behavior, boundaries).
 * Sourced from: archetype selection + sliders in onboarding wizard (Steps 5-7).
 */
export interface OrgProfileIntent {
  strategicFoundation: StrategicFoundation;
  valueHierarchies: ValueHierarchies;
  agentConfigs: AgentConfigs;
  hardBoundaries: HardBoundaries;
  feedbackConfig: FeedbackConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Profile Type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Unified organizational profile — single Firestore document at org_profiles/{orgId}.
 * Replaces the split between BrandGuide (brands/{id}) and DispensaryIntentProfile (org_intent_profiles/{id}).
 */
export interface OrgProfile {
  /** Document ID — equals orgId */
  id: string;
  orgId: string;

  /** Schema version. Current: '1.0.0' */
  version: string;

  /**
   * True if this profile was auto-generated from defaults;
   * false once the user has customized it.
   */
  isDefault: boolean;

  /** Cached completion percentage 0-100. Recalculated on every save. */
  completionPct: number;

  /** UID of the user who last modified this profile */
  lastModifiedBy: string;

  /** ISO timestamp */
  createdAt: string;

  /** ISO timestamp */
  updatedAt: string;

  brand: OrgProfileBrand;
  intent: OrgProfileIntent;
  /** Operational brand truth — hero products, campaign calendar, channel rules, etc. */
  operations?: OrgProfileOperations;
}

// ─────────────────────────────────────────────────────────────────────────────
// History Subcollection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Immutable snapshot stored at org_profiles/{orgId}/history/{versionId}.
 * versionId = ISO timestamp of when this version was saved.
 */
export interface OrgProfileVersion {
  versionId: string;
  savedBy: string;
  savedAt: string;
  changeNote: string;
  snapshot: OrgProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate how complete an OrgProfile is.
 * Safe to import in client components — no server deps.
 *
 * Scoring breakdown (120 pts, normalized to 100):
 *   Brand:      name(10) + voice(15) + visualIdentity.colors(15)  = 40 pts
 *   Intent:     strategicFoundation(20) + valueHierarchies(20) + agentConfigs(15) + hardBoundaries(5) = 60 pts
 *   Operations: heroProducts(5) + campaignCalendar(5) + channelRules(5) + performanceBaselines(5) = 20 pts
 */
export function calculateOrgProfileCompletion(profile: Partial<OrgProfile>): number {
  let score = 0;

  // ── Brand section (40 pts) ──
  const b = profile.brand;
  if (b?.name) score += 10;
  if (b?.voice?.tone?.length && b.voice.personality?.length) score += 15;
  if (b?.visualIdentity?.colors?.primary?.hex) score += 15;

  // ── Intent section (60 pts) ──
  const i = profile.intent;
  const sf = i?.strategicFoundation;
  if (sf?.archetype && sf.weightedObjectives?.length >= 1) score += 20;

  const vh = i?.valueHierarchies;
  if (
    vh &&
    vh.speedVsEducation !== undefined &&
    vh.volumeVsMargin !== undefined &&
    vh.acquisitionVsRetention !== undefined &&
    vh.complianceConservatism !== undefined &&
    vh.automationVsHumanTouch !== undefined &&
    vh.brandVoiceFormality !== undefined
  ) {
    score += 20;
  }

  const ac = i?.agentConfigs;
  if (
    ac?.smokey?.recommendationPhilosophy &&
    ac.smokey.newUserProtocol &&
    ac.smokey.productEducationDepth &&
    ac.craig?.toneArchetype &&
    ac.craig.promotionStrategy
  ) {
    score += 15;
  }

  if (i?.hardBoundaries !== undefined) score += 5;

  // ── Operations section (20 pts) ──
  const ops = profile.operations;
  if (ops?.heroProducts?.length) score += 5;
  if (ops?.campaignCalendar?.length) score += 5;
  if (ops?.channelRules?.length) score += 5;
  if (ops?.performanceBaselines?.lastUpdated) score += 5;

  // Normalize from 120-point scale to 100
  return Math.round((score / 120) * 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion breakdown label (for UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgProfileCompletionBreakdown {
  brand: { score: number; max: number };
  intent: { score: number; max: number };
  operations: { score: number; max: number };
  total: number;
}

export function getOrgProfileCompletionBreakdown(
  profile: Partial<OrgProfile>,
): OrgProfileCompletionBreakdown {
  let brandScore = 0;
  let intentScore = 0;
  let opsScore = 0;

  const b = profile.brand;
  if (b?.name) brandScore += 10;
  if (b?.voice?.tone?.length && b.voice.personality?.length) brandScore += 15;
  if (b?.visualIdentity?.colors?.primary?.hex) brandScore += 15;

  const i = profile.intent;
  const sf = i?.strategicFoundation;
  if (sf?.archetype && sf.weightedObjectives?.length >= 1) intentScore += 20;

  const vh = i?.valueHierarchies;
  if (
    vh &&
    vh.speedVsEducation !== undefined &&
    vh.volumeVsMargin !== undefined &&
    vh.acquisitionVsRetention !== undefined &&
    vh.complianceConservatism !== undefined &&
    vh.automationVsHumanTouch !== undefined &&
    vh.brandVoiceFormality !== undefined
  ) {
    intentScore += 20;
  }

  const ac = i?.agentConfigs;
  if (
    ac?.smokey?.recommendationPhilosophy &&
    ac.smokey.newUserProtocol &&
    ac.smokey.productEducationDepth &&
    ac.craig?.toneArchetype &&
    ac.craig.promotionStrategy
  ) {
    intentScore += 15;
  }

  if (i?.hardBoundaries !== undefined) intentScore += 5;

  const ops = profile.operations;
  if (ops?.heroProducts?.length) opsScore += 5;
  if (ops?.campaignCalendar?.length) opsScore += 5;
  if (ops?.channelRules?.length) opsScore += 5;
  if (ops?.performanceBaselines?.lastUpdated) opsScore += 5;

  const rawTotal = brandScore + intentScore + opsScore;
  return {
    brand: { score: brandScore, max: 40 },
    intent: { score: intentScore, max: 60 },
    operations: { score: opsScore, max: 20 },
    total: Math.round((rawTotal / 120) * 100),
  };
}
