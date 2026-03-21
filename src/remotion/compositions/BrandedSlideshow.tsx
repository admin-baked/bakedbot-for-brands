/**
 * BrandedSlideshow — Remotion composition for cannabis brand marketing videos.
 *
 * 3-scene structure (total: 5s @ 30fps = 150 frames):
 *   Scene 1 (0–50f):   Brand intro — logo pulse + name reveal
 *   Scene 2 (50–110f): Product highlight — headline + tagline
 *   Scene 3 (110–150f): CTA — call to action + website
 */

import {
    AbsoluteFill,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
    Sequence,
} from 'remotion';

export interface BrandedSlideshowProps extends Record<string, unknown> {
    brandName: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    productImageUrl?: string;
    ctaText?: string;
    websiteUrl?: string;
    headline?: string;
}

export const BrandedSlideshow: React.FC<BrandedSlideshowProps> = ({
    brandName,
    tagline,
    primaryColor,
    secondaryColor,
    accentColor,
    logoUrl,
    productImageUrl,
    ctaText = 'Shop Now',
    websiteUrl,
    headline,
}) => {
    return (
        <AbsoluteFill style={{ backgroundColor: primaryColor, fontFamily: 'system-ui, sans-serif' }}>
            {/* Scene 1: Brand Intro (0–50 frames) */}
            <Sequence from={0} durationInFrames={50}>
                <IntroScene
                    brandName={brandName}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    accentColor={accentColor}
                    logoUrl={logoUrl}
                />
            </Sequence>

            {/* Scene 2: Product / Headline (50–110 frames) */}
            <Sequence from={50} durationInFrames={60}>
                <ProductScene
                    headline={headline || tagline}
                    tagline={tagline}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    accentColor={accentColor}
                    productImageUrl={productImageUrl}
                />
            </Sequence>

            {/* Scene 3: CTA (110–150 frames) */}
            <Sequence from={110} durationInFrames={40}>
                <CTAScene
                    brandName={brandName}
                    ctaText={ctaText}
                    websiteUrl={websiteUrl}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    accentColor={accentColor}
                />
            </Sequence>
        </AbsoluteFill>
    );
};

// ---------------------------------------------------------------------------
// Scene 1: Brand Intro
// ---------------------------------------------------------------------------

const IntroScene: React.FC<{
    brandName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
}> = ({ brandName, primaryColor, secondaryColor, accentColor, logoUrl }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 200 }, durationInFrames: 30 });
    const textOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });
    const accentWidth = interpolate(frame, [25, 45], [0, 180], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 24,
            }}
        >
            {/* Logo or placeholder circle */}
            <div style={{ transform: `scale(${logoScale})` }}>
                {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt={brandName} style={{ width: 120, height: 120, objectFit: 'contain' }} />
                ) : (
                    <div style={{
                        width: 120,
                        height: 120,
                        borderRadius: '50%',
                        backgroundColor: accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 48,
                        fontWeight: 'bold',
                        color: primaryColor,
                    }}>
                        {brandName.charAt(0)}
                    </div>
                )}
            </div>

            {/* Brand name */}
            <div style={{ opacity: textOpacity, textAlign: 'center' }}>
                <div style={{
                    fontSize: 52,
                    fontWeight: 800,
                    color: '#ffffff',
                    letterSpacing: '-1px',
                    textShadow: '0 2px 20px rgba(0,0,0,0.3)',
                }}>
                    {brandName}
                </div>
                {/* Accent underline */}
                <div style={{
                    height: 4,
                    width: accentWidth,
                    backgroundColor: accentColor,
                    borderRadius: 2,
                    margin: '8px auto 0',
                }} />
            </div>
        </AbsoluteFill>
    );
};

// ---------------------------------------------------------------------------
// Scene 2: Product Highlight
// ---------------------------------------------------------------------------

const ProductScene: React.FC<{
    headline: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    productImageUrl?: string;
}> = ({ headline, tagline, primaryColor, secondaryColor, accentColor, productImageUrl }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const slideIn = spring({ frame, fps, config: { damping: 14, stiffness: 180 }, durationInFrames: 25 });
    const headlineX = interpolate(slideIn, [0, 1], [-60, 0]);
    const taglineOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' });
    const imageScale = spring({ frame, fps, config: { damping: 16, stiffness: 150 }, durationInFrames: 30 });

    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: productImageUrl ? 'space-between' : 'center',
                padding: '0 80px',
                gap: 48,
            }}
        >
            {/* Text side */}
            <div style={{ flex: 1 }}>
                <div style={{
                    transform: `translateX(${headlineX}px)`,
                    fontSize: productImageUrl ? 42 : 54,
                    fontWeight: 800,
                    color: primaryColor,
                    lineHeight: 1.15,
                    marginBottom: 16,
                }}>
                    {headline}
                </div>
                <div style={{
                    opacity: taglineOpacity,
                    fontSize: 22,
                    color: '#555',
                    lineHeight: 1.5,
                    borderLeft: `4px solid ${accentColor}`,
                    paddingLeft: 16,
                }}>
                    {tagline}
                </div>
            </div>

            {/* Product image */}
            {productImageUrl && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={productImageUrl}
                        alt="Product"
                        style={{
                            maxWidth: '100%',
                            maxHeight: 420,
                            objectFit: 'contain',
                            transform: `scale(${imageScale})`,
                            borderRadius: 16,
                        }}
                    />
                </div>
            )}
        </AbsoluteFill>
    );
};

// ---------------------------------------------------------------------------
// Scene 3: CTA
// ---------------------------------------------------------------------------

const CTAScene: React.FC<{
    brandName: string;
    ctaText: string;
    websiteUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
}> = ({ brandName, ctaText, websiteUrl, primaryColor, secondaryColor, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const scale = spring({ frame, fps, config: { damping: 10, stiffness: 200 }, durationInFrames: 20 });
    const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 20,
            }}
        >
            <div style={{ opacity, textAlign: 'center' }}>
                <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontWeight: 500 }}>
                    {brandName}
                </div>
                <div style={{
                    transform: `scale(${scale})`,
                    backgroundColor: accentColor,
                    color: primaryColor,
                    fontSize: 32,
                    fontWeight: 800,
                    padding: '16px 48px',
                    borderRadius: 50,
                    letterSpacing: '0.5px',
                }}>
                    {ctaText}
                </div>
                {websiteUrl && (
                    <div style={{
                        marginTop: 16,
                        fontSize: 18,
                        color: 'rgba(255,255,255,0.8)',
                        letterSpacing: '0.3px',
                    }}>
                        {websiteUrl.replace(/^https?:\/\//, '')}
                    </div>
                )}
            </div>
        </AbsoluteFill>
    );
};
