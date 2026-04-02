/**
 * LongFormVideo — Remotion composition for 60–90s marketing videos.
 *
 * Structure (all timing at 30 fps):
 *   Intro  (60 frames = 2s):        Brand name + kinetic headline
 *   Scene  (300 frames × N = 10s each): Kling clip background + branded overlay
 *   Outro  (90 frames = 3s):        CTA card with brand name + website
 *
 * Duration is calculated dynamically from the number of clips via calculateMetadata.
 * This file is pure Remotion — no server imports.
 */

import {
    AbsoluteFill,
    Sequence,
    Video,
    Img,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
    type CalculateMetadataFunction,
} from 'remotion';
import { hexToRgba } from '../../lib/utils';

const INTRO_FRAMES = 60;   // 2s
const CLIP_FRAMES = 300;   // 10s per scene
const OUTRO_FRAMES = 90;   // 3s

export interface LongFormVideoProps extends Record<string, unknown> {
    brandName: string;
    headline: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    clipUrls: string[];
    sceneTitles: string[];
    ctaText?: string;
    websiteUrl?: string;
}

// ─── Dynamic duration ────────────────────────────────────────────────────────

export const calculateLongFormMetadata: CalculateMetadataFunction<LongFormVideoProps> = ({ props }) => {
    const durationInFrames = INTRO_FRAMES + props.clipUrls.length * CLIP_FRAMES + OUTRO_FRAMES;
    return { durationInFrames };
};

// ─── Intro scene ─────────────────────────────────────────────────────────────

const IntroScene: React.FC<{
    brandName: string;
    headline: string;
    accentColor: string;
    logoUrl?: string;
}> = ({ brandName, headline, accentColor, logoUrl }) => {
    const frame = useCurrentFrame();
    const { fps, width } = useVideoConfig();

    const brandSlide = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
    const headlineSpring = spring({ frame: frame - 12, fps, config: { damping: 12, stiffness: 180 } });

    const words = headline.toUpperCase().split(' ');

    return (
        <AbsoluteFill
            style={{
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 24,
                padding: '0 60px',
            }}
        >
            {/* Brand name + optional logo */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    opacity: brandSlide,
                    transform: `translateY(${(1 - brandSlide) * -30}px)`,
                }}
            >
                {logoUrl && (
                    <Img
                        src={logoUrl}
                        style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8 }}
                    />
                )}
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', opacity: 0.75, letterSpacing: 4, textTransform: 'uppercase' }}>
                    {brandName}
                </div>
            </div>

            {/* Kinetic headline words */}
            <div style={{ textAlign: 'center' }}>
                {words.map((word, i) => {
                    const wordSpring = spring({
                        frame: frame - 18 - i * 5,
                        fps,
                        config: { damping: 10, stiffness: 200 },
                    });
                    return (
                        <div
                            key={i}
                            style={{
                                fontSize: width > 900 ? 96 : 72,
                                fontWeight: 900,
                                color: i % 2 === 0 ? '#ffffff' : accentColor,
                                lineHeight: 0.88,
                                letterSpacing: '-0.03em',
                                opacity: headlineSpring * wordSpring,
                                transform: `translateY(${(1 - wordSpring) * 24}px)`,
                            }}
                        >
                            {word}
                        </div>
                    );
                })}
            </div>
        </AbsoluteFill>
    );
};

// ─── Clip scene ───────────────────────────────────────────────────────────────

const ClipScene: React.FC<{
    clipUrl: string;
    sceneTitle: string;
    brandName: string;
    accentColor: string;
    sceneIndex: number;
    totalScenes: number;
}> = ({ clipUrl, sceneTitle, brandName, accentColor, sceneIndex, totalScenes }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // Fade in for first 10 frames, fade out for last 10 frames
    const opacity = interpolate(
        frame,
        [0, 10, CLIP_FRAMES - 10, CLIP_FRAMES],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    // Overlay slide-up entrance
    const overlaySlide = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 180 } });
    const overlayY = (1 - overlaySlide) * 30;

    // Scene number indicator
    const sceneNumOpacity = interpolate(frame, [0, 8, 40, 50], [0, 1, 1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    return (
        <AbsoluteFill style={{ opacity }}>
            {/* Kling always returns mp4 */}
            <Video
                src={clipUrl}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
                startFrom={0}
            />

            {/* Gradient vignette — bottom for overlay, subtle top for logo area */}
            <AbsoluteFill
                style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 35%, transparent 55%, rgba(0,0,0,0.75) 100%)',
                }}
            />

            {/* Scene number chip — top left, fades out after 1.5s */}
            <div
                style={{
                    position: 'absolute',
                    top: 28,
                    left: 32,
                    opacity: sceneNumOpacity,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                }}
            >
                <div
                    style={{
                        padding: '4px 12px',
                        borderRadius: 999,
                        background: accentColor,
                        color: '#000000',
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                    }}
                >
                    {sceneIndex + 1} / {totalScenes}
                </div>
            </div>

            {/* Brand watermark — top right */}
            <div
                style={{
                    position: 'absolute',
                    top: 28,
                    right: 32,
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                }}
            >
                {brandName}
            </div>

            {/* Scene title bar — bottom */}
            <div
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '40px 40px 36px',
                    transform: `translateY(${overlayY}px)`,
                    opacity: overlaySlide,
                }}
            >
                <div
                    style={{
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: 6,
                        background: accentColor,
                        color: '#000000',
                        fontSize: 13,
                        fontWeight: 900,
                        letterSpacing: 2,
                        textTransform: 'uppercase',
                        marginBottom: 10,
                    }}
                >
                    {sceneTitle}
                </div>
            </div>
        </AbsoluteFill>
    );
};

// ─── Outro / CTA scene ────────────────────────────────────────────────────────

const OutroScene: React.FC<{
    brandName: string;
    ctaText: string;
    websiteUrl?: string;
    tagline: string;
    accentColor: string;
}> = ({ brandName, ctaText, websiteUrl, tagline, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const reveal = spring({ frame, fps, config: { damping: 14, stiffness: 140 } });
    const ctaSpring = spring({ frame: frame - 15, fps, config: { damping: 12, stiffness: 160 } });

    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <div
                style={{
                    opacity: reveal,
                    transform: `scale(${0.9 + reveal * 0.1})`,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 16,
                }}
            >
                <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 4, textTransform: 'uppercase' }}>
                    {brandName}
                </div>
                <div style={{ fontSize: 64, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
                    {tagline}
                </div>
            </div>

            <div
                style={{
                    opacity: ctaSpring,
                    transform: `translateY(${(1 - ctaSpring) * 20}px)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 14,
                }}
            >
                <div
                    style={{
                        padding: '18px 48px',
                        borderRadius: 999,
                        background: accentColor,
                        color: '#000000',
                        fontSize: 28,
                        fontWeight: 900,
                        boxShadow: `0 20px 50px ${hexToRgba(accentColor, 0.4)}`,
                    }}
                >
                    {ctaText}
                </div>
                {websiteUrl && (
                    <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
                        {websiteUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                    </div>
                )}
            </div>
        </AbsoluteFill>
    );
};

// ─── Root composition ─────────────────────────────────────────────────────────

export const LongFormVideo: React.FC<LongFormVideoProps> = (props) => {
    const {
        brandName,
        headline,
        tagline,
        primaryColor,
        secondaryColor,
        accentColor,
        logoUrl,
        clipUrls,
        sceneTitles,
        ctaText = 'Shop Now',
        websiteUrl,
    } = props;

    return (
        <AbsoluteFill
            style={{
                backgroundColor: primaryColor,
                fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
        >
            {/* Ambient gradient backdrop (always visible behind everything) */}
            <AbsoluteFill
                style={{
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 60%, ${hexToRgba(accentColor, 0.15)} 100%)`,
                    opacity: 0.6,
                }}
            />

            {/* Intro */}
            <Sequence from={0} durationInFrames={INTRO_FRAMES}>
                <IntroScene
                    brandName={brandName}
                    headline={headline}
                    accentColor={accentColor}
                    logoUrl={logoUrl}
                />
            </Sequence>

            {/* Clip scenes */}
            {clipUrls.map((url, i) => (
                <Sequence
                    key={i}
                    from={INTRO_FRAMES + i * CLIP_FRAMES}
                    durationInFrames={CLIP_FRAMES}
                >
                    <ClipScene
                        clipUrl={url}
                        sceneTitle={sceneTitles[i] ?? `Scene ${i + 1}`}
                        brandName={brandName}
                        accentColor={accentColor}
                        sceneIndex={i}
                        totalScenes={clipUrls.length}
                    />
                </Sequence>
            ))}

            {/* Outro */}
            <Sequence
                from={INTRO_FRAMES + clipUrls.length * CLIP_FRAMES}
                durationInFrames={OUTRO_FRAMES}
            >
                <OutroScene
                    brandName={brandName}
                    ctaText={ctaText}
                    websiteUrl={websiteUrl}
                    tagline={tagline}
                    accentColor={accentColor}
                />
            </Sequence>
        </AbsoluteFill>
    );
};
