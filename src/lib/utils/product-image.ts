/**
 * Product Image Utilities
 *
 * Category-based icon fallbacks for products missing images.
 * Follows the upsell-row pattern (Leaf icon) but extends to all categories.
 */

export type ProductCategory =
    | 'flower'
    | 'pre-roll'
    | 'pre_roll'
    | 'preroll'
    | 'edible'
    | 'edibles'
    | 'concentrate'
    | 'concentrates'
    | 'vaporizer'
    | 'vape'
    | 'vapes'
    | 'tincture'
    | 'tinctures'
    | 'topical'
    | 'topicals'
    | 'accessory'
    | 'accessories'
    | 'capsule'
    | 'capsules'
    | 'beverage'
    | 'beverages'
    | string;

/** Lucide icon name for a product category */
export function getCategoryIconName(category?: string): string {
    if (!category) return 'Leaf';

    const normalized = category.toLowerCase().replace(/[-_\s]/g, '');

    if (normalized.includes('flower') || normalized.includes('bud')) return 'Leaf';
    if (normalized.includes('preroll') || normalized.includes('joint') || normalized.includes('cone')) return 'Cigarette';
    if (normalized.includes('edible') || normalized.includes('gummy') || normalized.includes('candy') || normalized.includes('chocolate')) return 'Cookie';
    if (normalized.includes('concentrate') || normalized.includes('wax') || normalized.includes('shatter') || normalized.includes('dab')) return 'Droplets';
    if (normalized.includes('vape') || normalized.includes('vaporizer') || normalized.includes('cart') || normalized.includes('pod')) return 'Wind';
    if (normalized.includes('tincture') || normalized.includes('oil') || normalized.includes('drop')) return 'Droplet';
    if (normalized.includes('topical') || normalized.includes('cream') || normalized.includes('lotion') || normalized.includes('balm') || normalized.includes('patch')) return 'HandHeart';
    if (normalized.includes('capsule') || normalized.includes('pill') || normalized.includes('tablet')) return 'Pill';
    if (normalized.includes('beverage') || normalized.includes('drink') || normalized.includes('soda') || normalized.includes('tea')) return 'Coffee';
    if (normalized.includes('accessory') || normalized.includes('device') || normalized.includes('pipe') || normalized.includes('bowl')) return 'Package';

    return 'Leaf'; // Default cannabis leaf
}

/** CSS color class for a category icon */
export function getCategoryIconColor(category?: string): string {
    if (!category) return 'text-green-500/40';

    const normalized = category.toLowerCase().replace(/[-_\s]/g, '');

    if (normalized.includes('flower') || normalized.includes('bud')) return 'text-green-500/40';
    if (normalized.includes('preroll') || normalized.includes('joint')) return 'text-amber-500/40';
    if (normalized.includes('edible') || normalized.includes('gummy')) return 'text-orange-500/40';
    if (normalized.includes('concentrate') || normalized.includes('wax')) return 'text-yellow-600/40';
    if (normalized.includes('vape') || normalized.includes('vaporizer')) return 'text-blue-500/40';
    if (normalized.includes('tincture') || normalized.includes('oil')) return 'text-emerald-500/40';
    if (normalized.includes('topical') || normalized.includes('cream')) return 'text-pink-500/40';
    if (normalized.includes('capsule') || normalized.includes('pill')) return 'text-purple-500/40';
    if (normalized.includes('beverage') || normalized.includes('drink')) return 'text-cyan-500/40';

    return 'text-green-500/40';
}
