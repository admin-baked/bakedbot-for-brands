'use client';

/**
 * Rule Scope Sheet
 *
 * Slide-over panel showing which products a pricing rule would affect.
 * Shows product name, category, current price → discounted price, and discount %.
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Info, Package, Tag, TrendingDown } from 'lucide-react';
import type { RuleScope, ScopeProduct } from '../actions';

interface RuleScopeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleName: string;
  discountDisplay: string;
  scope: RuleScope | null;
  loading: boolean;
  error?: string;
}

export function RuleScopeSheet({
  open,
  onOpenChange,
  ruleName,
  discountDisplay,
  scope,
  loading,
  error,
}: RuleScopeSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Affected Products
          </SheetTitle>
          <SheetDescription>
            Products matching <strong>{ruleName}</strong> — {discountDisplay}
          </SheetDescription>
        </SheetHeader>

        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && scope && (
          <>
            {/* Summary row */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex-1">
                <span className="font-semibold text-foreground">{scope.count}</span>
                <span className="text-muted-foreground"> of {scope.totalProducts} products match</span>
              </div>
              <Badge variant="destructive" className="shrink-0">
                {discountDisplay}
              </Badge>
            </div>

            {/* Runtime conditions notice */}
            {scope.hasRuntimeConditions && (
              <div className="flex items-start gap-2 mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200 text-xs">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  This rule has additional runtime conditions (inventory age, stock level, or time). The actual number of affected products may be smaller when the rule runs.
                </span>
              </div>
            )}

            {scope.count === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No products match the current filter</p>
                <p className="text-xs mt-1">Check category or product ID conditions in the rule</p>
              </div>
            )}

            {/* Product list */}
            <div className="space-y-2">
              {scope.products.map((product) => (
                <ProductScopeRow key={product.id} product={product} />
              ))}
              {scope.count > scope.products.length && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Showing {scope.products.length} of {scope.count} products
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ProductScopeRow({ product }: { product: ScopeProduct }) {
  const hasDiscount = product.discountedPrice < product.price;

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{product.name}</p>
        {product.category && (
          <p className="text-xs text-muted-foreground">{product.category}</p>
        )}
      </div>

      <div className="text-right shrink-0">
        {hasDiscount ? (
          <>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs text-muted-foreground line-through">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                ${product.discountedPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-1 justify-end mt-0.5">
              <TrendingDown className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                {product.discountPercent}% off
              </span>
            </div>
          </>
        ) : (
          <span className="text-sm font-medium">${product.price.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
