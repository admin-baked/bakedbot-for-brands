export interface OrderUserContext {
  uid: string;
  orgId?: string;
  currentOrgId?: string;
  brandId?: string;
  locationId?: string;
}

/**
 * Tenant context for org-level lookups (Alleaves config, tenant collections).
 */
export function getTenantOrgId(user: OrderUserContext): string {
  return String(user.orgId || user.currentOrgId || user.brandId || user.uid);
}

/**
 * Retailer/location context for order documents keyed by retailerId.
 */
export function getLocationId(user: Partial<OrderUserContext>): string | undefined {
  return user.locationId ? String(user.locationId) : undefined;
}

export function getDispensaryRetailerId(params: {
  locationId?: string;
  orgId?: string;
}): string | undefined {
  return params.locationId || params.orgId;
}

export function shouldRetryWithOrgFallback(params: {
  bakedBotOrdersCount: number;
  isDispensaryRole: boolean;
  locationId?: string;
  orgId?: string;
}): boolean {
  return (
    params.bakedBotOrdersCount === 0 &&
    params.isDispensaryRole &&
    Boolean(params.locationId) &&
    Boolean(params.orgId) &&
    params.locationId !== params.orgId
  );
}
