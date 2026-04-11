/**
 * VideoRemix — Remotion composition for remixing uploaded videos with brand overlays.
 *
 * Takes a source video (uploaded by user or from external URL) and adds:
 *   - Brand logo (top-left watermark, animated entrance)
 *   - Headline text (top area, animated slide-in)
 *   - Lower-third CTA bar (bottom, animated slide-up)
 *   - Brand color accent strip
 *   - Optional outro card (last 2s)
 *
 * All font sizes use relative sizing based on composition dimensions (width/height)
 * so text looks correct at 1080×1080, 1280×720, and 720×1280.
 *
 * Duration is dynamic — calculated from the source video via calculateMetadata.
 */

import {
    AbsoluteFill,
    Easing,
    Img,
    OffthreadVideo,
    Sequence,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
    type CalculateMetadataFunction,
} from 'remotion';
import { formatWebsiteLabel, hexToRgba } from '../../lib/utils';

const OUTRO_FRAMES = 60; // 2s outro card

export type VideoRemixProps = {
    /** URL of the source video to remix */
    videoSrc: string;
    brandName: string;
    headline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    ctaText?: string;
    websiteUrl?: string;
    /** Whether to show headline overlay on the video */
    showHeadline?: boolean;
    /** Whether to show CTA lower third */
    showLowerThird?: boolean;
    /** Whether to show outro card */
    showOutro?: boolean;
    /** Mute the source video audio */
    muted?: boolean;
    /** Override total duration in frames (if video duration detection fails) */
    durationOverride?: number;
};

// ─── Dynamic duration from video ────────────────────────────────────────────

export const calculateVideoRemixMetadata: CalculateMetadataFunction<
    VideoRemixProps
> = async ({ props }) => {
    // If caller provides an explicit duration, use it
    if (props.durationOverride && props.durationOverride > 0) {
        return { durationInFrames: props.durationOverride };
    }

    // Default: 10 seconds (300 frames @ 30fps) — Lambda render will use this
    // if we can't fetch the video duration at composition registration time.
    // The actual video will loop or end naturally.
    return { durationInFrames: 300 };
};

// ─── Logo Watermark ─────────────────────────────────────────────────────────

const LogoWatermark: React.FC<{
    logoUrl?: string;
    brandName: string;
    accentColor: string;
    primaryColor: string;
}> = ({ logoUrl, brandName, accentColor, primaryColor }) => {
    const frame = useCurrentFrame();
    const { fps, width } = useVideoConfig();

    const scale = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
    const opacity = interpolate(frame, [0, 15], [0, 1], {
        extrapolateRight: 'clamp',
    });

    // Size relative to composition width — works at all aspect ratios
    const logoSize = Math.round(width * 0.06);
    const padding = Math.round(width * 0.025);

    return (
        <div
            style={{
                position: 'absolute',
                top: padding,
                left: padding,
                opacity,
                transform: `scale(${scale})`,
                zIndex: 10,
            }}
        >
            <div
                style={{
                    width: logoSize + 12,
                    height: logoSize + 12,
                    borderRadius: (logoSize + 12) / 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: hexToRgba('#000000', 0.5),
                    backdropFilter: 'blur(8px)',
                    border: `2px solid ${hexToRgba(accentColor, 0.6)}`,
                }}
            >
                {logoUrl ? (
                    <Img
                        src={logoUrl}
                        alt={brandName}
                        style={{
                            width: logoSize * 0.75,
                            height: logoSize * 0.75,
                            objectFit: 'contain',
                            borderRadius: logoSize / 2,
                        }}
                    />
                ) : (
                    <span
                        style={{
                            fontSize: logoSize * 0.4,
                            fontWeight: 900,
                            color: '#ffffff',
                        }}
                    >
                        {brandName.charAt(0).toUpperCase()}
                    </span>
                )}
            </div>
        </div>
    );
};

// ─── Headline Overlay ───────────────────────────────────────────────────────

const HeadlineOverlay: React.FC<{
    headline: string;
    accentColor: string;
}> = ({ headline, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const slideIn = interpolate(frame, [10, 30], [-100, 0], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const opacity = interpolate(frame, [10, 25], [0, 1], {
        extrapolateRight: 'clamp',
    });

    // Fade out after 3 seconds to not obstruct video content
    const fadeOut = interpolate(frame, [fps * 3, fps * 3.5], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    // Font size relative to the smaller dimension so it works in all aspect ratios
    const minDimension = Math.min(width, height);
    const fontSize = Math.round(minDimension * 0.045);
    const padding = Math.round(width * 0.025);
    const topOffset = Math.round(height * 0.08);

    return (
        <div
            style={{
                position: 'absolute',
                top: topOffset,
                left: padding,
                right: padding,
                opacity: opacity * fadeOut,
                transform: `translateY(${slideIn}px)`,
                zIndex: 10,
            }}
        >
            <div
                style={{
                    display: 'inline-block',
                    padding: `${Math.round(fontSize * 0.4)}px ${Math.round(fontSize * 0.7)}px`,
                    background: hexToRgba('#000000', 0.6),
                    backdropFilter: 'blur(12px)',
                    borderRadius: Math.round(fontSize * 0.3),
                    borderLeft: `4px solid ${accentColor}`,
                }}
            >
                <span
                    style={{
                        fontSize,
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        textShadow: `0 2px 8px ${hexToRgba('#000000', 0.4)}`,
                    }}
                >
                    {headline}
                </span>
            </div>
        </div>
    );
};

// ─── Lower Third CTA ────────────────────────────────────────────────────────

const LowerThird: React.FC<{
    brandName: string;
    ctaText: string;
    accentColor: string;
    primaryColor: string;
    websiteUrl?: string;
    totalFrames: number;
}> = ({ brandName, ctaText, accentColor, primaryColor, websiteUrl, totalFrames }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // Slide up after 1s, stay for the rest of the video (fade out before outro)
    const enterDelay = fps;
    const slideUp = interpolate(frame, [enterDelay, enterDelay + 20], [80, 0], {
        easing: Easing.out(Easing.cubic),
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    const enterOpacity = interpolate(frame, [enterDelay, enterDelay + 15], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    // Fade out before outro
    const outroStart = totalFrames - OUTRO_FRAMES - 15;
    const exitOpacity = interpolate(frame, [outroStart, outroStart + 15], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const minDimension = Math.min(width, height);
    const fontSize = Math.round(minDimension * 0.028);
    const ctaFontSize = Math.round(minDimension * 0.032);
    const padding = Math.round(width * 0.025);
    const barHeight = Math.round(height * 0.09);
    const websiteLabel = formatWebsiteLabel(websiteUrl);

    return (
        <div
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                opacity: enterOpacity * exitOpacity,
                transform: `translateY(${slideUp}px)`,
                zIndex: 10,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: barHeight,
                    padding: `0 ${padding}px`,
                    background: `linear-gradient(90deg, ${hexToRgba(primaryColor, 0.85)}, ${hexToRgba(primaryColor, 0.7)})`,
                    backdropFilter: 'blur(16px)',
                    borderTop: `3px solid ${accentColor}`,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(fontSize * 0.6) }}>
                    <span
                        style={{
                            fontSize,
                            fontWeight: 700,
                            color: '#ffffff',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}
                    >
                        {brandName}
                    </span>
                    {websiteLabel ? (
                        <span
                            style={{
                                fontSize: fontSize * 0.85,
                                color: hexToRgba('#ffffff', 0.7),
                            }}
                        >
                            {websiteLabel}
                        </span>
                    ) : null}
                </div>
                <div
                    style={{
                        padding: `${Math.round(ctaFontSize * 0.3)}px ${Math.round(ctaFontSize * 0.7)}px`,
                        borderRadius: Math.round(ctaFontSize * 0.25),
                        background: accentColor,
                        color: primaryColor,
                        fontSize: ctaFontSize,
                        fontWeight: 800,
                    }}
                >
                    {ctaText}
                </div>
            </div>
        </div>
    );
};

// ─── Outro Card ─────────────────────────────────────────────────────────────

const OutroCard: React.FC<{
    brandName: string;
    ctaText: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    websiteUrl?: string;
}> = ({ brandName, ctaText, primaryColor, secondaryColor, accentColor, logoUrl, websiteUrl }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const scale = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
    const opacity = interpolate(frame, [0, 12], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const minDimension = Math.min(width, height);
    const headlineSize = Math.round(minDimension * 0.065);
    const ctaSize = Math.round(minDimension * 0.04);
    const websiteLabel = formatWebsiteLabel(websiteUrl);
    const logoSize = Math.round(minDimension * 0.12);

    return (
        <AbsoluteFill
            style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 55%, ${accentColor} 140%)`,
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif',
            }}
        >
            <div
                style={{
                    opacity,
                    transform: `scale(${0.9 + scale * 0.1})`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: Math.round(minDimension * 0.025),
                }}
            >
                {logoUrl ? (
                    <div
                        style={{
                            width: logoSize,
                            height: logoSize,
                            borderRadius: logoSize / 2,
                            overflow: 'hidden',
                            border: `3px solid ${hexToRgba('#ffffff', 0.3)}`,
                            marginBottom: Math.round(minDimension * 0.01),
                        }}
                    >
                        <Img
                            src={logoUrl}
                            alt={brandName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                ) : null}

                <div
                    style={{
                        fontSize: headlineSize,
                        fontWeight: 900,
                        color: '#ffffff',
                        letterSpacing: '-0.04em',
                        textAlign: 'center',
                        textShadow: `0 4px 20px ${hexToRgba('#000000', 0.3)}`,
                    }}
                >
                    {brandName}
                </div>

                <div
                    style={{
                        padding: `${Math.round(ctaSize * 0.35)}px ${Math.round(ctaSize * 0.9)}px`,
                        borderRadius: Math.round(ctaSize * 0.3),
                        background: `linear-gradient(135deg, ${accentColor}, ${hexToRgba('#ffffff', 0.9)})`,
                        color: primaryColor,
                        fontSize: ctaSize,
                        fontWeight: 800,
                    }}
                >
                    {ctaText}
                </div>

                {websiteLabel ? (
                    <div
                        style={{
                            fontSize: Math.round(minDimension * 0.025),
                            color: hexToRgba('#ffffff', 0.7),
                            fontWeight: 600,
                            marginTop: Math.round(minDimension * 0.01),
                        }}
                    >
                        {websiteLabel}
                    </div>
                ) : null}
            </div>
        </AbsoluteFill>
    );
};

// ─── Main Composition ───────────────────────────────────────────────────────

export const VideoRemix: React.FC<VideoRemixProps> = ({
    videoSrc,
    brandName,
    headline,
    primaryColor,
    secondaryColor,
    accentColor,
    logoUrl,
    ctaText = 'Learn More',
    websiteUrl,
    showHeadline = true,
    showLowerThird = true,
    showOutro = true,
    muted = false,
}) => {
    const { durationInFrames, width, height } = useVideoConfig();

    // Source video occupies all frames except the outro
    const videoFrames = showOutro ? durationInFrames - OUTRO_FRAMES : durationInFrames;

    return (
        <AbsoluteFill style={{ backgroundColor: primaryColor, fontFamily: 'system-ui, sans-serif' }}>
            {/* Source video — full bleed, covers the frame */}
            <Sequence from={0} durationInFrames={videoFrames}>
                <AbsoluteFill>
                    <OffthreadVideo
                        src={videoSrc}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                        muted={muted}
                    />
                </AbsoluteFill>

                {/* Brand overlays on top of video */}
                <LogoWatermark
                    logoUrl={logoUrl}
                    brandName={brandName}
                    accentColor={accentColor}
                    primaryColor={primaryColor}
                />

                {showHeadline && headline ? (
                    <HeadlineOverlay
                        headline={headline}
                        accentColor={accentColor}
                    />
                ) : null}

                {showLowerThird ? (
                    <LowerThird
                        brandName={brandName}
                        ctaText={ctaText}
                        accentColor={accentColor}
                        primaryColor={primaryColor}
                        websiteUrl={websiteUrl}
                        totalFrames={videoFrames}
                    />
                ) : null}

                {/* Accent strip — thin colored bar at top */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: Math.round(Math.min(width, height) * 0.005),
                        background: accentColor,
                        zIndex: 10,
                    }}
                />
            </Sequence>

            {/* Outro card */}
            {showOutro ? (
                <Sequence from={videoFrames} durationInFrames={OUTRO_FRAMES}>
                    <OutroCard
                        brandName={brandName}
                        ctaText={ctaText}
                        primaryColor={primaryColor}
                        secondaryColor={secondaryColor}
                        accentColor={accentColor}
                        logoUrl={logoUrl}
                        websiteUrl={websiteUrl}
                    />
                </Sequence>
            ) : null}
        </AbsoluteFill>
    );
};
