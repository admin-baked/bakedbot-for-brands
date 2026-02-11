/**
 * useBrandGuide Hook
 *
 * Fetches and caches brand guide data for creative generation
 */

'use client';

import { useState, useEffect } from 'react';
import { getBrandGuide } from '@/server/actions/brand-guide';
import type { BrandGuide } from '@/types/brand-guide';

export interface UseBrandGuideReturn {
  brandGuide: BrandGuide | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useBrandGuide(brandId: string): UseBrandGuideReturn {
  const [brandGuide, setBrandGuide] = useState<BrandGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBrandGuide = async () => {
    if (!brandId) {
      setError('No brand ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await getBrandGuide(brandId);

      if (result.success && result.brandGuide) {
        setBrandGuide(result.brandGuide);
      } else {
        setError(result.error || 'Failed to fetch brand guide');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrandGuide();
  }, [brandId]);

  return {
    brandGuide,
    loading,
    error,
    refetch: fetchBrandGuide,
  };
}

/**
 * Extract brand colors for creative generation
 */
export function useBrandColors(brandGuide: BrandGuide | null) {
  if (!brandGuide?.visualIdentity?.colors) {
    return {
      primary: '#4ade80', // Default BakedBot green
      secondary: '#1f3324',
      accent: '#10a34e',
    };
  }

  return {
    primary: brandGuide.visualIdentity.colors.primary?.hex || '#4ade80',
    secondary: brandGuide.visualIdentity.colors.secondary?.hex || '#1f3324',
    accent: brandGuide.visualIdentity.colors.accent?.hex || '#10a34e',
  };
}

/**
 * Extract brand voice for AI prompts
 */
export function useBrandVoice(brandGuide: BrandGuide | null) {
  if (!brandGuide?.voice) {
    return {
      tone: 'friendly',
      personality: ['Authentic', 'Trustworthy'],
      doWrite: [],
      dontWrite: [],
    };
  }

  return {
    tone: brandGuide.voice.tone || 'friendly',
    personality: brandGuide.voice.personality || [],
    doWrite: brandGuide.voice.vocabulary?.preferred.map(v => v.term) || [],
    dontWrite: brandGuide.voice.vocabulary?.avoid.map(v => v.term) || [],
  };
}

/**
 * Extract compliance requirements
 */
export function useBrandCompliance(brandGuide: BrandGuide | null) {
  if (!brandGuide?.compliance) {
    return {
      state: 'CA',
      disclaimers: [],
      restrictions: [],
    };
  }

  return {
    state: brandGuide.compliance.primaryState || 'CA',
    disclaimers: Object.values(brandGuide.compliance.requiredDisclaimers || {})
      .filter(d => typeof d === 'string') as string[],
    restrictions: brandGuide.compliance.restrictions || [],
  };
}
