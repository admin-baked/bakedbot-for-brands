'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Heart, ShoppingCart, Leaf, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/domain';

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

  const handleAddToCart = () => {
    onAddToCart?.(product, quantity);
    setQuantity(1);
  };

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
      <div className={cn('relative bg-muted overflow-hidden', imageSizeClasses[size])}>
        {(product.imageUrl && !product.imageUrl.includes('unsplash.com') && !product.imageUrl.includes('placeholder')) ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className={cn(
              'object-cover transition-transform duration-500',
              isHovered && 'scale-110'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-green-50/50">
            <Image
              src="/icon-192.png"
              alt="BakedBot"
              width={72}
              height={72}
              className="opacity-50 object-contain"
            />
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
                className="flex-1 h-10 font-bold"
                style={{ backgroundColor: primaryColor }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToCart();
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart
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
              ${product.price.toFixed(2)}
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
