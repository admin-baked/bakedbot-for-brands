'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { OversizedProductCard } from './oversized-product-card';
import type { Product } from '@/types/domain';

interface ProductSectionProps {
  id?: string; // For anchoring/scrolling to sections
  title: string;
  subtitle?: string;
  products: Product[];
  onAddToCart?: (product: Product, quantity: number) => void;
  getCartQuantity?: (productId: string) => number;
  primaryColor?: string;
  layout?: 'carousel' | 'grid';
  columns?: 2 | 3 | 4 | 5;
  showViewAll?: boolean;
  onViewAll?: () => void;
  dealBadge?: (product: Product) => string | undefined;
  onProductClick?: (product: Product) => void;
  onFavorite?: (productId: string) => void;
  favorites?: Set<string>;
}

export function ProductSection({
  id,
  title,
  subtitle,
  products,
  onAddToCart,
  getCartQuantity,
  primaryColor = '#16a34a',
  layout = 'carousel',
  columns = 4,
  showViewAll = true,
  onViewAll,
  dealBadge,
  onProductClick,
  onFavorite,
  favorites,
}: ProductSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 340;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  };

  if (products.length === 0) return null;

  return (
    <section id={id} className="py-8 scroll-mt-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {layout === 'carousel' && (
              <>
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
              </>
            )}
            {showViewAll && (
              <Button
                variant="link"
                className="gap-1 font-semibold"
                style={{ color: primaryColor }}
                onClick={onViewAll}
              >
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Products */}
        {layout === 'carousel' ? (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((product) => (
              <div key={product.id} className="shrink-0 w-[280px] md:w-[320px] snap-start">
                <OversizedProductCard
                  product={product}
                  onAddToCart={onAddToCart}
                  inCart={getCartQuantity?.(product.id) || 0}
                  primaryColor={primaryColor}
                  size="large"
                  dealBadge={dealBadge?.(product)}
                  onClick={() => onProductClick?.(product)}
                  onFavorite={onFavorite}
                  isFavorite={favorites?.has(product.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid ${columnClasses[columns]} gap-6`}>
            {products.map((product) => (
              <OversizedProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                inCart={getCartQuantity?.(product.id) || 0}
                primaryColor={primaryColor}
                size="large"
                dealBadge={dealBadge?.(product)}
                onClick={() => onProductClick?.(product)}
                onFavorite={onFavorite}
                isFavorite={favorites?.has(product.id)}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}
