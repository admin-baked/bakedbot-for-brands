/**
 * Maps CRM customer segments to dynamic pricing tiers.
 *
 * CRM segments (8): vip, loyal, new, at_risk, slipping, churned, high_value, frequent
 * Pricing tiers (4): new, regular, vip, whale
 */

import type { CustomerSegment } from '@/types/customers';
import type { CustomerTier } from '@/types/dynamic-pricing';

/**
 * Map a CRM segment + lifetime value to a pricing tier.
 * Pricing tiers are simpler and focused on spend-based personalization.
 */
export function mapSegmentToTier(segment: CustomerSegment, totalSpent: number): CustomerTier {
    // Whale: Ultra-high spenders regardless of segment
    if (totalSpent >= 5000) return 'whale';

    // VIP: High-value segments
    if (segment === 'vip' || segment === 'high_value') return 'vip';

    // Regular: Active, engaged customers
    if (segment === 'loyal' || segment === 'frequent') return 'regular';

    // New: Everyone else (new, at_risk, slipping, churned)
    return 'new';
}

/**
 * Get the display label for a pricing tier.
 */
export function getPricingTierInfo(tier: CustomerTier): { label: string; description: string } {
    const info: Record<CustomerTier, { label: string; description: string }> = {
        whale: { label: 'Whale', description: 'Ultra-high spenders ($5,000+)' },
        vip: { label: 'VIP', description: 'Top customers and high-value shoppers' },
        regular: { label: 'Regular', description: 'Loyal and frequent buyers' },
        new: { label: 'New', description: 'New, inactive, or returning customers' },
    };
    return info[tier];
}
