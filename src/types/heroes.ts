/**
 * Hero Banner Types
 *
 * Type definitions for hero banners used on brand and dispensary menu pages.
 */

export type HeroStyle = 'default' | 'minimal' | 'bold' | 'professional';

export type HeroPurchaseModel = 'online_only' | 'local_pickup' | 'hybrid';

export type HeroCtaAction = 'find_near_me' | 'shop_now' | 'custom';

export interface HeroStats {
  products?: number;
  retailers?: number;
  rating?: number;
  yearsInBusiness?: number;
  certifications?: string[]; // e.g., ["Organic", "Lab Tested", "Veteran Owned"]
  awards?: string[]; // e.g., ["Best Edibles 2025", "People's Choice"]
}

export interface HeroCta {
  label: string;
  action: HeroCtaAction;
  url?: string;
}

export interface Hero {
  id: string;
  orgId: string;
  brandId?: string;
  dispensaryId?: string;

  // Content
  brandName: string;
  brandLogo?: string;
  tagline: string;
  description?: string;
  heroImage?: string;

  // Video Background (Phase 3)
  videoBackground?: {
    url: string;
    posterImage?: string; // Fallback image while loading
    muted?: boolean;
    loop?: boolean;
    autoplay?: boolean;
  };

  // Style
  primaryColor: string;
  style: HeroStyle;

  // Stats
  stats?: HeroStats;

  // E-commerce
  purchaseModel: HeroPurchaseModel;
  shipsNationwide?: boolean;

  // CTAs
  primaryCta: HeroCta;
  secondaryCta?: HeroCta;

  // Status
  active: boolean;
  displayOrder: number;

  // Metadata
  verified?: boolean;

  // Multi-language (Phase 3)
  languages?: {
    [languageCode: string]: {
      tagline: string;
      description?: string;
      primaryCtaLabel?: string;
      secondaryCtaLabel?: string;
    };
  };

  // Location Personalization (Phase 3)
  locationPersonalization?: {
    enabled: boolean;
    rules: Array<{
      condition: 'state' | 'city' | 'zipCode';
      value: string;
      customCta?: {
        label: string;
        url: string;
      };
      customMessage?: string;
    }>;
  };

  // Scheduled Activation (Phase 2)
  scheduledActivation?: {
    startDate: Date;
    endDate?: Date;
    autoDeactivate?: boolean;
  };

  // Analytics (Phase 2)
  analytics?: {
    views: number;
    ctaClicks: {
      primary: number;
      secondary: number;
    };
    lastViewed?: Date;
    conversionRate?: number; // CTA clicks / views
  };

  // A/B Testing (Phase 2)
  abTest?: {
    testId: string;
    variant: 'A' | 'B';
    startDate: Date;
    endDate?: Date;
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AI Suggestion Response
 */
export interface HeroAISuggestion {
  brandName: string;
  tagline: string;
  description: string;
  primaryColor: string;
  style: HeroStyle;
  purchaseModel: HeroPurchaseModel;
  primaryCta: HeroCta;
  secondaryCta?: HeroCta;
  reasoning: string;
}
