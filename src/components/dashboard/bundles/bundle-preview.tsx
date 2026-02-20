'use client';

/**
 * Bundle Preview Card
 *
 * Displays a compact preview of a bundle with status, products, savings, and action buttons.
 * Used in both dashboard and inline generators after bundle creation.
 */

import { BundleDeal } from '@/types/bundles';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus } from 'lucide-react';

interface BundlePreviewProps {
  bundle: BundleDeal;
  onEdit?: () => void;
  onCreateAnother?: () => void;
  showActions?: boolean;
}

export function BundlePreview({
  bundle,
  onEdit,
  onCreateAnother,
  showActions = true,
}: BundlePreviewProps) {
  return (
    <Card className="p-4 border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{bundle.name}</h3>
              <Badge
                className={`${
                  bundle.status === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}
              >
                {bundle.status}
              </Badge>
            </div>
            {bundle.description && (
              <p className="text-sm text-muted-foreground">{bundle.description}</p>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-white/50 dark:bg-black/20 rounded p-2">
            <div className="text-xs text-muted-foreground">Products</div>
            <div className="font-semibold">{bundle.products.length}</div>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded p-2">
            <div className="text-xs text-muted-foreground">Original</div>
            <div className="font-semibold">${bundle.originalTotal.toFixed(2)}</div>
          </div>
          <div className="bg-white/50 dark:bg-black/20 rounded p-2">
            <div className="text-xs text-muted-foreground">Bundle Price</div>
            <div className="font-semibold">${bundle.bundlePrice.toFixed(2)}</div>
          </div>
        </div>

        {/* Savings */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded p-3 border border-green-200/50 dark:border-green-900/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Savings</div>
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {bundle.savingsPercent}% OFF
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Amount</div>
              <div className="font-semibold">${bundle.savingsAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Bundle Type */}
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="uppercase tracking-wider font-medium">
            {bundle.type.replace('_', ' ')}
          </span>
        </div>

        {/* Actions */}
        {showActions && (onEdit || onCreateAnother) && (
          <div className="flex gap-2 pt-2 border-t border-green-200/50 dark:border-green-900/30">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEdit}
                className="flex-1 border-green-200 hover:bg-green-100/50 dark:border-green-900/50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            {onCreateAnother && (
              <Button
                size="sm"
                onClick={onCreateAnother}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Another
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
