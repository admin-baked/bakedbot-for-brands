export type ActorOrgContext = {
  uid?: string | null;
  role?: string | null;
  currentOrgId?: string | null;
  orgId?: string | null;
  brandId?: string | null;
  locationId?: string | null;
};

function normalizeOrgCandidate(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('/')) return null;

  return trimmed;
}

export function isSuperRole(role: unknown): boolean {
  return role === 'super_user' || role === 'super_admin';
}

export function getActorOrgId(
  actor: ActorOrgContext,
  options?: {
    includeLocationId?: boolean;
    fallbackToUid?: boolean;
  },
): string | null {
  const candidates: unknown[] = [
    actor.currentOrgId,
    actor.orgId,
    actor.brandId,
  ];

  if (options?.includeLocationId) {
    candidates.push(actor.locationId);
  }

  if (options?.fallbackToUid) {
    candidates.push(actor.uid);
  }

  for (const candidate of candidates) {
    const normalized = normalizeOrgCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}
