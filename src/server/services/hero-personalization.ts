/**
 * Hero Personalization Service
 *
 * Personalize hero content based on user location and language.
 */

import type { Hero } from '@/types/heroes';

export interface UserContext {
  location?: {
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  language?: string; // e.g., 'en', 'es', 'fr'
  ip?: string;
}

/**
 * Personalize hero based on user context
 */
export function personalizeHero(hero: Hero, context: UserContext): Hero {
  let personalizedHero = { ...hero };

  // Apply location personalization
  if (hero.locationPersonalization?.enabled && context.location) {
    const matchingRule = hero.locationPersonalization.rules.find(rule => {
      switch (rule.condition) {
        case 'state':
          return context.location?.state?.toLowerCase() === rule.value.toLowerCase();
        case 'city':
          return context.location?.city?.toLowerCase() === rule.value.toLowerCase();
        case 'zipCode':
          return context.location?.zipCode === rule.value;
        default:
          return false;
      }
    });

    if (matchingRule) {
      // Apply custom CTA
      if (matchingRule.customCta) {
        personalizedHero.primaryCta = {
          ...matchingRule.customCta,
          action: 'custom',
        };
      }

      // Apply custom message
      if (matchingRule.customMessage) {
        personalizedHero.description = matchingRule.customMessage;
      }
    }
  }

  // Apply language localization
  if (hero.languages && context.language) {
    const languageContent = hero.languages[context.language];
    if (languageContent) {
      personalizedHero.tagline = languageContent.tagline;
      if (languageContent.description) {
        personalizedHero.description = languageContent.description;
      }
      if (languageContent.primaryCtaLabel) {
        personalizedHero.primaryCta = {
          ...personalizedHero.primaryCta,
          label: languageContent.primaryCtaLabel,
        };
      }
      if (languageContent.secondaryCtaLabel && personalizedHero.secondaryCta) {
        personalizedHero.secondaryCta = {
          ...personalizedHero.secondaryCta,
          label: languageContent.secondaryCtaLabel,
        };
      }
    }
  }

  return personalizedHero;
}

/**
 * Get user context from request headers
 */
export function getUserContextFromHeaders(headers: Headers): UserContext {
  // Get location from Cloudflare or similar headers
  const city = headers.get('cf-ipcity') || headers.get('x-vercel-ip-city');
  const state = headers.get('cf-region') || headers.get('x-vercel-ip-country-region');
  const country = headers.get('cf-ipcountry') || headers.get('x-vercel-ip-country');
  const ip = headers.get('cf-connecting-ip') || headers.get('x-forwarded-for') || headers.get('x-real-ip');

  // Get language from Accept-Language header
  const acceptLanguage = headers.get('accept-language');
  const language = acceptLanguage?.split(',')[0]?.split('-')[0] || 'en';

  return {
    location: city || state || country ? {
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
    } : undefined,
    language,
    ip: ip || undefined,
  };
}

/**
 * Get location from IP address (fallback using ipapi.co)
 */
export async function getLocationFromIP(ip: string): Promise<UserContext['location'] | null> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    if (!response.ok) return null;

    const data = await response.json();
    return {
      city: data.city,
      state: data.region_code,
      zipCode: data.postal,
      country: data.country_code,
    };
  } catch (error) {
    console.error('Error fetching location from IP:', error);
    return null;
  }
}

/**
 * Example personalization rules
 */
export const EXAMPLE_PERSONALIZATION_RULES = {
  california: {
    condition: 'state' as const,
    value: 'CA',
    customMessage: 'Now delivering to your area! Same-day delivery available in California.',
    customCta: {
      label: 'Get Delivered Today',
      url: '/delivery',
    },
  },
  colorado: {
    condition: 'state' as const,
    value: 'CO',
    customMessage: 'Visit our locations across Colorado. Pickup in-store or curbside.',
    customCta: {
      label: 'Find Your Store',
      url: '/locations',
    },
  },
  denver: {
    condition: 'city' as const,
    value: 'Denver',
    customMessage: 'Welcome, Denver! Visit our downtown location or order for delivery.',
    customCta: {
      label: 'Denver Locations',
      url: '/locations/denver',
    },
  },
};
