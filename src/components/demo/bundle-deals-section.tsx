'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, ArrowRight, Package, Sparkles, Percent } from 'lucide-react';

interface BundleDeal {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  bundlePrice: number;
  savingsPercent: number;
  image?: string;
  products?: string[];
  badge?: string;
  backgroundColor?: string;
}

interface BundleDealsSectionProps {
  bundles?: BundleDeal[];
  title?: string;
  subtitle?: string;
  onBundleClick?: (bundleId: string) => void;
  primaryColor?: string;
}

export function BundleDealsSection({
  bundles = [],
  title = 'Bundle Deals',
  subtitle = 'Save more when you bundle! Curated packs at special prices.',
  onBundleClick,
  primaryColor = '#16a34a',
}: BundleDealsSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Don't render if no bundles exist
  if (!bundles || bundles.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
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
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-7 w-7" style={{ color: primaryColor }} />
              {title}
            </h2>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
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
          className="flex gap-4 overflow-x-auto pb-4 pt-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {bundles.map((bundle) => (
            <Card
              key={bundle.id}
              className="shrink-0 w-[280px] md:w-[300px] overflow-hidden cursor-pointer group hover:shadow-xl transition-all snap-start"
              onClick={() => onBundleClick?.(bundle.id)}
            >
              {/* Header with gradient background */}
              <div
                className="p-6 text-white relative overflow-hidden"
                style={{ backgroundColor: bundle.backgroundColor || primaryColor }}
              >
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -right-8 -top-8 w-32 h-32 border-4 border-white rounded-full" />
                  <div className="absolute -left-4 -bottom-4 w-24 h-24 border-4 border-white rounded-full" />
                </div>

                {/* Badge */}
                {bundle.badge && (
                  <Badge className="absolute top-3 right-3 bg-white/20 text-white border-0">
                    {bundle.badge}
                  </Badge>
                )}

                {/* Content */}
                <div className="relative">
                  <Sparkles className="h-8 w-8 mb-3 opacity-80" />
                  <h3 className="text-xl font-bold mb-1">{bundle.name}</h3>
                  <p className="text-white/80 text-sm">{bundle.description}</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="p-4 bg-background">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-2xl font-bold" style={{ color: bundle.backgroundColor || primaryColor }}>
                      ${bundle.bundlePrice}
                    </span>
                    <span className="text-muted-foreground line-through ml-2">
                      ${bundle.originalPrice}
                    </span>
                  </div>
                  <Badge variant="destructive" className="font-bold">
                    <Percent className="h-3 w-3 mr-1" />
                    {bundle.savingsPercent}% OFF
                  </Badge>
                </div>

                <Button
                  className="w-full font-semibold"
                  style={{ backgroundColor: bundle.backgroundColor || primaryColor }}
                >
                  View Bundle
                </Button>
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
