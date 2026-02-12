/**
 * Helpers for handling org/brand/dispensary ID aliases.
 */

function sanitizeOrgId(value: string): string {
  return value.trim();
}

/**
 * Build common aliases for an org identifier.
 *
 * Examples:
 * - org_thrive_syracuse -> [org_thrive_syracuse, thrive_syracuse, brand_thrive_syracuse, dispensary_thrive_syracuse]
 * - thrive_syracuse -> [thrive_syracuse, org_thrive_syracuse, brand_thrive_syracuse, dispensary_thrive_syracuse]
 */
export function buildOrgIdCandidates(orgId: string): string[] {
  const normalized = sanitizeOrgId(orgId);
  if (!normalized) {
    return [];
  }

  const candidates = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (!value) {
      return;
    }

    const cleaned = sanitizeOrgId(value);
    if (cleaned) {
      candidates.add(cleaned);
    }
  };

  add(normalized);

  const base = normalized.replace(/^(org_|brand_|dispensary_)/, '');
  add(base);

  if (base) {
    add(`org_${base}`);
    add(`brand_${base}`);
    add(`dispensary_${base}`);
  }

  return Array.from(candidates);
}

/**
 * Expand many candidate values into a deduped set.
 */
export function collectOrgCandidates(
  values: Array<string | null | undefined>
): Set<string> {
  const candidates = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    for (const candidate of buildOrgIdCandidates(value)) {
      candidates.add(candidate);
    }
  }

  return candidates;
}

/**
 * True when there is at least one shared org candidate.
 */
export function hasOrgCandidateIntersection(
  left: Iterable<string>,
  right: Iterable<string>
): boolean {
  const rightSet = new Set(right);

  for (const candidate of left) {
    if (rightSet.has(candidate)) {
      return true;
    }
  }

  return false;
}
