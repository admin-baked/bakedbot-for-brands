'use client';

/**
 * SortableProductCard — Wraps OversizedProductCard with @dnd-kit sortable behavior
 * and management overlays (Price, Bundle, Discuss, Featured toggle).
 * Only used in the dashboard Preview tab (isManageMode=true).
 */

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Star, DollarSign, Package, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OversizedProductCard } from '@/components/demo/oversized-product-card';
import { PriceQuickSheet } from './PriceQuickSheet';
import { BundleQuickSheet } from './BundleQuickSheet';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/domain';

interface SortableProductCardProps {
  product: Product;
  primaryColor: string;
  onAddToCart: (product: Product, qty: number) => void;
  inCart: number;
  dealBadge?: string;
  onClick: () => void;
  onFavorite: (id: string) => void;
  isFavorite: boolean;
  sortable: boolean;
  onToggleFeatured?: (productId: string, featured: boolean) => Promise<void>;
}

export function SortableProductCard({
  product,
  primaryColor,
  onAddToCart,
  inCart,
  dealBadge,
  onClick,
  onFavorite,
  isFavorite,
  sortable,
  onToggleFeatured,
}: SortableProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [priceSheetOpen, setPriceSheetOpen] = useState(false);
  const [bundleSheetOpen, setBundleSheetOpen] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(false);
  const router = useRouter();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id, disabled: !sortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const handleToggleFeatured = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleFeatured || featuredLoading) return;
    setFeaturedLoading(true);
    try {
      await onToggleFeatured(product.id, !product.featured);
    } finally {
      setFeaturedLoading(false);
    }
  };

  const handleDiscuss = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/inbox?context=product&productId=${product.id}&productName=${encodeURIComponent(product.name)}`);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag Handle */}
        {sortable && (
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 left-2 z-20 cursor-grab active:cursor-grabbing bg-black/50 backdrop-blur-sm text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        )}

        {/* Management Overlay (hover) */}
        {isHovered && !isDragging && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Top action bar */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between gap-1 p-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-auto">
              {/* Featured star */}
              <button
                onClick={handleToggleFeatured}
                disabled={featuredLoading}
                className={cn(
                  'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors',
                  product.featured
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-white/20 text-white hover:bg-yellow-400 hover:text-yellow-900'
                )}
                title={product.featured ? 'Unfeature this product' : 'Feature this product (floats to top)'}
              >
                <Star className={cn('h-3 w-3', product.featured && 'fill-current')} />
                {product.featured ? 'Featured' : 'Feature'}
              </button>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setPriceSheetOpen(true); }}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                  title="Edit price / view pricing rules"
                >
                  <DollarSign className="h-3 w-3" />
                  Price
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setBundleSheetOpen(true); }}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                  title="View / add to bundles"
                >
                  <Package className="h-3 w-3" />
                  Bundle
                </button>
                <button
                  onClick={handleDiscuss}
                  className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
                  title="Discuss with AI — opens Inbox with product context"
                >
                  <MessageSquare className="h-3 w-3" />
                  Discuss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* The actual product card */}
        <OversizedProductCard
          product={product}
          onAddToCart={onAddToCart}
          inCart={inCart}
          primaryColor={primaryColor}
          size="large"
          dealBadge={dealBadge}
          onClick={onClick}
          onFavorite={onFavorite}
          isFavorite={isFavorite}
        />
      </div>

      {/* Sheets (rendered outside the relative container to avoid z-index issues) */}
      <PriceQuickSheet
        product={product}
        open={priceSheetOpen}
        onClose={() => setPriceSheetOpen(false)}
      />
      <BundleQuickSheet
        product={product}
        open={bundleSheetOpen}
        onClose={() => setBundleSheetOpen(false)}
      />
    </>
  );
}
