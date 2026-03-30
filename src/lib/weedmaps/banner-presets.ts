import { createSlug } from '@/lib/utils/slug';
import type { WeedmapsMobilePreset } from '@/types/heroes';

export type WeedmapsBannerVariant = 'desktop' | 'mobile';
export type WeedmapsExportFormat = 'png' | 'jpg';

export const WEEDMAPS_BANNER_DIMENSIONS = {
  desktop: {
    width: 2560,
    height: 800,
    label: '2560x800',
    aspectRatio: '3.2:1',
  },
  mobile: {
    documented: {
      width: 840,
      height: 540,
      label: '840x540',
      aspectRatio: '14:9',
    },
    legacy_square: {
      width: 800,
      height: 800,
      label: '800x800',
      aspectRatio: '1:1',
    },
  },
} as const;

export function getWeedmapsBannerDimensions(
  variant: WeedmapsBannerVariant,
  mobilePreset: WeedmapsMobilePreset = 'documented'
): { width: number; height: number; label: string; aspectRatio: string } {
  if (variant === 'desktop') {
    return WEEDMAPS_BANNER_DIMENSIONS.desktop;
  }

  return WEEDMAPS_BANNER_DIMENSIONS.mobile[mobilePreset];
}

export function buildWeedmapsBannerFilename(input: {
  brandName: string;
  variant: WeedmapsBannerVariant;
  format: WeedmapsExportFormat;
}): string {
  const slug = createSlug(input.brandName) || 'brand';

  return `${slug}-weedmaps-${input.variant}-banner.${input.format}`;
}
