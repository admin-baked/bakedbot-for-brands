'use client';

/**
 * PriceQuickSheet — Right-side slide panel for inline price editing.
 * Opens from the "Price" button on a product card in the dashboard Preview tab.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, DollarSign, Tag, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateProductPrice } from '@/app/dashboard/menu/actions';
import type { Product } from '@/types/domain';

interface PriceQuickSheetProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export function PriceQuickSheet({ product, open, onClose }: PriceQuickSheetProps) {
  const [price, setPrice] = useState(product.price.toFixed(2));
  const [cost, setCost] = useState(product.cost != null ? product.cost.toFixed(2) : '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const margin = product.cost != null && product.price > 0
    ? ((product.price - product.cost) / product.price * 100).toFixed(0)
    : null;

  const handleSave = async () => {
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const result = await updateProductPrice(product.id, parsedPrice);
      if (result.success) {
        toast({ title: 'Price updated', description: `${product.name} is now $${parsedPrice.toFixed(2)}` });
        onClose();
      } else {
        toast({ title: 'Failed to update price', description: result.error, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Price Manager
          </SheetTitle>
          <SheetDescription className="line-clamp-1">{product.name}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Current Price */}
          <div className="space-y-2">
            <Label htmlFor="retail-price">Retail Price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="retail-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          {/* COGS / Margin */}
          <div className="space-y-2">
            <Label>Cost (COGS)</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="pl-7"
                  placeholder="Not set"
                />
              </div>
              {margin !== null && (
                <Badge
                  variant="secondary"
                  className={Number(margin) < 30 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}
                >
                  {margin}% margin
                </Badge>
              )}
            </div>
          </div>

          {/* Dynamic Pricing Badge (read-only indicator) */}
          {product.dynamicPricingApplied && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
              <TrendingDown className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Dynamic Pricing Active</p>
                {product.dynamicPricingBadge && (
                  <p className="text-xs text-blue-600 mt-0.5">{product.dynamicPricingBadge}</p>
                )}
                {product.dynamicPricingReason && (
                  <p className="text-xs text-blue-600 mt-0.5">{product.dynamicPricingReason}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Saving…' : 'Update Price'}
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href={`/dashboard/pricing`} onClick={onClose}>
                <Tag className="h-4 w-4 mr-2" />
                Open Pricing Tool
                <ExternalLink className="h-3 w-3 ml-auto" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
