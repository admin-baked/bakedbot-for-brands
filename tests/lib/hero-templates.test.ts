/**
 * Unit Tests for Hero Templates Library
 */

import { describe, it, expect } from '@jest/globals';
import {
  getAllTemplates,
  getTemplatesByCategory,
  getTemplateById,
  applyTemplate,
  HERO_TEMPLATES,
} from '@/lib/hero-templates';

describe('Hero Templates Library', () => {
  describe('getAllTemplates', () => {
    it('should return all available templates', () => {
      const templates = getAllTemplates();

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.length).toBe(10); // We have 10 templates
    });

    it('should return templates with required fields', () => {
      const templates = getAllTemplates();

      templates.forEach(template => {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.template).toBeDefined();
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return only brand templates', () => {
      const brandTemplates = getTemplatesByCategory('brand');

      expect(brandTemplates.length).toBeGreaterThan(0);
      brandTemplates.forEach(template => {
        expect(template.category).toBe('brand');
      });
    });

    it('should return only dispensary templates', () => {
      const dispensaryTemplates = getTemplatesByCategory('dispensary');

      expect(dispensaryTemplates.length).toBeGreaterThan(0);
      dispensaryTemplates.forEach(template => {
        expect(template.category).toBe('dispensary');
      });
    });

    it('should return only event templates', () => {
      const eventTemplates = getTemplatesByCategory('event');

      expect(eventTemplates.length).toBeGreaterThan(0);
      eventTemplates.forEach(template => {
        expect(template.category).toBe('event');
      });
    });

    it('should return empty array for non-existent category', () => {
      const templates = getTemplatesByCategory('non-existent' as any);

      expect(templates).toEqual([]);
    });
  });

  describe('getTemplateById', () => {
    it('should return template by valid ID', () => {
      const template = getTemplateById('premium-flower');

      expect(template).toBeDefined();
      expect(template?.id).toBe('premium-flower');
      expect(template?.name).toBe('Premium Flower Brand');
    });

    it('should return undefined for invalid ID', () => {
      const template = getTemplateById('non-existent');

      expect(template).toBeUndefined();
    });
  });

  describe('applyTemplate', () => {
    it('should create hero from template with brand name', () => {
      const heroData = applyTemplate('premium-flower', 'Test Brand', 'org_123');

      expect(heroData.brandName).toBe('Test Brand');
      expect(heroData.orgId).toBe('org_123');
      expect(heroData.tagline).toBeDefined();
      expect(heroData.primaryColor).toBeDefined();
      expect(heroData.active).toBe(false);
    });

    it('should apply template overrides', () => {
      const heroData = applyTemplate('premium-flower', 'Test Brand', 'org_123', {
        primaryColor: '#FF0000',
        verified: false,
      });

      expect(heroData.primaryColor).toBe('#FF0000');
      expect(heroData.verified).toBe(false);
    });

    it('should throw error for invalid template ID', () => {
      expect(() => {
        applyTemplate('non-existent', 'Test Brand', 'org_123');
      }).toThrow('Template non-existent not found');
    });

    it('should preserve template defaults', () => {
      const heroData = applyTemplate('luxury-brand', 'Luxury Co', 'org_123');

      expect(heroData.style).toBe('professional');
      expect(heroData.purchaseModel).toBe('online_only');
      expect(heroData.shipsNationwide).toBe(true);
    });
  });

  describe('Template Structure Validation', () => {
    it('should have valid template structure', () => {
      HERO_TEMPLATES.forEach(template => {
        // Required fields
        expect(template.id).toBeTruthy();
        expect(template.name).toBeTruthy();
        expect(template.description).toBeTruthy();
        expect(template.category).toBeTruthy();
        expect(template.template).toBeDefined();

        // Template data
        expect(template.template.tagline).toBeDefined();
        expect(template.template.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(template.template.style).toBeDefined();
        expect(template.template.purchaseModel).toBeDefined();
        expect(template.template.primaryCta).toBeDefined();
      });
    });

    it('should have valid categories', () => {
      const validCategories = ['dispensary', 'brand', 'event', 'medical', 'luxury'];

      HERO_TEMPLATES.forEach(template => {
        expect(validCategories).toContain(template.category);
      });
    });

    it('should have unique template IDs', () => {
      const ids = HERO_TEMPLATES.map(t => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Specific Templates', () => {
    it('premium-flower template should have correct properties', () => {
      const template = getTemplateById('premium-flower');

      expect(template?.template.style).toBe('professional');
      expect(template?.template.purchaseModel).toBe('local_pickup');
      expect(template?.template.verified).toBe(true);
      expect(template?.template.stats?.certifications).toContain('Lab Tested');
    });

    it('420-event template should have scheduled activation', () => {
      const template = getTemplateById('420-event');

      expect(template?.template.scheduledActivation).toBeDefined();
      expect(template?.template.scheduledActivation?.autoDeactivate).toBe(true);
      expect(template?.template.style).toBe('bold');
    });

    it('medical-focus template should have consultation CTA', () => {
      const template = getTemplateById('medical-focus');

      expect(template?.template.primaryCta?.action).toBe('custom');
      expect(template?.template.style).toBe('professional');
    });
  });
});
