/**
 * Skill Registry Service
 *
 * Resolves which skill and agent handle a given signal for a given org.
 * Reads from a Firestore-backed registry (`skill_registry/{skillName}`)
 * seeded from SKILL.md metadata via `seedSkillRegistry()`.
 *
 * This avoids fs.readFile in serverless edge functions and allows
 * per-org skill overrides in the future.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type { SkillSignal } from '@/types/skill-signal';
import type { ApprovalPosture, SkillArtifactType } from '@/types/skill-artifact';

// ============ Registry entry ============

export interface SkillRegistryEntry {
    skillName: string;
    agentOwner: string;             // e.g., 'craig', 'ezal', 'pops'
    approvalPosture: ApprovalPosture;
    riskLevel: 'low' | 'medium' | 'high';
    artifactType: SkillArtifactType;
    orgTypes: string[];             // e.g., ['dispensary', 'brand', 'grower']
    triggerKeywords: string[];      // Matched against user_intent signals
    downstreamConsumers: string[];
    version: string;
    status: 'active' | 'draft' | 'deprecated';
    seededAt?: Timestamp;
}

// ============ Static registry seed data ============
// Authoritative source: SKILL.md frontmatter in /skills/ and /.claude/commands/

const SKILL_SEED_DATA: SkillRegistryEntry[] = [
    {
        skillName: 'craig-campaign',
        agentOwner: 'craig',
        approvalPosture: 'draft_only',
        riskLevel: 'high',
        artifactType: 'campaign_draft_bundle',
        orgTypes: ['dispensary', 'brand'],
        triggerKeywords: ['create a campaign', 'write campaign copy', 'sms blast', 'email promotion', 'win back customers', 'birthday campaign'],
        downstreamConsumers: ['deebo', 'mailjet', 'blackleaf'],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'competitive-intel',
        agentOwner: 'ezal',
        approvalPosture: 'recommend_only',
        riskLevel: 'medium',
        artifactType: 'competitor_watch_report',
        orgTypes: ['dispensary', 'brand'],
        triggerKeywords: ['competitive landscape', 'threat assessment', 'pricing analysis', 'competitive intelligence', 'market intel', 'weekly intel report'],
        downstreamConsumers: ['craig'],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'competitor-promo-watch',
        agentOwner: 'ezal',
        approvalPosture: 'recommend_only',
        riskLevel: 'medium',
        artifactType: 'competitor_promo_watch_report',
        orgTypes: ['dispensary', 'brand'],
        triggerKeywords: ['promo watch', 'active promotions', 'competitor promotion', 'promotion intelligence'],
        downstreamConsumers: ['craig'],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'daily-dispensary-ops-review',
        agentOwner: 'pops',
        approvalPosture: 'inform_only',
        riskLevel: 'low',
        artifactType: 'ops_memo',
        orgTypes: ['dispensary'],
        triggerKeywords: ['morning briefing', 'daily ops', 'how did we do yesterday', 'daily review', 'ops memo'],
        downstreamConsumers: [],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'menu-gap-analysis',
        agentOwner: 'ezal',
        approvalPosture: 'recommend_only',
        riskLevel: 'medium',
        artifactType: 'menu_gap_analysis',
        orgTypes: ['dispensary'],
        triggerKeywords: ['menu gaps', 'missing products', 'what should we carry', 'product gaps'],
        downstreamConsumers: [],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'low-performing-promo-diagnosis',
        agentOwner: 'craig',
        approvalPosture: 'inform_only',
        riskLevel: 'low',
        artifactType: 'diagnosis_report',
        orgTypes: ['dispensary'],
        triggerKeywords: ['why is my promo not working', 'campaign underperforming', 'promo diagnosis', 'low redemption'],
        downstreamConsumers: ['craig'],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'loyalty-reengagement-opportunity-review',
        agentOwner: 'mrs_parker',
        approvalPosture: 'recommend_only',
        riskLevel: 'medium',
        artifactType: 'campaign_brief',
        orgTypes: ['dispensary'],
        triggerKeywords: ['loyalty reengagement', 'lapsed customers', 'win back loyalty', 'loyalty campaign', 'churn risk'],
        downstreamConsumers: ['craig'],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'retail-account-opportunity-review',
        agentOwner: 'craig',
        approvalPosture: 'recommend_only',
        riskLevel: 'medium',
        artifactType: 'account_tier_review',
        orgTypes: ['brand'],
        triggerKeywords: ['retail accounts', 'account tiers', 'which stores to prioritize', 'account review'],
        downstreamConsumers: [],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'inventory-aging-risk-review',
        agentOwner: 'pops',
        approvalPosture: 'recommend_only',
        riskLevel: 'high',
        artifactType: 'aging_risk_report',
        orgTypes: ['grower', 'dispensary'],
        triggerKeywords: ['aging inventory', 'old stock', 'inventory risk', 'expiring product', 'flower aging'],
        downstreamConsumers: [],
        version: '0.1.0',
        status: 'active',
    },
    {
        skillName: 'sell-through-partner-analysis',
        agentOwner: 'pops',
        approvalPosture: 'recommend_only',
        riskLevel: 'medium',
        artifactType: 'partner_velocity_report',
        orgTypes: ['grower', 'brand'],
        triggerKeywords: ['partner velocity', 'sell-through rate', 'which partners are performing', 'partner analysis'],
        downstreamConsumers: [],
        version: '0.1.0',
        status: 'active',
    },
];

// ============ Registry operations ============

/** Seed all skill metadata into Firestore. Run once on deploy or schema change. */
export async function seedSkillRegistry(): Promise<void> {
    const db = getAdminFirestore();
    const batch = db.batch();
    const now = Timestamp.now();

    for (const entry of SKILL_SEED_DATA) {
        const ref = db.collection('skill_registry').doc(entry.skillName);
        batch.set(ref, { ...entry, seededAt: now }, { merge: true });
    }

    await batch.commit();
    logger.info('[skill-registry] seeded', { count: SKILL_SEED_DATA.length });
}

/** Fetch a single registry entry by skill name. Falls back to static seed if Firestore is cold. */
export async function getSkillRegistryEntry(skillName: string): Promise<SkillRegistryEntry | null> {
    try {
        const doc = await getAdminFirestore().collection('skill_registry').doc(skillName).get();
        if (doc.exists) return doc.data() as SkillRegistryEntry;
    } catch (err) {
        logger.warn('[skill-registry] Firestore miss, falling back to static seed', { skillName, err });
    }
    return SKILL_SEED_DATA.find(e => e.skillName === skillName) ?? null;
}

/** Resolve which skill handles a given signal. Returns null if no match. */
export async function resolveSkill(signal: SkillSignal, orgType?: string): Promise<SkillRegistryEntry | null> {
    // Explicit targetSkill on the signal takes priority
    const targetSkill = 'targetSkill' in signal ? signal.targetSkill : null;
    if (targetSkill) return getSkillRegistryEntry(targetSkill);

    // user_intent: match by keyword
    if (signal.kind === 'user_intent' && signal.userMessage) {
        return matchByKeyword(signal.userMessage, orgType);
    }

    return null;
}

/** List all active skills for a given org type. */
export async function listSkillsForOrg(orgType: string): Promise<SkillRegistryEntry[]> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const snap = await (getAdminFirestore().collection('skill_registry') as any)
            .where('status', '==', 'active')
            .get();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const all = snap.docs.map((d: any) => d.data() as SkillRegistryEntry);
        return all.filter((e: SkillRegistryEntry) => e.orgTypes.includes(orgType));
    } catch {
        return SKILL_SEED_DATA.filter(e => e.status === 'active' && e.orgTypes.includes(orgType));
    }
}

// ============ Internal helpers ============

function matchByKeyword(userMessage: string, orgType?: string): SkillRegistryEntry | null {
    const lower = userMessage.toLowerCase();
    const candidates = orgType
        ? SKILL_SEED_DATA.filter(e => e.status === 'active' && e.orgTypes.includes(orgType))
        : SKILL_SEED_DATA.filter(e => e.status === 'active');

    for (const entry of candidates) {
        if (entry.triggerKeywords.some(kw => lower.includes(kw.toLowerCase()))) {
            return entry;
        }
    }
    return null;
}
