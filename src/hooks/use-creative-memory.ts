/**
 * useCreativeMemory Hook
 *
 * Integrates with Letta memory service to learn and recall user preferences
 * for creative generation (tones, styles, templates, brand voice)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BrandGuide } from '@/types/brand-guide';
import type { AssetTemplate } from '@/types/creative-asset';

export interface CreativePreferences {
  favoriteTemplates: string[];
  preferredTones: string[];
  preferredPlatforms: string[];
  styleNotes: string[];
  lastUsedPrompts: string[];
  generationHistory: GenerationRecord[];
}

export interface GenerationRecord {
  templateId: string;
  platform: string;
  prompt: string;
  tone: string;
  timestamp: number;
  approved: boolean;
}

export interface UseCreativeMemoryReturn {
  preferences: CreativePreferences | null;
  loading: boolean;
  error: string | null;

  // Record actions
  recordGeneration: (record: Omit<GenerationRecord, 'timestamp'>) => Promise<void>;
  recordTemplateUse: (templateId: string) => Promise<void>;
  recordApproval: (generationId: string, approved: boolean) => Promise<void>;

  // Get recommendations
  getSuggestedTemplates: (context?: string) => string[];
  getSuggestedTone: (platform: string) => string;
  getSuggestedPrompt: (templateId: string) => string;

  // Clear/reset
  clearHistory: () => Promise<void>;
}

export function useCreativeMemory(
  userId: string,
  brandGuide?: BrandGuide | null
): UseCreativeMemoryReturn {
  const [preferences, setPreferences] = useState<CreativePreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from localStorage (client-side cache)
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load from localStorage
        const stored = localStorage.getItem(`creative_memory_${userId}`);
        if (stored) {
          setPreferences(JSON.parse(stored));
        } else {
          // Initialize empty preferences
          setPreferences({
            favoriteTemplates: [],
            preferredTones: [],
            preferredPlatforms: [],
            styleNotes: [],
            lastUsedPrompts: [],
            generationHistory: [],
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadPreferences();
    }
  }, [userId]);

  // Save preferences to localStorage
  const savePreferences = useCallback((prefs: CreativePreferences) => {
    localStorage.setItem(`creative_memory_${userId}`, JSON.stringify(prefs));
    setPreferences(prefs);
  }, [userId]);

  // Record a new generation
  const recordGeneration = useCallback(async (record: Omit<GenerationRecord, 'timestamp'>) => {
    if (!preferences) return;

    const newRecord: GenerationRecord = {
      ...record,
      timestamp: Date.now(),
    };

    const updated: CreativePreferences = {
      ...preferences,
      generationHistory: [newRecord, ...preferences.generationHistory].slice(0, 50), // Keep last 50
    };

    // Update preferred platforms
    if (!updated.preferredPlatforms.includes(record.platform)) {
      updated.preferredPlatforms.push(record.platform);
    }

    savePreferences(updated);
  }, [preferences, savePreferences]);

  // Record template use
  const recordTemplateUse = useCallback(async (templateId: string) => {
    if (!preferences) return;

    const updated: CreativePreferences = {
      ...preferences,
      favoriteTemplates: [
        templateId,
        ...preferences.favoriteTemplates.filter(t => t !== templateId),
      ].slice(0, 10), // Keep top 10
    };

    savePreferences(updated);
  }, [preferences, savePreferences]);

  // Record approval/rejection
  const recordApproval = useCallback(async (generationId: string, approved: boolean) => {
    if (!preferences) return;

    const updated: CreativePreferences = {
      ...preferences,
      generationHistory: preferences.generationHistory.map(g =>
        g.timestamp.toString() === generationId ? { ...g, approved } : g
      ),
    };

    savePreferences(updated);
  }, [preferences, savePreferences]);

  // Get suggested templates based on history
  const getSuggestedTemplates = useCallback((context?: string): string[] => {
    if (!preferences) return [];

    // Get most frequently used templates
    const templateCounts = preferences.generationHistory.reduce((acc, record) => {
      if (record.approved !== false) { // Include approved and neutral
        acc[record.templateId] = (acc[record.templateId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sorted = Object.entries(templateCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([id]) => id);

    return sorted.slice(0, 5);
  }, [preferences]);

  // Get suggested tone based on platform and history
  const getSuggestedTone = useCallback((platform: string): string => {
    if (!preferences) return brandGuide?.voice?.tone || 'friendly';

    // Find most common tone for this platform
    const platformGenerations = preferences.generationHistory.filter(
      g => g.platform === platform && g.approved !== false
    );

    if (platformGenerations.length === 0) {
      return brandGuide?.voice?.tone || 'friendly';
    }

    const toneCounts = platformGenerations.reduce((acc, record) => {
      acc[record.tone] = (acc[record.tone] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommon = Object.entries(toneCounts)
      .sort(([, a], [, b]) => b - a)[0];

    return mostCommon?.[0] || brandGuide?.voice?.tone || 'friendly';
  }, [preferences, brandGuide]);

  // Get suggested prompt based on template
  const getSuggestedPrompt = useCallback((templateId: string): string => {
    if (!preferences) return '';

    // Find most recent approved prompt for this template
    const recentGeneration = preferences.generationHistory.find(
      g => g.templateId === templateId && g.approved === true
    );

    return recentGeneration?.prompt || '';
  }, [preferences]);

  // Clear history
  const clearHistory = useCallback(async () => {
    const resetPrefs: CreativePreferences = {
      favoriteTemplates: [],
      preferredTones: [],
      preferredPlatforms: [],
      styleNotes: [],
      lastUsedPrompts: [],
      generationHistory: [],
    };

    savePreferences(resetPrefs);
  }, [savePreferences]);

  return {
    preferences,
    loading,
    error,
    recordGeneration,
    recordTemplateUse,
    recordApproval,
    getSuggestedTemplates,
    getSuggestedTone,
    getSuggestedPrompt,
    clearHistory,
  };
}

/**
 * Get smart prompt suggestions based on template and brand guide
 */
export function usePromptSuggestions(
  template: AssetTemplate | null,
  brandGuide: BrandGuide | null,
  memory: UseCreativeMemoryReturn
): string[] {
  if (!template) return [];

  const suggestions: string[] = [];

  // Check memory for previous prompts
  const memoryPrompt = memory.getSuggestedPrompt(template.id);
  if (memoryPrompt) {
    suggestions.push(memoryPrompt);
  }

  // Generate brand-specific suggestions
  if (brandGuide) {
    const brandName = brandGuide.brandName || 'your brand';
    const tone = brandGuide.voice?.tone || 'friendly';

    switch (template.category) {
      case 'menu_photography':
        suggestions.push(
          `Showcase ${brandName}'s premium cannabis selection in a ${tone} way`,
          `Highlight the quality and craftsmanship of ${brandName} products`
        );
        break;

      case 'social_media':
        suggestions.push(
          `Create an engaging ${tone} post about ${brandName}`,
          `Share ${brandName}'s story in a way that resonates with our community`
        );
        break;

      case 'education':
        suggestions.push(
          `Educate customers about cannabis in a ${tone} and informative way`,
          `Share valuable cannabis knowledge that builds trust with ${brandName}`
        );
        break;

      case 'compliance':
        suggestions.push(
          `Create compliant content that follows all ${brandGuide.compliance?.primaryState || 'state'} regulations`,
          `Professional compliance messaging for ${brandName}`
        );
        break;

      default:
        suggestions.push(
          `Create ${tone} content for ${brandName}`,
          `Design something unique that represents ${brandName}'s brand`
        );
    }
  }

  return suggestions.slice(0, 4); // Return top 4
}
