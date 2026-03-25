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
 * Build a URL to the OG social image route.
 *
 * Returns a relative path (/api/og/social?...) by default so the browser
 * resolves it against whatever origin the page is running on — works in dev,
 * staging, and production without base-URL mismatches.
 *
 * Pass an explicit `baseUrl` when you need an absolute URL (e.g. for email
 * templates or social platform uploads).
 *
 * @param params    Template + content parameters
 * @param baseUrl   Override base URL (only pass when absolute URL is required)
 */
export function buildOgImageUrl(params: OgImageParams, baseUrl?: string): string {
    const qs = new URLSearchParams();

    qs.set('template', params.template);
    qs.set('headline', params.headline);

    if (params.subtext)     qs.set('subtext',     params.subtext);
    if (params.bgColor)     qs.set('bgColor',     params.bgColor);
    if (params.accentColor) qs.set('accentColor', params.accentColor);
    if (params.brandName)   qs.set('brandName',   params.brandName);
    if (params.logoUrl)     qs.set('logoUrl',     params.logoUrl);
    if (params.imageUrl)    qs.set('imageUrl',    params.imageUrl);
    if (params.platform)    qs.set('platform',    params.platform);

    const path = `/api/og/social?${qs.toString()}`;

    if (baseUrl) {
        return `${baseUrl.replace(/\/$/, '')}${path}`;
    }

    return path;
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
