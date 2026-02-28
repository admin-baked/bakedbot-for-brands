/**
 * Runtime feature flags.
 *
 * Shipping checkout:
 * - Enabled by default (online storefronts depend on this)
 * - Can be disabled with NEXT_PUBLIC_ENABLE_SHIPPING_CHECKOUT="false"
 *
 * Company plan/pricing checkout:
 * - Disabled by default outside tests
 * - Enable only with NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT="true"
 */
export function isShippingCheckoutEnabled(): boolean {
    const configured = process.env.NEXT_PUBLIC_ENABLE_SHIPPING_CHECKOUT;

    if (configured === 'false') return false;
    if (configured === 'true') return true;

    return true;
}

export function isCompanyPlanCheckoutEnabled(): boolean {
    const configured = process.env.NEXT_PUBLIC_ENABLE_COMPANY_PLAN_CHECKOUT;

    if (configured === 'true') return true;
    if (configured === 'false') return false;

    if (process.env.NODE_ENV === 'test') {
        return true;
    }

    return false;
}
