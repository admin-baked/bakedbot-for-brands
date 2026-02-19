'use client';

/**
 * BundleQuickSheet — Bottom slide panel for bundle membership.
 * Opens from the "Bundle" button on a product card in the dashboard Preview tab.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ExternalLink, Plus, Percent, Loader2 } from 'lucide-react';
import { getProductBundles } from '@/app/dashboard/menu/actions';
import type { Product } from '@/types/domain';

interface ProductBundle {
  id: string;
  name: string;
  savingsPercent: number;
  bundlePrice: number;
  status: 'active' | 'draft';
}

interface BundleQuickSheetProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export function BundleQuickSheet({ product, open, onClose }: BundleQuickSheetProps) {
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getProductBundles(product.id)
      .then(setBundles)
      .catch(() => setBundles([]))
      .finally(() => setLoading(false));
  }, [open, product.id]);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Bundle Membership
          </SheetTitle>
          <SheetDescription className="line-clamp-1">{product.name}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bundles.length === 0 ? (
            <div className="text-center py-6">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Not in any bundles yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {bundles.map((bundle) => (
                <div key={bundle.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{bundle.name}</p>
                    <p className="text-xs text-muted-foreground">${bundle.bundlePrice.toFixed(2)} bundle price</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={bundle.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {bundle.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
                      <Percent className="h-3 w-3 mr-1" />
                      {bundle.savingsPercent}% off
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button asChild className="flex-1" variant="outline">
              <Link
                href={`/dashboard/bundles?addProduct=${product.id}&name=${encodeURIComponent(product.name)}`}
                onClick={onClose}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add to Bundle
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon">
              <Link href="/dashboard/bundles" onClick={onClose}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
