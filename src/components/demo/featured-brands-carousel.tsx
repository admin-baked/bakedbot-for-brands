'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface FeaturedBrand {
  id: string;
  name: string;
  logo?: string;
  tagline?: string;
  backgroundColor?: string;
  productCount?: number;
}

interface FeaturedBrandsCarouselProps {
  brands?: FeaturedBrand[];
  title?: string;
  onBrandClick?: (brandId: string) => void;
  primaryColor?: string;
}

const defaultBrands: FeaturedBrand[] = [
  { id: '1', name: '40 Tons', tagline: 'Premium Cannabis', backgroundColor: '#1a1a2e', productCount: 37 },
  { id: '2', name: 'Cookies', tagline: 'Culture & Cannabis', backgroundColor: '#000000', productCount: 24 },
  { id: '3', name: 'Stiiizy', tagline: 'The Future of Cannabis', backgroundColor: '#1e3a5f', productCount: 18 },
  { id: '4', name: 'Raw Garden', tagline: 'Clean Green Cannabis', backgroundColor: '#2d5a27', productCount: 32 },
  { id: '5', name: 'Wyld', tagline: 'Real Fruit Edibles', backgroundColor: '#4a1c40', productCount: 15 },
  { id: '6', name: 'Heavy Hitters', tagline: 'Unmatched Potency', backgroundColor: '#8b0000', productCount: 12 },
  { id: '7', name: 'Kiva', tagline: 'Artisan Edibles', backgroundColor: '#2c1810', productCount: 20 },
  { id: '8', name: 'Alien Labs', tagline: 'Exotic Genetics', backgroundColor: '#1a0a2e', productCount: 16 },
];

export function FeaturedBrandsCarousel({
  brands = defaultBrands,
  title = 'Featured Brands',
  onBrandClick,
  primaryColor = '#16a34a',
}: FeaturedBrandsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="hidden md:flex h-10 w-10 rounded-full"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="hidden md:flex h-10 w-10 rounded-full"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button variant="link" className="gap-1 font-semibold" style={{ color: primaryColor }}>
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {brands.map((brand) => (
            <Card
              key={brand.id}
              className="shrink-0 w-[200px] md:w-[240px] overflow-hidden cursor-pointer group hover:shadow-lg transition-all snap-start"
              onClick={() => onBrandClick?.(brand.id)}
            >
              {/* Brand Image/Logo Area */}
              <div
                className="aspect-[4/3] relative flex items-center justify-center p-6"
                style={{ backgroundColor: brand.backgroundColor || '#1a1a2e' }}
              >
                {brand.logo ? (
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    fill
                    className="object-contain p-4 group-hover:scale-110 transition-transform"
                  />
                ) : (
                  <div className="text-white text-center">
                    <div className="text-2xl md:text-3xl font-bold tracking-tight group-hover:scale-110 transition-transform">
                      {brand.name}
                    </div>
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>

              {/* Brand Info */}
              <div className="p-4 bg-background">
                <h3 className="font-bold text-lg">{brand.name}</h3>
                {brand.tagline && (
                  <p className="text-sm text-muted-foreground line-clamp-1">{brand.tagline}</p>
                )}
                {brand.productCount && (
                  <p className="text-xs mt-2" style={{ color: primaryColor }}>
                    {brand.productCount} products
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
