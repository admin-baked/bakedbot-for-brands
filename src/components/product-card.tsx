
'use client';

import { useStore } from '@/hooks/use-store';
import { ShoppingCart, Minus, Plus, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import { useMemo } from 'react';
import { AddToCartButton } from '@/components/add-to-cart-button';
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

  const priceDisplay = useMemo(() => {
    const prices = product.prices ?? {};
    const hasPricing = Object.keys(prices).length > 0;

    if (selectedRetailerId && hasPricing && prices[selectedRetailerId]) {
      return `$${prices[selectedRetailerId].toFixed(2)}`;
    }

    if (!selectedRetailerId && hasPricing) {
      const priceValues = Object.values(prices);
      if (priceValues.length > 0) {
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);

        if (minPrice === maxPrice) {
          return `$${minPrice.toFixed(2)}`;
        }
        return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
      }
    }

    return `$${product.price.toFixed(2)}`;
  }, [product, selectedRetailerId]);

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
          <span className={`${variant === 'large' ? 'text-2xl' : 'text-xl'} font-bold`}>
            {priceDisplay}
          </span>
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
