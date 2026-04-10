/**
 * OG Social Image Generator
 *
 * Renders branded social media images server-side using next/og (Satori + resvg).
 * Returns PNG — no external API, no cost, no cannabis content restrictions.
 *
 * Templates:
 *   text-on-color    → solid brand-color background + headline (Sunnyside style)
 *   text-on-photo    → background image + dark gradient + text (Harvest/Trulieve style)
 *   product-spotlight → split layout: text left, product image right
 *
 * Usage:
 *   /api/og/social?template=text-on-color&headline=Puff+puff+pass&bgColor=%23006400&brandName=MyCo
 *
 * Query params:
 *   template      text-on-color | text-on-photo | product-spotlight
 *   headline      Main headline text (required)
 *   subtext       Secondary line of text (optional)
 *   bgColor       Hex background/brand color, e.g. %23FF6B35 (default #1a1a2e)
 *   accentColor   Hex text/accent color (default #ffffff)
 *   brandName     Brand name shown in corner (optional)
 *   logoUrl       Absolute URL to brand logo image (optional)
 *   imageUrl      Absolute URL for background or product image (optional)
 *   platform      instagram | tiktok | linkedin | twitter | facebook (affects dimensions)
 *   format        post | story | reel | carousel (optional, refines dimensions)
 */

import { ImageResponse } from 'next/og';
import { type NextRequest } from 'next/server';
import { normalizeOgAssetUrl } from '@/ai/generators/og';

// Edge runtime: uses Satori's pure-JS renderer (no native bindings) —
// more reliable on Cloud Run and avoids @resvg/resvg-js compatibility issues.
export const runtime = 'edge';

// Platform → canvas dimensions
function getDimensions(platform: string, format: string): { width: number; height: number } {
    if (format === 'story' || format === 'reel') {
        return { width: 1080, height: 1920 };
    }

    if (format === 'carousel') {
        if (platform === 'linkedin') {
            return { width: 1200, height: 628 };
        }

        return { width: 1200, height: 1200 };
    }

    switch (platform) {
        case 'linkedin':
        case 'twitter':
        case 'youtube':
            return { width: 1200, height: 628 };
        case 'tiktok':
            return { width: 1080, height: 1920 };
        default: // instagram, facebook
            return { width: 1200, height: 1200 };
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const origin = req.nextUrl.origin;

    const template    = searchParams.get('template')     ?? 'text-on-color';
    const headline    = searchParams.get('headline')     ?? '';
    const subtext     = searchParams.get('subtext')      ?? '';
    const bgColor     = searchParams.get('bgColor')      ?? '#1a1a2e';
    const accentColor = searchParams.get('accentColor')  ?? '#ffffff';
    const brandName   = searchParams.get('brandName')    ?? '';
    const logoUrl     = normalizeOgAssetUrl(searchParams.get('logoUrl') ?? '', origin) ?? '';
    const imageUrl    = normalizeOgAssetUrl(searchParams.get('imageUrl') ?? '', origin) ?? '';
    const platform    = searchParams.get('platform')     ?? 'instagram';
    const format      = searchParams.get('format')       ?? 'post';

    const dims = getDimensions(platform, format);

    try {
        switch (template) {
            case 'text-on-photo':
                return renderTextOnPhoto({ headline, subtext, imageUrl, accentColor, brandName, logoUrl, dims });
            case 'product-spotlight':
                return renderProductSpotlight({ headline, subtext, bgColor, accentColor, brandName, imageUrl, dims });
            default: // text-on-color
                return renderTextOnColor({ headline, subtext, bgColor, accentColor, brandName, logoUrl, dims });
        }
    } catch {
        return new Response('Failed to generate image', { status: 500 });
    }
}

// ─── Template: Text on Color ──────────────────────────────────────────────────
// Solid brand-color background with large centered headline.
// Reference: Sunnyside "Bright buys, every day" orange post.

function renderTextOnColor({
    headline, subtext, bgColor, accentColor, brandName, logoUrl, dims,
}: {
    headline: string; subtext: string; bgColor: string; accentColor: string;
    brandName: string; logoUrl: string; dims: { width: number; height: number };
}) {
    const { width, height } = dims;
    const isWide = width > height;
    const headlineFontSize = isWide
        ? 80
        : headline.length > 50 ? 72 : headline.length > 30 ? 88 : 108;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: bgColor,
                    padding: isWide ? '60px 100px' : '80px 80px',
                    position: 'relative',
                }}
            >
                {/* Subtle radial glow */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(ellipse at 25% 25%, ${accentColor}18 0%, transparent 55%), radial-gradient(ellipse at 75% 75%, ${accentColor}10 0%, transparent 55%)`,
                    display: 'flex',
                }} />

                {/* Brand name — top left */}
                {brandName && (
                    <div style={{
                        position: 'absolute',
                        top: isWide ? 36 : 52,
                        left: isWide ? 80 : 72,
                        color: accentColor,
                        fontSize: isWide ? 28 : 32,
                        fontWeight: 700,
                        opacity: 0.85,
                        letterSpacing: 1,
                        display: 'flex',
                    }}>
                        {brandName}
                    </div>
                )}

                {/* Logo — top right */}
                {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={logoUrl}
                        alt=""
                        style={{
                            position: 'absolute',
                            top: isWide ? 28 : 40,
                            right: isWide ? 80 : 72,
                            height: isWide ? 52 : 64,
                            objectFit: 'contain',
                        }}
                    />
                )}

                {/* Headline */}
                <div style={{
                    color: accentColor,
                    fontSize: headlineFontSize,
                    fontWeight: 900,
                    lineHeight: 1.08,
                    textAlign: 'center',
                    letterSpacing: '-1.5px',
                    maxWidth: '92%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                }}>
                    {headline}
                </div>

                {/* Subtext */}
                {subtext && (
                    <div style={{
                        color: accentColor,
                        fontSize: isWide ? 32 : 40,
                        fontWeight: 400,
                        textAlign: 'center',
                        marginTop: 28,
                        opacity: 0.75,
                        maxWidth: '80%',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                    }}>
                        {subtext}
                    </div>
                )}

                {/* Bottom accent bar */}
                <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: 10,
                    backgroundColor: accentColor,
                    opacity: 0.35,
                    display: 'flex',
                }} />
            </div>
        ),
        { width, height },
    );
}

// ─── Template: Text on Photo ──────────────────────────────────────────────────
// Full-bleed background image with dark gradient + text at bottom.
// Reference: Harvest x Trulieve "CANNA-CURIOUS?" forest photo post.

function renderTextOnPhoto({
    headline, subtext, imageUrl, accentColor, brandName, logoUrl, dims,
}: {
    headline: string; subtext: string; imageUrl: string; accentColor: string;
    brandName: string; logoUrl: string; dims: { width: number; height: number };
}) {
    const { width, height } = dims;
    const isWide = width > height;
    const headlineFontSize = isWide
        ? 80
        : headline.length > 40 ? 76 : 96;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative', overflow: 'hidden',
                    backgroundColor: '#111',
                }}
            >
                {/* Background photo */}
                {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt=""
                        style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                )}

                {/* Dark gradient — heavier at bottom for text legibility */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.12) 100%)',
                    display: 'flex',
                }} />

                {/* Brand name — top left */}
                {brandName && (
                    <div style={{
                        position: 'absolute',
                        top: isWide ? 36 : 52,
                        left: isWide ? 80 : 72,
                        color: '#ffffff',
                        fontSize: isWide ? 28 : 32,
                        fontWeight: 700,
                        display: 'flex',
                        textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                    }}>
                        {brandName}
                    </div>
                )}

                {/* Logo — top right */}
                {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={logoUrl}
                        alt=""
                        style={{
                            position: 'absolute',
                            top: isWide ? 28 : 40,
                            right: isWide ? 80 : 72,
                            height: isWide ? 52 : 64,
                            objectFit: 'contain',
                        }}
                    />
                )}

                {/* Text block — pinned to bottom */}
                <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    padding: isWide ? '48px 100px' : '64px 72px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 20,
                }}>
                    <div style={{
                        color: accentColor || '#ffffff',
                        fontSize: headlineFontSize,
                        fontWeight: 900,
                        lineHeight: 1.06,
                        letterSpacing: '-1.5px',
                        display: 'flex',
                        flexWrap: 'wrap',
                    }}>
                        {headline}
                    </div>
                    {subtext && (
                        <div style={{
                            color: '#ffffff',
                            fontSize: isWide ? 30 : 38,
                            fontWeight: 500,
                            opacity: 0.88,
                            display: 'flex',
                            flexWrap: 'wrap',
                        }}>
                            {subtext}
                        </div>
                    )}
                </div>
            </div>
        ),
        { width, height },
    );
}

// ─── Template: Product Spotlight ─────────────────────────────────────────────
// Split layout: headline + CTA on left, product image on right.
// Reference: Sunnyside dispensary product feature style.

function renderProductSpotlight({
    headline, subtext, bgColor, accentColor, brandName, imageUrl, dims,
}: {
    headline: string; subtext: string; bgColor: string; accentColor: string;
    brandName: string; imageUrl: string; dims: { width: number; height: number };
}) {
    const { width, height } = dims;
    const hasImage = !!imageUrl;
    const textWidth = hasImage ? '54%' : '100%';
    const headlineFontSize = headline.length > 35 ? 72 : headline.length > 20 ? 84 : 96;

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'row',
                    backgroundColor: '#f5f5f5',
                    position: 'relative', overflow: 'hidden',
                }}
            >
                {/* Left: text panel */}
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center',
                    width: textWidth,
                    padding: '80px 64px',
                    gap: 28,
                }}>
                    {/* Brand accent stripe */}
                    <div style={{
                        width: 56, height: 7,
                        backgroundColor: bgColor,
                        borderRadius: 4,
                        display: 'flex',
                    }} />

                    {brandName && (
                        <div style={{
                            color: bgColor,
                            fontSize: 30,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            display: 'flex',
                        }}>
                            {brandName}
                        </div>
                    )}

                    <div style={{
                        color: '#111111',
                        fontSize: headlineFontSize,
                        fontWeight: 900,
                        lineHeight: 1.05,
                        letterSpacing: '-1.5px',
                        display: 'flex',
                        flexWrap: 'wrap',
                    }}>
                        {headline}
                    </div>

                    {subtext && (
                        <div style={{
                            color: '#555555',
                            fontSize: 38,
                            fontWeight: 400,
                            lineHeight: 1.3,
                            display: 'flex',
                            flexWrap: 'wrap',
                        }}>
                            {subtext}
                        </div>
                    )}

                    {/* CTA pill */}
                    <div style={{
                        backgroundColor: bgColor,
                        color: accentColor || '#ffffff',
                        padding: '16px 44px',
                        borderRadius: 100,
                        fontSize: 30,
                        fontWeight: 700,
                        width: 'fit-content',
                        marginTop: 8,
                        display: 'flex',
                    }}>
                        Shop Now
                    </div>
                </div>

                {/* Right: product image */}
                {hasImage && (
                    <div style={{
                        width: '46%',
                        display: 'flex',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        {/* Color wash behind image */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            backgroundColor: bgColor,
                            opacity: 0.12,
                            display: 'flex',
                        }} />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt=""
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    </div>
                )}
            </div>
        ),
        { width, height },
    );
}
