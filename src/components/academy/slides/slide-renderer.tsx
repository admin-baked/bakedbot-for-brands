'use client';

/**
 * Slide Renderer Component
 *
 * Renders different slide types for the presenter mode.
 * Optimized for 1920x1080 screen recording.
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

interface SlideRendererProps {
  slide: Slide;
  trackColor?: string;
}

export function SlideRenderer({ slide, trackColor = '#10b981' }: SlideRendererProps) {
  switch (slide.type) {
    case 'title':
      return <TitleSlideComponent slide={slide} />;
    case 'objectives':
      return <ObjectivesSlideComponent slide={slide} trackColor={trackColor} />;
    case 'content':
      return <ContentSlideComponent slide={slide} trackColor={trackColor} />;
    case 'split':
      return <SplitSlideComponent slide={slide} trackColor={trackColor} />;
    case 'agent':
      return <AgentSlideComponent slide={slide} />;
    case 'comparison':
      return <ComparisonSlideComponent slide={slide} />;
    case 'quote':
      return <QuoteSlideComponent slide={slide} trackColor={trackColor} />;
    case 'stat':
      return <StatSlideComponent slide={slide} trackColor={trackColor} />;
    case 'demo':
      return <DemoSlideComponent slide={slide} trackColor={trackColor} />;
    case 'recap':
      return <RecapSlideComponent slide={slide} trackColor={trackColor} />;
    case 'cta':
      return <CTASlideComponent slide={slide} trackColor={trackColor} />;
    default:
      return <div>Unknown slide type</div>;
  }
}

// ============================================================
// TITLE SLIDE
// ============================================================
function TitleSlideComponent({ slide }: { slide: TitleSlide }) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center text-center p-16"
      style={{
        background: `linear-gradient(135deg, ${slide.trackColor || '#10b981'}15, ${slide.trackColor || '#10b981'}05)`,
      }}
    >
      <div
        className="text-sm font-bold uppercase tracking-widest mb-6 px-4 py-2 rounded-full"
        style={{ backgroundColor: `${slide.trackColor || '#10b981'}20`, color: slide.trackColor || '#10b981' }}
      >
        Episode {slide.episodeNumber}
      </div>
      <h1 className="text-6xl font-bold mb-6 max-w-5xl leading-tight">{slide.title}</h1>
      {slide.subtitle && (
        <p className="text-2xl text-muted-foreground max-w-3xl">{slide.subtitle}</p>
      )}
      <div className="mt-16 flex items-center gap-3 text-muted-foreground">
        <img src="/bakedbot-logo.svg" alt="BakedBot" className="h-8 w-8" onError={(e) => (e.currentTarget.style.display = 'none')} />
        <span className="text-lg font-medium">Cannabis Marketing AI Academy</span>
      </div>
    </div>
  );
}

// ============================================================
// OBJECTIVES SLIDE
// ============================================================
function ObjectivesSlideComponent({ slide, trackColor }: { slide: ObjectivesSlide; trackColor: string }) {
  return (
    <div className="h-full flex flex-col p-16">
      <div className="flex items-center gap-4 mb-12">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${trackColor}20` }}
        >
          <Target className="h-6 w-6" style={{ color: trackColor }} />
        </div>
        <h2 className="text-4xl font-bold">{slide.title}</h2>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <ul className="space-y-6">
          {slide.objectives.map((objective, index) => (
            <li key={index} className="flex items-start gap-4 text-2xl">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                style={{ backgroundColor: `${trackColor}20` }}
              >
                <span className="font-bold" style={{ color: trackColor }}>
                  {index + 1}
                </span>
              </div>
              <span className="leading-relaxed">{objective}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// CONTENT SLIDE
// ============================================================
function ContentSlideComponent({ slide, trackColor }: { slide: ContentSlide; trackColor: string }) {
  return (
    <div className="h-full flex flex-col p-16">
      <h2 className="text-4xl font-bold mb-12">{slide.title}</h2>
      <div className="flex-1 flex flex-col justify-center">
        <ul className="space-y-5">
          {slide.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-4 text-2xl">
              <CheckCircle className="h-7 w-7 flex-shrink-0 mt-1" style={{ color: trackColor }} />
              <span className="leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
        {slide.highlight && (
          <div
            className="mt-10 p-6 rounded-2xl text-xl font-medium"
            style={{ backgroundColor: `${trackColor}15`, borderLeft: `4px solid ${trackColor}` }}
          >
            <Lightbulb className="inline h-5 w-5 mr-2" style={{ color: trackColor }} />
            {slide.highlight}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SPLIT SLIDE
// ============================================================
function SplitSlideComponent({ slide, trackColor }: { slide: SplitSlide; trackColor: string }) {
  return (
    <div className="h-full flex flex-col p-16">
      <h2 className="text-4xl font-bold mb-12">{slide.title}</h2>
      <div className="flex-1 grid grid-cols-2 gap-12">
        {/* Left Column */}
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold mb-6 pb-3 border-b-2" style={{ borderColor: trackColor }}>
            {slide.leftTitle}
          </h3>
          <ul className="space-y-4">
            {slide.leftBullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3 text-xl">
                <div className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0" style={{ backgroundColor: trackColor }} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Right Column */}
        <div className="flex flex-col">
          <h3 className="text-2xl font-bold mb-6 pb-3 border-b-2 border-muted-foreground/30">
            {slide.rightTitle}
          </h3>
          <ul className="space-y-4">
            {slide.rightBullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3 text-xl">
                <div className="w-2 h-2 rounded-full mt-2.5 flex-shrink-0 bg-muted-foreground/50" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
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

function AgentSlideComponent({ slide }: { slide: AgentSlide }) {
  const IconComponent = AGENT_ICONS[slide.icon] || Leaf;
  // Check if we have a real image for this agent
  const agentAsset = AGENT_ASSETS[slide.agentId as AgentTrack];

  return (
    <div className="h-full flex items-center p-16">
      <div className="flex-1 grid grid-cols-5 gap-12 items-center">
        {/* Agent Avatar */}
        <div className="col-span-2 flex flex-col items-center">
          {agentAsset?.hasImage && agentAsset.imagePath ? (
            <div className="w-56 h-56 flex items-center justify-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={agentAsset.imagePath}
                alt={slide.agentName}
                className="max-w-full max-h-full object-contain drop-shadow-2xl"
              />
            </div>
          ) : (
            <div
              className="w-48 h-48 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: `${slide.color}20` }}
            >
              <IconComponent className="h-24 w-24" style={{ color: slide.color }} />
            </div>
          )}
          <h2 className="text-3xl font-bold text-center">{slide.agentName}</h2>
          <p className="text-xl text-muted-foreground text-center mt-2">{slide.tagline}</p>
        </div>

        {/* Agent Info */}
        <div className="col-span-3">
          <p className="text-xl mb-8 leading-relaxed">{slide.description}</p>
          <h4 className="text-lg font-bold uppercase tracking-wide mb-4" style={{ color: slide.color }}>
            Key Capabilities
          </h4>
          <ul className="space-y-4">
            {slide.capabilities.map((capability, index) => (
              <li key={index} className="flex items-start gap-3 text-lg">
                <CheckCircle className="h-6 w-6 flex-shrink-0 mt-0.5" style={{ color: slide.color }} />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPARISON SLIDE
// ============================================================
function ComparisonSlideComponent({ slide }: { slide: ComparisonSlide }) {
  return (
    <div className="h-full flex flex-col p-16">
      <h2 className="text-4xl font-bold mb-12">{slide.title}</h2>
      <div className="flex-1 grid grid-cols-2 gap-8">
        {/* Before */}
        <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-red-600 dark:text-red-400 flex items-center gap-2">
            <span className="text-3xl">✗</span> {slide.beforeTitle}
          </h3>
          <ul className="space-y-4">
            {slide.beforeItems.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-lg text-red-900 dark:text-red-200">
                <span className="text-red-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* After */}
        <div className="bg-green-50 dark:bg-green-950/20 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6 text-green-600 dark:text-green-400 flex items-center gap-2">
            <span className="text-3xl">✓</span> {slide.afterTitle}
          </h3>
          <ul className="space-y-4">
            {slide.afterItems.map((item, index) => (
              <li key={index} className="flex items-start gap-3 text-lg text-green-900 dark:text-green-200">
                <span className="text-green-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {slide.verdict && (
        <div className="mt-8 text-center text-xl font-medium text-muted-foreground">
          {slide.verdict}
        </div>
      )}
    </div>
  );
}

// ============================================================
// QUOTE SLIDE
// ============================================================
function QuoteSlideComponent({ slide, trackColor }: { slide: QuoteSlide; trackColor: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-16 text-center">
      <Quote className="h-16 w-16 mb-8" style={{ color: trackColor }} />
      <blockquote className="text-4xl font-medium max-w-4xl leading-relaxed mb-8">
        "{slide.quote}"
      </blockquote>
      <p className="text-xl text-muted-foreground">— {slide.attribution}</p>
      {slide.context && (
        <p className="mt-4 text-lg text-muted-foreground/70">{slide.context}</p>
      )}
    </div>
  );
}

// ============================================================
// STAT SLIDE
// ============================================================
function StatSlideComponent({ slide, trackColor }: { slide: StatSlide; trackColor: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-16 text-center">
      <div className="text-9xl font-bold mb-6" style={{ color: trackColor }}>
        {slide.stat}
      </div>
      <h2 className="text-3xl font-medium max-w-3xl mb-4">{slide.label}</h2>
      <p className="text-xl text-muted-foreground max-w-2xl">{slide.context}</p>
      {slide.source && (
        <p className="mt-8 text-sm text-muted-foreground/60">Source: {slide.source}</p>
      )}
    </div>
  );
}

// ============================================================
// DEMO SLIDE
// ============================================================
function DemoSlideComponent({ slide, trackColor }: { slide: DemoSlide; trackColor: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-16">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
        style={{ backgroundColor: `${trackColor}20` }}
      >
        <Play className="h-12 w-12" style={{ color: trackColor }} />
      </div>
      <h2 className="text-4xl font-bold mb-4">{slide.title}</h2>
      <p className="text-xl text-muted-foreground mb-12 max-w-2xl text-center">
        {slide.description}
      </p>
      <div className="bg-muted/50 rounded-2xl p-8 max-w-2xl w-full">
        <h4 className="font-bold mb-4 flex items-center gap-2">
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
              <span>{instruction}</span>
            </li>
          ))}
        </ol>
        {slide.demoUrl && (
          <div className="mt-6 p-4 bg-background rounded-lg text-sm font-mono">
            {slide.demoUrl}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// RECAP SLIDE
// ============================================================
function RecapSlideComponent({ slide, trackColor }: { slide: RecapSlide; trackColor: string }) {
  return (
    <div className="h-full flex flex-col p-16">
      <div className="flex items-center gap-4 mb-12">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${trackColor}20` }}
        >
          <Lightbulb className="h-6 w-6" style={{ color: trackColor }} />
        </div>
        <h2 className="text-4xl font-bold">{slide.title}</h2>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <ul className="space-y-6">
          {slide.takeaways.map((takeaway, index) => (
            <li key={index} className="flex items-start gap-4 text-2xl">
              <CheckCircle className="h-8 w-8 flex-shrink-0 mt-0.5" style={{ color: trackColor }} />
              <span className="leading-relaxed">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// CTA SLIDE
// ============================================================
function CTASlideComponent({ slide, trackColor }: { slide: CTASlide; trackColor: string }) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center p-16 text-center"
      style={{
        background: `linear-gradient(135deg, ${trackColor}15, ${trackColor}05)`,
      }}
    >
      <h2 className="text-5xl font-bold mb-4">{slide.title}</h2>
      <p className="text-2xl text-muted-foreground mb-12">{slide.subtitle}</p>

      <div className="flex gap-6 mb-12">
        <div
          className="px-8 py-4 rounded-xl text-xl font-bold text-white flex items-center gap-3"
          style={{ backgroundColor: trackColor }}
        >
          <ArrowRight className="h-6 w-6" />
          {slide.primaryAction}
        </div>
        {slide.secondaryAction && (
          <div className="px-8 py-4 rounded-xl text-xl font-bold border-2 flex items-center gap-3">
            <Download className="h-6 w-6" />
            {slide.secondaryAction}
          </div>
        )}
      </div>

      {slide.nextEpisodeTitle && (
        <div className="mt-8 p-6 bg-background/50 rounded-2xl max-w-2xl">
          <p className="text-sm text-muted-foreground mb-2">Next Episode</p>
          <p className="text-xl font-medium">{slide.nextEpisodeTitle}</p>
        </div>
      )}
    </div>
  );
}
