/**
 * Product price tier categorization utilities
 */

export type PriceTier = 'budget' | 'mid' | 'premium' | 'luxury';

/**
 * Determine price tier based on product price
 */
export function getPriceTier(price: number): PriceTier {
  if (price < 30) return 'budget';
  if (price < 60) return 'mid';
  if (price < 100) return 'premium';
  return 'luxury';
}

/**
 * Configuration for each price tier including display label, color, and price range
 */
export const TIER_CONFIG: Record<PriceTier, { label: string; color: string; range: string; bgClass: string; textClass: string }> = {
  budget: {
    label: 'Budget',
    color: 'green',
    range: 'Under $30',
    bgClass: 'bg-green-100 dark:bg-green-900/30',
    textClass: 'text-green-700 dark:text-green-400'
  },
  mid: {
    label: 'Mid-Range',
    color: 'blue',
    range: '$30-60',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    textClass: 'text-blue-700 dark:text-blue-400'
  },
  premium: {
    label: 'Premium',
    color: 'purple',
    range: '$60-100',
    bgClass: 'bg-purple-100 dark:bg-purple-900/30',
    textClass: 'text-purple-700 dark:text-purple-400'
  },
  luxury: {
    label: 'Luxury',
    color: 'amber',
    range: '$100+',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    textClass: 'text-amber-700 dark:text-amber-400'
  }
};

/**
 * Get tier badge classes for styling
 */
export function getTierBadgeClasses(tier: PriceTier): string {
  const config = TIER_CONFIG[tier];
  return `${config.bgClass} ${config.textClass}`;
}
