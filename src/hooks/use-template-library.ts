/**
 * useTemplateLibrary Hook
 *
 * Provides access to creative asset templates with filtering
 */

'use client';

import { useMemo } from 'react';
import { ASSET_TEMPLATES } from '@/types/creative-asset';
import type { AssetTemplate, AssetFilter, AssetCategory, AssetPlatform } from '@/types/creative-asset';

export interface UseTemplateLibraryReturn {
  templates: AssetTemplate[];
  categories: AssetCategory[];
  getTemplateById: (id: string) => AssetTemplate | undefined;
  getTemplatesByCategory: (category: AssetCategory) => AssetTemplate[];
  getTemplatesByPlatform: (platform: AssetPlatform) => AssetTemplate[];
}

export function useTemplateLibrary(filters?: AssetFilter): UseTemplateLibraryReturn {
  // Convert ASSET_TEMPLATES object to array
  const allTemplates: AssetTemplate[] = useMemo(() => {
    return Object.entries(ASSET_TEMPLATES).map(([id, template]) => ({
      id,
      ...template,
    }));
  }, []);

  // Apply filters
  const filteredTemplates = useMemo(() => {
    let results = allTemplates;

    // Category filter
    if (filters?.category) {
      results = results.filter(t => t.category === filters.category);
    }

    // Format filter
    if (filters?.format) {
      results = results.filter(t => t.format === filters.format);
    }

    // Platform filter
    if (filters?.platform) {
      results = results.filter(t => t.platforms?.includes(filters.platform!));
    }

    // Compliance level filter
    if (filters?.complianceLevel) {
      results = results.filter(t => t.complianceLevel === filters.complianceLevel);
    }

    // Premium filter
    if (filters?.isPremium !== undefined) {
      results = results.filter(t => t.isPremium === filters.isPremium);
    }

    // Tags filter
    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    // Search filter
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return results;
  }, [allTemplates, filters]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.category));
    return Array.from(cats);
  }, [allTemplates]);

  // Helper functions
  const getTemplateById = (id: string) => {
    return allTemplates.find(t => t.id === id);
  };

  const getTemplatesByCategory = (category: AssetCategory) => {
    return allTemplates.filter(t => t.category === category);
  };

  const getTemplatesByPlatform = (platform: AssetPlatform) => {
    return allTemplates.filter(t => t.platforms?.includes(platform));
  };

  return {
    templates: filteredTemplates,
    categories,
    getTemplateById,
    getTemplatesByCategory,
    getTemplatesByPlatform,
  };
}

/**
 * Get recommended templates based on brand guide and context
 */
export function useRecommendedTemplates(
  brandGuide: any,
  context?: {
    hasDeals?: boolean;
    hasNewProducts?: boolean;
    upcomingEvents?: any[];
    topProducts?: any[];
  }
): AssetTemplate[] {
  const { templates } = useTemplateLibrary();

  return useMemo(() => {
    const recommended: AssetTemplate[] = [];

    // If there are active deals, recommend social media templates
    if (context?.hasDeals) {
      const dealTemplates = templates.filter(
        t => t.category === 'social_media' && t.tags.includes('deals')
      );
      recommended.push(...dealTemplates.slice(0, 2));
    }

    // If there are new products, recommend product spotlight
    if (context?.hasNewProducts) {
      const productTemplates = templates.filter(
        t => t.id === 'new_arrival' || t.id === 'product_spotlight'
      );
      recommended.push(...productTemplates);
    }

    // If there are upcoming events, recommend event templates
    if (context?.upcomingEvents && context.upcomingEvents.length > 0) {
      const eventTemplates = templates.filter(t => t.id === 'event_announcement');
      recommended.push(...eventTemplates);
    }

    // Always recommend education content (builds authority)
    const eduTemplates = templates.filter(t => t.category === 'education');
    if (eduTemplates[0]) {
      recommended.push(eduTemplates[0]); // Add one edu template
    }

    // Recommend high-conversion templates
    const highConversion = templates.filter(t => t.conversionOptimized);
    recommended.push(...highConversion.slice(0, 3));

    // Remove duplicates
    const unique = Array.from(new Set(recommended.map(t => t.id)))
      .map(id => recommended.find(t => t.id === id)!)
      .filter(Boolean);

    return unique.slice(0, 6); // Return top 6
  }, [templates, context]);
}

/**
 * Get templates compatible with current platform
 */
export function usePlatformTemplates(platform: AssetPlatform): AssetTemplate[] {
  const { getTemplatesByPlatform } = useTemplateLibrary();
  return getTemplatesByPlatform(platform);
}
