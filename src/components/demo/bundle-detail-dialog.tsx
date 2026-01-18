'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Sparkles,
  Percent,
  ShoppingCart,
  Check,
  Plus,
  Minus,
  Leaf,
} from 'lucide-react';

export interface BundleDeal {
  id: string;
  name: string;
  description: string;
  originalPrice: number;
  bundlePrice: number;
  savingsPercent: number;
  image?: string;
  products?: string[];
  badge?: string;
  backgroundColor?: string;
}

interface BundleDetailDialogProps {
  bundle: BundleDeal | null;
  open: boolean;
  onClose: () => void;
  onAddToCart: (bundle: BundleDeal, quantity: number) => void;
  primaryColor?: string;
}

// Default bundle products for display
const bundleProductDetails: Record<string, { name: string; category: string; value: string }[]> = {
  '1': [ // Starter Pack
    { name: 'House Pre-Roll (1g)', category: 'Pre-roll', value: '$15' },
    { name: 'Mixed Fruit Gummies (10pk)', category: 'Edibles', value: '$25' },
    { name: 'Premium Grinder', category: 'Accessories', value: '$15' },
  ],
  '2': [ // Weekend Vibes
    { name: 'Any Edible #1', category: 'Edibles', value: '$22' },
    { name: 'Any Edible #2', category: 'Edibles', value: '$22' },
    { name: 'Any Edible #3', category: 'Edibles', value: '$22' },
  ],
  '3': [ // Concentrate Bundle
    { name: 'Live Resin (1g)', category: 'Concentrates', value: '$55' },
    { name: 'Badder (1g)', category: 'Concentrates', value: '$50' },
    { name: 'THC-A Diamonds (0.5g)', category: 'Concentrates', value: '$55' },
  ],
  '4': [ // Vape Trio
    { name: 'Premium Cart #1 (1g)', category: 'Vapes', value: '$45' },
    { name: 'Premium Cart #2 (1g)', category: 'Vapes', value: '$45' },
    { name: 'Premium Cart #3 (1g)', category: 'Vapes', value: '$45' },
  ],
  '5': [ // Sleep Bundle
    { name: 'Indica Flower (3.5g)', category: 'Flower', value: '$40' },
    { name: 'Sleep Tincture (30ml)', category: 'Tinctures', value: '$60' },
  ],
  '6': [ // First Timer Pack
    { name: 'CBD Pre-Roll (1g)', category: 'Pre-roll', value: '$18' },
    { name: '1:1 CBD:THC Gummies (10pk)', category: 'Edibles', value: '$20' },
  ],
};

export function BundleDetailDialog({
  bundle,
  open,
  onClose,
  onAddToCart,
  primaryColor = '#16a34a',
}: BundleDetailDialogProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  if (!bundle) return null;

  const products = bundleProductDetails[bundle.id] || [];
  const bundleColor = bundle.backgroundColor || primaryColor;

  const handleAddToCart = () => {
    onAddToCart(bundle, quantity);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      setQuantity(1);
    }, 1500);
  };

  const handleClose = () => {
    onClose();
    setQuantity(1);
    setAdded(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className="rounded-lg p-6 text-white relative overflow-hidden -m-6 mb-4"
            style={{ backgroundColor: bundleColor }}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-8 -top-8 w-32 h-32 border-4 border-white rounded-full" />
              <div className="absolute -left-4 -bottom-4 w-24 h-24 border-4 border-white rounded-full" />
            </div>

            {/* Badge */}
            {bundle.badge && (
              <Badge className="absolute top-4 right-4 bg-white/20 text-white border-0">
                {bundle.badge}
              </Badge>
            )}

            {/* Content */}
            <div className="relative">
              <Package className="h-10 w-10 mb-3 opacity-80" />
              <DialogTitle className="text-2xl font-bold text-white mb-1">
                {bundle.name}
              </DialogTitle>
              <DialogDescription className="text-white/80">
                {bundle.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Bundle Contents */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: bundleColor }} />
              What&apos;s Included
            </h4>
            <div className="space-y-2">
              {products.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${bundleColor}20` }}
                    >
                      <Leaf className="h-4 w-4" style={{ color: bundleColor }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{product.value}</span>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Pricing Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Regular Price</span>
              <span className="line-through">${bundle.originalPrice}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Bundle Price</span>
              <span className="text-xl font-bold" style={{ color: bundleColor }}>
                ${bundle.bundlePrice}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You Save</span>
              <Badge variant="destructive" className="font-bold">
                <Percent className="h-3 w-3 mr-1" />
                ${bundle.originalPrice - bundle.bundlePrice} ({bundle.savingsPercent}%)
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Quantity & Add to Cart */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Quantity</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              className="w-full h-12 font-bold text-base gap-2"
              style={{ backgroundColor: added ? '#22c55e' : bundleColor }}
              onClick={handleAddToCart}
              disabled={added}
            >
              {added ? (
                <>
                  <Check className="h-5 w-5" />
                  Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5" />
                  Add Bundle to Cart — ${bundle.bundlePrice * quantity}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
