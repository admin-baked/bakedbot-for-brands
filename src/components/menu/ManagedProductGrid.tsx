'use client';

/**
 * ManagedProductGrid — Dashboard-only product grid with drag-to-reorder + action overlays.
 * Used in the dashboard Menu → Preview tab when isManageMode={true}.
 * Public-facing pages use the standard OversizedProductCard grid.
 */

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GripVertical, ArrowUpDown, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SortableProductCard } from './SortableProductCard';
import type { Product } from '@/types/domain';

interface ManagedProductGridProps {
  products: Product[];
  primaryColor: string;
  onAddToCart: (product: Product, qty: number) => void;
  getCartQuantity: (id: string) => number;
  onProductClick: (product: Product) => void;
  onFavorite: (id: string) => void;
  favorites: Set<string>;
  getDealBadge: (product: Product) => string | undefined;
  onReorderSave?: (updates: { id: string; sortOrder: number }[]) => Promise<void>;
  onToggleFeatured?: (productId: string, featured: boolean) => Promise<void>;
}

export function ManagedProductGrid({
  products,
  primaryColor,
  onAddToCart,
  getCartQuantity,
  onProductClick,
  onFavorite,
  favorites,
  getDealBadge,
  onReorderSave,
  onToggleFeatured,
}: ManagedProductGridProps) {
  const [customOrderMode, setCustomOrderMode] = useState(false);
  const [orderedProducts, setOrderedProducts] = useState<Product[]>(products);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Sync when parent products change (e.g. after filter change)
  // Only update if not in custom order mode
  const [prevProducts, setPrevProducts] = useState(products);
  if (products !== prevProducts) {
    setPrevProducts(products);
    if (!customOrderMode) {
      setOrderedProducts(products);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedProducts.findIndex(p => p.id === active.id);
    const newIndex = orderedProducts.findIndex(p => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(orderedProducts, oldIndex, newIndex);
    setOrderedProducts(reordered);

    if (!onReorderSave) return;

    setIsSaving(true);
    try {
      const updates = reordered.map((p, idx) => ({ id: p.id, sortOrder: idx }));
      await onReorderSave(updates);
      toast({
        title: 'Order saved',
        description: 'Product order updated. Customers see this on their next page load.',
      });
    } catch {
      toast({ title: 'Failed to save order', variant: 'destructive' });
      // Revert on failure
      setOrderedProducts(products);
    } finally {
      setIsSaving(false);
    }
  }, [orderedProducts, onReorderSave, products, toast]);

  const handleToggleCustomOrder = () => {
    if (customOrderMode) {
      // Exiting custom order mode — reset to parent products
      setOrderedProducts(products);
    }
    setCustomOrderMode(prev => !prev);
  };

  const displayProducts = customOrderMode ? orderedProducts : products;

  return (
    <div>
      {/* Custom Order Controls */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <Button
            variant={customOrderMode ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleCustomOrder}
            className="gap-2"
          >
            {customOrderMode ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Custom Order On
              </>
            ) : (
              <>
                <ArrowUpDown className="h-3.5 w-3.5" />
                Reorder Products
              </>
            )}
          </Button>
          {customOrderMode && (
            <Badge variant="secondary" className="text-xs">
              <GripVertical className="h-3 w-3 mr-1" />
              Drag cards to reorder
            </Badge>
          )}
          {isSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>
          )}
        </div>
        {customOrderMode && (
          <p className="text-xs text-muted-foreground">
            Order reflects on your live menu
          </p>
        )}
      </div>

      {/* Sortable Grid */}
      {customOrderMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={displayProducts.map(p => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayProducts.map((product) => (
                <SortableProductCard
                  key={product.id}
                  product={product}
                  primaryColor={primaryColor}
                  onAddToCart={onAddToCart}
                  inCart={getCartQuantity(product.id)}
                  dealBadge={getDealBadge(product)}
                  onClick={() => onProductClick(product)}
                  onFavorite={onFavorite}
                  isFavorite={favorites.has(product.id)}
                  sortable={true}
                  onToggleFeatured={onToggleFeatured}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {displayProducts.map((product) => (
            <SortableProductCard
              key={product.id}
              product={product}
              primaryColor={primaryColor}
              onAddToCart={onAddToCart}
              inCart={getCartQuantity(product.id)}
              dealBadge={getDealBadge(product)}
              onClick={() => onProductClick(product)}
              onFavorite={onFavorite}
              isFavorite={favorites.has(product.id)}
              sortable={false}
              onToggleFeatured={onToggleFeatured}
            />
          ))}
        </div>
      )}
    </div>
  );
}
