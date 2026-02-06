/**
 * Unit Tests for Hero Personalization
 */

import { describe, it, expect } from '@jest/globals';
import { personalizeHero, getUserContextFromHeaders } from '@/server/services/hero-personalization';
import type { Hero } from '@/types/heroes';
import type { UserContext } from '@/server/services/hero-personalization';

describe('Hero Personalization', () => {
  const mockHero: Hero = {
    id: 'hero_123',
    orgId: 'org_test',
    brandName: 'Test Brand',
    tagline: 'Premium Cannabis',
    description: 'Default description',
    primaryColor: '#16a34a',
    style: 'default',
    purchaseModel: 'local_pickup',
    primaryCta: {
      label: 'Find Near Me',
      action: 'find_near_me',
    },
    active: true,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('personalizeHero', () => {
    it('should return original hero when no personalization configured', () => {
      const context: UserContext = {
        location: { state: 'CA' },
        language: 'en',
      };

      const personalized = personalizeHero(mockHero, context);

      expect(personalized).toEqual(mockHero);
    });

    it('should apply location-based custom CTA', () => {
      const heroWithLocation: Hero = {
        ...mockHero,
        locationPersonalization: {
          enabled: true,
          rules: [
            {
              condition: 'state',
              value: 'CA',
              customCta: {
                label: 'Get Delivered Today',
                url: '/delivery/ca',
              },
            },
          ],
        },
      };

      const context: UserContext = {
        location: { state: 'CA' },
      };

      const personalized = personalizeHero(heroWithLocation, context);

      expect(personalized.primaryCta.label).toBe('Get Delivered Today');
      expect(personalized.primaryCta.action).toBe('custom');
      expect(personalized.primaryCta.url).toBe('/delivery/ca');
    });

    it('should apply location-based custom message', () => {
      const heroWithLocation: Hero = {
        ...mockHero,
        locationPersonalization: {
          enabled: true,
          rules: [
            {
              condition: 'city',
              value: 'Denver',
              customMessage: 'Welcome, Denver! Visit our downtown location.',
            },
          ],
        },
      };

      const context: UserContext = {
        location: { city: 'Denver' },
      };

      const personalized = personalizeHero(heroWithLocation, context);

      expect(personalized.description).toBe('Welcome, Denver! Visit our downtown location.');
    });

    it('should match case-insensitive location values', () => {
      const heroWithLocation: Hero = {
        ...mockHero,
        locationPersonalization: {
          enabled: true,
          rules: [
            {
              condition: 'state',
              value: 'CA',
              customMessage: 'California exclusive offer!',
            },
          ],
        },
      };

      const context: UserContext = {
        location: { state: 'ca' }, // lowercase
      };

      const personalized = personalizeHero(heroWithLocation, context);

      expect(personalized.description).toBe('California exclusive offer!');
    });

    it('should apply first matching location rule', () => {
      const heroWithLocation: Hero = {
        ...mockHero,
        locationPersonalization: {
          enabled: true,
          rules: [
            {
              condition: 'state',
              value: 'CA',
              customMessage: 'California message',
            },
            {
              condition: 'city',
              value: 'Los Angeles',
              customMessage: 'LA message',
            },
          ],
        },
      };

      const context: UserContext = {
        location: { state: 'CA', city: 'Los Angeles' },
      };

      const personalized = personalizeHero(heroWithLocation, context);

      // Should apply first matching rule (state)
      expect(personalized.description).toBe('California message');
    });

    it('should apply language localization', () => {
      const heroWithLanguages: Hero = {
        ...mockHero,
        languages: {
          es: {
            tagline: 'Cannabis Premium',
            description: 'Descripción en español',
            primaryCtaLabel: 'Encontrar Cerca',
          },
        },
      };

      const context: UserContext = {
        language: 'es',
      };

      const personalized = personalizeHero(heroWithLanguages, context);

      expect(personalized.tagline).toBe('Cannabis Premium');
      expect(personalized.description).toBe('Descripción en español');
      expect(personalized.primaryCta.label).toBe('Encontrar Cerca');
    });

    it('should apply secondary CTA label from language', () => {
      const heroWithLanguages: Hero = {
        ...mockHero,
        secondaryCta: {
          label: 'Shop Now',
          action: 'shop_now',
        },
        languages: {
          fr: {
            tagline: 'Cannabis Premium',
            secondaryCtaLabel: 'Acheter Maintenant',
          },
        },
      };

      const context: UserContext = {
        language: 'fr',
      };

      const personalized = personalizeHero(heroWithLanguages, context);

      expect(personalized.secondaryCta?.label).toBe('Acheter Maintenant');
    });

    it('should combine location and language personalization', () => {
      const hero: Hero = {
        ...mockHero,
        languages: {
          es: {
            tagline: 'Cannabis Premium',
          },
        },
        locationPersonalization: {
          enabled: true,
          rules: [
            {
              condition: 'state',
              value: 'CA',
              customMessage: 'Entrega el mismo día en California',
            },
          ],
        },
      };

      const context: UserContext = {
        language: 'es',
        location: { state: 'CA' },
      };

      const personalized = personalizeHero(hero, context);

      expect(personalized.tagline).toBe('Cannabis Premium');
      expect(personalized.description).toBe('Entrega el mismo día en California');
    });

    it('should not apply personalization when location personalization is disabled', () => {
      const hero: Hero = {
        ...mockHero,
        locationPersonalization: {
          enabled: false,
          rules: [
            {
              condition: 'state',
              value: 'CA',
              customMessage: 'California message',
            },
          ],
        },
      };

      const context: UserContext = {
        location: { state: 'CA' },
      };

      const personalized = personalizeHero(hero, context);

      expect(personalized.description).toBe(mockHero.description);
    });
  });

  describe('getUserContextFromHeaders', () => {
    it('should extract location from Cloudflare headers', () => {
      const headers = new Headers({
        'cf-ipcity': 'San Francisco',
        'cf-region': 'CA',
        'cf-ipcountry': 'US',
        'accept-language': 'en-US,en;q=0.9',
      });

      const context = getUserContextFromHeaders(headers);

      expect(context.location?.city).toBe('San Francisco');
      expect(context.location?.state).toBe('CA');
      expect(context.location?.country).toBe('US');
      expect(context.language).toBe('en');
    });

    it('should extract language from Accept-Language header', () => {
      const headers = new Headers({
        'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
      });

      const context = getUserContextFromHeaders(headers);

      expect(context.language).toBe('es');
    });

    it('should default to "en" when no Accept-Language header', () => {
      const headers = new Headers({});

      const context = getUserContextFromHeaders(headers);

      expect(context.language).toBe('en');
    });

    it('should handle missing location headers gracefully', () => {
      const headers = new Headers({
        'accept-language': 'en-US',
      });

      const context = getUserContextFromHeaders(headers);

      expect(context.location).toBeUndefined();
      expect(context.language).toBe('en');
    });
  });
});
