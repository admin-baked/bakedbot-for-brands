'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Navigation,
  Clock,
  Phone,
  Star,
  ChevronRight,
  Loader2,
  CheckCircle,
  Store,
  Package,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Dispensary {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  distance?: number;
  rating?: number;
  reviewCount?: number;
  hours?: string;
  hasProducts?: boolean;
  pickupReady?: boolean;
  deliveryAvailable?: boolean;
  logo?: string;
}

interface DispensaryLocatorFlowProps {
  brandName: string;
  primaryColor?: string;
  onDispensarySelect?: (dispensary: Dispensary) => void;
  selectedDispensary?: Dispensary | null;
  cartItemCount?: number;
}

// Demo dispensaries for the flow
const demoDispensaries: Dispensary[] = [
  {
    id: 'disp-1',
    name: 'Green Valley Dispensary',
    address: '420 Cannabis Blvd',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    phone: '(415) 555-0420',
    distance: 0.8,
    rating: 4.8,
    reviewCount: 324,
    hours: 'Open until 10PM',
    hasProducts: true,
    pickupReady: true,
    deliveryAvailable: true,
  },
  {
    id: 'disp-2',
    name: 'Herbal Heights',
    address: '710 Dab Ave',
    city: 'San Francisco',
    state: 'CA',
    zip: '94103',
    phone: '(415) 555-0710',
    distance: 1.2,
    rating: 4.6,
    reviewCount: 189,
    hours: 'Open until 9PM',
    hasProducts: true,
    pickupReady: true,
    deliveryAvailable: false,
  },
  {
    id: 'disp-3',
    name: 'Pacific Cannabis Co',
    address: '888 Green St',
    city: 'Oakland',
    state: 'CA',
    zip: '94612',
    phone: '(510) 555-0888',
    distance: 3.5,
    rating: 4.9,
    reviewCount: 512,
    hours: 'Open until 11PM',
    hasProducts: true,
    pickupReady: false,
    deliveryAvailable: true,
  },
  {
    id: 'disp-4',
    name: 'Bay Area Buds',
    address: '123 Leaf Lane',
    city: 'Berkeley',
    state: 'CA',
    zip: '94704',
    phone: '(510) 555-0123',
    distance: 5.2,
    rating: 4.4,
    reviewCount: 98,
    hours: 'Open until 8PM',
    hasProducts: true,
    pickupReady: true,
    deliveryAvailable: false,
  },
];

export function DispensaryLocatorFlow({
  brandName,
  primaryColor = '#16a34a',
  onDispensarySelect,
  selectedDispensary,
  cartItemCount = 0,
}: DispensaryLocatorFlowProps) {
  const [zipCode, setZipCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const handleSearch = async () => {
    if (!zipCode.trim() && !useCurrentLocation) return;

    setIsSearching(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setDispensaries(demoDispensaries);
    setHasSearched(true);
    setIsSearching(false);
  };

  const handleUseLocation = async () => {
    setUseCurrentLocation(true);
    setIsSearching(true);

    // Simulate getting location
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setZipCode('94102');
    setDispensaries(demoDispensaries);
    setHasSearched(true);
    setIsSearching(false);
  };

  const handleSelectDispensary = (dispensary: Dispensary) => {
    onDispensarySelect?.(dispensary);
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge
            className="mb-4 text-white border-0"
            style={{ backgroundColor: primaryColor }}
          >
            <MapPin className="h-3 w-3 mr-1" />
            Find Pickup Location
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Where would you like to pick up?
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Order {brandName} products online and pick them up at a licensed dispensary near you.
            {cartItemCount > 0 && (
              <span className="font-medium" style={{ color: primaryColor }}>
                {' '}You have {cartItemCount} item{cartItemCount > 1 ? 's' : ''} in your cart.
              </span>
            )}
          </p>
        </div>

        {/* Search Card */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter ZIP code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="pl-10 h-12 text-lg"
                  maxLength={5}
                  disabled={isSearching}
                />
              </div>
              <Button
                size="lg"
                className="h-12 px-8 font-semibold"
                style={{ backgroundColor: primaryColor }}
                onClick={handleSearch}
                disabled={isSearching || (!zipCode.trim() && !useCurrentLocation)}
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  'Find Dispensaries'
                )}
              </Button>
            </div>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-4 text-sm text-muted-foreground">
                or
              </span>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 gap-2"
              onClick={handleUseLocation}
              disabled={isSearching}
            >
              <Navigation className="h-5 w-5" />
              Use My Current Location
            </Button>
          </CardContent>
        </Card>

        {/* Selected Dispensary Banner */}
        {selectedDispensary && (
          <Card className="max-w-2xl mx-auto mb-8 border-2" style={{ borderColor: primaryColor }}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${primaryColor}20` }}
                  >
                    <CheckCircle className="h-6 w-6" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pickup Location Selected</p>
                    <p className="font-semibold">{selectedDispensary.name}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDispensarySelect?.(null as unknown as Dispensary)}
                >
                  Change
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {hasSearched && !selectedDispensary && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <p className="text-muted-foreground">
                {dispensaries.length} dispensaries found near {zipCode}
              </p>
              <Badge variant="outline" className="gap-1">
                <Store className="h-3 w-3" />
                All carry {brandName}
              </Badge>
            </div>

            <div className="space-y-4">
              {dispensaries.map((dispensary) => (
                <Card
                  key={dispensary.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                  onClick={() => handleSelectDispensary(dispensary)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Dispensary Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div
                            className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${primaryColor}15` }}
                          >
                            <Store className="h-7 w-7" style={{ color: primaryColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-lg">{dispensary.name}</h3>
                              {dispensary.pickupReady && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Package className="h-3 w-3" />
                                  Ready Today
                                </Badge>
                              )}
                              {dispensary.deliveryAvailable && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Truck className="h-3 w-3" />
                                  Delivery
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm mt-1">
                              {dispensary.address}, {dispensary.city}, {dispensary.state} {dispensary.zip}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              {dispensary.rating && (
                                <span className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{dispensary.rating}</span>
                                  <span className="text-muted-foreground">({dispensary.reviewCount})</span>
                                </span>
                              )}
                              {dispensary.hours && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {dispensary.hours}
                                </span>
                              )}
                              {dispensary.phone && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-4 w-4" />
                                  {dispensary.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Distance & Action */}
                      <div className="flex items-center gap-4 md:flex-col md:items-end">
                        {dispensary.distance && (
                          <div className="text-right">
                            <p className="text-2xl font-bold" style={{ color: primaryColor }}>
                              {dispensary.distance} mi
                            </p>
                            <p className="text-xs text-muted-foreground">away</p>
                          </div>
                        )}
                        <Button
                          className="shrink-0 gap-1"
                          style={{ backgroundColor: primaryColor }}
                        >
                          Select
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && (
          <div className="text-center py-12">
            <div
              className="h-20 w-20 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}15` }}
            >
              <MapPin className="h-10 w-10" style={{ color: primaryColor }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Enter your location</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              We&apos;ll find licensed dispensaries near you that carry {brandName} products.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
