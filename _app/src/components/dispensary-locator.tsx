
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation, Star } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import { haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useOptionalFirebase } from '@/firebase/use-optional-firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { Retailer } from '@/types/domain';
import { useHydrated } from '@/hooks/use-hydrated';
import Skeleton from './ui/skeleton';

interface DispensaryLocatorProps {
  locations?: Retailer[];
  isLoading?: boolean;
}

export default function DispensaryLocator({ locations = [], isLoading = false }: DispensaryLocatorProps) {
  const { selectedRetailerId, setSelectedRetailerId } = useStore();
  const firebase = useOptionalFirebase();
  const { toast } = useToast();
  const hydrated = useHydrated();
  
  const user = firebase?.user ?? null;
  const firestore = firebase?.firestore ?? null;

  const [isLocating, setIsLocating] = useState(false);
  const [sortedLocations, setSortedLocations] = useState<Retailer[]>([]);

  useEffect(() => {
    if (locations) {
      setSortedLocations(locations);
    }
  }, [locations]);

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
            setSelectedRetailerId(newSortedLocations[0].id);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({ variant: 'destructive', title: 'Could not get your location. Please ensure location services are enabled.'});
        setIsLocating(false);
      }
    );
  };
  
  const handleSelectLocation = (id: string) => {
    setSelectedRetailerId(id);
  }

  const handleSetFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) {
        toast({ variant: 'destructive', title: 'Login required', description: 'Please log in to set a favorite location.' });
        return;
    }
    if (!firestore) {
      console.warn('No firestore available; cannot save favorite.');
      toast({ variant: 'destructive', title: 'Database connection not available.' });
      return;
    }
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userDocRef, { favoriteLocationId: id });
        // Assuming there's a way to update the cookie/local state for favorite
        // This part needs a hook like `useCookieStore`
        console.log(`User ${user.uid} favorited location ${id}`);
        toast({ title: 'Favorite location saved!' });
    } catch (error) {
        console.error('Failed to set favorite location', error);
        toast({ variant: 'destructive', title: 'Could not save favorite location.' });
    }
  };
  
  const displayLocations = sortedLocations.length > 0 ? sortedLocations : locations;

  return (
    <div className="py-12 bg-muted/40 rounded-lg" id="locator">
      <div className="container mx-auto text-center">
        <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4">
          Find a Dispensary Near You
        </h2>
        <Button onClick={handleFindClosest} disabled={isLocating || isLoading}>
          {isLocating ? <Loader2 className="mr-2 animate-spin" /> : <Navigation className="mr-2" />}
          Use My Current Location
        </Button>
        <div className="mt-8">
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
                    // Favorite status needs to be derived from a persistent store, e.g., a cookie store.
                    const isFavorite = false; 
                    const isSelected = hydrated && selectedRetailerId === loc.id;
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
                                    <Star className={cn("h-5 w-5 text-muted-foreground", isFavorite && "fill-yellow-400 text-yellow-400")} />
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
                )})}
            </div>
        </div>
      </div>
    </div>
  );
}
