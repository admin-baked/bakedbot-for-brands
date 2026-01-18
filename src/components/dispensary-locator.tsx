
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Navigation, Heart, Search } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import { haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Retailer } from '@/types/domain';
import { Skeleton } from '@/components/ui/skeleton';

import { logger } from '@/lib/logger';
import { RetailerMap } from '@/components/maps/retailer-map';
import { SingleLocationBanner } from '@/components/single-location-banner';

interface DispensaryLocatorProps {
  locations?: Retailer[];
  isLoading?: boolean;
  className?: string;
  /** Force full locator even for single location */
  forceFullView?: boolean;
  /** Props to pass to SingleLocationBanner when showing single location */
  singleLocationProps?: {
    isOpen?: boolean;
    hours?: string;
    rating?: number;
    reviewCount?: number;
  };
}

export default function DispensaryLocator({
  locations = [],
  isLoading = false,
  className,
  forceFullView = false,
  singleLocationProps
}: DispensaryLocatorProps) {
  const {
    selectedRetailerId,
    setSelectedRetailerId,
    setSelectedRetailer,
    favoriteRetailerId,
    favoriteRetailerIds,
    toggleFavoriteRetailer,
    _hasHydrated
  } = useStore();
  const firebase = useOptionalFirebase();
  const { toast } = useToast();

  const user = firebase?.user ?? null;
  const firestore = firebase?.firestore ?? null;

  const [isLocating, setIsLocating] = useState(false);
  const [sortedLocations, setSortedLocations] = useState<Retailer[]>([]);

  useEffect(() => {
    if (locations) {
      setSortedLocations(locations);
    }
  }, [locations]);

  // New effect to sync favorite retailer on component mount
  useEffect(() => {
    if (_hasHydrated) {
      if (!selectedRetailerId && favoriteRetailerId) {
        setSelectedRetailerId(favoriteRetailerId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, favoriteRetailerId]);

  const handleFindClosest = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: 'Geolocation is not supported by your browser.' });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userCoords = { lat: latitude, lon: longitude };

        const newSortedLocations = [...locations]
          .map((loc) => ({
            ...loc,
            distance: haversineDistance(userCoords, { lat: loc.lat!, lon: loc.lon! }),
          }))
          .sort((a, b) => a.distance - b.distance);

        setSortedLocations(newSortedLocations);
        setIsLocating(false);
        if (newSortedLocations.length > 0) {
          setSelectedRetailer(newSortedLocations[0]);
        }
      },
      (error) => {
        logger.error('Error getting location:', error instanceof Error ? error : new Error(String(error)));
        toast({ variant: 'destructive', title: 'Could not get your location. Please ensure location services are enabled.' });
        setIsLocating(false);
      }
    );
  };

  const handleSelectLocation = (id: string) => {
    const loc = sortedLocations.find(l => l.id === id) || locations.find(l => l.id === id);
    if (loc) {
      setSelectedRetailer(loc);
    } else {
      setSelectedRetailerId(id);
    }
  }

  const handleSetFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) {
      toast({ variant: 'destructive', title: 'Login required', description: 'Please log in to set a favorite location.' });
      return;
    }
    if (!firestore) {
      logger.warn('No firestore available; cannot save favorite.');
      toast({ variant: 'destructive', title: 'Database connection not available.' });
      return;
    }

    const isFavorite = favoriteRetailerIds.includes(id);
    const updatedFavorites = isFavorite
      ? favoriteRetailerIds.filter(fId => fId !== id)
      : [...favoriteRetailerIds, id];

    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, { favoriteRetailerIds: updatedFavorites });
      toggleFavoriteRetailer(id);
      toast({
        title: isFavorite ? 'Removed from favorites' : 'Added to favorites!',
        description: isFavorite ? 'Dispensary removed.' : 'You can find it in your Favorites tab.'
      });
    } catch (error) {
      logger.error('Failed to set favorite location', error instanceof Error ? error : new Error(String(error)));
      toast({ variant: 'destructive', title: 'Could not save favorite location.' });
    }
  };

  const [searchQuery, setSearchQuery] = useState('');

  const handleManualSearch = () => {
    if (!searchQuery.trim()) {
      setSortedLocations(locations);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = locations.filter(l =>
      l.name.toLowerCase().includes(query) ||
      l.city.toLowerCase().includes(query) ||
      l.zip.includes(query) ||
      l.state.toLowerCase().includes(query)
    );

    setSortedLocations(results);

    if (results.length === 0) {
      toast({
        variant: "destructive",
        title: "No locations found",
        description: `We couldn't find any dispensaries matching "${searchQuery}".`
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSearch();
    }
  };

  const displayLocations = sortedLocations.length > 0 ? sortedLocations : locations;

  // For single location, show optimized compact banner unless forced to full view
  if (locations.length === 1 && !forceFullView && !isLoading) {
    const singleRetailer = locations[0];
    return (
      <div className={cn("py-4", className)} id="locator">
        <SingleLocationBanner
          retailer={singleRetailer}
          isOpen={singleLocationProps?.isOpen}
          hours={singleLocationProps?.hours}
          rating={singleLocationProps?.rating}
          reviewCount={singleLocationProps?.reviewCount}
          isFavorite={_hasHydrated && favoriteRetailerIds.includes(singleRetailer.id)}
          onFavoriteToggle={() => handleSetFavorite({ stopPropagation: () => {} } as React.MouseEvent, singleRetailer.id)}
        />
      </div>
    );
  }

  return (
    <div className={cn("py-12 bg-muted/40 rounded-lg", className)} id="locator">
      <div className="container mx-auto text-center max-w-4xl">
        <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4">
          Find a Dispensary Near You
        </h2>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Enter City or Zip Code"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button onClick={handleManualSearch} variant="secondary">
            Search
          </Button>
          <span className="text-sm text-muted-foreground hidden md:inline">- OR -</span>
          <Button onClick={handleFindClosest} disabled={isLocating || isLoading}>
            {isLocating ? <Loader2 className="mr-2 animate-spin" /> : <Navigation className="mr-2" />}
            Use My Current Location
          </Button>
        </div>

        <div className="mt-8 space-y-8">
          {/* Map View */}
          {displayLocations.length > 0 && !isLoading && (
            <div className="w-full h-[400px] hidden md:block rounded-lg overflow-hidden border shadow-sm">
              <RetailerMap
                retailers={displayLocations.map(l => ({
                  id: l.id,
                  name: l.name,
                  address: l.address,
                  lat: l.lat || l.lon, // Handle mismatched types if needed, but checked Retailer has lat/lon
                  lng: l.lon || l.lat
                }))}
                height="100%"
              />
            </div>
          )}

          <div className="flex gap-6 pb-4 -mx-4 px-4 overflow-x-auto">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="w-80 shrink-0">
                  <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-5 w-1/3 mt-2" />
                  </CardContent>
                </Card>
              ))
            ) : displayLocations.map(loc => {
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.name}, ${loc.address}, ${loc.city}, ${loc.state} ${loc.zip}`)}`;
              const isFavorite = _hasHydrated && favoriteRetailerIds.includes(loc.id);
              const isSelected = _hasHydrated && selectedRetailerId === loc.id;
              return (
                <Card
                  key={loc.id}
                  data-testid={`location-card-${loc.id}`}
                  className={cn(
                    "text-left cursor-pointer transition-all w-80 shrink-0",
                    isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                  )}
                  onClick={() => handleSelectLocation(loc.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 mt-1 text-primary shrink-0" />
                        <span>{loc.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={(e) => handleSetFavorite(e, loc.id)}
                      >
                        <Heart className={cn("h-5 w-5 text-muted-foreground transition-all", isFavorite && "fill-primary text-primary scale-110")} />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{loc.address}</p>
                    <p className="text-sm text-muted-foreground">{loc.city}, {loc.state} {loc.zip}</p>
                    <Button variant="link" asChild className="p-0 h-auto mt-2 text-sm">
                      <Link href={mapUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        View on Map
                      </Link>
                    </Button>
                    {loc.distance && (
                      <p className="text-sm font-semibold mt-2">{loc.distance.toFixed(1)} miles away</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
