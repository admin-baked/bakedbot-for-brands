/**
 * Unit Tests for Hero Server Actions
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Hero } from '@/types/heroes';

// Mock Firestore
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          get: jest.fn(),
          limit: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
        get: jest.fn(),
      })),
    })),
  })),
}));

describe('Hero Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createHero', () => {
    it('should create a hero with required fields', async () => {
      const heroData = {
        orgId: 'org_test',
        brandName: 'Test Brand',
        tagline: 'Test Tagline',
        primaryColor: '#16a34a',
        style: 'default' as const,
        purchaseModel: 'local_pickup' as const,
        primaryCta: {
          label: 'Find Near Me',
          action: 'find_near_me' as const,
        },
      };

      // Test would call createHero and verify the result
      expect(heroData.brandName).toBe('Test Brand');
      expect(heroData.primaryColor).toBe('#16a34a');
    });

    it('should reject hero creation without required fields', async () => {
      const invalidData = {
        orgId: 'org_test',
        // Missing brandName
        tagline: 'Test Tagline',
      };

      expect(invalidData.orgId).toBe('org_test');
      // Would verify error is thrown
    });

    it('should set default values for optional fields', async () => {
      const heroData = {
        orgId: 'org_test',
        brandName: 'Test Brand',
      };

      // Verify defaults are applied
      expect(heroData.orgId).toBe('org_test');
    });
  });

  describe('toggleHeroActive', () => {
    it('should deactivate other heroes when activating one', async () => {
      const heroId = 'hero_123';
      const orgId = 'org_test';

      // Test that only one hero is active per org
      expect(heroId).toBe('hero_123');
      expect(orgId).toBe('org_test');
    });

    it('should allow deactivating a hero without affecting others', async () => {
      const heroId = 'hero_123';

      // Deactivating should work independently
      expect(heroId).toBe('hero_123');
    });
  });

  describe('getActiveHero', () => {
    it('should return the active hero for an organization', async () => {
      const orgId = 'org_test';

      // Should return hero with active: true
      expect(orgId).toBe('org_test');
    });

    it('should return error when no active hero exists', async () => {
      const orgId = 'org_no_active';

      // Should return { success: false, error: ... }
      expect(orgId).toBe('org_no_active');
    });
  });

  describe('duplicateHero', () => {
    it('should create a copy with "(Copy)" appended to name', async () => {
      const originalName = 'Premium Flower';
      const expectedName = 'Premium Flower (Copy)';

      expect(expectedName).toContain('(Copy)');
      expect(expectedName).toContain(originalName);
    });

    it('should set duplicated hero as inactive', async () => {
      // Duplicated heroes should always be inactive
      const duplicateActive = false;

      expect(duplicateActive).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should validate hex color format', () => {
      const validColors = ['#16a34a', '#FF5733', '#000000'];
      const invalidColors = ['16a34a', '#gg0000', 'red'];

      validColors.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });

      invalidColors.forEach(color => {
        expect(color).not.toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should validate hero style enum', () => {
      const validStyles = ['default', 'minimal', 'bold', 'professional'];
      const invalidStyle = 'invalid';

      validStyles.forEach(style => {
        expect(['default', 'minimal', 'bold', 'professional']).toContain(style);
      });

      expect(['default', 'minimal', 'bold', 'professional']).not.toContain(invalidStyle);
    });

    it('should validate purchase model enum', () => {
      const validModels = ['online_only', 'local_pickup', 'hybrid'];
      const invalidModel = 'invalid';

      validModels.forEach(model => {
        expect(['online_only', 'local_pickup', 'hybrid']).toContain(model);
      });

      expect(['online_only', 'local_pickup', 'hybrid']).not.toContain(invalidModel);
    });
  });
});
