/**
 * Product image utilities
 *
 * Provides the Smokey mascot as a branded placeholder for products
 * when the POS doesn't supply a real product image.
 * Replaces generic Unsplash stock photos with BakedBot's mascot.
 */

/**
 * Get the Smokey mascot placeholder image URL.
 * Category is used for future variant support but currently all return
 * the same mascot to maintain brand consistency.
 */
export function getPlaceholderImageForCategory(category: string): string {
    // Use BakedBot's Smokey mascot for all missing product images.
    // This keeps the visual identity consistent and avoids unrelated stock photos.
    return '/icon-192.png';
}

/**
 * Get placeholder image with brand color overlay (future enhancement)
 */
export function getPlaceholderImageWithBrand(category: string, brandColor?: string): string {
    return getPlaceholderImageForCategory(category);
}
