/**
 * BrandedSlideshow - Remotion composition for cannabis brand marketing videos.
 *
 * 3-scene structure (total: 5s @ 30fps = 150 frames):
 *   Scene 1 (0-46f):   Brand arrival - logo, brand name, tagline
 *   Scene 2 (46-110f): Product focus - animated headline + product card
 *   Scene 3 (110-150f): CTA close - action prompt + website
 */

import {
    AbsoluteFill,
    Easing,
    Img,
    interpolate,
    Sequence,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';
import { formatWebsiteLabel, hexToRgba } from '../../lib/utils';

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



const AmbientBackdrop: React.FC<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    light?: boolean;
}> = ({ primaryColor, secondaryColor, accentColor, light = false }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();

    const driftX = interpolate(frame, [0, 60], [-width * 0.05, width * 0.04], {
        easing: Easing.inOut(Easing.ease),
        extrapolateRight: 'clamp',
    });
    const driftY = interpolate(frame, [0, 60], [height * 0.04, -height * 0.03], {
        easing: Easing.inOut(Easing.ease),
        extrapolateRight: 'clamp',
    });
    const gridSize = Math.max(28, Math.round(width / 24));

    return (
        <AbsoluteFill>
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: light
                        ? `linear-gradient(135deg, ${hexToRgba('#ffffff', 1)} 0%, ${hexToRgba(accentColor, 0.08)} 45%, ${hexToRgba(primaryColor, 0.12)} 100%)`
                        : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 55%, ${accentColor} 130%)`,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: -height * 0.18,
                    transform: `translate(${driftX}px, ${driftY}px)`,
                    background: `radial-gradient(circle at 20% 20%, ${hexToRgba(accentColor, light ? 0.24 : 0.34)} 0%, transparent 38%),
                        radial-gradient(circle at 78% 24%, ${hexToRgba('#ffffff', light ? 0.65 : 0.12)} 0%, transparent 28%),
                        radial-gradient(circle at 62% 78%, ${hexToRgba(primaryColor, light ? 0.22 : 0.32)} 0%, transparent 34%)`,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `linear-gradient(${hexToRgba(light ? primaryColor : '#ffffff', light ? 0.08 : 0.1)} 1px, transparent 1px),
                        linear-gradient(90deg, ${hexToRgba(light ? primaryColor : '#ffffff', light ? 0.08 : 0.1)} 1px, transparent 1px)`,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    opacity: light ? 0.75 : 0.35,
                    maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.85), rgba(0,0,0,0.1))',
                }}
            />
        </AbsoluteFill>
    );
};

const BrandMark: React.FC<{
    brandName: string;
    accentColor: string;
    primaryColor: string;
    logoUrl?: string;
    size: number;
}> = ({ brandName, accentColor, primaryColor, logoUrl, size }) => {
    const outerSize = size + 22;
    const innerSize = size;

    return (
        <div
            style={{
                width: outerSize,
                height: outerSize,
                borderRadius: outerSize / 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(145deg, ${hexToRgba('#ffffff', 0.92)}, ${hexToRgba(accentColor, 0.22)})`,
                boxShadow: `0 24px 80px ${hexToRgba('#000000', 0.28)}`,
            }}
        >
            <div
                style={{
                    width: innerSize,
                    height: innerSize,
                    borderRadius: innerSize / 2,
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(145deg, ${hexToRgba(primaryColor, 0.96)}, ${hexToRgba(accentColor, 0.85)})`,
                }}
            >
                {logoUrl ? (
                    <Img
                        src={logoUrl}
                        alt={brandName}
                        style={{
                            width: innerSize * 0.72,
                            height: innerSize * 0.72,
                            objectFit: 'contain',
                        }}
                    />
                ) : (
                    <span
                        style={{
                            fontSize: innerSize * 0.42,
                            fontWeight: 900,
                            color: '#ffffff',
                            letterSpacing: '-0.04em',
                        }}
                    >
                        {brandName.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>
        </div>
    );
};

const IntroScene: React.FC<{
    brandName: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
}> = ({ brandName, tagline, primaryColor, secondaryColor, accentColor, logoUrl }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const isTall = height > width;

    const cardScale = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
    const textLift = interpolate(frame, [0, 24], [36, 0], {
        easing: Easing.out(Easing.cubic),
        extrapolateRight: 'clamp',
    });
    const textOpacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: 'clamp',
    });
    const lineWidth = interpolate(frame, [10, 32], [0, isTall ? 160 : 220], {
        easing: Easing.out(Easing.cubic),
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill>
            <AmbientBackdrop
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                accentColor={accentColor}
            />
            <AbsoluteFill
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isTall ? '84px 52px' : '72px 88px',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: isTall ? 560 : 900,
                        borderRadius: 34,
                        padding: isTall ? '48px 36px' : '44px 56px',
                        background: `linear-gradient(160deg, ${hexToRgba('#ffffff', 0.18)}, ${hexToRgba('#ffffff', 0.06)})`,
                        border: `1px solid ${hexToRgba('#ffffff', 0.22)}`,
                        boxShadow: `0 32px 120px ${hexToRgba('#000000', 0.3)}`,
                        backdropFilter: 'blur(24px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: isTall ? 28 : 36,
                        flexDirection: isTall ? 'column' : 'row',
                        transform: `scale(${0.92 + (cardScale * 0.08)})`,
                    }}
                >
                    <BrandMark
                        brandName={brandName}
                        accentColor={accentColor}
                        primaryColor={primaryColor}
                        logoUrl={logoUrl}
                        size={isTall ? 118 : 126}
                    />
                    <div
                        style={{
                            flex: 1,
                            opacity: textOpacity,
                            transform: `translateY(${textLift}px)`,
                            textAlign: isTall ? 'center' : 'left',
                        }}
                    >
                        <div
                            style={{
                                fontSize: isTall ? 18 : 16,
                                fontWeight: 700,
                                letterSpacing: '0.24em',
                                textTransform: 'uppercase',
                                color: hexToRgba('#ffffff', 0.72),
                                marginBottom: 18,
                            }}
                        >
                            BakedBot Creative Story
                        </div>
                        <div
                            style={{
                                fontSize: isTall ? 62 : 72,
                                fontWeight: 900,
                                color: '#ffffff',
                                lineHeight: 0.95,
                                letterSpacing: '-0.05em',
                                textShadow: `0 14px 50px ${hexToRgba('#000000', 0.32)}`,
                            }}
                        >
                            {brandName}
                        </div>
                        <div
                            style={{
                                width: lineWidth,
                                height: 6,
                                borderRadius: 999,
                                margin: isTall ? '18px auto 18px' : '18px 0',
                                background: `linear-gradient(90deg, ${accentColor}, ${hexToRgba('#ffffff', 0.9)})`,
                            }}
                        />
                        <div
                            style={{
                                fontSize: isTall ? 24 : 26,
                                fontWeight: 500,
                                color: hexToRgba('#ffffff', 0.88),
                                lineHeight: 1.35,
                                maxWidth: isTall ? '100%' : 520,
                            }}
                        >
                            {tagline}
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

const ProductScene: React.FC<{
    brandName: string;
    headline: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    productImageUrl?: string;
}> = ({ brandName, headline, tagline, primaryColor, secondaryColor, accentColor, productImageUrl }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const isTall = height > width;
    const isSquare = height === width;

    const panelSlide = spring({ frame, fps, config: { damping: 14, stiffness: 170 } });
    const imageFloat = interpolate(frame, [0, 64], [16, -12], {
        easing: Easing.inOut(Easing.ease),
        extrapolateRight: 'clamp',
    });
    const copyOpacity = interpolate(frame, [2, 18], [0, 1], {
        extrapolateRight: 'clamp',
    });
    const copyShift = interpolate(frame, [0, 18], [40, 0], {
        easing: Easing.out(Easing.cubic),
        extrapolateRight: 'clamp',
    });
    const accentScale = interpolate(frame, [10, 36], [0.7, 1], {
        easing: Easing.out(Easing.cubic),
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill>
            <AmbientBackdrop
                primaryColor={primaryColor}
                secondaryColor={secondaryColor}
                accentColor={accentColor}
                light
            />
            <AbsoluteFill
                style={{
                    padding: isTall ? '72px 48px 56px' : '64px 78px',
                    justifyContent: 'center',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: isTall ? 'column' : 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: isTall ? 34 : isSquare ? 32 : 46,
                        width: '100%',
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            opacity: copyOpacity,
                            transform: `translateX(${copyShift}px)`,
                        }}
                    >
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 16px',
                                borderRadius: 999,
                                backgroundColor: hexToRgba(accentColor, 0.14),
                                color: primaryColor,
                                fontSize: 16,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                marginBottom: 18,
                            }}
                        >
                            Featured Drop
                        </div>
                        <div
                            style={{
                                fontSize: isTall ? 66 : 72,
                                fontWeight: 900,
                                lineHeight: 0.94,
                                letterSpacing: '-0.06em',
                                color: primaryColor,
                                maxWidth: isTall ? '100%' : 520,
                                wordBreak: 'break-word',
                            }}
                        >
                            {headline}
                        </div>
                        <div
                            style={{
                                marginTop: 20,
                                fontSize: isTall ? 24 : 26,
                                lineHeight: 1.38,
                                color: hexToRgba(secondaryColor, 0.82),
                                maxWidth: 560,
                                borderLeft: `6px solid ${accentColor}`,
                                paddingLeft: 20,
                            }}
                        >
                            {tagline}
                        </div>
                        <div
                            style={{
                                marginTop: 24,
                                display: 'flex',
                                gap: 12,
                                flexWrap: 'wrap',
                            }}
                        >
                            {[brandName, '21+ only', 'Brand-matched creative'].map((pill) => (
                                <div
                                    key={pill}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: 16,
                                        backgroundColor: '#ffffff',
                                        color: primaryColor,
                                        fontSize: 15,
                                        fontWeight: 700,
                                        boxShadow: `0 16px 38px ${hexToRgba(primaryColor, 0.08)}`,
                                    }}
                                >
                                    {pill}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div
                        style={{
                            flex: isTall ? '0 0 auto' : 0.92,
                            width: isTall ? '100%' : undefined,
                            display: 'flex',
                            justifyContent: 'center',
                            transform: `translateY(${imageFloat}px) scale(${0.9 + (panelSlide * 0.1)})`,
                        }}
                    >
                        <div
                            style={{
                                width: isTall ? '100%' : isSquare ? 410 : 380,
                                maxWidth: isTall ? 420 : undefined,
                                aspectRatio: '4 / 5',
                                borderRadius: 34,
                                overflow: 'hidden',
                                position: 'relative',
                                background: `linear-gradient(160deg, ${hexToRgba('#ffffff', 0.92)}, ${hexToRgba(accentColor, 0.2)})`,
                                boxShadow: `0 36px 110px ${hexToRgba(primaryColor, 0.16)}`,
                            }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 16,
                                    borderRadius: 26,
                                    overflow: 'hidden',
                                    background: productImageUrl
                                        ? `linear-gradient(160deg, ${hexToRgba('#ffffff', 1)}, ${hexToRgba(accentColor, 0.12)})`
                                        : `radial-gradient(circle at 25% 22%, ${hexToRgba(accentColor, 0.36)} 0%, transparent 40%),
                                            linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                                }}
                            >
                                {productImageUrl ? (
                                    <Img
                                        src={productImageUrl}
                                        alt={headline}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                ) : (
                                    <AbsoluteFill
                                        style={{
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#ffffff',
                                            fontSize: 56,
                                            fontWeight: 900,
                                            letterSpacing: '-0.05em',
                                        }}
                                    >
                                        {brandName}
                                    </AbsoluteFill>
                                )}
                            </div>
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    pointerEvents: 'none',
                                    background: `linear-gradient(180deg, transparent 0%, ${hexToRgba(primaryColor, 0.08)} 55%, ${hexToRgba(primaryColor, 0.28)} 100%)`,
                                }}
                            />
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 20,
                                    right: 20,
                                    padding: '10px 14px',
                                    borderRadius: 999,
                                    backgroundColor: '#ffffff',
                                    color: primaryColor,
                                    fontSize: 15,
                                    fontWeight: 800,
                                    transform: `scale(${accentScale})`,
                                    boxShadow: `0 14px 34px ${hexToRgba(primaryColor, 0.14)}`,
                                }}
                            >
                                Built for scroll-stopping visuals
                            </div>
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

const CTAScene: React.FC<{
    brandName: string;
    ctaText: string;
    tagline: string;
    websiteUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
}> = ({ brandName, ctaText, tagline, websiteUrl, primaryColor, secondaryColor, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const isTall = height > width;
    const websiteLabel = formatWebsiteLabel(websiteUrl);

    const contentScale = spring({ frame, fps, config: { damping: 11, stiffness: 180 } });
    const opacity = interpolate(frame, [0, 14], [0, 1], {
        extrapolateRight: 'clamp',
    });
    const lift = interpolate(frame, [0, 20], [40, 0], {
        easing: Easing.out(Easing.cubic),
        extrapolateRight: 'clamp',
    });
    const pulse = 1 + (interpolate(frame, [0, 40], [0, 0.04], {
        easing: Easing.inOut(Easing.ease),
        extrapolateRight: 'clamp',
    }));

    return (
        <AbsoluteFill>
            <AmbientBackdrop
                primaryColor={secondaryColor}
                secondaryColor={primaryColor}
                accentColor={accentColor}
            />
            <AbsoluteFill
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: isTall ? '72px 42px' : '62px 78px',
                }}
            >
                <div
                    style={{
                        width: '100%',
                        maxWidth: isTall ? 560 : 880,
                        textAlign: 'center',
                        opacity,
                        transform: `translateY(${lift}px) scale(${0.94 + (contentScale * 0.06)})`,
                    }}
                >
                    <div
                        style={{
                            fontSize: 18,
                            fontWeight: 700,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: hexToRgba('#ffffff', 0.72),
                            marginBottom: 18,
                        }}
                    >
                        Ready to publish
                    </div>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: isTall ? '22px 30px' : '20px 34px',
                            borderRadius: 28,
                            background: `linear-gradient(135deg, ${accentColor}, ${hexToRgba('#ffffff', 0.92)})`,
                            color: primaryColor,
                            fontSize: isTall ? 46 : 54,
                            fontWeight: 900,
                            letterSpacing: '-0.05em',
                            boxShadow: `0 34px 120px ${hexToRgba(accentColor, 0.32)}`,
                            transform: `scale(${pulse})`,
                        }}
                    >
                        {ctaText}
                    </div>
                    <div
                        style={{
                            marginTop: 24,
                            fontSize: isTall ? 22 : 24,
                            lineHeight: 1.4,
                            color: '#ffffff',
                            maxWidth: 680,
                            marginLeft: 'auto',
                            marginRight: 'auto',
                        }}
                    >
                        {tagline}
                    </div>
                    <div
                        style={{
                            marginTop: 28,
                            display: 'flex',
                            gap: 16,
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div
                            style={{
                                padding: '12px 18px',
                                borderRadius: 16,
                                backgroundColor: hexToRgba('#ffffff', 0.12),
                                border: `1px solid ${hexToRgba('#ffffff', 0.18)}`,
                                color: '#ffffff',
                                fontSize: 18,
                                fontWeight: 700,
                            }}
                        >
                            {brandName}
                        </div>
                        {websiteLabel ? (
                            <div
                                style={{
                                    padding: '12px 18px',
                                    borderRadius: 16,
                                    backgroundColor: hexToRgba('#ffffff', 0.9),
                                    color: primaryColor,
                                    fontSize: 18,
                                    fontWeight: 800,
                                }}
                            >
                                {websiteLabel}
                            </div>
                        ) : null}
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

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
            <Sequence from={0} durationInFrames={46} premountFor={15}>
                <IntroScene
                    brandName={brandName}
                    tagline={tagline}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    accentColor={accentColor}
                    logoUrl={logoUrl}
                />
            </Sequence>

            <Sequence from={46} durationInFrames={64} premountFor={15}>
                <ProductScene
                    brandName={brandName}
                    headline={headline || tagline}
                    tagline={tagline}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    accentColor={accentColor}
                    productImageUrl={productImageUrl}
                />
            </Sequence>

            <Sequence from={110} durationInFrames={40} premountFor={15}>
                <CTAScene
                    brandName={brandName}
                    ctaText={ctaText}
                    tagline={tagline}
                    websiteUrl={websiteUrl}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    accentColor={accentColor}
                />
            </Sequence>
        </AbsoluteFill>
    );
};
