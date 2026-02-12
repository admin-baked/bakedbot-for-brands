'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ShoppingCart, Leaf, Share2, Info } from 'lucide-react';
import Image from 'next/image';
import { Product } from '@/types/domain';
import { cn } from '@/lib/utils';
import { useState, useCallback } from 'react';
import { ProductUpsellRow } from '@/components/upsell/product-upsell-row';
import { fetchProductUpsells } from '@/server/actions/upsell';

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  onFavorite: (productId: string) => void;
  isFavorite: boolean;
  primaryColor?: string;
  orgId?: string;
}

export function ProductDetailModal({
  product,
  open,
  onClose,
  onAddToCart,
  onFavorite,
  isFavorite,
  primaryColor = '#16a34a',
  orgId,
}: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  const fetchUpsells = useCallback(() => {
    if (!product || !orgId) {
      return Promise.resolve({ suggestions: [], placement: 'product_detail' as const, generatedAt: Date.now() });
    }
    return fetchProductUpsells(product.id, orgId);
  }, [product?.id, orgId]);

  if (!product) return null;

  // Use product effects if available, otherwise show decent defaults for the demo
  const effects = product.effects?.length ? product.effects : ['Relaxed', 'Happy', 'Euphoric'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
        <div className="grid md:grid-cols-2 h-full max-h-[90vh] overflow-y-auto">
          {/* Image Side */}
          <div className="relative bg-muted h-[300px] md:h-full md:min-h-[500px]">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Leaf className="h-20 w-20 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
               {product.strainType && (
                 <Badge 
                    className="text-white border-0"
                    style={{ backgroundColor: primaryColor }}
                 >
                   {product.strainType}
                 </Badge>
               )}
               {product.thcPercent && (
                 <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-md">
                   {product.thcPercent}% THC
                 </Badge>
               )}
            </div>
          </div>

          {/* Content Side */}
          <div className="p-6 md:p-8 flex flex-col h-full bg-background">
            <DialogHeader className="mb-4">
               <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
                      {product.category}
                    </p>
                    <DialogTitle className="text-2xl md:text-3xl font-bold leading-tight mb-2">
                      {product.name}
                    </DialogTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-red-500"
                    onClick={() => onFavorite(product.id)}
                  >
                    <Heart className={cn("h-6 w-6", isFavorite && "fill-red-500 text-red-500")} />
                  </Button>
               </div>
               <div className="flex items-center gap-4 mt-2">
                 <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                    ${product.price.toFixed(2)}
                 </span>
                 {product.price < 30 && (
                   <Badge variant="outline" className="border-red-200 text-red-600 bg-red-50">
                     Great Deal
                   </Badge>
                 )}
               </div>
            </DialogHeader>

            <DialogDescription className="text-base text-foreground/80 mb-6 leading-relaxed">
              {product.description || "Experience premium quality with this carefully selected cannabis product. Known for its potent effects and distinct flavor profile."}
            </DialogDescription>

            {/* Effects */}
            <div className="space-y-6 mb-8 mr-1">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase text-muted-foreground">
                  <SparklesIcon className="h-4 w-4" /> Effects
                </h4>
                <div className="flex flex-wrap gap-2">
                  {effects.map((effect, i) => (
                    <Badge key={i} variant="secondary" className="px-3 py-1">
                      {effect}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Upsell Suggestions */}
            {orgId && (
              <div className="mb-6">
                <ProductUpsellRow
                  heading="Pairs Well With"
                  fetchUpsells={fetchUpsells}
                  onAddToCart={(p) => {
                    onAddToCart(p, 1);
                  }}
                  primaryColor={primaryColor}
                />
              </div>
            )}

            {/* Actions */}
            <div className="mt-auto pt-6 border-t flex flex-col gap-4">
               <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-md">
                     <Button 
                       variant="ghost" 
                       size="icon"
                       className="h-10 w-10 rounded-none"
                       onClick={() => setQuantity(Math.max(1, quantity - 1))}
                     >
                       -
                     </Button>
                     <span className="w-12 text-center font-medium">{quantity}</span>
                     <Button 
                       variant="ghost" 
                       size="icon"
                       className="h-10 w-10 rounded-none"
                       onClick={() => setQuantity(quantity + 1)}
                     >
                       +
                     </Button>
                  </div>
                  <Button 
                    className="flex-1 h-10 font-bold"
                    style={{ backgroundColor: primaryColor }}
                    onClick={() => {
                      onAddToCart(product, quantity);
                      setQuantity(1);
                      onClose();
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart - ${(product.price * quantity).toFixed(2)}
                  </Button>
               </div>
               
               <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                 <Info className="h-3 w-3" />
                 Taxes calculated at checkout.
               </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SparklesIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M9 3v4" />
      <path d="M5 17v4" />
      <path d="M9 17v4" />
    </svg>
  );
}
