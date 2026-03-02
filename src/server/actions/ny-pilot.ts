'use server';

/**
 * NY10 Pilot Command Center — Server Actions
 *
 * Cross-org data aggregation for managing the NY Founding Partner Program.
 * All actions gated by requireUser(['super_user']).
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { PROMO_CODES } from '@/config/promos';
import { PLAYBOOKS, getPlaybookIdsForTier } from '@/config/playbooks';
import type { TierId } from '@/config/tiers';
import {
  getDispensaryPlaybookAssignments,
  toggleDispensaryPlaybookAssignment,
  updatePlaybookAssignmentConfig,
  type PlaybookCustomConfig,
} from './dispensary-playbooks';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NY10Org {
  orgId: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  planId: string;
  posProvider: string | null;
  posConnected: boolean;
  signedUpAt: string | null;
  status: 'invited' | 'signed-up' | 'onboarded' | 'active';
  daysActive: number;
  activePromo: {
    code: string;
    currentPhase: number;
    activatedAt: string | null;
    discountPercent: number;
  } | null;
  customerCount: number;
}

export interface NY10KPIs {
  totalOrgs: number;
  activeOrgs: number;
  avgDaysActive: number;
  combinedMrr: number;
  orgs: Array<{
    orgId: string;
    name: string;
    playbooks: { active: number; paused: number; total: number };
    campaigns: { sent: number; scheduled: number; draft: number };
    customers: { total: number };
    revenue: { mrr: number };
  }>;
}

export interface NY10PlaybookRow {
  playbookId: string;
  name: string;
  agent: string;
  orgStatuses: Record<string, 'active' | 'paused' | 'unassigned'>;
}

export interface NY10CampaignItem {
  id: string;
  orgId: string;
  orgName: string;
  name: string;
  status: string;
  channels: string[];
  goal: string;
  createdAt: string | null;
  performance: {
    sent?: number;
    opened?: number;
    clicked?: number;
  };
}

export interface NY10PromoStatus {
  nyfp: {
    totalRedemptions: number;
    maxRedemptions: number;
    orgs: Array<{
      orgId: string;
      name: string;
      currentPhase: number;
      discountPercent: number;
      activatedAt: string | null;
      daysUntilNextPhase: number | null;
    }>;
  };
  alleaves: {
    totalRedemptions: number;
    orgs: Array<{
      orgId: string;
      name: string;
      activatedAt: string | null;
    }>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve current discount % for a graduated promo */
function resolvePromoPhase(activatedAt: Date | null): { phase: number; discount: number; daysUntilNext: number | null } {
  if (!activatedAt) return { phase: 0, discount: 50, daysUntilNext: null };

  const phases = PROMO_CODES.NYFOUNDINGPARTNER.phases;
  const daysSinceActivation = Math.floor((Date.now() - activatedAt.getTime()) / (1000 * 60 * 60 * 24));

  let cumDays = 0;
  for (let i = 0; i < phases.length; i++) {
    cumDays += phases[i].durationDays;
    if (daysSinceActivation < cumDays) {
      const daysUntilNext = cumDays - daysSinceActivation;
      return { phase: i + 1, discount: phases[i].discountPercent, daysUntilNext };
    }
  }

  // Past all phases — full price
  return { phase: phases.length + 1, discount: 0, daysUntilNext: null };
}

function inferOrgStatus(org: Record<string, unknown>): NY10Org['status'] {
  // Has active playbooks or campaigns → active
  if (org.hasActivePlaybooks) return 'active';
  // Has POS connected or brand guide → onboarded
  if (org.posConnected || org.brandGuideCreated) return 'onboarded';
  // Has a user account → signed-up
  if (org.hasUser) return 'signed-up';
  return 'invited';
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * 1. Get all NY Founding Partner orgs
 */
export async function getNY10PilotOrgs(): Promise<NY10Org[]> {
  await requireUser(['super_user']);
  const db = getAdminFirestore();

  try {
    // Query all NY organizations
    const orgsSnap = await db
      .collection('organizations')
      .where('state', '==', 'NY')
      .get();

    const orgs: NY10Org[] = [];

    for (const doc of orgsSnap.docs) {
      const data = doc.data();
      const orgId = doc.id;

      // Include orgs with NYFOUNDINGPARTNER promo or tagged as ny-founding-partner
      const hasPromo = data.activePromo?.code === 'NYFOUNDINGPARTNER';
      const hasTag = Array.isArray(data.tags) && data.tags.includes('ny-founding-partner');
      // Also include Thrive (our existing pilot)
      const isThrive = orgId === 'org_thrive_syracuse';

      if (!hasPromo && !hasTag && !isThrive) continue;

      const signedUpAt = data.createdAt?.toDate?.() || null;
      const daysActive = signedUpAt
        ? Math.floor((Date.now() - signedUpAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Resolve promo phase
      let activePromo: NY10Org['activePromo'] = null;
      if (data.activePromo?.code === 'NYFOUNDINGPARTNER') {
        const activatedAt = data.activePromo.activatedAt?.toDate?.() || null;
        const { phase, discount } = resolvePromoPhase(activatedAt);
        activePromo = {
          code: 'NYFOUNDINGPARTNER',
          currentPhase: phase,
          activatedAt: activatedAt?.toISOString() || null,
          discountPercent: discount,
        };
      }

      // Get customer count
      let customerCount = 0;
      try {
        const custSnap = await db
          .collection('customers')
          .where('orgId', '==', orgId)
          .count()
          .get();
        customerCount = custSnap.data().count;
      } catch {
        // Non-fatal
      }

      // Check if org has active playbooks
      let hasActivePlaybooks = false;
      try {
        const pbSnap = await db
          .collection('playbook_assignments')
          .where('orgId', '==', orgId)
          .where('status', '==', 'active')
          .limit(1)
          .get();
        hasActivePlaybooks = !pbSnap.empty;
      } catch {
        // Non-fatal
      }

      // Check if org has a user
      let hasUser = false;
      try {
        const userSnap = await db
          .collection('users')
          .where('orgId', '==', orgId)
          .limit(1)
          .get();
        hasUser = !userSnap.empty;
      } catch {
        // Non-fatal
      }

      orgs.push({
        orgId,
        name: (data.name as string) || orgId,
        slug: (data.slug as string) || '',
        city: (data.city as string) || '',
        state: 'NY',
        planId: (data.planId as string) || 'scout',
        posProvider: (data.posProvider as string) || null,
        posConnected: Boolean(data.posConnected),
        signedUpAt: signedUpAt?.toISOString() || null,
        status: inferOrgStatus({
          hasActivePlaybooks,
          posConnected: data.posConnected,
          brandGuideCreated: data.brandGuideCreated,
          hasUser,
        }),
        daysActive,
        activePromo,
        customerCount,
      });
    }

    return orgs;
  } catch (error) {
    logger.error(`[NY10] Failed to fetch pilot orgs: ${String(error)}`);
    return [];
  }
}

/**
 * 2. Get aggregated KPIs across all NY10 orgs
 */
export async function getNY10KPIs(): Promise<NY10KPIs> {
  await requireUser(['super_user']);
  const db = getAdminFirestore();

  try {
    const pilotOrgs = await getNY10PilotOrgs();
    const orgKpis = [];
    let combinedMrr = 0;

    for (const org of pilotOrgs) {
      // Playbook counts
      let playbooks = { active: 0, paused: 0, total: 0 };
      try {
        const pbData = await getDispensaryPlaybookAssignments(org.orgId);
        playbooks = {
          active: pbData.totalActive,
          paused: pbData.assignments.filter(a => a.status === 'paused').length,
          total: pbData.assignments.length,
        };
      } catch {
        // Non-fatal
      }

      // Campaign counts
      let campaigns = { sent: 0, scheduled: 0, draft: 0 };
      try {
        const campSnap = await db
          .collection('campaigns')
          .where('orgId', '==', org.orgId)
          .get();
        for (const doc of campSnap.docs) {
          const status = doc.data().status as string;
          if (status === 'sent' || status === 'completed') campaigns.sent++;
          else if (status === 'scheduled') campaigns.scheduled++;
          else if (status === 'draft') campaigns.draft++;
        }
      } catch {
        // Non-fatal
      }

      // MRR from subscriptions
      let mrr = 0;
      try {
        const subSnap = await db
          .collection('organizations')
          .doc(org.orgId)
          .collection('subscription')
          .where('status', 'in', ['active', 'trialing', 'past_due'])
          .limit(1)
          .get();
        if (!subSnap.empty) {
          mrr = (subSnap.docs[0].data().amount as number) || 0;
        }
      } catch {
        // Non-fatal
      }
      combinedMrr += mrr;

      orgKpis.push({
        orgId: org.orgId,
        name: org.name,
        playbooks,
        campaigns,
        customers: { total: org.customerCount },
        revenue: { mrr },
      });
    }

    const activeOrgs = pilotOrgs.filter(o => o.status === 'active').length;
    const avgDays = pilotOrgs.length > 0
      ? Math.round(pilotOrgs.reduce((sum, o) => sum + o.daysActive, 0) / pilotOrgs.length)
      : 0;

    return {
      totalOrgs: pilotOrgs.length,
      activeOrgs,
      avgDaysActive: avgDays,
      combinedMrr,
      orgs: orgKpis,
    };
  } catch (error) {
    logger.error(`[NY10] Failed to fetch KPIs: ${String(error)}`);
    return { totalOrgs: 0, activeOrgs: 0, avgDaysActive: 0, combinedMrr: 0, orgs: [] };
  }
}

/**
 * 3. Get cross-org playbook status matrix
 */
export async function getNY10PlaybookSummary(): Promise<NY10PlaybookRow[]> {
  await requireUser(['super_user']);

  try {
    const pilotOrgs = await getNY10PilotOrgs();

    // Get all playbook definitions
    const allPlaybooks = Object.values(PLAYBOOKS);

    // Get assignments for each org in parallel
    const assignmentsByOrg = await Promise.all(
      pilotOrgs.map(async (org) => {
        try {
          const data = await getDispensaryPlaybookAssignments(org.orgId);
          return { orgId: org.orgId, assignments: data.assignments };
        } catch {
          return { orgId: org.orgId, assignments: [] };
        }
      })
    );

    // Build assignment lookup: orgId -> playbookId -> status
    const lookupMap = new Map<string, Map<string, 'active' | 'paused'>>();
    for (const { orgId, assignments } of assignmentsByOrg) {
      const pbMap = new Map<string, 'active' | 'paused'>();
      for (const a of assignments) {
        pbMap.set(a.playbookId, a.status === 'active' ? 'active' : 'paused');
      }
      lookupMap.set(orgId, pbMap);
    }

    // Build matrix rows
    const rows: NY10PlaybookRow[] = allPlaybooks.map((pb) => {
      const orgStatuses: Record<string, 'active' | 'paused' | 'unassigned'> = {};
      for (const org of pilotOrgs) {
        const pbMap = lookupMap.get(org.orgId);
        orgStatuses[org.orgId] = pbMap?.get(pb.id) || 'unassigned';
      }
      return {
        playbookId: pb.id,
        name: pb.name,
        agent: pb.agent,
        orgStatuses,
      };
    });

    return rows;
  } catch (error) {
    logger.error(`[NY10] Failed to fetch playbook summary: ${String(error)}`);
    return [];
  }
}

/**
 * 4. Batch toggle a playbook across multiple orgs
 */
export async function batchTogglePlaybook(
  playbookId: string,
  active: boolean,
  orgIds?: string[]
): Promise<{ success: number; failed: number }> {
  await requireUser(['super_user']);

  try {
    const pilotOrgs = await getNY10PilotOrgs();
    const targetOrgIds = orgIds || pilotOrgs.map(o => o.orgId);

    let success = 0;
    let failed = 0;

    // Process sequentially to avoid overwhelming Firestore
    for (const orgId of targetOrgIds) {
      try {
        const result = await toggleDispensaryPlaybookAssignment(orgId, playbookId, active);
        if (result.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    logger.info(`[NY10] Batch toggle playbook: ${playbookId} → ${active ? 'active' : 'paused'}`, {
      success,
      failed,
      total: targetOrgIds.length,
    });

    return { success, failed };
  } catch (error) {
    logger.error(`[NY10] Batch toggle failed: ${String(error)}`);
    return { success: 0, failed: 0 };
  }
}

/**
 * 5. Get cross-org campaign summary
 */
export async function getNY10CampaignSummary(): Promise<NY10CampaignItem[]> {
  await requireUser(['super_user']);
  const db = getAdminFirestore();

  try {
    const pilotOrgs = await getNY10PilotOrgs();
    const orgNameMap = new Map(pilotOrgs.map(o => [o.orgId, o.name]));
    const orgIdSet = new Set(pilotOrgs.map(o => o.orgId));

    // Firestore 'in' queries limited to 30 values — fine for 10 orgs
    const orgIdArr = Array.from(orgIdSet);
    if (orgIdArr.length === 0) return [];

    const campSnap = await db
      .collection('campaigns')
      .where('orgId', 'in', orgIdArr)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    return campSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        orgId: (data.orgId as string) || '',
        orgName: orgNameMap.get(data.orgId as string) || 'Unknown',
        name: (data.name as string) || 'Untitled',
        status: (data.status as string) || 'draft',
        channels: (data.channels as string[]) || [],
        goal: (data.goal as string) || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        performance: {
          sent: data.performance?.sent || 0,
          opened: data.performance?.opened || 0,
          clicked: data.performance?.clicked || 0,
        },
      };
    });
  } catch (error) {
    logger.error(`[NY10] Failed to fetch campaign summary: ${String(error)}`);
    return [];
  }
}

/**
 * 6. Batch update playbook schedule/delivery config across orgs
 */
export async function batchUpdatePlaybookConfig(
  playbookId: string,
  config: PlaybookCustomConfig,
  orgIds?: string[]
): Promise<{ success: number; failed: number }> {
  await requireUser(['super_user']);

  try {
    const pilotOrgs = await getNY10PilotOrgs();
    const targetOrgIds = orgIds || pilotOrgs.map(o => o.orgId);

    let success = 0;
    let failed = 0;

    for (const orgId of targetOrgIds) {
      try {
        const result = await updatePlaybookAssignmentConfig(orgId, playbookId, config);
        if (result.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }

    logger.info(`[NY10] Batch update playbook config: ${playbookId}`, {
      success,
      failed,
      total: targetOrgIds.length,
    });

    return { success, failed };
  } catch (error) {
    logger.error(`[NY10] Batch config update failed: ${String(error)}`);
    return { success: 0, failed: 0 };
  }
}

/**
 * 7. Get promo code redemption status
 */
export async function getNY10PromoStatus(): Promise<NY10PromoStatus> {
  await requireUser(['super_user']);
  const db = getAdminFirestore();

  try {
    // NYFOUNDINGPARTNER redemptions
    const nyfpSnap = await db
      .collection('promo_redemptions')
      .where('code', '==', 'NYFOUNDINGPARTNER')
      .get();

    const nyfpOrgs = nyfpSnap.docs.map((doc) => {
      const data = doc.data();
      const activatedAt = data.activatedAt?.toDate?.() || null;
      const { phase, discount, daysUntilNext } = resolvePromoPhase(activatedAt);
      return {
        orgId: (data.orgId as string) || '',
        name: (data.orgName as string) || data.orgId || 'Unknown',
        currentPhase: phase,
        discountPercent: discount,
        activatedAt: activatedAt?.toISOString() || null,
        daysUntilNextPhase: daysUntilNext,
      };
    });

    // ALLEAVES10 redemptions
    const alleSnap = await db
      .collection('promo_redemptions')
      .where('code', '==', 'ALLEAVES10')
      .get();

    const alleOrgs = alleSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        orgId: (data.orgId as string) || '',
        name: (data.orgName as string) || data.orgId || 'Unknown',
        activatedAt: data.activatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    return {
      nyfp: {
        totalRedemptions: nyfpOrgs.length,
        maxRedemptions: PROMO_CODES.NYFOUNDINGPARTNER.maxRedemptions ?? 10,
        orgs: nyfpOrgs,
      },
      alleaves: {
        totalRedemptions: alleOrgs.length,
        orgs: alleOrgs,
      },
    };
  } catch (error) {
    logger.error(`[NY10] Failed to fetch promo status: ${String(error)}`);
    return {
      nyfp: { totalRedemptions: 0, maxRedemptions: 10, orgs: [] },
      alleaves: { totalRedemptions: 0, orgs: [] },
    };
  }
}
