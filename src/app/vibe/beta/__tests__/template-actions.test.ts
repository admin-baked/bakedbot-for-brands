/**
 * Template Marketplace Actions Unit Tests
 *
 * Tests for template browsing, downloading, and submissions
 */

import {
  searchTemplates,
  getTemplate,
  downloadTemplate,
  submitTemplate,
  favoriteTemplate,
  unfavoriteTemplate,
  addReview,
} from '../template-actions';

// Mock Firestore
jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      get: jest.fn(() => Promise.resolve({ docs: [], empty: true })),
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ exists: false })),
        update: jest.fn(() => Promise.resolve()),
      })),
      add: jest.fn(() => Promise.resolve({ id: 'test_template_id' })),
    })),
  })),
}));

describe('Template Marketplace Actions', () => {
  describe('searchTemplates', () => {
    it('should return empty results when no templates exist', async () => {
      const result = await searchTemplates({});

      expect(result.templates).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by category', async () => {
      const filter = { category: 'dispensary' as const };
      const result = await searchTemplates(filter);

      expect(result).toHaveProperty('templates');
      expect(result).toHaveProperty('total');
    });

    it('should sort by popularity', async () => {
      const filter = { sortBy: 'popular' as const };
      const result = await searchTemplates(filter);

      expect(result).toHaveProperty('templates');
    });

    it('should handle pagination', async () => {
      const result = await searchTemplates({}, 2, 10); // Page 2, 10 per page

      expect(result).toHaveProperty('hasMore');
    });
  });

  describe('getTemplate', () => {
    it('should return null for non-existent template', async () => {
      const result = await getTemplate('non_existent_id');

      expect(result.template).toBeNull();
      expect(result.error).toContain('not found');
    });
  });

  describe('downloadTemplate', () => {
    it('should create new project from template', async () => {
      // Mock will handle the return value
      const result = await downloadTemplate('template_123', 'user_123');

      expect(result).toHaveProperty('success');
    });

    it('should return error for non-existent template', async () => {
      const result = await downloadTemplate('non_existent', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('submitTemplate', () => {
    it('should create template with pending status', async () => {
      const template = {
        name: 'Test Template',
        description: 'A test template',
        category: 'dispensary' as const,
        tags: ['cannabis', 'modern'],
        vibeConfig: {},
        features: ['products' as const],
        thumbnailUrl: 'https://example.com/thumb.png',
        previewImages: [],
        creatorName: 'Test User',
        isOfficial: false,
        downloads: 0,
        favorites: 0,
        rating: 0,
        ratingCount: 0,
        isPremium: false,
      };

      const result = await submitTemplate(template, 'user_123');

      expect(result.success).toBe(true);
      expect(result.templateId).toBeDefined();
    });
  });

  describe('favoriteTemplate', () => {
    it('should add template to favorites', async () => {
      const result = await favoriteTemplate('template_123', 'user_123');

      expect(result).toHaveProperty('success');
    });

    it('should prevent duplicate favorites', async () => {
      // First favorite
      await favoriteTemplate('template_123', 'user_123');

      // Try to favorite again
      const result = await favoriteTemplate('template_123', 'user_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Already favorited');
    });
  });

  describe('addReview', () => {
    it('should add review with valid rating', async () => {
      const result = await addReview(
        'template_123',
        'user_123',
        'Test User',
        5,
        'Great template!'
      );

      expect(result).toHaveProperty('success');
    });

    it('should reject invalid ratings', async () => {
      const result = await addReview(
        'template_123',
        'user_123',
        'Test User',
        6, // Invalid rating (> 5)
        'Test review'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('between 1 and 5');
    });

    it('should prevent duplicate reviews', async () => {
      // First review
      await addReview('template_123', 'user_123', 'Test User', 5, 'Great!');

      // Try to review again
      const result = await addReview(
        'template_123',
        'user_123',
        'Test User',
        4,
        'Still great!'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('already reviewed');
    });
  });
});
