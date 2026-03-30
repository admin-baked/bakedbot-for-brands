/**
 * ToolShowcase - Remotion composition for software tool demos and branded motion.
 * 
 * Duration: 150 frames (5s @ 30fps)
 *   Scene 1 (0-45f):   Kinetic Typography Intro - "Big Bold Text"
 *   Scene 2 (45-120f): Feature Showcase - Screenshots with motion styles
 *   Scene 3 (120-150f): Brand Closure & CTA
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
    Video,
    Audio,
} from 'remotion';
import { hexToRgba } from '@/lib/utils';
import { VideoStyle } from '@/types/creative-video';

export interface ToolShowcaseProps extends Record<string, unknown> {
    brandName: string;
    tagline: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    screenshotUrls: string[];
    backgroundImageUrl?: string;
    styleMode: VideoStyle;
    kineticHeadline: string;
    websiteUrl?: string;
    ctaText?: string;
}


const BackgroundLayer: React.FC<{
    backgroundImageUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
}> = ({ backgroundImageUrl, primaryColor, secondaryColor, accentColor }) => {
    const isVideo = backgroundImageUrl?.toLowerCase().endsWith('.mp4');

    return (
        <AbsoluteFill>
            {backgroundImageUrl ? (
                isVideo ? (
                    <Video
                        src={backgroundImageUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                        muted
                        loop
                    />
                ) : (
                    <Img
                        src={backgroundImageUrl}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                        }}
                    />
                )
            ) : (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 55%, ${accentColor} 130%)`,
                    }}
                />
            )}
            {/* Dark overlay for readability */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.4)',
                }}
            />
        </AbsoluteFill>
    );
};

const KineticIntro: React.FC<{
    headline: string;
    accentColor: string;
}> = ({ headline, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const scale = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 200 },
    });

    const words = headline.split(' ');

    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 40px' }}>
            <div style={{ transform: `scale(${scale})`, textAlign: 'center' }}>
                {words.map((word, i) => {
                    const wordSpring = spring({
                        frame: frame - i * 3,
                        fps,
                        config: { damping: 10, stiffness: 180 },
                    });
                    
                    return (
                        <div
                            key={i}
                            style={{
                                fontSize: width > height ? 100 : 80,
                                fontWeight: 900,
                                color: i % 2 === 0 ? '#ffffff' : accentColor,
                                lineHeight: 0.9,
                                textTransform: 'uppercase',
                                letterSpacing: '-0.04em',
                                opacity: wordSpring,
                                transform: `translateY(${(1 - wordSpring) * 20}px)`,
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

const ScreenshotShowcase: React.FC<{
    urls: string[];
    styleMode: VideoStyle;
}> = ({ urls, styleMode }) => {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    
    // Each screenshot shows for a portion of the scene
    const totalFrames = 75; // 45 to 120
    const framesPerScreenshot = totalFrames / urls.length;

    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
            {urls.map((url, i) => {
                const startFrame = i * framesPerScreenshot;
                const endFrame = (i + 1) * framesPerScreenshot;
                
                // Active window for this screenshot
                if (frame < startFrame || frame >= endFrame) return null;

                let transform = '';
                let opacity = 1;

                if (styleMode === 'stop-motion') {
                    // Slight random rotation for stop motion feel
                    const rot = Math.sin(i * 999) * 3;
                    transform = `rotate(${rot}deg) scale(0.95)`;
                } else if (styleMode === 'slow-motion') {
                    const drift = interpolate(frame, [startFrame, endFrame], [0, -20]);
                    transform = `translateY(${drift}px) scale(0.95)`;
                    opacity = interpolate(frame, [startFrame, startFrame + 5, endFrame - 5, endFrame], [0, 1, 1, 0]);
                } else {
                    // Fast paced / Cinematic
                    const pop = spring({ frame: frame - startFrame, fps: 30, config: { damping: 12, stiffness: 200 } });
                    transform = `scale(${0.9 + pop * 0.05})`;
                    opacity = interpolate(frame, [startFrame, startFrame + 3, endFrame - 3, endFrame], [0, 1, 1, 0]);
                }

                return (
                    <div
                        key={i}
                        style={{
                            width: '85%',
                            height: '80%',
                            borderRadius: 24,
                            overflow: 'hidden',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            transform,
                            opacity,
                            backgroundColor: '#1f1f23',
                        }}
                    >
                        <Img
                            src={url}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    </div>
                );
            })}
        </AbsoluteFill>
    );
};

const ClosureScene: React.FC<{
    brandName: string;
    ctaText: string;
    websiteUrl?: string;
    primaryColor: string;
    accentColor: string;
}> = ({ brandName, ctaText, websiteUrl, primaryColor, accentColor }) => {
    const frame = useCurrentFrame();
    const slide = spring({ frame, fps: 30, config: { damping: 14, stiffness: 150 } });

    return (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ transform: `scale(${0.9 + slide * 0.1})`, opacity: slide }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', opacity: 0.8, marginBottom: 12 }}>
                    Powered by
                </div>
                <div style={{ fontSize: 72, fontWeight: 900, color: '#ffffff', marginBottom: 40 }}>
                    {brandName}
                </div>
                <div
                    style={{
                        padding: '20px 40px',
                        borderRadius: 999,
                        background: accentColor,
                        color: '#000000',
                        fontSize: 32,
                        fontWeight: 900,
                        boxShadow: `0 20px 50px ${hexToRgba(accentColor, 0.4)}`,
                    }}
                >
                    {ctaText}
                </div>
                {websiteUrl && (
                    <div style={{ marginTop: 24, fontSize: 20, color: '#ffffff', opacity: 0.6 }}>
                        {websiteUrl}
                    </div>
                )}
            </div>
        </AbsoluteFill>
    );
};

export const ToolShowcase: React.FC<ToolShowcaseProps> = (props) => {
    return (
        <AbsoluteFill style={{ backgroundColor: props.primaryColor, fontFamily: 'system-ui, sans-serif' }}>
            <BackgroundLayer
                backgroundImageUrl={props.backgroundImageUrl}
                primaryColor={props.primaryColor}
                secondaryColor={props.secondaryColor}
                accentColor={props.accentColor}
            />

            <Sequence from={0} durationInFrames={45}>
                <KineticIntro headline={props.kineticHeadline} accentColor={props.accentColor} />
            </Sequence>

            <Sequence from={45} durationInFrames={75}>
                <ScreenshotShowcase urls={props.screenshotUrls} styleMode={props.styleMode} />
            </Sequence>

            <Sequence from={120} durationInFrames={30}>
                <ClosureScene
                    brandName={props.brandName}
                    ctaText={props.ctaText || 'Get Started'}
                    websiteUrl={props.websiteUrl}
                    primaryColor={props.primaryColor}
                    accentColor={props.accentColor}
                />
            </Sequence>
        </AbsoluteFill>
    );
};
