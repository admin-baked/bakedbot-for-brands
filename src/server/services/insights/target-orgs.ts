import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export type InsightTargetOrgType = 'dispensary' | 'brand' | 'grower';

export interface InsightTargetOrg {
  orgId: string;
  orgType: InsightTargetOrgType;
  source: 'tenant' | 'user_fallback';
  userId?: string;
}

export interface InsightFallbackUserRecord {
  id: string;
  role?: string | null;
  orgId?: string | null;
  currentOrgId?: string | null;
  organizationIds?: unknown;
  orgMemberships?: Record<string, { orgType?: string | null; type?: string | null } | null> | null;
}

const USER_FALLBACK_ROLES = [
  'super_user',
  'brand_admin',
  'brand_member',
  'brand',
  'dispensary_admin',
  'dispensary_staff',
  'dispensary',
  'budtender',
  'grower',
] as const;

const BRAND_ROLES = new Set(['brand_admin', 'brand_member', 'brand']);
const DISPENSARY_ROLES = new Set([
  'dispensary_admin',
  'dispensary_staff',
  'dispensary',
  'budtender',
]);

function normalizeInsightTargetOrgType(value: unknown): InsightTargetOrgType | null {
  if (value === 'dispensary' || value === 'brand' || value === 'grower') {
    return value;
  }

  return null;
}

export function extractUserScopedOrgIds(user: InsightFallbackUserRecord): string[] {
  const orgIds = new Set<string>();

  if (typeof user.currentOrgId === 'string' && user.currentOrgId) {
    orgIds.add(user.currentOrgId);
  }

  if (typeof user.orgId === 'string' && user.orgId) {
    orgIds.add(user.orgId);
  }

  if (Array.isArray(user.organizationIds)) {
    for (const orgId of user.organizationIds) {
      if (typeof orgId === 'string' && orgId) {
        orgIds.add(orgId);
      }
    }
  }

  if (user.orgMemberships && typeof user.orgMemberships === 'object') {
    for (const orgId of Object.keys(user.orgMemberships)) {
      if (orgId) {
        orgIds.add(orgId);
      }
    }
  }

  return Array.from(orgIds);
}

export function inferInsightTargetOrgType(
  user: InsightFallbackUserRecord,
  orgId: string
): InsightTargetOrgType | null {
  const membershipType = normalizeInsightTargetOrgType(
    user.orgMemberships?.[orgId]?.orgType ?? user.orgMemberships?.[orgId]?.type
  );

  if (membershipType) {
    return membershipType;
  }

  if (user.role === 'grower') {
    return 'grower';
  }

  if (user.role && BRAND_ROLES.has(user.role)) {
    return 'brand';
  }

  if (user.role && DISPENSARY_ROLES.has(user.role)) {
    return 'dispensary';
  }

  return null;
}

export function collectUserFallbackInsightTargets(
  users: InsightFallbackUserRecord[],
  existingOrgIds: Iterable<string>,
  requestedOrgTypes: readonly InsightTargetOrgType[]
): InsightTargetOrg[] {
  const foundOrgIds = new Set(existingOrgIds);
  const requestedTypes = new Set(requestedOrgTypes);
  const fallbackTargets = new Map<string, InsightTargetOrg>();

  for (const user of users) {
    for (const orgId of extractUserScopedOrgIds(user)) {
      if (foundOrgIds.has(orgId) || fallbackTargets.has(orgId)) {
        continue;
      }

      const orgType = inferInsightTargetOrgType(user, orgId);
      if (!orgType || !requestedTypes.has(orgType)) {
        continue;
      }

      fallbackTargets.set(orgId, {
        orgId,
        orgType,
        source: 'user_fallback',
        userId: user.id,
      });
    }
  }

  return Array.from(fallbackTargets.values()).sort((left, right) =>
    left.orgId.localeCompare(right.orgId)
  );
}

export async function getInsightTargetOrgs(
  requestedOrgTypes: readonly InsightTargetOrgType[]
): Promise<InsightTargetOrg[]> {
  if (requestedOrgTypes.length === 0) {
    return [];
  }

  const db = getAdminFirestore();
  const targetTypes = new Set(requestedOrgTypes);
  const orgTargets = new Map<string, InsightTargetOrg>();

  const tenantsQuery =
    requestedOrgTypes.length === 1
      ? db.collection('tenants').where('type', '==', requestedOrgTypes[0])
      : db.collection('tenants').where('type', 'in', [...requestedOrgTypes]);

  const tenantsSnapshot = await tenantsQuery.get();
  for (const doc of tenantsSnapshot.docs) {
    const orgType = normalizeInsightTargetOrgType(doc.data()?.type);
    if (!orgType || !targetTypes.has(orgType)) {
      continue;
    }

    orgTargets.set(doc.id, {
      orgId: doc.id,
      orgType,
      source: 'tenant',
    });
  }

  const usersSnapshot = await db
    .collection('users')
    .where('role', 'in', [...USER_FALLBACK_ROLES])
    .get();

  const users: InsightFallbackUserRecord[] = usersSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<InsightFallbackUserRecord, 'id'>),
  }));

  const fallbackTargets = collectUserFallbackInsightTargets(
    users,
    orgTargets.keys(),
    requestedOrgTypes
  );

  for (const target of fallbackTargets) {
    orgTargets.set(target.orgId, target);
  }

  logger.info('[Insights] Resolved target orgs', {
    requestedOrgTypes: [...targetTypes].sort(),
    tenantMatches: tenantsSnapshot.size,
    userFallbackMatches: fallbackTargets.length,
    totalTargets: orgTargets.size,
  });

  if (fallbackTargets.length > 0) {
    logger.info('[Insights] Added orgs from users fallback', {
      orgIds: fallbackTargets.map((target) => target.orgId).slice(0, 25),
      count: fallbackTargets.length,
    });
  }

  return Array.from(orgTargets.values()).sort((left, right) =>
    left.orgId.localeCompare(right.orgId)
  );
}
