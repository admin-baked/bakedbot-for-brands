// src/server/services/intent-profile.ts
// Dispensary Intent Profile Framework (DIPF) — Service Layer
// Provides caching, CRUD, default profiles, and agent block builders.

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
  DispensaryIntentProfile,
  BusinessArchetype,
  IntentProfileVersion,
} from '@/types/dispensary-intent-profile';

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Cache (5-minute TTL)
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  profile: DispensaryIntentProfile;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

export function invalidateCache(orgId: string): void {
  cache.delete(orgId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore CRUD
// ─────────────────────────────────────────────────────────────────────────────

const COLLECTION = 'org_intent_profiles';

export async function getIntentProfile(orgId: string): Promise<DispensaryIntentProfile | null> {
  // Cache hit
  const cached = cache.get(orgId);
  if (cached && isCacheValid(cached)) {
    return cached.profile;
  }

  try {
    const db = getAdminFirestore();
    const docRef = db.collection(COLLECTION).doc(orgId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return null;
    }

    const profile = snap.data() as DispensaryIntentProfile;
    cache.set(orgId, { profile, fetchedAt: Date.now() });
    return profile;
  } catch (err) {
    logger.error(`[IntentProfile] Failed to fetch for orgId=${orgId}: ${String(err)}`);
    return null;
  }
}

export async function upsertIntentProfile(
  orgId: string,
  updates: Partial<DispensaryIntentProfile>,
  updatedBy: string,
): Promise<void> {
  const db = getAdminFirestore();
  const docRef = db.collection(COLLECTION).doc(orgId);
  const now = new Date().toISOString();

  // Merge the updates with metadata fields
  const merged: Partial<DispensaryIntentProfile> = {
    ...updates,
    id: orgId,
    orgId,
    updatedAt: now,
    lastModifiedBy: updatedBy,
    isDefault: false,
    version: '1.0.0',
  };

  // Set createdAt only on first write
  const existing = await docRef.get();
  if (!existing.exists) {
    merged.createdAt = now;
  }

  await docRef.set(merged, { merge: true });

  // Write version history snapshot
  const versionId = now;
  const historyRef = docRef.collection('history').doc(versionId);
  const historyEntry: IntentProfileVersion = {
    versionId,
    savedBy: updatedBy,
    savedAt: now,
    changeNote: 'Profile updated',
    snapshot: merged as DispensaryIntentProfile,
  };
  await historyRef.set(historyEntry);

  // Invalidate cache so next read fetches fresh data
  invalidateCache(orgId);
  logger.info(`[IntentProfile] Upserted for orgId=${orgId} by ${updatedBy}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Archetype Profiles
// TODO: Add medical_focus and lifestyle_brand defaults in Phase 2.
// For now both fall through to community_hub with archetype field overridden.
// ─────────────────────────────────────────────────────────────────────────────

export function getDefaultProfile(archetype: BusinessArchetype, orgId: string): DispensaryIntentProfile {
  const now = new Date().toISOString();
  const base: Omit<DispensaryIntentProfile, 'strategicFoundation' | 'valueHierarchies' | 'agentConfigs'> = {
    id: orgId,
    orgId,
    version: '1.0.0',
    isDefault: true,
    lastModifiedBy: 'system',
    createdAt: now,
    updatedAt: now,
    hardBoundaries: { neverDoList: [], escalationTriggers: [] },
    feedbackConfig: {
      captureNegativeFeedback: true,
      requestExplicitFeedback: false,
      minimumInteractionsForAdjustment: 50,
    },
  };

  switch (archetype) {
    case 'premium_boutique':
      return {
        ...base,
        strategicFoundation: {
          archetype: 'premium_boutique',
          growthStage: 'established',
          competitivePosture: 'differentiator',
          geographicStrategy: 'hyperlocal',
          weightedObjectives: [
            { objective: 'boost_average_order_value', weight: 0.45 },
            { objective: 'build_brand_authority', weight: 0.35 },
            { objective: 'improve_retention', weight: 0.20 },
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
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: false,
          minimumInteractionsForAdjustment: 100,
        },
      };

    case 'community_hub':
      return {
        ...base,
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
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: true,
          minimumInteractionsForAdjustment: 30,
        },
      };

    case 'value_leader':
      return {
        ...base,
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
        feedbackConfig: {
          captureNegativeFeedback: true,
          requestExplicitFeedback: false,
          minimumInteractionsForAdjustment: 50,
        },
      };

    // TODO Phase 2: Add medical_focus and lifestyle_brand defaults
    case 'medical_focus':
    case 'lifestyle_brand':
    default: {
      // Fall back to community_hub with archetype override
      const fallback = getDefaultProfile('community_hub', orgId);
      fallback.strategicFoundation.archetype = archetype;
      return fallback;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Completion Scoring
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCompletionPct(profile: Partial<DispensaryIntentProfile>): number {
  let score = 0;

  // Strategic Foundation — 30 points
  const sf = profile.strategicFoundation;
  if (sf && sf.archetype && sf.weightedObjectives && sf.weightedObjectives.length >= 1) {
    score += 30;
  }

  // Value Hierarchies — 30 points
  const vh = profile.valueHierarchies;
  if (
    vh &&
    vh.speedVsEducation !== undefined &&
    vh.volumeVsMargin !== undefined &&
    vh.acquisitionVsRetention !== undefined &&
    vh.complianceConservatism !== undefined &&
    vh.automationVsHumanTouch !== undefined &&
    vh.brandVoiceFormality !== undefined
  ) {
    score += 30;
  }

  // Agent Configs — 25 points
  const ac = profile.agentConfigs;
  if (
    ac &&
    ac.smokey &&
    ac.smokey.recommendationPhilosophy &&
    ac.smokey.newUserProtocol &&
    ac.smokey.productEducationDepth &&
    ac.craig &&
    ac.craig.toneArchetype &&
    ac.craig.promotionStrategy
  ) {
    score += 25;
  }

  // Hard Boundaries — 15 points (object presence is enough)
  if (profile.hardBoundaries !== undefined) {
    score += 15;
  }

  return Math.round(score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent System Prompt Block Builders
// ─────────────────────────────────────────────────────────────────────────────

const ARCHETYPE_LABELS: Record<string, string> = {
  premium_boutique: 'Premium Boutique',
  value_leader: 'Value Leader',
  community_hub: 'Community Hub',
  medical_focus: 'Medical Focus',
  lifestyle_brand: 'Lifestyle Brand',
};

const ARCHETYPE_DESCRIPTIONS: Record<string, string> = {
  premium_boutique: 'Elevated experience; quality, education, and curation are the product',
  value_leader: 'High-volume, accessible cannabis; competitive pricing drives every decision',
  community_hub: 'Cannabis as community; relationships and local loyalty come before transactions',
  medical_focus: 'Patient-first dispensary; clinical accuracy and condition-based guidance',
  lifestyle_brand: 'Cannabis culture and creativity; brand identity is the product',
};

const PHILOSOPHY_DESCRIPTIONS: Record<string, string> = {
  chemistry_first: 'Lead every recommendation with terpene profiles and cannabinoid ratios. Explain the entourage effect.',
  effect_first: 'Ask about desired effect first (relax, focus, sleep, pain). Build recommendation around stated need.',
  price_first: 'Anchor recommendations on value and price. Best-bang-for-buck framing always.',
  popularity_first: 'Lead with what other customers are buying. Social proof and trending items first.',
};

const DEPTH_DESCRIPTIONS: Record<string, string> = {
  minimal: 'Name, price, and one key benefit only. Keep it fast.',
  moderate: 'Name, price, main effect, and primary terpene. Two sentences max.',
  comprehensive: 'Full terpene profile, cannabinoid breakdown, use-case scenarios. Take the time to educate.',
};

const PROTOCOL_DESCRIPTIONS: Record<string, string> = {
  guided: 'Ask 2–3 intake questions (experience level, desired effect, consumption preference) before recommending.',
  express: 'Skip intake; go straight to top-3 picks. Respect the customer\'s time.',
  discover: 'Invite the customer to describe themselves and their relationship with cannabis. Let the conversation unfold naturally.',
};

const OBJECTIVE_LABELS: Record<string, string> = {
  increase_foot_traffic: 'Increase Foot Traffic',
  boost_average_order_value: 'Boost Average Order Value',
  improve_retention: 'Improve Customer Retention',
  grow_loyalty_enrollment: 'Grow Loyalty Enrollment',
  launch_new_products: 'Launch New Products',
  clear_aging_inventory: 'Clear Aging Inventory',
  build_brand_authority: 'Build Brand Authority',
};

function getUpsellLabel(value: number): { label: string; description: string } {
  if (value < 0.4) {
    return {
      label: 'Low',
      description: 'Mention one complementary item only if it\'s a clear, natural fit. Accept "no" immediately.',
    };
  }
  if (value <= 0.7) {
    return {
      label: 'Medium',
      description: 'Suggest one upsell per interaction. Frame with value (savings, entourage effect). Drop it if declined.',
    };
  }
  return {
    label: 'High',
    description: 'Actively suggest add-ons and bundles. Use urgency framing. Offer alternatives if first upsell is declined.',
  };
}

function getSpeedEduDescription(value: number): string {
  if (value < 0.33) return 'Efficiency-first: resolve the customer\'s need as quickly as possible. Minimal explanation.';
  if (value <= 0.67) return 'Balanced: answer the question, then offer to go deeper if the customer wants it.';
  return 'Education-first: take the time to explain options before recommending. Curiosity over convenience.';
}

function getFormalityDescription(value: number): string {
  if (value < 0.33) return 'Casual and conversational: friendly tone, light humor acceptable, contractions welcome.';
  if (value <= 0.67) return 'Professional but approachable: clear language, no jargon, warm but not informal.';
  return 'Clinical and formal: precise terminology, avoid slang, professional register throughout.';
}

function getComplianceDescription(value: number): string {
  if (value < 0.33) return 'Standard compliance: follow regulations; marketing can be bold and promotional.';
  if (value <= 0.67) return 'Balanced: promotional messaging with appropriate disclaimers.';
  return 'Conservative: err on the side of caution; prefer understated claims; add disclaimers liberally.';
}

function getAcquisitionRetentionDescription(value: number): string {
  if (value < 0.33) return 'Acquisition-first: prioritize new customer acquisition. Budget and messaging should skew toward getting first purchases.';
  if (value <= 0.67) return 'Balanced: split effort between winning new customers and rewarding existing loyal ones.';
  return 'Retention-first: existing customers are the primary audience. Loyalty, re-engagement, and VIP treatment take priority.';
}

function getComplianceStanceDescription(value: number): string {
  if (value < 0.33) return 'Standard: follow state regulations. Promotions can be bold and sales-forward.';
  if (value <= 0.67) return 'Balanced: promotional but measured. Include standard disclaimers.';
  return 'Conservative: understated messaging, extensive disclaimers, avoid anything that could draw regulatory attention.';
}

export function buildSmokeyIntentBlock(profile: DispensaryIntentProfile): string {
  const sf = profile.strategicFoundation;
  const vh = profile.valueHierarchies;
  const sc = profile.agentConfigs.smokey;
  const hb = profile.hardBoundaries;

  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;
  const archetypeDesc = ARCHETYPE_DESCRIPTIONS[sf.archetype] ?? '';

  const objectivesBlock = [...sf.weightedObjectives]
    .sort((a, b) => b.weight - a.weight)
    .map(o => `• ${OBJECTIVE_LABELS[o.objective] ?? o.objective} (${Math.round(o.weight * 100)}%)`)
    .join('\n');

  const philosophyDesc = PHILOSOPHY_DESCRIPTIONS[sc.recommendationPhilosophy] ?? '';
  const depthDesc = DEPTH_DESCRIPTIONS[sc.productEducationDepth] ?? '';
  const protocolDesc = PROTOCOL_DESCRIPTIONS[sc.newUserProtocol] ?? '';
  const upsell = getUpsellLabel(sc.upsellAggressiveness);

  const neverDoBlock =
    hb.neverDoList.length > 0
      ? `\nHARD BOUNDARIES — NEVER DO:\n${hb.neverDoList.map(r => `• ${r}`).join('\n')}`
      : '';

  const escalationBlock =
    hb.escalationTriggers.length > 0
      ? `\nESCALATE TO HUMAN WHEN:\n${hb.escalationTriggers.map(t => `• ${t}`).join('\n')}`
      : '';

  return `
=== DISPENSARY INTENT PROFILE ===
Archetype: ${archetypeLabel} — ${archetypeDesc}
Growth Stage: ${sf.growthStage} | Competitive Posture: ${sf.competitivePosture}

TOP PRIORITIES:
${objectivesBlock}

RECOMMENDATION APPROACH:
Philosophy: ${sc.recommendationPhilosophy} — ${philosophyDesc}
Education Depth: ${sc.productEducationDepth} — ${depthDesc}
New Customer Protocol: ${sc.newUserProtocol} — ${protocolDesc}
Upsell Guidance: ${upsell.label} — ${upsell.description}

VALUE TRADE-OFFS:
Speed vs Education: ${getSpeedEduDescription(vh.speedVsEducation)}
Voice Formality: ${getFormalityDescription(vh.brandVoiceFormality)}
Compliance Posture: ${getComplianceDescription(vh.complianceConservatism)}
${neverDoBlock}${escalationBlock}
=== END INTENT PROFILE ===`;
}

export function buildCraigIntentBlock(profile: DispensaryIntentProfile): string {
  const sf = profile.strategicFoundation;
  const vh = profile.valueHierarchies;
  const cc = profile.agentConfigs.craig;
  const hb = profile.hardBoundaries;

  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;

  const objectivesBlock = [...sf.weightedObjectives]
    .sort((a, b) => b.weight - a.weight)
    .map(o => `• ${OBJECTIVE_LABELS[o.objective] ?? o.objective} (${Math.round(o.weight * 100)}%)`)
    .join('\n');

  const neverDoBlock =
    hb.neverDoList.length > 0
      ? `\nHARD LIMITS — NEVER DO:\n${hb.neverDoList.map(r => `• ${r}`).join('\n')}`
      : '';

  return `
=== CAMPAIGN INTENT PROFILE ===
Archetype: ${archetypeLabel} | Growth Stage: ${sf.growthStage}
Strategy: ${cc.promotionStrategy} | Tone: ${cc.toneArchetype}
Preferred Channels: ${cc.preferredChannels.join(' > ')} | Max campaigns/week: ${cc.campaignFrequencyCap}

BUSINESS FOCUS:
${objectivesBlock}

CUSTOMER FOCUS: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
COMPLIANCE STANCE: ${getComplianceStanceDescription(vh.complianceConservatism)}
${neverDoBlock}
=== END CAMPAIGN INTENT ===`;
}
