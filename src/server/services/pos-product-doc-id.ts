import { createHash } from 'crypto';

/**
 * Tenant POS product docs use deterministic IDs so sync, analytics, and
 * downstream enrichers can address the same product record by external POS ID.
 */
export function buildTenantPosProductDocId(orgId: string, externalProductId: string): string {
  return `prod_${createHash('sha256').update(`${orgId.trim()}:${externalProductId.trim()}`).digest('hex').slice(0, 20)}`;
}
