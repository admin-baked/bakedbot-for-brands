/**
 * Type definitions for Academy Slide Presentations
 *
 * Used for creating YouTube video content through screen recording.
 * Supports various slide types optimized for 1920x1080 recording.
 */

export type SlideType =
  | 'title'           // Episode title slide with big text
  | 'objectives'      // Learning objectives list
  | 'content'         // Standard content with header + bullets
  | 'split'           // Two-column layout
  | 'agent'           // Agent character introduction
  | 'comparison'      // Before/After or A vs B
  | 'quote'           // Big quote with attribution
  | 'stat'            // Big statistic with context
  | 'demo'            // Demo placeholder with instructions
  | 'recap'           // Key takeaways list
  | 'cta';            // Call to action / next steps

export interface BaseSlide {
  id: string;
  type: SlideType;
  notes?: string; // Speaker notes (not shown on screen)
}

export interface TitleSlide extends BaseSlide {
  type: 'title';
  episodeNumber: number;
  title: string;
  subtitle?: string;
  trackColor?: string; // Agent track color
}

export interface ObjectivesSlide extends BaseSlide {
  type: 'objectives';
  title: string;
  objectives: string[];
}

export interface ContentSlide extends BaseSlide {
  type: 'content';
  title: string;
  bullets: string[];
  image?: string; // Optional image path
  highlight?: string; // Optional highlighted text
}

export interface SplitSlide extends BaseSlide {
  type: 'split';
  title: string;
  leftTitle: string;
  leftBullets: string[];
  rightTitle: string;
  rightBullets: string[];
}

export interface AgentSlide extends BaseSlide {
  type: 'agent';
  agentId: string;
  agentName: string;
  tagline: string;
  description: string;
  capabilities: string[];
  color: string;
  icon: string;
}

export interface ComparisonSlide extends BaseSlide {
  type: 'comparison';
  title: string;
  beforeTitle: string;
  beforeItems: string[];
  afterTitle: string;
  afterItems: string[];
  verdict?: string;
}

export interface QuoteSlide extends BaseSlide {
  type: 'quote';
  quote: string;
  attribution: string;
  context?: string;
}

export interface StatSlide extends BaseSlide {
  type: 'stat';
  stat: string;
  label: string;
  context: string;
  source?: string;
}

export interface DemoSlide extends BaseSlide {
  type: 'demo';
  title: string;
  description: string;
  demoUrl?: string; // URL to navigate to for demo
  instructions: string[];
}

export interface RecapSlide extends BaseSlide {
  type: 'recap';
  title: string;
  takeaways: string[];
}

export interface CTASlide extends BaseSlide {
  type: 'cta';
  title: string;
  subtitle: string;
  primaryAction: string;
  primaryUrl: string;
  secondaryAction?: string;
  secondaryUrl?: string;
  nextEpisodeTitle?: string;
}

export type Slide =
  | TitleSlide
  | ObjectivesSlide
  | ContentSlide
  | SplitSlide
  | AgentSlide
  | ComparisonSlide
  | QuoteSlide
  | StatSlide
  | DemoSlide
  | RecapSlide
  | CTASlide;

export interface EpisodePresentation {
  episodeId: string;
  episodeNumber: number;
  title: string;
  track: string;
  trackColor: string;
  estimatedDuration: number; // minutes
  slides: Slide[];
}
