/**
 * Google Analytics Integration for Heroes
 *
 * Track hero banner performance in Google Analytics.
 */

// Declare gtag function for TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export interface GAHeroEvent {
  heroId: string;
  heroName: string;
  action: 'view' | 'cta_click' | 'video_play' | 'video_complete';
  ctaType?: 'primary' | 'secondary';
  ctaLabel?: string;
}

/**
 * Track hero banner view
 */
export function trackHeroView(heroId: string, heroName: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'hero_view', {
    event_category: 'Hero Banners',
    event_label: heroName,
    hero_id: heroId,
    hero_name: heroName,
  });
}

/**
 * Track hero CTA click
 */
export function trackHeroCtaClick(
  heroId: string,
  heroName: string,
  ctaType: 'primary' | 'secondary',
  ctaLabel: string
) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'hero_cta_click', {
    event_category: 'Hero Banners',
    event_label: `${heroName} - ${ctaLabel}`,
    hero_id: heroId,
    hero_name: heroName,
    cta_type: ctaType,
    cta_label: ctaLabel,
  });

  // Also track as conversion
  window.gtag('event', 'conversion', {
    send_to: 'AW-CONVERSION_ID/CONVERSION_LABEL', // Replace with actual conversion ID
    value: 1.0,
    currency: 'USD',
  });
}

/**
 * Track hero video play
 */
export function trackHeroVideoPlay(heroId: string, heroName: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'hero_video_play', {
    event_category: 'Hero Banners',
    event_label: heroName,
    hero_id: heroId,
    hero_name: heroName,
  });
}

/**
 * Track hero video complete
 */
export function trackHeroVideoComplete(heroId: string, heroName: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'hero_video_complete', {
    event_category: 'Hero Banners',
    event_label: heroName,
    hero_id: heroId,
    hero_name: heroName,
  });
}

/**
 * Track hero A/B test impression
 */
export function trackHeroABTest(
  heroId: string,
  heroName: string,
  testId: string,
  variant: 'A' | 'B'
) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'hero_ab_test', {
    event_category: 'Hero Banners',
    event_label: `${heroName} - Variant ${variant}`,
    hero_id: heroId,
    hero_name: heroName,
    test_id: testId,
    variant: variant,
  });
}

/**
 * Initialize Google Analytics with hero-specific dimensions
 */
export function initializeHeroAnalytics(measurementId: string) {
  if (typeof window === 'undefined') return;

  // Load gtag.js
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer?.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    // Custom dimensions for hero tracking
    custom_map: {
      dimension1: 'hero_id',
      dimension2: 'hero_name',
      dimension3: 'cta_type',
      dimension4: 'test_id',
      dimension5: 'variant',
    },
  });
}

/**
 * Track enhanced e-commerce for hero CTAs
 */
export function trackHeroEcommerce(
  heroId: string,
  heroName: string,
  action: 'product_click' | 'begin_checkout'
) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    items: [{
      item_id: heroId,
      item_name: heroName,
      item_category: 'Hero Banner',
      price: 0,
    }],
  });
}
