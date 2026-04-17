export interface CatalogAnalyticsScope {
  tenantIds: string[];
  rootProductQueryIds: {
    orgId: string[];
    dispensaryId: string[];
    brandId: string[];
  };
}

export function normalizeCandidate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function addCandidate(target: Set<string>, value: unknown) {
  const normalized = normalizeCandidate(value);
  if (normalized) {
    target.add(normalized);
  }
}

export async function resolveCatalogAnalyticsScope(
  db: FirebaseFirestore.Firestore,
  orgId: string,
): Promise<CatalogAnalyticsScope> {
  const tenantIds = new Set<string>([orgId]);
  const rootProductQueryIds = {
    orgId: new Set<string>([orgId]),
    dispensaryId: new Set<string>([orgId]),
    brandId: new Set<string>(),
  };

  const [tenantSnap, tenantAliasSnap] = await Promise.all([
    db.collection('tenants').doc(orgId).get().catch(() => null),
    db.collection('tenants').where('orgId', '==', orgId).limit(5).get().catch(() => null),
  ]);

  if (tenantSnap?.exists) {
    const tenantData = tenantSnap.data() ?? {};
    addCandidate(tenantIds, tenantData.brandId);
    addCandidate(rootProductQueryIds.brandId, tenantData.brandId);
  }

  for (const doc of tenantAliasSnap?.docs ?? []) {
    const tenantData = doc.data() ?? {};
    addCandidate(tenantIds, doc.id);
    addCandidate(tenantIds, tenantData.brandId);
    addCandidate(rootProductQueryIds.brandId, tenantData.brandId);
  }

  const brandIds = Array.from(rootProductQueryIds.brandId);
  const [brandDocs, brandByOrgSnap] = await Promise.all([
    Promise.all(
      brandIds.map((brandId) => db.collection('brands').doc(brandId).get().catch(() => null)),
    ),
    db.collection('brands').where('orgId', '==', orgId).limit(5).get().catch(() => null),
  ]);

  for (const brandSnap of brandDocs) {
    if (!brandSnap?.exists) continue;
    const brandData = brandSnap.data() ?? {};
    addCandidate(tenantIds, brandSnap.id);
    addCandidate(tenantIds, brandData.slug);
    addCandidate(rootProductQueryIds.brandId, brandSnap.id);
  }

  for (const brandSnap of brandByOrgSnap?.docs ?? []) {
    const brandData = brandSnap.data() ?? {};
    addCandidate(tenantIds, brandSnap.id);
    addCandidate(tenantIds, brandData.slug);
    addCandidate(rootProductQueryIds.brandId, brandSnap.id);
  }

  return {
    tenantIds: Array.from(tenantIds),
    rootProductQueryIds: {
      orgId: Array.from(rootProductQueryIds.orgId),
      dispensaryId: Array.from(rootProductQueryIds.dispensaryId),
      brandId: Array.from(rootProductQueryIds.brandId),
    },
  };
}
