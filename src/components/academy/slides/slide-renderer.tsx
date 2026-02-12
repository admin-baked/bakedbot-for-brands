'use client';

/**
 * Slide Renderer Component
 *
 * Renders different slide types for the presenter mode.
 * Optimized for 1920x1080 screen recording.
 *
 * Visual upgrade: Gemini-generated backgrounds, glassmorphism cards,
 * decorative SVGs, gradient text, and animated elements.
 */

import type {
  Slide,
  TitleSlide,
  ObjectivesSlide,
  ContentSlide,
  SplitSlide,
  AgentSlide,
  ComparisonSlide,
  QuoteSlide,
  StatSlide,
  DemoSlide,
  RecapSlide,
  CTASlide,
} from '@/types/slides';
import {
  Leaf,
  Megaphone,
  ChartBar,
  Binoculars,
  DollarSign,
  Heart,
  Shield,
  CheckCircle,
  ArrowRight,
  Play,
  Download,
  Lightbulb,
  Target,
  Quote,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENT_ASSETS } from '@/lib/academy/agent-assets';
import type { AgentTrack } from '@/types/academy';
import { glassCard, glassPill, gradientText, hexToRgba, glowShadow } from './slide-css-utils';
import {
  GlowOrb,
  DotGrid,
  FloatingCircles,
  DiagonalLines,
  DecorativeQuoteMarks,
  PulseRing,
  FlowArrow,
} from './slide-decorations';

interface SlideRendererProps {
  slide: Slide;
  trackColor?: string;
  backgrounds?: Record<string, string>;
  agentIllustrations?: Record<string, string>;
}

export function SlideRenderer({
  slide,
  trackColor = '#10b981',
  backgrounds,
  agentIllustrations,
}: SlideRendererProps) {
  switch (slide.type) {
    case 'title':
      return <TitleSlideComponent slide={slide} backgrounds={backgrounds} />;
    case 'objectives':
      return <ObjectivesSlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    case 'content':
      return <ContentSlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    case 'split':
      return <SplitSlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    case 'agent':
      return <AgentSlideComponent slide={slide} agentIllustrations={agentIllustrations} />;
    case 'comparison':
      return <ComparisonSlideComponent slide={slide} backgrounds={backgrounds} />;
    case 'quote':
      return <QuoteSlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    case 'stat':
      return <StatSlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    case 'demo':
      return <DemoSlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    case 'recap':
      return <RecapSlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    case 'cta':
      return <CTASlideComponent slide={slide} trackColor={trackColor} backgrounds={backgrounds} />;
    default:
      return <div>Unknown slide type</div>;
  }
}

// ============================================================
// SHARED BACKGROUND WRAPPER
// ============================================================
function SlideBackground({
  slideType,
  trackColor,
  backgrounds,
  overlayOpacity = 0.8,
  children,
  decorations,
}: {
  slideType: string;
  trackColor: string;
  backgrounds?: Record<string, string>;
  overlayOpacity?: number;
  children: React.ReactNode;
  decorations?: React.ReactNode;
}) {
  const colorHex = trackColor.replace('#', '');
  const bgKey = `${slideType}_${colorHex}`;
  const bgUrl = backgrounds?.[bgKey];

  return (
    <div className="h-full relative overflow-hidden">
      {/* Generated background image */}
      {bgUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />
      )}
      {/* Fallback gradient when no generated bg */}
      {!bgUrl && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${trackColor}15, ${trackColor}05)`,
          }}
        />
      )}
      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
      />
      {/* Decorative elements layer */}
      {decorations && (
        <div className="absolute inset-0 pointer-events-none">
          {decorations}
        </div>
      )}
      {/* Content */}
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

// ============================================================
// TITLE SLIDE
// ============================================================
function TitleSlideComponent({
  slide,
  backgrounds,
}: {
  slide: TitleSlide;
  backgrounds?: Record<string, string>;
}) {
  const color = slide.trackColor || '#10b981';

  return (
    <SlideBackground
      slideType="title"
      trackColor={color}
      backgrounds={backgrounds}
      overlayOpacity={0.75}
      decorations={
        <>
          <GlowOrb color={color} position="top-right" size={400} />
          <DiagonalLines color={color} position="bottom-left" />
        </>
      }
    >
      <div className="h-full flex flex-col items-center justify-center text-center p-16">
        <div
          className="text-sm font-bold uppercase tracking-widest mb-6 px-5 py-2.5"
          style={{ ...glassPill, color }}
        >
          Episode {slide.episodeNumber}
        </div>
        <h1 className="text-6xl font-bold mb-6 max-w-5xl leading-tight text-white">
          <span style={gradientText(color)}>{slide.title}</span>
        </h1>
        {slide.subtitle && (
          <p className="text-2xl text-gray-300 max-w-3xl">{slide.subtitle}</p>
        )}
        <div className="mt-16 flex items-center gap-3" style={glassPill}>
          <img
            src="/bakedbot-logo.svg"
            alt="BakedBot"
            className="h-8 w-8"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <span className="text-lg font-medium text-gray-300 pr-2">
            Cannabis Marketing AI Academy
          </span>
        </div>
      </div>
    </SlideBackground>
  );
}

// ============================================================
// OBJECTIVES SLIDE
// ============================================================
function ObjectivesSlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: ObjectivesSlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="objectives"
      trackColor={trackColor}
      backgrounds={backgrounds}
      decorations={<DotGrid color={trackColor} position="right" />}
    >
      <div className="h-full flex flex-col p-16">
        <div className="flex items-center gap-4 mb-12">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ ...glassCard, borderRadius: '12px' }}
          >
            <Target className="h-6 w-6" style={{ color: trackColor }} />
          </div>
          <h2 className="text-4xl font-bold text-white">{slide.title}</h2>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <ul className="space-y-5">
            {slide.objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-4 text-2xl" style={glassCard}>
                <div className="p-5 flex items-start gap-4 w-full">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: hexToRgba(trackColor, 0.2),
                      boxShadow: `0 0 15px ${hexToRgba(trackColor, 0.15)}`,
                    }}
                  >
                    <span className="font-bold" style={{ color: trackColor }}>
                      {index + 1}
                    </span>
                  </div>
                  <span className="leading-relaxed text-gray-100 pt-1">{objective}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SlideBackground>
  );
}

// ============================================================
// CONTENT SLIDE
// ============================================================
function ContentSlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: ContentSlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="content"
      trackColor={trackColor}
      backgrounds={backgrounds}
      decorations={<FloatingCircles color={trackColor} count={4} />}
    >
      <div className="h-full flex flex-col p-16">
        <h2 className="text-4xl font-bold mb-12 text-white">{slide.title}</h2>
        <div className="flex-1 flex flex-col justify-center">
          <ul className="space-y-5">
            {slide.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-4 text-2xl">
                <CheckCircle
                  className="h-7 w-7 flex-shrink-0 mt-1"
                  style={{ color: trackColor, ...glowShadow(trackColor, 10) }}
                />
                <span className="leading-relaxed text-gray-100">{bullet}</span>
              </li>
            ))}
          </ul>
          {slide.highlight && (
            <div
              className="mt-10 p-6 rounded-2xl text-xl font-medium text-gray-100"
              style={{
                ...glassCard,
                borderLeft: `4px solid ${trackColor}`,
                background: hexToRgba(trackColor, 0.08),
              }}
            >
              <Lightbulb
                className="inline h-5 w-5 mr-2"
                style={{ color: trackColor }}
              />
              {slide.highlight}
            </div>
          )}
        </div>
      </div>
    </SlideBackground>
  );
}

// ============================================================
// SPLIT SLIDE
// ============================================================
function SplitSlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: SplitSlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="split"
      trackColor={trackColor}
      backgrounds={backgrounds}
    >
      <div className="h-full flex flex-col p-16">
        <h2 className="text-4xl font-bold mb-12 text-white">{slide.title}</h2>
        <div className="flex-1 grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="p-8" style={glassCard}>
            <h3
              className="text-2xl font-bold mb-6 pb-3 border-b-2"
              style={{ borderColor: trackColor, ...gradientText(trackColor) }}
            >
              {slide.leftTitle}
            </h3>
            <ul className="space-y-4">
              {slide.leftBullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3 text-xl text-gray-100">
                  <div
                    className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0"
                    style={{ backgroundColor: trackColor }}
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Vertical divider */}
          <div className="p-8" style={glassCard}>
            <h3 className="text-2xl font-bold mb-6 pb-3 border-b-2 border-gray-600 text-gray-200">
              {slide.rightTitle}
            </h3>
            <ul className="space-y-4">
              {slide.rightBullets.map((bullet, index) => (
                <li key={index} className="flex items-start gap-3 text-xl text-gray-300">
                  <div className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0 bg-gray-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </SlideBackground>
  );
}

// ============================================================
// AGENT SLIDE
// ============================================================
const AGENT_ICONS: Record<string, React.ElementType> = {
  leaf: Leaf,
  megaphone: Megaphone,
  'chart-bar': ChartBar,
  binoculars: Binoculars,
  'dollar-sign': DollarSign,
  heart: Heart,
  shield: Shield,
};

function AgentSlideComponent({
  slide,
  agentIllustrations,
}: {
  slide: AgentSlide;
  agentIllustrations?: Record<string, string>;
}) {
  const IconComponent = AGENT_ICONS[slide.icon] || Leaf;
  const agentAsset = AGENT_ASSETS[slide.agentId as AgentTrack];

  // Check for generated scene background
  const sceneBg = agentIllustrations?.[`${slide.agentId}_scene`];
  // Check for generated character illustration
  const characterIllustration = agentIllustrations?.[`${slide.agentId}_character`];

  // Determine avatar source: real image > generated character > icon fallback
  const hasRealImage = agentAsset?.hasImage && agentAsset.imagePath;
  const avatarSrc = hasRealImage ? agentAsset.imagePath : characterIllustration;

  return (
    <div className="h-full relative overflow-hidden">
      {/* Scene background */}
      {sceneBg && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${sceneBg})` }}
        />
      )}
      {!sceneBg && (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${slide.color}15, ${slide.color}05)`,
          }}
        />
      )}
      {/* Overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }} />
      {/* Glow decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <GlowOrb color={slide.color} position="bottom-left" size={350} />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center p-16">
        <div className="flex-1 grid grid-cols-5 gap-12 items-center">
          {/* Agent Avatar */}
          <div className="col-span-2 flex flex-col items-center">
            {avatarSrc ? (
              <div
                className="w-56 h-56 flex items-center justify-center mb-6 rounded-full"
                style={{
                  boxShadow: `0 0 40px ${hexToRgba(slide.color, 0.3)}, 0 0 80px ${hexToRgba(slide.color, 0.1)}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarSrc}
                  alt={slide.agentName}
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                />
              </div>
            ) : (
              <div
                className="w-48 h-48 rounded-full flex items-center justify-center mb-6"
                style={{
                  ...glassCard,
                  borderRadius: '50%',
                  borderColor: hexToRgba(slide.color, 0.3),
                  boxShadow: `0 0 30px ${hexToRgba(slide.color, 0.2)}`,
                }}
              >
                <IconComponent className="h-24 w-24" style={{ color: slide.color }} />
              </div>
            )}
            <h2 className="text-3xl font-bold text-center text-white">
              <span style={gradientText(slide.color)}>{slide.agentName}</span>
            </h2>
            <p className="text-lg text-gray-400 text-center mt-2 uppercase tracking-wider">
              {slide.tagline}
            </p>
          </div>

          {/* Agent Info */}
          <div className="col-span-3">
            <p className="text-xl mb-8 leading-relaxed text-gray-200">
              {slide.description}
            </p>
            <h4
              className="text-lg font-bold uppercase tracking-wide mb-4"
              style={{ color: slide.color }}
            >
              Key Capabilities
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {slide.capabilities.map((capability, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 text-base p-4"
                  style={glassCard}
                >
                  <CheckCircle
                    className="h-5 w-5 flex-shrink-0 mt-0.5"
                    style={{ color: slide.color }}
                  />
                  <span className="text-gray-200">{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPARISON SLIDE
// ============================================================
function ComparisonSlideComponent({
  slide,
  backgrounds,
}: {
  slide: ComparisonSlide;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="comparison"
      trackColor="#10b981"
      backgrounds={backgrounds}
      decorations={<FlowArrow color="#10b981" />}
    >
      <div className="h-full flex flex-col p-16">
        <h2 className="text-4xl font-bold mb-12 text-white">{slide.title}</h2>
        <div className="flex-1 grid grid-cols-2 gap-8">
          {/* Before */}
          <div
            className="rounded-2xl p-8"
            style={{
              ...glassCard,
              background: hexToRgba('#ef4444', 0.08),
              borderColor: hexToRgba('#ef4444', 0.2),
            }}
          >
            <h3 className="text-2xl font-bold mb-6 text-red-400 flex items-center gap-2">
              <span className="text-3xl">✗</span> {slide.beforeTitle}
            </h3>
            <ul className="space-y-4">
              {slide.beforeItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-lg text-red-200">
                  <span className="text-red-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* After */}
          <div
            className="rounded-2xl p-8"
            style={{
              ...glassCard,
              background: hexToRgba('#22c55e', 0.08),
              borderColor: hexToRgba('#22c55e', 0.2),
            }}
          >
            <h3 className="text-2xl font-bold mb-6 text-green-400 flex items-center gap-2">
              <span className="text-3xl">✓</span> {slide.afterTitle}
            </h3>
            <ul className="space-y-4">
              {slide.afterItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-lg text-green-200">
                  <span className="text-green-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        {slide.verdict && (
          <div className="mt-8 text-center">
            <span
              className="text-xl font-medium text-gray-200 px-6 py-3 inline-block"
              style={glassPill}
            >
              {slide.verdict}
            </span>
          </div>
        )}
      </div>
    </SlideBackground>
  );
}

// ============================================================
// QUOTE SLIDE
// ============================================================
function QuoteSlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: QuoteSlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="quote"
      trackColor={trackColor}
      backgrounds={backgrounds}
      overlayOpacity={0.82}
      decorations={<DecorativeQuoteMarks color={trackColor} />}
    >
      <div className="h-full flex flex-col items-center justify-center p-16 text-center">
        <div className="max-w-4xl p-10" style={{ ...glassCard, borderLeft: `4px solid ${trackColor}` }}>
          <Quote className="h-12 w-12 mb-6" style={{ color: trackColor, ...glowShadow(trackColor, 15) }} />
          <blockquote className="text-4xl font-medium leading-relaxed mb-8 text-gray-100 italic">
            &ldquo;{slide.quote}&rdquo;
          </blockquote>
          <p className="text-xl text-gray-400 uppercase tracking-wider">
            — {slide.attribution}
          </p>
          {slide.context && (
            <p className="mt-4 text-lg text-gray-500">{slide.context}</p>
          )}
        </div>
      </div>
    </SlideBackground>
  );
}

// ============================================================
// STAT SLIDE
// ============================================================
function StatSlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: StatSlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="stat"
      trackColor={trackColor}
      backgrounds={backgrounds}
      overlayOpacity={0.78}
      decorations={<PulseRing color={trackColor} size={300} />}
    >
      <div className="h-full flex flex-col items-center justify-center p-16 text-center">
        <div
          className="text-9xl font-bold mb-6"
          style={{
            ...gradientText(trackColor),
            textShadow: `0 0 60px ${hexToRgba(trackColor, 0.3)}`,
          }}
        >
          {slide.stat}
        </div>
        <div className="max-w-3xl p-6" style={glassCard}>
          <h2 className="text-3xl font-medium mb-3 text-gray-100">{slide.label}</h2>
          <p className="text-xl text-gray-400">{slide.context}</p>
        </div>
        {slide.source && (
          <p className="mt-8 text-sm text-gray-500">Source: {slide.source}</p>
        )}
      </div>
    </SlideBackground>
  );
}

// ============================================================
// DEMO SLIDE
// ============================================================
function DemoSlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: DemoSlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="demo"
      trackColor={trackColor}
      backgrounds={backgrounds}
    >
      <div className="h-full flex flex-col items-center justify-center p-16">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
          style={{
            ...glassCard,
            borderRadius: '50%',
            borderColor: hexToRgba(trackColor, 0.3),
            boxShadow: `0 0 30px ${hexToRgba(trackColor, 0.2)}`,
          }}
        >
          <Play className="h-12 w-12" style={{ color: trackColor }} />
        </div>
        <h2 className="text-4xl font-bold mb-4 text-white">{slide.title}</h2>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl text-center">
          {slide.description}
        </p>
        <div className="max-w-2xl w-full p-8" style={glassCard}>
          <h4 className="font-bold mb-4 flex items-center gap-2 text-gray-200">
            <ExternalLink className="h-5 w-5" style={{ color: trackColor }} />
            Demo Instructions
          </h4>
          <ol className="space-y-3">
            {slide.instructions.map((instruction, index) => (
              <li key={index} className="flex items-start gap-3 text-lg">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: trackColor, color: 'white' }}
                >
                  {index + 1}
                </span>
                <span className="text-gray-200">{instruction}</span>
              </li>
            ))}
          </ol>
          {slide.demoUrl && (
            <div
              className="mt-6 p-4 rounded-lg text-sm font-mono text-gray-300"
              style={{ background: 'rgba(0, 0, 0, 0.3)' }}
            >
              {slide.demoUrl}
            </div>
          )}
        </div>
      </div>
    </SlideBackground>
  );
}

// ============================================================
// RECAP SLIDE
// ============================================================
function RecapSlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: RecapSlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="recap"
      trackColor={trackColor}
      backgrounds={backgrounds}
      decorations={<DotGrid color={trackColor} position="right" rows={5} cols={6} />}
    >
      <div className="h-full flex flex-col p-16">
        <div className="flex items-center gap-4 mb-12">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ ...glassCard, borderRadius: '12px' }}
          >
            <Lightbulb className="h-6 w-6" style={{ color: trackColor }} />
          </div>
          <h2 className="text-4xl font-bold text-white">{slide.title}</h2>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <ul className="space-y-4">
            {slide.takeaways.map((takeaway, index) => (
              <li key={index} className="flex items-start gap-4 text-2xl p-5" style={glassCard}>
                <CheckCircle
                  className="h-8 w-8 flex-shrink-0 mt-0.5"
                  style={{ color: trackColor, ...glowShadow(trackColor, 12) }}
                />
                <span className="leading-relaxed text-gray-100">{takeaway}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SlideBackground>
  );
}

// ============================================================
// CTA SLIDE
// ============================================================
function CTASlideComponent({
  slide,
  trackColor,
  backgrounds,
}: {
  slide: CTASlide;
  trackColor: string;
  backgrounds?: Record<string, string>;
}) {
  return (
    <SlideBackground
      slideType="cta"
      trackColor={trackColor}
      backgrounds={backgrounds}
      overlayOpacity={0.7}
      decorations={
        <>
          <GlowOrb color={trackColor} position="top-left" size={300} />
          <GlowOrb color={trackColor} position="bottom-right" size={350} />
        </>
      }
    >
      <div className="h-full flex flex-col items-center justify-center p-16 text-center">
        <h2 className="text-5xl font-bold mb-4 text-white">
          <span style={gradientText(trackColor)}>{slide.title}</span>
        </h2>
        <p className="text-2xl text-gray-300 mb-12">{slide.subtitle}</p>

        <div className="flex gap-6 mb-12">
          <div
            className="px-8 py-4 rounded-xl text-xl font-bold text-white flex items-center gap-3 animate-gradient-rotate"
            style={{
              background: `linear-gradient(135deg, ${trackColor}, ${hexToRgba(trackColor, 0.7)}, ${trackColor})`,
              backgroundSize: '200% 200%',
              boxShadow: `0 0 30px ${hexToRgba(trackColor, 0.3)}`,
            }}
          >
            <ArrowRight className="h-6 w-6" />
            {slide.primaryAction}
          </div>
          {slide.secondaryAction && (
            <div
              className="px-8 py-4 rounded-xl text-xl font-bold flex items-center gap-3 text-gray-200"
              style={glassCard}
            >
              <Download className="h-6 w-6" />
              {slide.secondaryAction}
            </div>
          )}
        </div>

        {slide.nextEpisodeTitle && (
          <div className="mt-8 p-6 max-w-2xl" style={glassCard}>
            <p className="text-sm text-gray-500 mb-2">Next Episode</p>
            <p className="text-xl font-medium text-gray-200">{slide.nextEpisodeTitle}</p>
          </div>
        )}
      </div>
    </SlideBackground>
  );
}
