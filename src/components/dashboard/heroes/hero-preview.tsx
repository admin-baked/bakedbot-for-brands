'use client';

/**
 * Hero Preview Component
 *
 * Live preview of hero banner using the BrandHero component.
 */

import React from 'react';
import { BrandHero } from '@/components/demo/brand-hero';
import { Hero } from '@/types/heroes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeroPreviewProps {
  hero: Partial<Hero>;
  className?: string;
}

export function HeroPreview({ hero, className }: HeroPreviewProps) {
  const [viewMode, setViewMode] = React.useState<'desktop' | 'mobile'>('desktop');

  // Handle CTA clicks in preview mode
  const handleFindNearMe = () => {
    console.log('Find Near Me clicked (preview mode)');
  };

  const handleShopNow = () => {
    console.log('Shop Now clicked (preview mode)');
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Preview</CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'desktop' | 'mobile')}>
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
      </CardContent>
    </Card>
  );
}
