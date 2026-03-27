'use client';

/**
 * Hero Preview Component
 *
 * Live preview of hero banner using the BrandHero component.
 */

import React from 'react';
import { BrandHero } from '@/components/demo/brand-hero';
import { WeedmapsBannerPreview } from '@/components/dashboard/heroes/weedmaps-banner-preview';
import { Hero } from '@/types/heroes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import {
  buildWeedmapsBannerFilename,
  getWeedmapsBannerDimensions,
  type WeedmapsBannerVariant,
  type WeedmapsExportFormat,
} from '@/lib/weedmaps/banner-presets';
import { cn } from '@/lib/utils';

interface HeroPreviewProps {
  hero: Partial<Hero>;
  className?: string;
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function HeroPreview({ hero, className }: HeroPreviewProps) {
  const { toast } = useToast();
  const [viewMode, setViewMode] = React.useState<'desktop' | 'mobile'>('desktop');
  const desktopExportRef = React.useRef<HTMLDivElement>(null);
  const mobileExportRef = React.useRef<HTMLDivElement>(null);
  const isWeedmaps = hero.channel === 'weedmaps';
  const mobilePreset = hero.weedmaps?.mobilePreset || 'documented';
  const currentDimensions = getWeedmapsBannerDimensions(
    viewMode === 'desktop' ? 'desktop' : 'mobile',
    mobilePreset
  );

  const handleFindNearMe = () => {
    console.log('Find Near Me clicked (preview mode)');
  };

  const handleShopNow = () => {
    console.log('Shop Now clicked (preview mode)');
  };

  const handleExport = async (
    variant: WeedmapsBannerVariant,
    format: WeedmapsExportFormat
  ) => {
    const exportNode = variant === 'desktop' ? desktopExportRef.current : mobileExportRef.current;
    const formatMime = format === 'png' ? 'image/png' : 'image/jpeg';
    const heroId = hero.id || 'draft';
    const orgId = hero.orgId || 'unknown';

    if (!exportNode) {
      toast({
        title: 'Export Failed',
        description: 'Preview is not ready yet. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    void logger.info('weedmaps_banner_export_started', {
      heroId,
      orgId,
      channel: hero.channel || 'menu',
      variant,
      format,
      mobilePreset,
    });

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(exportNode, {
        useCORS: true,
        logging: false,
        scale: 1,
        backgroundColor: null,
      });
      const dataUrl = format === 'png'
        ? canvas.toDataURL(formatMime)
        : canvas.toDataURL(formatMime, 0.92);
      const filename = buildWeedmapsBannerFilename({
        brandName: hero.brandName || 'brand',
        variant,
        format,
      });

      triggerDownload(dataUrl, filename);
      toast({
        title: 'Export Ready',
        description: `${filename} downloaded.`,
      });
      void logger.info('weedmaps_banner_export_completed', {
        heroId,
        orgId,
        channel: hero.channel || 'menu',
        variant,
        format,
        mobilePreset,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export error';
      toast({
        title: 'Export Failed',
        description: message,
        variant: 'destructive',
      });
      void logger.error('weedmaps_banner_export_failed', {
        heroId,
        orgId,
        channel: hero.channel || 'menu',
        variant,
        format,
        mobilePreset,
        error: message,
      });
    }
  };

  return (
    <>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">
                {isWeedmaps ? 'Weedmaps Banner Preview' : 'Live Preview'}
              </CardTitle>
              {isWeedmaps ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {viewMode === 'desktop' ? 'Desktop' : 'Mobile'} export size: {currentDimensions.label} ({currentDimensions.aspectRatio})
                </p>
              ) : null}
            </div>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'desktop' | 'mobile')}>
              <TabsList className="grid w-[200px] grid-cols-2">
                <TabsTrigger value="desktop" className="flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Desktop
                </TabsTrigger>
                <TabsTrigger value="mobile" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Mobile
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isWeedmaps ? (
            <div className="space-y-4 p-4">
              <div
                className={cn(
                  'transition-all duration-300',
                  viewMode === 'mobile' ? 'mx-auto max-w-[420px]' : 'w-full'
                )}
              >
                <WeedmapsBannerPreview
                  hero={hero}
                  variant={viewMode === 'desktop' ? 'desktop' : 'mobile'}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button type="button" variant="outline" onClick={() => handleExport('desktop', 'png')}>
                  Desktop PNG
                </Button>
                <Button type="button" variant="outline" onClick={() => handleExport('desktop', 'jpg')}>
                  Desktop JPG
                </Button>
                <Button type="button" variant="outline" onClick={() => handleExport('mobile', 'png')}>
                  Mobile PNG
                </Button>
                <Button type="button" variant="outline" onClick={() => handleExport('mobile', 'jpg')}>
                  Mobile JPG
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'transition-all duration-300',
                viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
              )}
            >
              <BrandHero
                brandName={hero.brandName || 'Your Brand'}
                brandLogo={hero.brandLogo}
                tagline={hero.tagline || 'Premium Cannabis Products'}
                description={hero.description}
                heroImage={hero.heroImage}
                primaryColor={hero.primaryColor || '#16a34a'}
                verified={hero.verified}
                stats={hero.stats}
                purchaseModel={hero.purchaseModel || 'local_pickup'}
                shipsNationwide={hero.shipsNationwide}
                onFindNearMe={handleFindNearMe}
                onShopNow={handleShopNow}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {isWeedmaps ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed -left-[20000px] top-0 z-[-1]"
        >
          <div ref={desktopExportRef}>
            <WeedmapsBannerPreview hero={hero} variant="desktop" mode="export" />
          </div>
          <div ref={mobileExportRef}>
            <WeedmapsBannerPreview hero={hero} variant="mobile" mode="export" />
          </div>
        </div>
      ) : null}
    </>
  );
}
