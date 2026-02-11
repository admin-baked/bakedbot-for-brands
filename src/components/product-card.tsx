
'use client';

import { useStore } from '@/hooks/use-store';
import { ShoppingCart, Minus, Plus, Heart, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { useMemo } from 'react';
import { AddToCartButton } from '@/components/add-to-cart-button';
import { useDynamicPrice } from '@/hooks/use-dynamic-price';
import { useDispensaryId } from '@/hooks/use-dispensary-id';
import type { Product } from '@/types/domain';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  brandSlug?: string;
  variant?: 'standard' | 'large';
  isClaimedPage?: boolean;
  onClick?: (product: Product) => void;
  onFavorite?: (productId: string) => void;
  isFavorite?: boolean;
}

export function ProductCard({
  product,
  brandSlug,
  variant = 'standard',
  isClaimedPage = false,
  onClick,
  onFavorite,
  isFavorite = false,
}: ProductCardProps) {
  const { selectedRetailerId, cartItems, updateQuantity, removeFromCart } = useStore();

  const cartItem = cartItems.find(item => item.id === product.id);
  const quantity = cartItem ? cartItem.quantity : 0;

  // Dynamic pricing hook
  const { dispensaryId } = useDispensaryId();
  const { dynamicPrice, hasDiscount } = useDynamicPrice({
    productId: product.id,
    orgId: product.brandId || dispensaryId || '',
    enabled: true,
  });

  const priceDisplay = useMemo(() => {
    // Priority 1: Use menu-published dynamic pricing (persisted to product document)
    if (product.dynamicPricingApplied && product.originalPrice) {
      const current = product.price;
      const original = product.originalPrice;
      const discount = ((original - current) / original) * 100;

      return {
        current: `$${current.toFixed(2)}`,
        original: `$${original.toFixed(2)}`,
        discount: discount.toFixed(0),
        badge: product.dynamicPricingBadge
          ? { text: product.dynamicPricingBadge, color: 'red' }
          : { text: `${discount.toFixed(0)}% OFF`, color: 'red' },
        reason: product.dynamicPricingReason || 'Dynamic pricing',
      };
    }

    // Priority 2: Use on-demand dynamic price if available and discounted
    if (dynamicPrice && hasDiscount) {
      return {
        current: `$${dynamicPrice.dynamicPrice.toFixed(2)}`,
        original: `$${dynamicPrice.originalPrice.toFixed(2)}`,
        discount: dynamicPrice.discountPercent.toFixed(0),
        badge: dynamicPrice.badge,
        reason: dynamicPrice.displayReason,
      };
    }

    // Priority 3: Retailer-specific pricing
    const prices = product.prices ?? {};
    const hasPricing = Object.keys(prices).length > 0;

    if (selectedRetailerId && hasPricing && prices[selectedRetailerId]) {
      return {
        current: `$${prices[selectedRetailerId].toFixed(2)}`,
        original: null,
        discount: null,
        badge: null,
        reason: null,
      };
    }

    // Priority 4: Price range if multiple retailers
    if (!selectedRetailerId && hasPricing) {
      const priceValues = Object.values(prices);
      if (priceValues.length > 0) {
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);

        if (minPrice === maxPrice) {
          return {
            current: `$${minPrice.toFixed(2)}`,
            original: null,
            discount: null,
            badge: null,
            reason: null,
          };
        }
        return {
          current: `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`,
          original: null,
          discount: null,
          badge: null,
          reason: null,
        };
      }
    }

    // Priority 5: Fallback to standard price
    return {
      current: `$${product.price.toFixed(2)}`,
      original: null,
      discount: null,
      badge: null,
      reason: null,
    };
  }, [product, selectedRetailerId, dynamicPrice, hasDiscount]);

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(product);
    }
  };

  const cardContent = (
    <div
      data-testid={`product-card-${product.id}`}
      className="bg-card text-card-foreground rounded-lg overflow-hidden flex flex-col group border cursor-pointer"
      onClick={handleCardClick}
    >
      <div className={`relative ${variant === 'large' ? 'h-72' : 'h-48'} transition-all duration-300`}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          data-ai-hint={product.imageHint}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Quantity controls */}
        {quantity > 0 && (
          <div
            className="absolute top-2 left-2 z-10 flex items-center bg-background/90 backdrop-blur-sm rounded-full shadow-md border px-1 py-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                if (quantity > 1) updateQuantity(product.id, quantity - 1);
                else removeFromCart(product.id);
              }}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="text-xs font-bold w-4 text-center tabular-nums">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                updateQuantity(product.id, quantity + 1);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Dynamic Pricing Badge */}
        {hasDiscount && priceDisplay.badge && (
          <Badge
            className="absolute top-2 left-2 z-10 gap-1 font-bold"
            style={{
              backgroundColor: priceDisplay.badge.color === 'red' ? '#ef4444' : '#10b981',
            }}
          >
            <Zap className="h-3 w-3" />
            {priceDisplay.badge.text}
          </Badge>
        )}

        {/* Favorite button */}
        {onFavorite && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-full h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onFavorite(product.id);
            }}
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-red-500 text-red-500")} />
          </Button>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        {product.category && (
          <span className="text-xs font-semibold uppercase text-primary tracking-wider">{product.category}</span>
        )}

        <h3 className={`${variant === 'large' ? 'text-xl' : 'text-lg'} font-bold mt-1 mb-2 line-clamp-2`}>
          {product.name}
        </h3>

        {product.description && (
          <p className="text-sm text-muted-foreground mb-3 flex-1 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-auto">
          <div className="flex flex-col">
            {/* Strikethrough original price */}
            {priceDisplay.original && (
              <span className="text-sm text-muted-foreground line-through">
                {priceDisplay.original}
              </span>
            )}

            {/* Current price with dynamic indicator */}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  variant === 'large' ? 'text-2xl' : 'text-xl',
                  'font-bold',
                  hasDiscount && 'text-green-600'
                )}
              >
                {priceDisplay.current}
              </span>
              {hasDiscount && <Zap className="h-4 w-4 text-amber-500" />}
            </div>

            {/* Customer-facing reason */}
            {priceDisplay.reason && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {priceDisplay.reason}
              </span>
            )}
          </div>

          {isClaimedPage && (
            <div onClick={(e) => e.stopPropagation()}>
              <AddToCartButton product={product} size="sm" />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // If onClick is provided, render as div (modal trigger). Otherwise, wrap in Link.
  if (onClick) {
    return cardContent;
  }

  return (
    <Link href={`/${brandSlug || product.brandId || 'default'}/products/${product.id}`} className="block">
      {cardContent}
    </Link>
  );
}
