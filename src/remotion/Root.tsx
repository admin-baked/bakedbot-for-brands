/**
 * Remotion Root — registers all BakedBot compositions.
 * Used by: npx remotion studio  (preview)
 *           npx remotion render  (local CLI render)
 *           @remotion/renderer renderMedia()  (server-side)
 */

import { Composition, type CalculateMetadataFunction } from 'remotion';
import type { ComponentType } from 'react';
import { BrandedSlideshow, type BrandedSlideshowProps } from './compositions/BrandedSlideshow';
import { ToolShowcase, type ToolShowcaseProps } from './compositions/ToolShowcase';
import { LongFormVideo, calculateLongFormMetadata, type LongFormVideoProps } from './compositions/LongFormVideo';

// Remotion's Composition generic requires ComponentType<Record<string, unknown>>.
// Cast once here so all three registrations stay clean.
const BrandedSlideshowComp = BrandedSlideshow as unknown as ComponentType<Record<string, unknown>>;
const ToolShowcaseComp = ToolShowcase as unknown as ComponentType<Record<string, unknown>>;
const LongFormVideoComp = LongFormVideo as unknown as ComponentType<Record<string, unknown>>;
const calculateLongFormCompositionMetadata: CalculateMetadataFunction<Record<string, unknown>> = (options) =>
    calculateLongFormMetadata({
        ...options,
        defaultProps: options.defaultProps as LongFormVideoProps,
        props: options.props as LongFormVideoProps,
    });

const DEFAULT_PROPS: BrandedSlideshowProps = {
    brandName: 'BakedBot AI',
    tagline: 'Turn Your Menu Into a Revenue Engine',
    primaryColor: '#18181b',
    secondaryColor: '#27272a',
    accentColor: '#22c55e',
    logoUrl: undefined,
    productImageUrl: undefined,
    ctaText: 'Shop Now',
    websiteUrl: 'bakedbot.ai',
    headline: 'AI-Powered Cannabis Commerce',
};

const DEFAULT_TOOL_PROPS: ToolShowcaseProps = {
    brandName: 'BakedBot AI',
    tagline: 'The Agentic Commerce OS',
    primaryColor: '#18181b',
    secondaryColor: '#27272a',
    accentColor: '#22c55e',
    logoUrl: undefined,
    screenshotUrls: [],
    backgroundImageUrl: undefined,
    styleMode: 'stop-motion',
    kineticHeadline: 'INTRODUCING THE FUTURE',
    websiteUrl: 'bakedbot.ai',
    ctaText: 'Build Your Agent',
};

const DEFAULT_LONGFORM_PROPS: LongFormVideoProps = {
    brandName: 'BakedBot AI',
    headline: 'THE FUTURE OF CANNABIS COMMERCE',
    tagline: 'Powered by AI',
    primaryColor: '#18181b',
    secondaryColor: '#27272a',
    accentColor: '#22c55e',
    logoUrl: undefined,
    clipUrls: [],
    sceneTitles: [],
    ctaText: 'Shop Now',
    websiteUrl: 'bakedbot.ai',
};

export const RemotionRoot: React.FC = () => {
    return (
        <>
            {/* 16:9 — landscape (social feed, LinkedIn, Twitter) */}
            <Composition
                id="BrandedSlideshow-16x9"
                component={BrandedSlideshowComp}
                durationInFrames={150}
                fps={30}
                width={1280}
                height={720}
                defaultProps={DEFAULT_PROPS}
            />

            {/* 9:16 — vertical (TikTok, Instagram Reels, Stories) */}
            <Composition
                id="BrandedSlideshow-9x16"
                component={BrandedSlideshowComp}
                durationInFrames={150}
                fps={30}
                width={720}
                height={1280}
                defaultProps={DEFAULT_PROPS}
            />

            {/* 1:1 — square (Instagram feed) */}
            <Composition
                id="BrandedSlideshow-1x1"
                component={BrandedSlideshowComp}
                durationInFrames={150}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={DEFAULT_PROPS}
            />

            {/* Tool Showcase - 16:9 */}
            <Composition
                id="ToolShowcase-16x9"
                component={ToolShowcaseComp}
                durationInFrames={150}
                fps={30}
                width={1280}
                height={720}
                defaultProps={DEFAULT_TOOL_PROPS}
            />

            {/* Tool Showcase - 9:16 */}
            <Composition
                id="ToolShowcase-9x16"
                component={ToolShowcaseComp}
                durationInFrames={150}
                fps={30}
                width={720}
                height={1280}
                defaultProps={DEFAULT_TOOL_PROPS}
            />

            {/* Tool Showcase - 1:1 */}
            <Composition
                id="ToolShowcase-1x1"
                component={ToolShowcaseComp}
                durationInFrames={150}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={DEFAULT_TOOL_PROPS}
            />

            {/* Long Form Video - 16:9 (60–90s, dynamic via calculateMetadata) */}
            <Composition
                id="LongFormVideo-16x9"
                component={LongFormVideoComp}
                calculateMetadata={calculateLongFormCompositionMetadata}
                durationInFrames={2700}
                fps={30}
                width={1280}
                height={720}
                defaultProps={DEFAULT_LONGFORM_PROPS}
            />

            {/* Long Form Video - 9:16 (TikTok / Reels) */}
            <Composition
                id="LongFormVideo-9x16"
                component={LongFormVideoComp}
                calculateMetadata={calculateLongFormCompositionMetadata}
                durationInFrames={2700}
                fps={30}
                width={720}
                height={1280}
                defaultProps={DEFAULT_LONGFORM_PROPS}
            />

            {/* Long Form Video - 1:1 (Instagram feed) */}
            <Composition
                id="LongFormVideo-1x1"
                component={LongFormVideoComp}
                calculateMetadata={calculateLongFormCompositionMetadata}
                durationInFrames={2700}
                fps={30}
                width={1080}
                height={1080}
                defaultProps={DEFAULT_LONGFORM_PROPS}
            />
        </>
    );
};
