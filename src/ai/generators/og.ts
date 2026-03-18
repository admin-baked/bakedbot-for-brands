/**
 * OG Social Image URL Builder
 *
 * Constructs URLs to /api/og/social for branded social media images.
 * All rendering is server-side (next/og + Satori) — zero API cost,
 * no content restrictions, instant generation.
 *
 * Use this instead of fal.ai FLUX.1 when the brand wants text-on-color
 * or text-on-photo composites rather than photorealistic AI imagery.
 */

export type OgTemplate = 'text-on-color' | 'text-on-photo' | 'product-spotlight';
export type OgPlatform = 'instagram' | 'tiktok' | 'linkedin' | 'twitter' | 'facebook';

export interface OgImageParams {
    template: OgTemplate;
    /** Main headline text */
    headline: string;
    /** Secondary line (tagline, price, CTA text) */
    subtext?: string;
    /** Hex background / brand primary color, e.g. '#FF6B35' */
    bgColor?: string;
    /** Hex text / accent color, e.g. '#ffffff' */
    accentColor?: string;
    /** Brand display name shown in corner */
    brandName?: string;
    /** Absolute URL to brand logo (PNG/SVG with transparency ideal) */
    logoUrl?: string;
    /** Absolute URL for background photo (text-on-photo) or product image (product-spotlight) */
    imageUrl?: string;
    /** Social platform — controls canvas dimensions */
    platform?: OgPlatform;
}

/**
 * Build an absolute URL to the OG social image route.
 *
 * The returned URL renders a PNG when fetched via GET and can be used:
 *   - As an `<img src>` in previews
 *   - Stored in Firestore as the generated imageUrl
 *   - Posted directly to social platforms
 *
 * @param params    Template + content parameters
 * @param baseUrl   Override base URL (defaults to NEXT_PUBLIC_APP_URL or bakedbot.ai)
 */
export function buildOgImageUrl(params: OgImageParams, baseUrl?: string): string {
    const base = baseUrl
        ?? process.env.NEXT_PUBLIC_APP_URL
        ?? 'https://bakedbot.ai';

    const url = new URL('/api/og/social', base);

    url.searchParams.set('template', params.template);
    url.searchParams.set('headline', params.headline);

    if (params.subtext)     url.searchParams.set('subtext',     params.subtext);
    if (params.bgColor)     url.searchParams.set('bgColor',     params.bgColor);
    if (params.accentColor) url.searchParams.set('accentColor', params.accentColor);
    if (params.brandName)   url.searchParams.set('brandName',   params.brandName);
    if (params.logoUrl)     url.searchParams.set('logoUrl',     params.logoUrl);
    if (params.imageUrl)    url.searchParams.set('imageUrl',    params.imageUrl);
    if (params.platform)    url.searchParams.set('platform',    params.platform);

    return url.toString();
}

/**
 * Derive the best OG template from a style hint.
 * Craig can pass the brand's preferred style; this picks the template.
 */
export function deriveOgTemplate(
    styleHint: string,
    hasBackgroundPhoto: boolean,
): OgTemplate {
    const h = styleHint.toLowerCase();
    if (hasBackgroundPhoto || h.includes('photo') || h.includes('lifestyle') || h.includes('outdoor')) {
        return 'text-on-photo';
    }
    if (h.includes('product') || h.includes('spotlight') || h.includes('feature') || h.includes('deal')) {
        return 'product-spotlight';
    }
    return 'text-on-color';
}
