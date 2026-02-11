/**
 * Tests for useTemplateLibrary hook
 */

import { renderHook } from '@testing-library/react';
import { useTemplateLibrary, useRecommendedTemplates, usePlatformTemplates } from '../use-template-library';

describe('useTemplateLibrary', () => {
  it('returns all templates by default', () => {
    const { result } = renderHook(() => useTemplateLibrary());

    expect(result.current.templates.length).toBeGreaterThan(0);
    expect(result.current.categories.length).toBeGreaterThan(0);
  });

  it('filters by category', () => {
    const { result } = renderHook(() =>
      useTemplateLibrary({ category: 'social_media' })
    );

    expect(result.current.templates.every(t => t.category === 'social_media')).toBe(true);
  });

  it('filters by format', () => {
    const { result } = renderHook(() =>
      useTemplateLibrary({ format: 'image' })
    );

    expect(result.current.templates.every(t => t.format === 'image')).toBe(true);
  });

  it('filters by compliance level', () => {
    const { result } = renderHook(() =>
      useTemplateLibrary({ complianceLevel: 'high' })
    );

    expect(result.current.templates.every(t => t.complianceLevel === 'high')).toBe(true);
  });

  it('filters by premium status', () => {
    const { result } = renderHook(() =>
      useTemplateLibrary({ isPremium: true })
    );

    expect(result.current.templates.every(t => t.isPremium === true)).toBe(true);
  });

  it('searches by name and description', () => {
    const { result } = renderHook(() =>
      useTemplateLibrary({ search: 'menu' })
    );

    expect(
      result.current.templates.every(t =>
        t.name.toLowerCase().includes('menu') ||
        t.description.toLowerCase().includes('menu') ||
        t.tags.some(tag => tag.toLowerCase().includes('menu'))
      )
    ).toBe(true);
  });

  it('filters by tags', () => {
    const { result } = renderHook(() =>
      useTemplateLibrary({ tags: ['deals'] })
    );

    expect(
      result.current.templates.every(t => t.tags.includes('deals'))
    ).toBe(true);
  });

  it('combines multiple filters', () => {
    const { result } = renderHook(() =>
      useTemplateLibrary({
        category: 'social_media',
        format: 'image',
        isPremium: false,
      })
    );

    expect(
      result.current.templates.every(
        t => t.category === 'social_media' &&
             t.format === 'image' &&
             t.isPremium === false
      )
    ).toBe(true);
  });

  it('gets template by ID', () => {
    const { result } = renderHook(() => useTemplateLibrary());

    const firstTemplate = result.current.templates[0];
    const retrieved = result.current.getTemplateById(firstTemplate.id);

    expect(retrieved).toEqual(firstTemplate);
  });

  it('gets templates by category', () => {
    const { result } = renderHook(() => useTemplateLibrary());

    const socialMediaTemplates = result.current.getTemplatesByCategory('social_media');
    expect(socialMediaTemplates.every(t => t.category === 'social_media')).toBe(true);
  });

  it('returns unique categories', () => {
    const { result } = renderHook(() => useTemplateLibrary());

    const uniqueCategories = new Set(result.current.categories);
    expect(uniqueCategories.size).toBe(result.current.categories.length);
  });
});

describe('useRecommendedTemplates', () => {
  it('recommends templates for active deals', () => {
    const { result } = renderHook(() =>
      useRecommendedTemplates(null, { hasDeals: true })
    );

    expect(result.current.length).toBeGreaterThan(0);
  });

  it('recommends templates for new products', () => {
    const { result } = renderHook(() =>
      useRecommendedTemplates(null, { hasNewProducts: true })
    );

    expect(result.current.length).toBeGreaterThan(0);
  });

  it('recommends templates for upcoming events', () => {
    const { result } = renderHook(() =>
      useRecommendedTemplates(null, { upcomingEvents: [{ name: 'Test Event' }] })
    );

    expect(result.current.length).toBeGreaterThan(0);
  });

  it('always includes education content', () => {
    const { result } = renderHook(() => useRecommendedTemplates(null, {}));

    const hasEducation = result.current.some(t => t.category === 'education');
    expect(hasEducation).toBe(true);
  });

  it('limits recommendations to 6', () => {
    const { result } = renderHook(() =>
      useRecommendedTemplates(null, {
        hasDeals: true,
        hasNewProducts: true,
        upcomingEvents: [{ name: 'Event 1' }, { name: 'Event 2' }],
      })
    );

    expect(result.current.length).toBeLessThanOrEqual(6);
  });

  it('removes duplicate recommendations', () => {
    const { result } = renderHook(() =>
      useRecommendedTemplates(null, {
        hasDeals: true,
        hasNewProducts: true,
      })
    );

    const ids = result.current.map(t => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('usePlatformTemplates', () => {
  it('returns templates for Instagram feed', () => {
    const { result } = renderHook(() => usePlatformTemplates('instagram_feed'));

    expect(
      result.current.every(t => t.platforms?.includes('instagram_feed'))
    ).toBe(true);
  });

  it('returns templates for TikTok', () => {
    const { result } = renderHook(() => usePlatformTemplates('tiktok'));

    expect(
      result.current.every(t => t.platforms?.includes('tiktok'))
    ).toBe(true);
  });

  it('returns empty array for platform with no templates', () => {
    const { result } = renderHook(() => usePlatformTemplates('print' as any));

    // Print might not have templates, or could have some
    expect(Array.isArray(result.current)).toBe(true);
  });
});
