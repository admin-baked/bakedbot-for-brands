'use client';

/**
 * Carousel Preview Component
 *
 * Live preview of a product carousel while creating/editing.
 * Shows selected products in a scrollable card layout matching the public menu style.
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PreviewProduct {
  id: string;
  name: string;
  category?: string;
  price: number;
  imageUrl?: string;
  thc?: string;
}

interface CarouselPreviewProps {
  title: string;
  description?: string;
  selectedProductIds: string[];
  orgId: string;
  className?: string;
}

export function CarouselPreview({
  title,
  description,
  selectedProductIds,
  orgId,
  className,
}: CarouselPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [products, setProducts] = useState<PreviewProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProducts() {
      if (!orgId || selectedProductIds.length === 0) {
        setProducts([]);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/products?orgId=${orgId}`);
        if (response.ok) {
          const data = await response.json();
          const allProducts: PreviewProduct[] = data.products || [];
          const selected = selectedProductIds
            .map(id => allProducts.find(p => p.id === id))
            .filter(Boolean) as PreviewProduct[];
          setProducts(selected);
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [orgId, selectedProductIds]);

  if (selectedProductIds.length === 0) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-lg">Live Preview</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Select products to see a live preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Preview</CardTitle>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'desktop' | 'mobile')}>
            <TabsList className="grid w-[200px] grid-cols-2">
              <TabsTrigger value="desktop" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Desktop
              </TabsTrigger>
              <TabsTrigger value="mobile" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div
          className={cn(
            'transition-all duration-300 bg-background rounded-lg border p-4',
            viewMode === 'mobile' ? 'max-w-[375px] mx-auto' : 'w-full'
          )}
        >
          {/* Carousel Header */}
          <div className="mb-3">
            <h3 className="text-lg font-bold">{title || 'Untitled Carousel'}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>

          {/* Product Cards */}
          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: viewMode === 'mobile' ? 2 : 4 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[160px] animate-pulse">
                  <div className="bg-muted rounded-lg h-28 mb-2" />
                  <div className="bg-muted rounded h-4 w-3/4 mb-1" />
                  <div className="bg-muted rounded h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      'flex-shrink-0 bg-card rounded-lg overflow-hidden border shadow-sm',
                      viewMode === 'mobile' ? 'w-[140px]' : 'w-[160px]'
                    )}
                  >
                    <div className="relative h-28 bg-muted">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                      )}
                      {product.category && (
                        <Badge
                          variant="secondary"
                          className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0"
                        >
                          {product.category}
                        </Badge>
                      )}
                    </div>
                    <div className="p-2.5">
                      <h4 className="text-xs font-semibold line-clamp-2 leading-tight mb-1.5">
                        {product.name}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">
                          ${product.price?.toFixed(2) ?? '0.00'}
                        </span>
                        {product.thc && (
                          <span className="text-[10px] text-muted-foreground">
                            {product.thc}% THC
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {/* Product count badge */}
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''}
            </Badge>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
