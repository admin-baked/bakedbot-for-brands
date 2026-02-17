'use client';

/**
 * Product Upsell Row
 *
 * Reusable horizontal row of compact upsell product cards.
 * Used in product detail modal, cart sidebar, and checkout page.
 * Lazy-loads suggestions when the component mounts.
 */

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Leaf, Sparkles, Tag, Zap, X } from 'lucide-react';
import type { Product } from '@/types/domain';
import type { UpsellSuggestion, UpsellPlacement, UpsellResult } from '@/types/upsell';

interface ProductUpsellRowProps {
  /** Heading text (e.g., "Pairs Well With", "Complete Your Order") */
  heading: string;
  /** Fetch function that returns upsell suggestions */
  fetchUpsells: () => Promise<UpsellResult>;
  /** Called when user clicks "Add" on a suggestion */
  onAddToCart: (product: Product) => void;
  /** Brand primary color for styling */
  primaryColor?: string;
  /** Compact mode for cart/checkout (smaller cards) */
  compact?: boolean;
}

/** Icon mapping for upsell strategies */
function StrategyIcon({ strategy }: { strategy: UpsellSuggestion['strategy'] }) {
  switch (strategy) {
    case 'terpene_pairing':
    case 'effect_stacking':
      return <Sparkles className="h-3 w-3" />;
    case 'bundle_match':
    case 'clearance':
      return <Tag className="h-3 w-3" />;
    case 'category_complement':
      return <Zap className="h-3 w-3" />;
    default:
      return <Sparkles className="h-3 w-3" />;
  }
}

export function ProductUpsellRow({
  heading,
  fetchUpsells,
  onAddToCart,
  primaryColor = '#16a34a',
  compact = false,
}: ProductUpsellRowProps) {
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await fetchUpsells();
        if (!cancelled) {
          setSuggestions(result.suggestions);
        }
      } catch {
        // Silently fail - upsells are enhancement, not critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [fetchUpsells]);

  // Don't render anything if dismissed or no suggestions
  if (dismissed) return null;
  if (!loading && suggestions.length === 0) return null;

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm uppercase text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          {heading}
        </h4>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: compact ? 2 : 3 }).map((_, i) => (
            <div key={i} className={compact ? 'min-w-[200px]' : 'min-w-[180px]'}>
              <Skeleton className={compact ? 'h-16 w-full rounded-lg' : 'h-28 w-full rounded-lg'} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm uppercase text-muted-foreground flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          {heading}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss suggestions"
        >
          <X className="h-4 w-4" />
        </button>
      </h4>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {suggestions.map((suggestion) => (
          compact ? (
            <CompactUpsellCard
              key={suggestion.product.id}
              suggestion={suggestion}
              onAddToCart={onAddToCart}
              primaryColor={primaryColor}
            />
          ) : (
            <UpsellCard
              key={suggestion.product.id}
              suggestion={suggestion}
              onAddToCart={onAddToCart}
              primaryColor={primaryColor}
            />
          )
        ))}
      </div>
    </div>
  );
}

/** Full upsell card for product detail modal */
function UpsellCard({
  suggestion,
  onAddToCart,
  primaryColor,
}: {
  suggestion: UpsellSuggestion;
  onAddToCart: (product: Product) => void;
  primaryColor: string;
}) {
  const { product, strategy, reason, savingsText } = suggestion;

  return (
    <div className="min-w-[170px] max-w-[170px] flex flex-col rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="relative h-24 bg-muted flex items-center justify-center">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="170px"
          />
        ) : (
          <Leaf className="h-8 w-8 text-muted-foreground/30" />
        )}
        {/* Strategy Badge */}
        <div className="absolute top-1.5 left-1.5">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 bg-black/60 text-white backdrop-blur-sm border-0"
          >
            <StrategyIcon strategy={strategy} />
            <span className="ml-1">{reason}</span>
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-2.5 flex flex-col flex-1">
        <p className="text-xs text-muted-foreground">{product.category}</p>
        <p className="text-sm font-medium line-clamp-2 leading-tight mt-0.5">{product.name}</p>

        <div className="mt-auto pt-2 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold" style={{ color: primaryColor }}>
              ${product.price.toFixed(2)}
            </span>
            {savingsText && (
              <Badge variant="outline" className="ml-1 text-[10px] border-green-200 text-green-700 bg-green-50 px-1">
                {savingsText}
              </Badge>
            )}
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7 shrink-0"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Compact upsell card for cart sidebar and checkout */
function CompactUpsellCard({
  suggestion,
  onAddToCart,
  primaryColor,
}: {
  suggestion: UpsellSuggestion;
  onAddToCart: (product: Product) => void;
  primaryColor: string;
}) {
  const { product, strategy, reason, savingsText } = suggestion;

  return (
    <div className="min-w-[220px] flex items-center gap-3 p-2.5 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      {/* Thumbnail */}
      <div className="h-14 w-14 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={56}
            height={56}
            className="object-cover w-full h-full"
          />
        ) : (
          <Leaf className="h-6 w-6 text-muted-foreground/30" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium line-clamp-1">{product.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0"
          >
            <StrategyIcon strategy={strategy} />
            <span className="ml-1">{reason}</span>
          </Badge>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-sm font-bold" style={{ color: primaryColor }}>
            ${product.price.toFixed(2)}
          </span>
          {savingsText && (
            <span className="text-[10px] text-green-700 font-medium">{savingsText}</span>
          )}
        </div>
      </div>

      {/* Quick Add */}
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8 shrink-0"
        onClick={() => onAddToCart(product)}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
