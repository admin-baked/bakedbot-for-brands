// src/server/services/org-profile.ts
// Unified OrgProfile service — single Firestore document, single cache, unified agent block builders.
// Replaces the dual getBrandGuide + getIntentProfile pattern across all agents.

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type {
  OrgProfile,
  OrgProfileVersion,
  OrgProfileBrand,
  OrgProfileIntent,
} from '@/types/org-profile';
import { calculateOrgProfileCompletion } from '@/types/org-profile';
import type { BusinessArchetype } from '@/types/dispensary-intent-profile';
import { getDefaultProfile } from './intent-profile';
import {
  buildOrganizationDescriptor,
} from '@/lib/brand-guide-utils';

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Cache (5-minute TTL)
// ─────────────────────────────────────────────────────────────────────────────

interface CacheEntry {
  profile: OrgProfile;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

export function invalidateOrgProfileCache(orgId: string): void {
  cache.delete(orgId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore CRUD
// ─────────────────────────────────────────────────────────────────────────────

const COLLECTION = 'org_profiles';

export async function getOrgProfile(orgId: string): Promise<OrgProfile | null> {
  const cached = cache.get(orgId);
  if (cached && isCacheValid(cached)) return cached.profile;

  try {
    const db = getAdminFirestore();
    const snap = await db.collection(COLLECTION).doc(orgId).get();
    if (!snap.exists) return null;
    const profile = snap.data() as OrgProfile;
    cache.set(orgId, { profile, fetchedAt: Date.now() });
    return profile;
  } catch (err) {
    logger.error(`[OrgProfile] Failed to fetch orgId=${orgId}: ${String(err)}`);
    return null;
  }
}

export async function upsertOrgProfile(
  orgId: string,
  updates: Partial<OrgProfile>,
  updatedBy: string,
): Promise<void> {
  const db = getAdminFirestore();
  const docRef = db.collection(COLLECTION).doc(orgId);
  const now = new Date().toISOString();

  const existing = await docRef.get();
  const merged: Partial<OrgProfile> = {
    ...updates,
    id: orgId,
    orgId,
    version: '1.0.0',
    isDefault: false,
    updatedAt: now,
    lastModifiedBy: updatedBy,
  };
  if (!existing.exists) {
    merged.createdAt = now;
  }

  // Calculate and cache completion pct
  const fullForScoring = { ...(existing.exists ? (existing.data() as OrgProfile) : {}), ...merged };
  merged.completionPct = calculateOrgProfileCompletion(fullForScoring as Partial<OrgProfile>);

  await docRef.set(merged, { merge: true });

  // Write history snapshot
  const historyEntry: OrgProfileVersion = {
    versionId: now,
    savedBy: updatedBy,
    savedAt: now,
    changeNote: 'Profile updated',
    snapshot: merged as OrgProfile,
  };
  await docRef.collection('history').doc(now).set(historyEntry);

  invalidateOrgProfileCache(orgId);
  logger.info(`[OrgProfile] Upserted orgId=${orgId} by ${updatedBy} (${merged.completionPct}% complete)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Profile Generator
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BRAND: OrgProfileBrand = {
  name: '',
  visualIdentity: {
    colors: {
      primary: { hex: '#4ade80', name: 'Primary Green', usage: 'Main brand color' },
    },
  },
  voice: {
    tone: [],
    personality: [],
    doWrite: [],
    dontWrite: [],
  },
  messaging: {},
  compliance: {},
};

export function getDefaultOrgProfile(archetype: BusinessArchetype, orgId: string): OrgProfile {
  const now = new Date().toISOString();
  const intentDefaults = getDefaultProfile(archetype, orgId);

  const intent: OrgProfileIntent = {
    strategicFoundation: intentDefaults.strategicFoundation,
    valueHierarchies: intentDefaults.valueHierarchies,
    agentConfigs: intentDefaults.agentConfigs,
    hardBoundaries: intentDefaults.hardBoundaries,
    feedbackConfig: intentDefaults.feedbackConfig,
  };

  const profile: OrgProfile = {
    id: orgId,
    orgId,
    version: '1.0.0',
    isDefault: true,
    completionPct: 0,
    lastModifiedBy: 'system',
    createdAt: now,
    updatedAt: now,
    brand: { ...DEFAULT_BRAND },
    intent,
  };

  profile.completionPct = calculateOrgProfileCompletion(profile);
  return profile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward-Compat Fallback Bridge
// Reads old collections and merges into OrgProfile shape.
// Used by agents so zero breaking change for existing orgs.
// ─────────────────────────────────────────────────────────────────────────────

function mapTenantOrganizationType(value: unknown): OrgProfileBrand['organizationType'] | undefined {
  if (value === 'dispensary') return 'dispensary';
  if (value === 'brand') return 'cannabis_brand';
  if (value === 'platform' || value === 'super_user') return 'technology_platform';
  return undefined;
}

function mapTenantBusinessModel(value: unknown): OrgProfileBrand['businessModel'] | undefined {
  if (value === 'dispensary') return 'retail';
  if (value === 'brand') return 'product_brand';
  if (value === 'platform' || value === 'super_user') return 'saas_ai_platform';
  return undefined;
}

export async function getOrgProfileFromLegacy(orgId: string): Promise<OrgProfile | null> {
  try {
    const db = getAdminFirestore();
    const [brandSnap, intentSnap, tenantSnap] = await Promise.all([
      db.collection('brands').doc(orgId).get(),
      db.collection('org_intent_profiles').doc(orgId).get(),
      db.collection('tenants').doc(orgId).get(),
    ]);

    if (!brandSnap.exists && !intentSnap.exists && !tenantSnap.exists) return null;

    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandData: any = brandSnap.exists ? brandSnap.data() : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intentData: any = intentSnap.exists ? intentSnap.data() : {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenantData: any = tenantSnap.exists ? tenantSnap.data() : {};
    const tenantOrganizationType = mapTenantOrganizationType(tenantData.type);
    const tenantBusinessModel = mapTenantBusinessModel(tenantData.type);

    // Map brand guide fields
    const brand: OrgProfileBrand = {
      name: brandData.brandName ?? brandData.name ?? tenantData.name ?? tenantData.orgName ?? '',
      tagline: brandData.messaging?.tagline,
      organizationType:
        brandData.messaging?.organizationType
        ?? (brandData.metadata?.dispensaryType ? 'dispensary' : undefined)
        ?? tenantOrganizationType,
      businessModel: brandData.messaging?.businessModel ?? tenantBusinessModel,
      city: brandData.metadata?.city ?? tenantData.city,
      state: brandData.metadata?.state ?? brandData.compliance?.state ?? tenantData.state ?? tenantData.marketState,
      dispensaryType: brandData.metadata?.dispensaryType,
      instagramHandle: brandData.metadata?.instagramHandle,
      facebookHandle: brandData.metadata?.facebookHandle,
      websiteUrl: brandData.source?.url ?? tenantData.websiteUrl ?? tenantData.website ?? tenantData.url,
      visualIdentity: {
        colors: {
          primary: brandData.visualIdentity?.colors?.primary ?? { hex: '#4ade80', name: 'Primary', usage: '' },
          secondary: brandData.visualIdentity?.colors?.secondary,
          accent: brandData.visualIdentity?.colors?.accent,
        },
        logo: brandData.visualIdentity?.logo,
      },
      voice: {
        tone: brandData.voice?.tone ?? [],
        personality: brandData.voice?.personality ?? [],
        doWrite: brandData.voice?.doWrite ?? brandData.voice?.writingStyle?.doWrite ?? [],
        dontWrite: brandData.voice?.dontWrite ?? brandData.voice?.writingStyle?.dontWrite ?? [],
        vocabulary: brandData.voice?.vocabulary,
      },
      messaging: {
        tagline: brandData.messaging?.tagline,
        positioning: brandData.messaging?.positioning,
        mission: brandData.messaging?.mission,
        keyMessages: brandData.messaging?.keyMessages,
        valuePropositions: brandData.messaging?.valuePropositions,
      },
      compliance: {
        state: brandData.compliance?.state ?? brandData.metadata?.state ?? tenantData.state ?? tenantData.marketState,
        ageDisclaimer: brandData.compliance?.ageDisclaimer,
        medicalClaimsGuidance: brandData.compliance?.medicalClaims?.guidance,
        restrictions: brandData.compliance?.contentRestrictions,
      },
      assets: {
        heroImages: brandData.assets?.heroImages,
        brandImages: brandData.assets?.brandImages,
      },
    };

    // Map intent profile fields
    const intent: OrgProfileIntent = intentData.strategicFoundation
      ? {
          strategicFoundation: intentData.strategicFoundation,
          valueHierarchies: intentData.valueHierarchies,
          agentConfigs: intentData.agentConfigs,
          hardBoundaries: intentData.hardBoundaries ?? { neverDoList: [], escalationTriggers: [] },
          feedbackConfig: intentData.feedbackConfig ?? {
            captureNegativeFeedback: true,
            requestExplicitFeedback: false,
            minimumInteractionsForAdjustment: 50,
          },
        }
      : getDefaultOrgProfile('community_hub', orgId).intent;

    const profile: OrgProfile = {
      id: orgId,
      orgId,
      version: '1.0.0',
      isDefault: !intentSnap.exists,
      completionPct: 0,
      lastModifiedBy: intentData.lastModifiedBy ?? brandData.updatedBy ?? tenantData.updatedBy ?? 'legacy',
      createdAt: brandData.createdAt ?? tenantData.createdAt ?? now,
      updatedAt: intentData.updatedAt ?? brandData.updatedAt ?? tenantData.updatedAt ?? now,
      brand,
      intent,
    };
    profile.completionPct = calculateOrgProfileCompletion(profile);
    return profile;
  } catch (err) {
    logger.error(`[OrgProfile] Legacy fallback failed orgId=${orgId}: ${String(err)}`);
    return null;
  }
}

/**
 * Primary fetch for agents.
 * Reads org_profiles/{orgId} first; falls back to legacy collections if not found.
 */
export async function getOrgProfileWithFallback(orgId: string): Promise<OrgProfile | null> {
  const profile = await getOrgProfile(orgId);
  if (profile) return profile;
  return getOrgProfileFromLegacy(orgId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Label Helpers (used by block builders)
// ─────────────────────────────────────────────────────────────────────────────

const ARCHETYPE_LABELS: Record<string, string> = {
  premium_boutique: 'Premium Boutique',
  value_leader: 'Value Leader',
  community_hub: 'Community Hub',
  medical_focus: 'Medical Focus',
  lifestyle_brand: 'Lifestyle Brand',
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

const PHILOSOPHY_DESCRIPTIONS: Record<string, string> = {
  chemistry_first: 'Lead with terpene profiles and cannabinoid ratios. Explain the entourage effect.',
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
  guided: 'Ask 2–3 intake questions (experience level, desired effect, consumption) before recommending.',
  express: 'Skip intake; go straight to top-3 picks. Respect the customer\'s time.',
  discover: 'Invite the customer to describe themselves. Let the conversation unfold naturally.',
};

function getUpsellLabel(value: number): string {
  if (value < 0.4) return 'Low — mention one complementary item only if it\'s a clear fit. Accept "no" immediately.';
  if (value <= 0.7) return 'Medium — suggest one upsell per interaction. Frame with value. Drop if declined.';
  return 'High — actively suggest add-ons and bundles. Use urgency framing. Offer alternatives if first upsell declined.';
}

function getFormalityDescription(value: number): string {
  if (value < 0.33) return 'Casual and conversational — friendly tone, light humor acceptable, contractions welcome.';
  if (value <= 0.67) return 'Professional but approachable — clear language, no jargon, warm but not informal.';
  return 'Clinical and formal — precise terminology, avoid slang, professional register throughout.';
}

function getComplianceDescription(value: number): string {
  if (value < 0.33) return 'Standard — follow regulations; marketing can be bold and promotional.';
  if (value <= 0.67) return 'Balanced — promotional messaging with appropriate disclaimers.';
  return 'Conservative — understated messaging, extensive disclaimers, avoid anything borderline.';
}

function getAcquisitionRetentionDescription(value: number): string {
  if (value < 0.33) return 'Acquisition-first — budget and messaging skew toward converting new customers.';
  if (value <= 0.67) return 'Balanced — equal effort on new customer acquisition and existing loyalty.';
  return 'Retention-first — existing loyal customers are the primary audience. Loyalty and re-engagement take priority.';
}

function getVolumeMarginDescription(value: number): string {
  if (value < 0.33) return 'Volume-first — maximize transaction count; recommend accessible, high-velocity products.';
  if (value <= 0.67) return 'Balanced — weigh both transaction volume and margin per sale equally.';
  return 'Margin-first — prioritize premium products and upsells; fewer transactions at higher revenue per ticket.';
}

function getAutomationDescription(value: number): string {
  if (value < 0.33) return 'Full automation — let AI handle end-to-end. Maximize throughput.';
  if (value <= 0.67) return 'Hybrid — automate routine tasks; escalate judgment calls to humans.';
  return 'Human-in-the-loop — prefer human sign-off on important decisions; automation supports, not replaces, staff.';
}

function getPostureDescription(posture: string): string {
  switch (posture) {
    case 'aggressive': return 'Aggressive — actively pursue competitor customers; price match and promote heavily.';
    case 'defensive': return 'Defensive — protect market share; focus on loyalty over conquest.';
    case 'differentiator': return 'Differentiator — compete on quality, selection, and experience rather than price.';
    default: return posture;
  }
}

function buildObjectivesBlock(profile: OrgProfile, limit?: number): string {
  const objectives = [...(profile.intent.strategicFoundation.weightedObjectives ?? [])]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit ?? 10);
  return objectives
    .map(o => `• ${OBJECTIVE_LABELS[o.objective] ?? o.objective} (${Math.round(o.weight * 100)}%)`)
    .join('\n');
}

function buildBrandHeader(profile: OrgProfile): string {
  const b = profile.brand;
  const descriptor = buildOrganizationDescriptor({
    organizationType: b.organizationType,
    businessModel: b.businessModel,
    dispensaryType: b.dispensaryType,
    city: b.city,
    state: b.state,
  });
  return [
    b.name ? `You are representing: ${b.name}, a ${descriptor}.` : '',
  ].filter(Boolean).join('\n');
}

function buildVoiceGuidance(profile: OrgProfile): string {
  const v = profile.brand.voice;
  const lines: string[] = [];
  if (v.tone.length) lines.push(`Brand voice: ${v.tone.join(', ')}`);
  if (v.personality.length) lines.push(`Personality: ${v.personality.join(', ')}`);
  if (v.doWrite.length) lines.push(`Write like: ${v.doWrite.slice(0, 2).join('; ')}`);
  if (v.dontWrite.length) lines.push(`Never: ${v.dontWrite.slice(0, 2).join('; ')}`);
  if (v.vocabulary?.preferred?.length) lines.push(`Preferred terms: "${v.vocabulary.preferred.slice(0, 3).join('", "')}"`);
  if (v.vocabulary?.avoid?.length) lines.push(`Avoid: "${v.vocabulary.avoid.slice(0, 3).join('", "')}"`);
  return lines.join('\n');
}

function buildHardBoundaries(profile: OrgProfile): string {
  const hb = profile.intent.hardBoundaries;
  const lines: string[] = [];
  if (hb.neverDoList.length) {
    lines.push('\nNEVER DO:');
    hb.neverDoList.forEach(r => lines.push(`• ${r}`));
  }
  if (hb.escalationTriggers.length) {
    lines.push('\nESCALATE TO HUMAN WHEN:');
    hb.escalationTriggers.forEach(t => lines.push(`• ${t}`));
  }
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified Agent Context Block Builders
// ─────────────────────────────────────────────────────────────────────────────

// ─── Operations Block Helpers (Brand Brain → Agent Context) ─────────────────
// Each agent gets only the operations fields it needs (progressive disclosure).

function formatHeroProducts(products: import('@/types/org-profile').HeroProduct[], limit: number): string {
  const now = new Date().toISOString();
  const active = products
    .filter(p => !p.validUntil || p.validUntil >= now)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
  if (active.length === 0) return '';
  return '\nHERO PRODUCTS:\n' + active.map(p => `• ${p.name} [${p.role}]${p.reason ? ` — ${p.reason}` : ''}`).join('\n');
}

function buildSmokeyOperationsBlock(profile: OrgProfile): string {
  const ops = profile.operations;
  if (!ops) return '';
  const lines: string[] = [];
  if (ops.heroProducts?.length) lines.push(formatHeroProducts(ops.heroProducts, 5));
  if (ops.inventoryStrategy) {
    const inv = ops.inventoryStrategy;
    const parts: string[] = [];
    if (inv.lowStockAlertThreshold) parts.push(`low-stock alert at ${inv.lowStockAlertThreshold} units`);
    if (inv.clearanceThresholdDays) parts.push(`clearance after ${inv.clearanceThresholdDays} days`);
    if (parts.length) lines.push(`\nINVENTORY RULES: ${parts.join('; ')}`);
  }
  if (ops.customerSegments?.length) {
    lines.push('\nCUSTOMER SEGMENTS:\n' + ops.customerSegments.slice(0, 4).map(s => `• ${s.name}: ${s.description}`).join('\n'));
  }
  return lines.join('\n');
}

function buildCraigOperationsBlock(profile: OrgProfile): string {
  const ops = profile.operations;
  if (!ops) return '';
  const lines: string[] = [];
  if (ops.heroProducts?.length) lines.push(formatHeroProducts(ops.heroProducts, 5));
  if (ops.campaignCalendar?.length) {
    const now = new Date().toISOString();
    const upcoming = ops.campaignCalendar
      .filter(c => c.endDate >= now)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 3);
    if (upcoming.length) {
      lines.push('\nCAMPAIGN CALENDAR:\n' + upcoming.map(c => `• ${c.name} (${c.startDate}–${c.endDate}) [${c.channels.join(', ')}] — ${c.theme}`).join('\n'));
    }
  }
  if (ops.blackoutDates?.length) {
    const now = new Date().toISOString();
    const active = ops.blackoutDates.filter(d => d.date >= now);
    if (active.length) lines.push(`\nBLACKOUT DATES: ${active.map(d => `${d.date} (${d.reason})`).join('; ')}`);
  }
  if (ops.channelRules?.length) {
    const enabled = ops.channelRules.filter(r => r.enabled);
    if (enabled.length) {
      lines.push('\nCHANNEL RULES:\n' + enabled.map(r => {
        const parts = [r.channel];
        if (r.frequencyCap) parts.push(`max ${r.frequencyCap}/week`);
        if (r.voiceOverride) parts.push(`voice: ${r.voiceOverride}`);
        return `• ${parts.join(' | ')}`;
      }).join('\n'));
    }
  }
  if (ops.pricingPolicy) {
    const pp = ops.pricingPolicy;
    lines.push(`\nPRICING GUARDRAILS: margin floor ${pp.marginFloorPct}% | max discount ${pp.maxDiscountPct}%`);
  }
  if (ops.contentLibrary?.approvedPhrases?.length) {
    const phrases = ops.contentLibrary.approvedPhrases.slice(0, 2);
    lines.push('\nAPPROVED MESSAGING:\n' + phrases.map(p => `• ${p.category}: ${p.phrases.slice(0, 3).join('; ')}`).join('\n'));
  }
  return lines.join('\n');
}

function buildPopsOperationsBlock(profile: OrgProfile): string {
  const ops = profile.operations;
  if (!ops) return '';
  const lines: string[] = [];
  if (ops.performanceBaselines?.lastUpdated) {
    const pb = ops.performanceBaselines;
    const metrics: string[] = [];
    if (pb.conversionRate !== undefined) metrics.push(`conversion: ${(pb.conversionRate * 100).toFixed(1)}%`);
    if (pb.averageOrderValue !== undefined) metrics.push(`AOV: $${pb.averageOrderValue.toFixed(2)}`);
    if (pb.repeatPurchaseRate !== undefined) metrics.push(`repeat: ${(pb.repeatPurchaseRate * 100).toFixed(1)}%`);
    if (pb.churnRate !== undefined) metrics.push(`churn: ${(pb.churnRate * 100).toFixed(1)}%`);
    if (metrics.length) lines.push(`\nPERFORMANCE BASELINES (as of ${pb.lastUpdated}):\n${metrics.join(' | ')}`);
  }
  if (ops.campaignCalendar?.length) {
    const now = new Date().toISOString();
    const upcoming = ops.campaignCalendar.filter(c => c.endDate >= now).slice(0, 3);
    if (upcoming.length) {
      lines.push('\nUPCOMING CAMPAIGNS (for anomaly baseline):\n' + upcoming.map(c => `• ${c.name} (${c.startDate}–${c.endDate})`).join('\n'));
    }
  }
  return lines.join('\n');
}

/**
 * Smokey — budtender context block.
 * Combines brand voice + recommendation philosophy + upsell + education + business priorities.
 */
export function buildSmokeyContextBlock(profile: OrgProfile): string {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const sc = profile.intent.agentConfigs.smokey;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;

  return `
=== ${profile.brand.name || 'ORGANIZATION'} — BUDTENDER CONTEXT ===
${buildBrandHeader(profile)}
${buildVoiceGuidance(profile)}

RECOMMENDATION APPROACH:
Philosophy: ${sc.recommendationPhilosophy} — ${PHILOSOPHY_DESCRIPTIONS[sc.recommendationPhilosophy] ?? ''}
Education depth: ${sc.productEducationDepth} — ${DEPTH_DESCRIPTIONS[sc.productEducationDepth] ?? ''}
New customers: ${sc.newUserProtocol} — ${PROTOCOL_DESCRIPTIONS[sc.newUserProtocol] ?? ''}
Upselling: ${getUpsellLabel(sc.upsellAggressiveness)}

BUSINESS CONTEXT:
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}
${buildObjectivesBlock(profile)}

BEHAVIORAL GUIDELINES:
Customer Focus: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
Voice Formality: ${getFormalityDescription(vh.brandVoiceFormality)}
Compliance: ${getComplianceDescription(vh.complianceConservatism)}
${buildHardBoundaries(profile)}
${buildSmokeyOperationsBlock(profile)}
=== END BUDTENDER CONTEXT ===`.trim();
}

/**
 * Craig — marketer/campaign context block.
 * Combines brand positioning, messaging, compliance, tone archetype, campaign strategy.
 */
export function buildCraigContextBlock(profile: OrgProfile): string {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const cc = profile.intent.agentConfigs.craig;
  const b = profile.brand;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;

  const messagingLines: string[] = [];
  if (b.messaging.tagline) messagingLines.push(`Tagline: "${b.messaging.tagline}"`);
  if (b.messaging.positioning) messagingLines.push(`Positioning: ${b.messaging.positioning}`);
  if (b.messaging.keyMessages?.length) messagingLines.push(`Key messages: ${b.messaging.keyMessages.slice(0, 2).join('; ')}`);

  const complianceLines: string[] = [];
  if (b.compliance.ageDisclaimer) complianceLines.push(`Age disclaimer required: "${b.compliance.ageDisclaimer}"`);
  if (b.compliance.restrictions?.length) complianceLines.push(`Content restrictions: ${b.compliance.restrictions.slice(0, 3).join(', ')}`);
  if (b.compliance.medicalClaimsGuidance) complianceLines.push(`Medical claims: ${b.compliance.medicalClaimsGuidance}`);

  return `
=== ${b.name || 'DISPENSARY'} — CAMPAIGN CONTEXT ===
${buildBrandHeader(profile)}
${buildVoiceGuidance(profile)}
${messagingLines.length ? '\nMESSAGING:\n' + messagingLines.join('\n') : ''}
${complianceLines.length ? '\nCOMPLIANCE REQUIREMENTS:\n' + complianceLines.join('\n') : ''}

CAMPAIGN STRATEGY:
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}
Tone: ${cc.toneArchetype} | Strategy: ${cc.promotionStrategy}
Channels (preferred order): ${cc.preferredChannels.join(' > ')}
Frequency cap: max ${cc.campaignFrequencyCap} campaign(s)/week per customer

BUSINESS PRIORITIES:
${buildObjectivesBlock(profile)}

BEHAVIORAL GUIDELINES:
Customer Focus: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
Compliance Stance: ${getComplianceDescription(vh.complianceConservatism)}
${buildHardBoundaries(profile)}
${buildCraigOperationsBlock(profile)}
=== END CAMPAIGN CONTEXT ===`.trim();
}

/**
 * Pops — analytics context block.
 * Focuses on business priorities, revenue strategy, customer strategy.
 */
export function buildPopsContextBlock(profile: OrgProfile): string {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;

  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ''}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

ANALYTICS PRIORITIES:
${buildObjectivesBlock(profile)}

BUSINESS FOCUS:
Customer Strategy: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
Revenue Strategy: ${getVolumeMarginDescription(vh.volumeVsMargin)}

Frame all reports and recommendations around these priorities. Highlight metrics most relevant to the current growth stage.
${buildPopsOperationsBlock(profile)}
=== END INTENT PROFILE ===`.trim();
}

/**
 * Ezal — competitive intelligence context block.
 * Focuses on competitive posture, top goals, compliance stance.
 */
export function buildEzalContextBlock(profile: OrgProfile): string {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;

  const topObjectives = [...(sf.weightedObjectives ?? [])]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map(o => `• ${OBJECTIVE_LABELS[o.objective] ?? o.objective}`)
    .join('\n');

  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ''}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

COMPETITIVE STANCE: ${getPostureDescription(sf.competitivePosture)}
COMPLIANCE POSTURE: ${getComplianceDescription(vh.complianceConservatism)}

TOP BUSINESS GOALS:
${topObjectives}

When analyzing competitors, focus on gaps relevant to these goals and this competitive stance.
=== END INTENT PROFILE ===`.trim();
}

/**
 * MoneyMike — financial context block.
 * Focuses on pricing philosophy, financial priorities, margin strategy.
 */
export function buildMoneyMikeContextBlock(profile: OrgProfile): string {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;

  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ''}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

FINANCIAL PRIORITIES:
${buildObjectivesBlock(profile)}

PRICING PHILOSOPHY: ${getVolumeMarginDescription(vh.volumeVsMargin)}
COMPLIANCE POSTURE: ${getComplianceDescription(vh.complianceConservatism)}

All pricing recommendations, bundle structures, and margin analyses should align with these priorities.
=== END INTENT PROFILE ===`.trim();
}

/**
 * MrsParker — retention/engagement context block.
 * Focuses on retention priorities, engagement style, voice, customer strategy.
 */
export function buildMrsParkerContextBlock(profile: OrgProfile): string {
  const sf = profile.intent.strategicFoundation;
  const vh = profile.intent.valueHierarchies;
  const archetypeLabel = ARCHETYPE_LABELS[sf.archetype] ?? sf.archetype;

  return `
=== ORGANIZATION INTENT PROFILE ===
${profile.brand.name ? `Organization: ${profile.brand.name}` : ''}
Archetype: ${archetypeLabel} | Stage: ${sf.growthStage}

RETENTION PRIORITIES:
${buildObjectivesBlock(profile)}

CUSTOMER STRATEGY: ${getAcquisitionRetentionDescription(vh.acquisitionVsRetention)}
ENGAGEMENT STYLE: ${getAutomationDescription(vh.automationVsHumanTouch)}
VOICE: ${getFormalityDescription(vh.brandVoiceFormality)}

Personalize all retention campaigns and re-engagement messages to match these priorities and voice.
=== END INTENT PROFILE ===`.trim();
}
