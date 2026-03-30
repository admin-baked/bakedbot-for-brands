'use client';

import type { Hero } from '@/types/heroes';
import { getWeedmapsBannerDimensions, type WeedmapsBannerVariant } from '@/lib/weedmaps/banner-presets';
import { cn, hexToRgba } from '@/lib/utils';

interface WeedmapsBannerPreviewProps {
  hero: Partial<Hero>;
  variant: WeedmapsBannerVariant;
  mode?: 'preview' | 'export';
  className?: string;
}

export function WeedmapsBannerPreview({
  hero,
  variant,
  mode = 'preview',
  className,
}: WeedmapsBannerPreviewProps) {
  const mobilePreset = hero.weedmaps?.mobilePreset || 'documented';
  const dimensions = getWeedmapsBannerDimensions(variant, mobilePreset);
  const backgroundImage = variant === 'desktop'
    ? hero.weedmaps?.desktopImage || hero.heroImage || ''
    : hero.weedmaps?.mobileImage || hero.weedmaps?.desktopImage || hero.heroImage || '';
  const primaryColor = hero.primaryColor || '#16a34a';
  const headline = hero.weedmaps?.headline || hero.tagline || hero.brandName || 'Your next Weedmaps banner';
  const subheadline = hero.weedmaps?.subheadline || '';
  const ctaText = hero.weedmaps?.ctaText || 'Shop Now';
  const dealText = hero.weedmaps?.dealText || '';
  const bundleText = hero.weedmaps?.bundleText || '';
  const complianceLine = [hero.weedmaps?.disclaimerText, hero.weedmaps?.licenseText]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join('   |   ');
  const isExport = mode === 'export';

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-slate-900 text-white',
        !isExport && 'w-full rounded-xl shadow-sm',
        className
      )}
      style={isExport ? {
        width: dimensions.width,
        height: dimensions.height,
      } : {
        width: '100%',
        aspectRatio: `${dimensions.width} / ${dimensions.height}`,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${hexToRgba(primaryColor, 0.92)} 45%, ${hexToRgba(primaryColor, 0.72)} 100%)`,
        }}
      />

      {backgroundImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImage}
          alt=""
          crossOrigin="anonymous"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.58 }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, ${hexToRgba('#000000', 0.82)} 0%, ${hexToRgba('#000000', 0.55)} 45%, ${hexToRgba('#000000', 0.18)} 100%)`,
        }}
      />

      {mode === 'preview' && (
        <div
          className="absolute border border-dashed border-white/45 pointer-events-none"
          style={{
            top: '8%',
            left: '6%',
            width: '52%',
            height: '74%',
            borderRadius: 14,
          }}
        />
      )}

      <div
        className="relative z-10 flex h-full flex-col justify-between"
        style={{
          padding: variant === 'desktop' ? '5.5% 5.5% 4.5%' : '7.5% 7.5% 6.5%',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex max-w-[38%] items-center gap-3 rounded-full bg-white/12 px-4 py-2 backdrop-blur-sm">
            {hero.brandLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.brandLogo}
                alt={hero.brandName || 'Brand logo'}
                crossOrigin="anonymous"
                className="h-9 w-9 rounded-full bg-white object-cover p-1"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-slate-900">
                {(hero.brandName || 'B').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-white/85">
              {hero.brandName || 'Your Brand'}
            </div>
          </div>
        </div>

        <div className="max-w-[54%]">
          <div className="space-y-3">
            <h2
              className="font-black leading-[0.95] tracking-[-0.03em] text-white drop-shadow-sm"
              style={{
                fontSize: variant === 'desktop' ? 'clamp(36px, 4vw, 88px)' : 'clamp(28px, 7vw, 64px)',
              }}
            >
              {headline}
            </h2>

            {subheadline ? (
              <p
                className="max-w-[95%] font-medium leading-[1.15] text-white/90"
                style={{
                  fontSize: variant === 'desktop' ? 'clamp(18px, 1.4vw, 34px)' : 'clamp(14px, 3vw, 26px)',
                }}
              >
                {subheadline}
              </p>
            ) : null}

            {(dealText || bundleText) ? (
              <div className="flex flex-wrap gap-3 pt-2">
                {dealText ? (
                  <span
                    className="rounded-full bg-[#facc15] px-4 py-2 font-black uppercase tracking-[0.14em] text-slate-950 shadow-sm"
                    style={{ fontSize: variant === 'desktop' ? 'clamp(14px, 1vw, 22px)' : 'clamp(11px, 2vw, 18px)' }}
                  >
                    {dealText}
                  </span>
                ) : null}
                {bundleText ? (
                  <span
                    className="rounded-full bg-white/15 px-4 py-2 font-semibold tracking-[0.06em] text-white shadow-sm backdrop-blur-sm"
                    style={{ fontSize: variant === 'desktop' ? 'clamp(14px, 1vw, 20px)' : 'clamp(11px, 2vw, 16px)' }}
                  >
                    {bundleText}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <div
            className="inline-flex w-fit items-center rounded-full bg-white px-5 py-3 font-bold text-slate-950 shadow-lg"
            style={{
              fontSize: variant === 'desktop' ? 'clamp(16px, 1vw, 24px)' : 'clamp(13px, 2.3vw, 20px)',
            }}
          >
            {ctaText}
          </div>

          {complianceLine ? (
            <div
              className="max-w-[45%] text-right font-medium leading-[1.2] text-white/78"
              style={{
                fontSize: variant === 'desktop' ? 'clamp(10px, 0.7vw, 14px)' : 'clamp(9px, 1.5vw, 12px)',
              }}
            >
              {complianceLine}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
