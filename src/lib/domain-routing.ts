/**
 * Domain Routing Utilities
 *
 * Helpers for resolving custom domains to their target content.
 * Used by the domain resolve API and can be called from server-side code.
 */

import { createServerClient } from '@/firebase/server-client';
import { getCachedTenant, setCachedTenant } from '@/lib/domain-cache';
import { logger } from '@/lib/logger';
import type { DomainMapping, DomainTargetType, DomainRoutingConfig } from '@/types/tenant';

export interface ResolvedDomain {
  tenantId: string;
  targetType: DomainTargetType;
  targetId?: string;
  targetName?: string;
  routingConfig?: DomainRoutingConfig;
}

/**
 * Get full domain mapping from Firestore (with tenant cache for fast lookup)
 */
export async function getDomainMapping(hostname: string): Promise<ResolvedDomain | null> {
  const normalized = hostname.toLowerCase();

  try {
    // Check tenant cache for quick existence check
    let tenantId = getCachedTenant(normalized);

    const { firestore } = await createServerClient();

    if (tenantId === undefined) {
      // Not in cache - look up in Firestore
      const mappingDoc = await firestore
        .collection('domain_mappings')
        .doc(normalized)
        .get();

      if (!mappingDoc.exists) {
        setCachedTenant(normalized, null);
        return null;
      }

      const mapping = mappingDoc.data() as DomainMapping;
      tenantId = mapping.tenantId;
      setCachedTenant(normalized, tenantId);

      return {
        tenantId: mapping.tenantId,
        targetType: mapping.targetType || 'menu',
        targetId: mapping.targetId,
        targetName: mapping.targetName,
        routingConfig: mapping.routingConfig,
      };
    }

    if (tenantId === null) {
      return null;
    }

    // Tenant is cached but we need full mapping data
    const mappingDoc = await firestore
      .collection('domain_mappings')
      .doc(normalized)
      .get();

    if (!mappingDoc.exists) {
      return null;
    }

    const mapping = mappingDoc.data() as DomainMapping;
    return {
      tenantId: mapping.tenantId,
      targetType: mapping.targetType || 'menu',
      targetId: mapping.targetId,
      targetName: mapping.targetName,
      routingConfig: mapping.routingConfig,
    };
  } catch (error) {
    logger.error('[DomainRouting] Failed to resolve domain', { hostname: normalized, error });
    return null;
  }
}

/**
 * Resolve a domain + path to the internal rewrite path
 */
export async function resolveRoute(
  hostname: string,
  pathname: string
): Promise<{ path: string; tenantId: string; targetType: DomainTargetType } | null> {
  const mapping = await getDomainMapping(hostname);

  if (!mapping) return null;

  const { tenantId, targetType, targetId, routingConfig } = mapping;

  let resolvedPath: string;

  switch (targetType) {
    case 'vibe_site':
      if (!targetId) return null;
      resolvedPath = `/api/vibe/site/${targetId}${pathname === '/' ? '' : pathname}`;
      break;

    case 'hybrid':
      if (!targetId) return null;
      const menuPath = routingConfig?.menuPath || '/shop';
      if (pathname.startsWith(menuPath)) {
        const strippedPath = pathname.replace(menuPath, '') || '';
        resolvedPath = await buildMenuPath(tenantId, strippedPath);
      } else {
        resolvedPath = `/api/vibe/site/${targetId}`;
      }
      break;

    case 'menu':
    default:
      resolvedPath = await buildMenuPath(tenantId, pathname === '/' ? '' : pathname);
      break;
  }

  return {
    path: resolvedPath,
    tenantId,
    targetType,
  };
}

/**
 * Build the internal path for a menu (brand or dispensary)
 */
async function buildMenuPath(tenantId: string, suffix: string): Promise<string> {
  try {
    const { firestore } = await createServerClient();
    const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
    const tenant = tenantDoc.data();
    const tenantType = tenant?.type || 'brand';

    return tenantType === 'dispensary'
      ? `/dispensaries/${tenantId}${suffix}`
      : `/${tenantId}${suffix}`;
  } catch {
    // Default to brand path
    return `/${tenantId}${suffix}`;
  }
}
