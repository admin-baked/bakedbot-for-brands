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
 * Brand identity section — who the dispensary IS (visual, voice, messaging, compliance).
 * Sourced from: website scan + manual entry in onboarding wizard (Steps 1-4).
 */
export interface OrgProfileBrand {
  name: string;
  tagline?: string;
  city?: string;
  state?: string;
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
// Intent Section
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Business intent section — HOW the dispensary operates (strategy, agent behavior, boundaries).
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
 * Scoring breakdown (100 pts total):
 *   Brand:  name(10) + voice(15) + visualIdentity.colors(15)  = 40 pts
 *   Intent: strategicFoundation(20) + valueHierarchies(20) + agentConfigs(15) + hardBoundaries(5) = 60 pts
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

  return Math.round(score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion breakdown label (for UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrgProfileCompletionBreakdown {
  brand: { score: number; max: number };
  intent: { score: number; max: number };
  total: number;
}

export function getOrgProfileCompletionBreakdown(
  profile: Partial<OrgProfile>,
): OrgProfileCompletionBreakdown {
  let brandScore = 0;
  let intentScore = 0;

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

  return {
    brand: { score: brandScore, max: 40 },
    intent: { score: intentScore, max: 60 },
    total: brandScore + intentScore,
  };
}
