/**
 * Product image utilities
 *
 * Provides placeholder images for products when POS doesn't provide images
 */

/**
 * Get a placeholder image URL based on product category
 * Uses Unsplash for high-quality, relevant cannabis-adjacent images
 */
export function getPlaceholderImageForCategory(category: string): string {
    const categoryLower = category.toLowerCase();

    // Map categories to appropriate Unsplash search terms
    if (categoryLower.includes('flower') || categoryLower.includes('bud')) {
        return 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('vape') || categoryLower.includes('cartridge')) {
        return 'https://images.unsplash.com/photo-1594882645126-14020914d58d?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('edible') || categoryLower.includes('gummies') || categoryLower.includes('gummy')) {
        return 'https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('concentrate') || categoryLower.includes('wax') || categoryLower.includes('shatter') || categoryLower.includes('rosin')) {
        return 'https://images.unsplash.com/photo-1606923829579-0cb981a83e2e?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('tincture') || categoryLower.includes('oil')) {
        return 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('topical') || categoryLower.includes('lotion') || categoryLower.includes('balm')) {
        return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('beverage') || categoryLower.includes('drink')) {
        return 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('accessory') || categoryLower.includes('accessories')) {
        return 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800&auto=format&fit=crop';
    }

    if (categoryLower.includes('pre roll') || categoryLower.includes('preroll') || categoryLower.includes('joint')) {
        return 'https://images.unsplash.com/photo-1571667598291-b9236e67d4e4?w=800&auto=format&fit=crop';
    }

    // Default: generic cannabis leaf image
    return 'https://images.unsplash.com/photo-1611779822107-8a5c9e8b0ad4?w=800&auto=format&fit=crop';
}

/**
 * Get placeholder image with brand color overlay (future enhancement)
 */
export function getPlaceholderImageWithBrand(category: string, brandColor?: string): string {
    // For now, just return the category placeholder
    // Future: Generate dynamic images with brand colors
    return getPlaceholderImageForCategory(category);
}
