/**
 * Tests for useCreativeMemory hook
 */

import { renderHook, act } from '@testing-library/react';
import { useCreativeMemory, usePromptSuggestions } from '../use-creative-memory';
import type { BrandGuide } from '@/types/brand-guide';
import type { AssetTemplate } from '@/types/creative-asset';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useCreativeMemory', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('initializes with empty preferences', () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    expect(result.current.loading).toBe(false);
    expect(result.current.preferences).toBeDefined();
    expect(result.current.preferences?.favoriteTemplates).toEqual([]);
    expect(result.current.preferences?.generationHistory).toEqual([]);
  });

  it('records a generation', async () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    await act(async () => {
      await result.current.recordGeneration({
        templateId: 'menu_product_shot',
        platform: 'instagram',
        prompt: 'Test prompt',
        tone: 'friendly',
        approved: true,
      });
    });

    expect(result.current.preferences?.generationHistory).toHaveLength(1);
    expect(result.current.preferences?.generationHistory[0].templateId).toBe('menu_product_shot');
  });

  it('records template use and updates favorites', async () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    await act(async () => {
      await result.current.recordTemplateUse('template_1');
      await result.current.recordTemplateUse('template_2');
      await result.current.recordTemplateUse('template_1');
    });

    expect(result.current.preferences?.favoriteTemplates).toContain('template_1');
    expect(result.current.preferences?.favoriteTemplates).toContain('template_2');
    // template_1 should be first (most recent)
    expect(result.current.preferences?.favoriteTemplates[0]).toBe('template_1');
  });

  it('limits favorite templates to 10', async () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    await act(async () => {
      for (let i = 0; i < 15; i++) {
        await result.current.recordTemplateUse(`template_${i}`);
      }
    });

    expect(result.current.preferences?.favoriteTemplates).toHaveLength(10);
  });

  it('suggests tone based on platform history', async () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    // Record multiple generations with 'playful' tone on Instagram
    await act(async () => {
      await result.current.recordGeneration({
        templateId: 'template_1',
        platform: 'instagram',
        prompt: 'Test 1',
        tone: 'playful',
        approved: true,
      });
      await result.current.recordGeneration({
        templateId: 'template_2',
        platform: 'instagram',
        prompt: 'Test 2',
        tone: 'playful',
        approved: true,
      });
      await result.current.recordGeneration({
        templateId: 'template_3',
        platform: 'facebook',
        prompt: 'Test 3',
        tone: 'professional',
        approved: true,
      });
    });

    const suggestedTone = result.current.getSuggestedTone('instagram');
    expect(suggestedTone).toBe('playful');
  });

  it('suggests templates based on approval history', async () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    await act(async () => {
      // Approved template
      await result.current.recordGeneration({
        templateId: 'good_template',
        platform: 'instagram',
        prompt: 'Test',
        tone: 'friendly',
        approved: true,
      });
      // Rejected template
      await result.current.recordGeneration({
        templateId: 'bad_template',
        platform: 'instagram',
        prompt: 'Test',
        tone: 'friendly',
        approved: false,
      });
    });

    const suggested = result.current.getSuggestedTemplates();
    expect(suggested).toContain('good_template');
    expect(suggested).not.toContain('bad_template');
  });

  it('clears history', async () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    await act(async () => {
      await result.current.recordTemplateUse('template_1');
      await result.current.recordGeneration({
        templateId: 'template_1',
        platform: 'instagram',
        prompt: 'Test',
        tone: 'friendly',
        approved: true,
      });
    });

    expect(result.current.preferences?.favoriteTemplates).toHaveLength(1);

    await act(async () => {
      await result.current.clearHistory();
    });

    expect(result.current.preferences?.favoriteTemplates).toHaveLength(0);
    expect(result.current.preferences?.generationHistory).toHaveLength(0);
  });

  it('persists to localStorage', async () => {
    const { result } = renderHook(() => useCreativeMemory('user123', null));

    await act(async () => {
      await result.current.recordTemplateUse('template_1');
    });

    const stored = localStorageMock.getItem('creative_memory_user123');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.favoriteTemplates).toContain('template_1');
  });
});

describe('usePromptSuggestions', () => {
  const mockBrandGuide: Partial<BrandGuide> = {
    brandName: 'Test Brand',
    voice: {
      tone: 'friendly',
      personality: ['Authentic', 'Trustworthy'],
      vocabulary: {
        preferred: [{ term: 'premium', usage: 'always' }],
        avoid: [{ term: 'cheap', reason: 'off-brand' }],
      },
      messageHierarchy: {
        primary: 'Quality first',
        secondary: ['Affordable', 'Accessible'],
        support: [],
      },
      examples: {
        taglines: [],
        socialPosts: [],
        emailSubjects: [],
      },
    },
  };

  const mockTemplate: Partial<AssetTemplate> = {
    id: 'menu_product_shot',
    name: 'Menu Product Shot',
    category: 'menu_photography',
    tags: ['product', 'menu'],
  };

  const mockMemory = {
    preferences: null,
    loading: false,
    error: null,
    recordGeneration: jest.fn(),
    recordTemplateUse: jest.fn(),
    recordApproval: jest.fn(),
    getSuggestedTemplates: jest.fn(() => []),
    getSuggestedTone: jest.fn(() => 'friendly'),
    getSuggestedPrompt: jest.fn(() => 'Previous successful prompt'),
    clearHistory: jest.fn(),
  };

  it('returns memory-based suggestions first', () => {
    const suggestions = usePromptSuggestions(
      mockTemplate as AssetTemplate,
      mockBrandGuide as BrandGuide,
      mockMemory
    );

    expect(suggestions[0]).toBe('Previous successful prompt');
  });

  it('generates brand-specific suggestions', () => {
    mockMemory.getSuggestedPrompt = jest.fn(() => '');

    const suggestions = usePromptSuggestions(
      mockTemplate as AssetTemplate,
      mockBrandGuide as BrandGuide,
      mockMemory
    );

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('Test Brand'))).toBe(true);
  });

  it('includes tone in suggestions', () => {
    mockMemory.getSuggestedPrompt = jest.fn(() => '');

    const suggestions = usePromptSuggestions(
      mockTemplate as AssetTemplate,
      mockBrandGuide as BrandGuide,
      mockMemory
    );

    expect(suggestions.some(s => s.includes('friendly'))).toBe(true);
  });

  it('returns empty array when no template', () => {
    const suggestions = usePromptSuggestions(null, mockBrandGuide as BrandGuide, mockMemory);
    expect(suggestions).toEqual([]);
  });
});
