'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Minus, Heart, ShoppingCart, Leaf, Zap, Wind, Cookie,
  Droplet, Droplets, Package, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSafeProductImageUrl } from '@/lib/utils/product-image';
import type { LucideIcon } from 'lucide-react';
import type { Product } from '@/types/domain';

function getCategoryIcon(category?: string): LucideIcon {
  const c = (category ?? '').toLowerCase().replace(/[-_\s]/g, '');
  if (c.includes('flower') || c.includes('bud')) return Leaf;
  if (c.includes('preroll') || c.includes('joint')) return Wind;
  if (c.includes('edible') || c.includes('gummy')) return Cookie;
  if (c.includes('concentrate') || c.includes('wax')) return Droplets;
  if (c.includes('vape') || c.includes('cart') || c.includes('pod')) return Wind;
  if (c.includes('tincture') || c.includes('oil')) return Droplet;
  if (c.includes('topical') || c.includes('cream')) return Leaf;
  return Package;
}

function getCategoryBgColor(category?: string): string {
  const c = (category ?? '').toLowerCase().replace(/[-_\s]/g, '');
  if (c.includes('flower') || c.includes('bud')) return 'bg-green-100 dark:bg-green-900/40';
  if (c.includes('preroll') || c.includes('joint')) return 'bg-amber-100 dark:bg-amber-900/40';
  if (c.includes('edible') || c.includes('gummy')) return 'bg-orange-100 dark:bg-orange-900/40';
  if (c.includes('concentrate') || c.includes('wax')) return 'bg-yellow-100 dark:bg-yellow-900/40';
  if (c.includes('vape') || c.includes('cart') || c.includes('pod')) return 'bg-blue-100 dark:bg-blue-900/40';
  if (c.includes('tincture') || c.includes('oil')) return 'bg-emerald-100 dark:bg-emerald-900/40';
  if (c.includes('topical') || c.includes('cream')) return 'bg-pink-100 dark:bg-pink-900/40';
  return 'bg-muted';
}

function getCategoryIconColor(category?: string): string {
  const c = (category ?? '').toLowerCase().replace(/[-_\s]/g, '');
  if (c.includes('flower') || c.includes('bud')) return 'text-green-500';
  if (c.includes('preroll') || c.includes('joint')) return 'text-amber-500';
  if (c.includes('edible') || c.includes('gummy')) return 'text-orange-500';
  if (c.includes('concentrate') || c.includes('wax')) return 'text-yellow-600';
  if (c.includes('vape') || c.includes('cart') || c.includes('pod')) return 'text-blue-500';
  if (c.includes('tincture') || c.includes('oil')) return 'text-emerald-600';
  if (c.includes('topical') || c.includes('cream')) return 'text-pink-500';
  return 'text-muted-foreground';
}

interface OversizedProductCardProps {
  product: Product;
  onAddToCart?: (product: Product, quantity: number) => void;
  onFavorite?: (productId: string) => void;
  isFavorite?: boolean;
  inCart?: number;
  primaryColor?: string;
  showQuickAdd?: boolean;
  size?: 'normal' | 'large' | 'xlarge';
  dealBadge?: string;
  onClick?: () => void;
  brandName?: string;
}

export function OversizedProductCard({
  product,
  onAddToCart,
  onFavorite,
  isFavorite = false,
  inCart = 0,
  primaryColor = '#16a34a',
  showQuickAdd = true,
  size = 'large',
  dealBadge,
  onClick,
  brandName,
}: OversizedProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = () => {
    onAddToCart?.(product, quantity);
    setQuantity(1);
    setAddedToCart(true);
  };

  // Auto-clear the "added" flash after 1.5s
  useEffect(() => {
    if (!addedToCart) return;
    const timer = setTimeout(() => setAddedToCart(false), 1500);
    return () => clearTimeout(timer);
  }, [addedToCart]);

  const incrementQuantity = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity((q) => q + 1);
  };

  const decrementQuantity = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuantity((q) => Math.max(1, q - 1));
  };

  const sizeClasses = {
    normal: 'w-full',
    large: 'w-full min-h-[400px]',
    xlarge: 'w-full min-h-[480px]',
  };

  const imageSizeClasses = {
    normal: 'aspect-square',
    large: 'aspect-[4/3]',
    xlarge: 'aspect-[3/2]',
  };

  // Strain type colors
  const strainColors: Record<string, string> = {
    'Sativa': '#f59e0b',
    'Indica': '#8b5cf6',
    'Hybrid': '#10b981',
    'CBD': '#3b82f6',
    'Sativa-Hybrid': '#f97316',
    'Indica-Hybrid': '#a855f7',
  };

  const strainColor = product.strainType ? strainColors[product.strainType] || primaryColor : primaryColor;
  const rawImageUrl = getSafeProductImageUrl(product.imageUrl);
  // Treat /icon-192.png as "no real image" — render a category icon placeholder instead
  const isPlaceholder = imageFailed || rawImageUrl === '/icon-192.png';
  const imageUrl = isPlaceholder ? null : rawImageUrl;
  const CategoryIcon = getCategoryIcon(product.category);

  return (
    <Card
      className={cn(
        'group overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 flex flex-col',
        sizeClasses[size]
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className={cn('relative overflow-hidden', imageSizeClasses[size], isPlaceholder ? getCategoryBgColor(product.category) : 'bg-muted')}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className={cn(
              'object-cover transition-transform duration-500',
              isHovered && 'scale-110'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            <CategoryIcon className={cn('h-16 w-16 opacity-30', getCategoryIconColor(product.category))} />
            <span className="text-xs text-muted-foreground/50 font-medium uppercase tracking-widest">
              {product.category}
            </span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          {/* Trending Badge */}
          {product.trending && (
            <Badge className="bg-orange-500 text-white font-bold px-3 py-1 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Trending
            </Badge>
          )}

          {/* Deal Badge */}
          {dealBadge && (
            <Badge className="bg-red-500 text-white font-bold px-3 py-1">
              {dealBadge}
            </Badge>
          )}

          {/* Strain Type */}
          {product.strainType && (
            <Badge
              className="text-white font-medium"
              style={{ backgroundColor: strainColor }}
            >
              {product.strainType}
            </Badge>
          )}
        </div>

        {/* THC/CBD Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          {product.thcPercent && product.thcPercent > 0 && (
            <Badge variant="secondary" className="bg-black/70 text-white font-bold">
              THC {product.thcPercent}%
            </Badge>
          )}
          {product.cbdPercent && product.cbdPercent > 0 && (
            <Badge variant="secondary" className="bg-black/70 text-white font-bold">
              CBD {product.cbdPercent}%
            </Badge>
          )}
        </div>

        {/* Favorite Button */}
        <Button
          size="icon"
          variant="secondary"
          className={cn(
            'absolute top-3 right-3 rounded-full opacity-0 group-hover:opacity-100 transition-all',
            product.thcPercent && 'top-16'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.(product.id);
          }}
        >
          <Heart
            className={cn('h-5 w-5', isFavorite && 'fill-red-500 text-red-500')}
          />
        </Button>

        {/* Quick Add Overlay (shown on hover) */}
        {showQuickAdd && (
          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300'
            )}
          >
            <div className="flex items-center gap-2">
              {/* Quantity Controls */}
              <div className="flex items-center bg-white rounded-lg shadow-lg">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-l-lg"
                  onClick={decrementQuantity}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 rounded-r-lg"
                  onClick={incrementQuantity}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Add to Cart */}
              <Button
                className={cn(
                  'flex-1 h-10 font-bold transition-all duration-300',
                  addedToCart && 'scale-105'
                )}
                style={{ backgroundColor: addedToCart ? '#16a34a' : primaryColor }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
              >
                {addedToCart ? (
                  <>
                    <Check className="h-4 w-4 mr-2 animate-bounce" />
                    Added!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category + Weight row */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {product.category}
          </p>
          {product.weight && (
            <p className="text-xs text-muted-foreground font-medium">
              {product.weight}{product.weightUnit || 'g'}
            </p>
          )}
        </div>

        {/* Brand name */}
        {(brandName || product.brandName) && (
          <p className="text-xs font-semibold mb-1" style={{ color: primaryColor }}>
            {brandName || product.brandName}
          </p>
        )}

        {/* Name */}
        <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {product.description}
          </p>
        )}

        {/* Effects */}
        {product.effects && product.effects.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.effects.slice(0, 3).map((effect) => (
              <Badge
                key={effect}
                variant="outline"
                className="text-xs px-2 py-0.5"
              >
                {effect}
              </Badge>
            ))}
          </div>
        )}

        {/* Price & Cart Status */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t">
          <div>
            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
              ${(product.price ?? 0).toFixed(2)}
            </span>
          </div>

          {inCart > 0 && (
            <Badge variant="secondary" className="gap-1">
              <ShoppingCart className="h-3 w-3" />
              {inCart} in cart
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
