/**
 * Skill Context Assembler
 *
 * Assembles the org context bundle (org profile, recent artifacts, relevant
 * business objects) required to build a skill prompt.
 *
 * Each skill gets a tailored assembler dispatched by skillName.
 * Assemblers call existing services and Firestore — no LLM calls here.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { getSkillArtifacts } from '@/server/services/skill-artifacts';
import type { SkillSignal } from '@/types/skill-signal';
import type { SkillRegistryEntry } from '@/server/services/skill-registry';

// ============ Context bundle ============

export interface SkillContextBundle {
    orgId: string;
    orgProfile?: Record<string, unknown>;
    recentArtifacts?: unknown[];
    businessObjects: Record<string, unknown>;
    assembledAt: string;
}

// ============ Main entry point ============

export async function assembleSkillContext(
    signal: SkillSignal,
    skill: SkillRegistryEntry
): Promise<SkillContextBundle> {
    const orgId = signal.orgId;

    const [orgProfile, recentArtifacts] = await Promise.all([
        fetchOrgProfile(orgId),
        getSkillArtifacts(orgId, { artifactType: skill.artifactType, limit: 5 }),
    ]);

    const businessObjects = await fetchBusinessObjects(signal, skill);

    const bundle: SkillContextBundle = {
        orgId,
        orgProfile: orgProfile ?? undefined,
        recentArtifacts,
        businessObjects,
        assembledAt: new Date().toISOString(),
    };

    logger.info('[skill-context-assembler] assembled', {
        orgId,
        skillName: skill.skillName,
        businessObjectKeys: Object.keys(businessObjects),
    });

    return bundle;
}

// ============ Shared Firestore query helper ============

/** Fetch documents from a collection scoped to an org, returns empty array on error. */
async function queryOrgCollection(
    orgId: string,
    collection: string,
    filters: Array<[string, string, unknown]>,
    limit: number
): Promise<Record<string, unknown>[]> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query: any = getAdminFirestore().collection(collection).where('orgId', '==', orgId);
        for (const [field, op, value] of filters) {
            query = query.where(field, op, value);
        }
        const snap = await query.limit(limit).get();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return snap.docs.map((d: any) => d.data() as Record<string, unknown>);
    } catch {
        return [];
    }
}

// ============ Per-skill business object fetchers ============

async function fetchBusinessObjects(
    signal: SkillSignal,
    skill: SkillRegistryEntry
): Promise<Record<string, unknown>> {
    switch (skill.skillName) {
        case 'daily-dispensary-ops-review':
            return assembleDailyOpsObjects(signal.orgId);
        case 'competitive-intel':
        case 'competitor-promo-watch':
            return assembleCompetitorObjects(signal.orgId);
        case 'loyalty-reengagement-opportunity-review':
            return assembleLoyaltyObjects(signal.orgId);
        case 'menu-gap-analysis':
            return assembleMenuObjects(signal.orgId);
        case 'inventory-aging-risk-review':
            return assembleInventoryObjects(signal.orgId);
        case 'retail-account-opportunity-review':
            return assembleRetailAccountObjects(signal.orgId);
        case 'sell-through-partner-analysis':
            return assemblePartnerObjects(signal.orgId);
        case 'low-performing-promo-diagnosis':
            return assemblePromoDiagnosisObjects(signal);
        case 'craig-campaign':
            return assembleCampaignObjects(signal);
        default:
            return {};
    }
}

async function assembleDailyOpsObjects(orgId: string): Promise<Record<string, unknown>> {
    const [recentOrders, activePromos] = await Promise.all([
        queryOrgCollection(orgId, 'orders', [], 50),
        queryOrgCollection(orgId, 'promotions', [['status', '==', 'active']], 10),
    ]);
    return { recentOrders, activePromos };
}

async function assembleCompetitorObjects(orgId: string): Promise<Record<string, unknown>> {
    return { competitorSnapshots: await queryOrgCollection(orgId, 'competitive_snapshots', [], 3) };
}

async function assembleLoyaltyObjects(orgId: string): Promise<Record<string, unknown>> {
    return { loyaltyCustomers: await queryOrgCollection(orgId, 'customers', [['loyaltyTier', '!=', null]], 200) };
}

async function assembleMenuObjects(orgId: string): Promise<Record<string, unknown>> {
    return { activeProducts: await queryOrgCollection(orgId, 'products', [['active', '==', true]], 100) };
}

async function assembleInventoryObjects(orgId: string): Promise<Record<string, unknown>> {
    return { inventoryBatches: await queryOrgCollection(orgId, 'inventory_batches', [['status', '==', 'active']], 50) };
}

async function assembleRetailAccountObjects(orgId: string): Promise<Record<string, unknown>> {
    return { retailAccounts: await queryOrgCollection(orgId, 'retail_accounts', [], 50) };
}

async function assemblePartnerObjects(orgId: string): Promise<Record<string, unknown>> {
    return { partners: await queryOrgCollection(orgId, 'distribution_partners', [], 30) };
}

async function assemblePromoDiagnosisObjects(signal: SkillSignal): Promise<Record<string, unknown>> {
    const db = getAdminFirestore();
    const intentContext = signal.kind === 'user_intent' ? signal.intentContext : undefined;
    const promoId = intentContext?.promoId as string | undefined;
    if (!promoId) return {};

    const snap = await db.collection('promotions').doc(promoId).get().catch(() => null);
    return { promo: snap?.data() ?? null };
}

async function assembleCampaignObjects(signal: SkillSignal): Promise<Record<string, unknown>> {
    const intentContext = signal.kind === 'user_intent' ? signal.intentContext : undefined;
    const handoffContext = signal.kind === 'agent_handoff' ? signal.handoffContext : undefined;
    return { campaignContext: intentContext ?? handoffContext ?? {} };
}

// ============ Org profile fetcher ============

async function fetchOrgProfile(orgId: string): Promise<Record<string, unknown> | null> {
    const snap = await getAdminFirestore().collection('organizations').doc(orgId).get().catch(() => null);
    return snap?.data() ?? null;
}
