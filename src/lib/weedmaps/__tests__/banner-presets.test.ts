import {
  buildWeedmapsBannerFilename,
  getWeedmapsBannerDimensions,
} from '@/lib/weedmaps/banner-presets';

describe('banner-presets', () => {
  it('returns documented desktop dimensions', () => {
    expect(getWeedmapsBannerDimensions('desktop')).toEqual({
      width: 2560,
      height: 800,
      label: '2560x800',
      aspectRatio: '3.2:1',
    });
  });

  it('returns the documented mobile preset', () => {
    expect(getWeedmapsBannerDimensions('mobile', 'documented')).toEqual({
      width: 840,
      height: 540,
      label: '840x540',
      aspectRatio: '14:9',
    });
  });

  it('returns the legacy square mobile preset', () => {
    expect(getWeedmapsBannerDimensions('mobile', 'legacy_square')).toEqual({
      width: 800,
      height: 800,
      label: '800x800',
      aspectRatio: '1:1',
    });
  });

  it('builds export filenames from the brand name and variant', () => {
    expect(buildWeedmapsBannerFilename({
      brandName: 'Thrive Syracuse',
      variant: 'desktop',
      format: 'png',
    })).toBe('thrive-syracuse-weedmaps-desktop-banner.png');
  });
});
