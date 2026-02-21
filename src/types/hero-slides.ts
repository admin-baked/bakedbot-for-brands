/**
 * Hero Carousel Slide Types
 * Defines promotional slides for the hero carousel section
 */

export type HeroSlideAction = 'scroll' | 'link' | 'none';

export interface HeroSlide {
  id: string;
  orgId: string;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaAction: HeroSlideAction;
  ctaTarget?: string; // URL for 'link' action or element ID for 'scroll'
  imageUrl?: string; // Background image URL
  backgroundColor: string; // Fallback color if no image
  textAlign: 'left' | 'center' | 'right';
  displayOrder: number;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface HeroSlideInput extends Omit<HeroSlide, 'id' | 'createdAt' | 'updatedAt'> {
  // Same as HeroSlide but without id and auto-generated timestamps
}
