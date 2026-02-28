/**
 * Runtime feature flags.
 *
 * Shipping checkout:
 * - Enabled by default (online storefronts depend on this)
 * - Can be disabled with NEXT_PUBLIC_ENABLE_SHIPPING_CHECKOUT="false"
 *
 * Company plan/pricing checkout:
 * - Disabled by default outside tests
 * - Requires BOTH:
 *   - NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT="true" (UI opt-in)
 *   - ENABLE_COMPANY_PLAN_CHECKOUT="true" (server opt-in)
 * This prevents accidental exposure via client-only env toggles.
 */
export function isShippingCheckoutEnabled(): boolean {
    const configured = process.env.NEXT_PUBLIC_ENABLE_SHIPPING_CHECKOUT;

    if (configured === 'false') return false;
    if (configured === 'true') return true;

    return true;
}

export function isCompanyPlanCheckoutEnabled(): boolean {
    const publicFlag = process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT;
    const serverFlag = process.env.ENABLE_COMPANY_PLAN_CHECKOUT;
    const uiEnabled = publicFlag === 'true';
    const serverEnabled = serverFlag === 'true';

    if (process.env.NODE_ENV === 'test') {
        if (publicFlag === 'false' || serverFlag === 'false') {
            return false;
        }
        return true;
    }

    return uiEnabled && serverEnabled;
}
