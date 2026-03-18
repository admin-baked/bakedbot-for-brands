'use client';

// src/components/checkout/retailer-selector.tsx
// Step shown when a claimed brand page has multiple dispensary locations.
// Auto-selects and skips render when only one retailer is available.

import { useEffect } from 'react';
import { MapPin, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type CheckoutRetailer = {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  distance?: number;
};

type Props = {
  retailers: CheckoutRetailer[];
  selected: string | null;
  onSelect: (retailerId: string) => void;
};

export function RetailerSelector({ retailers, selected, onSelect }: Props) {
  // Auto-select when only one option
  useEffect(() => {
    if (retailers.length === 1 && !selected) {
      onSelect(retailers[0].id);
    }
  }, [retailers, selected, onSelect]);

  if (retailers.length <= 1) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Choose a pickup location</p>
      {retailers.map((r) => {
        const isSelected = selected === r.id;
        const locationLine = [r.city, r.state].filter(Boolean).join(', ');
        return (
          <Card
            key={r.id}
            className={cn(
              'cursor-pointer border-2 transition-colors',
              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            )}
            onClick={() => onSelect(r.id)}
          >
            <CardContent className="flex items-start gap-3 p-4">
              <Store className={cn('h-5 w-5 mt-0.5 shrink-0', isSelected ? 'text-primary' : 'text-muted-foreground')} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight">{r.name}</p>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{r.address}{locationLine ? `, ${locationLine}` : ''}</span>
                </div>
              </div>
              {r.distance != null && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {r.distance.toFixed(1)} mi
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
