
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin, CheckCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { haversineDistance } from '@/lib/utils';
import type { Location } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useStore } from '@/hooks/use-store';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMenuData } from '@/hooks/use-menu-data';

type LocationWithDistance = Location & { distance?: number };

const DispensaryCard = ({ location, isSelected, onSelect }: { location: LocationWithDistance, isSelected: boolean, onSelect: (id: string) => void }) => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.name}, ${location.address}, ${location.city}, ${location.state} ${location.zip}`)}`;
    
    return (
    <div className="w-72 flex-shrink-0 md:w-full">
        <Card 
            className={cn("w-full h-full flex flex-col transition-all", isSelected ? "border-primary ring-2 ring-primary" : "border-border")}
        >
            <div className="p-4 cursor-pointer flex-1" onClick={() => onSelect(location.id)}>
                <div className="flex justify-between items-start">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MapPin className="h-4 w-4" />
                        {location.name}
                    </CardTitle>
                    {isSelected && (
                        <Badge variant="default" className="flex items-center gap-1">
                           <CheckCircle className="h-3 w-3" />
                           Selected
                        </Badge>
                    )}
                </div>
                <CardContent className="p-0 pt-2">
                    <p className="text-sm text-muted-foreground">{location.address}, {location.city}, {location.state}</p>
                    {location.distance && (
                        <p className="text-sm font-bold mt-2">{location.distance.toFixed(1)} miles away</p>
                    )}
                </CardContent>
            </div>
            <div className="p-4 pt-0">
                 <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2" /> View on Map
                    </Link>
                </Button>
            </div>
        </Card>
    </div>
    )
};

export default function DispensaryLocator() {
    const { toast } = useToast();
    const { data: menuLocations, isLoading: areLocationsLoading } = useMenuData();
    const { selectedLocationId, setSelectedLocationId, setLocations, locations: storeLocations, _hasHydrated } = useStore();
    const [sortedLocations, setSortedLocations] = useState<LocationWithDistance[]>([]);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        // This effect ensures that the fetched locations are persisted in the Zustand store.
        if (_hasHydrated && menuLocations.length > 0 && storeLocations.length === 0) {
            setLocations(menuLocations);
        }
    }, [_hasHydrated, menuLocations, storeLocations.length, setLocations]);

    useEffect(() => {
        const locationsToUse = storeLocations.length > 0 ? storeLocations : menuLocations;

        if (areLocationsLoading || !_hasHydrated) {
            setStatus('loading');
            return;
        }

        if (!locationsToUse || locationsToUse.length === 0) {
            setStatus('success'); // No locations to show, but not an error
            setSortedLocations([]);
            return;
        }
        
        setStatus('loading');
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    const locationsWithDistance = locationsToUse
                        .filter(loc => loc.lat && loc.lon)
                        .map(loc => {
                            const distance = haversineDistance(userCoords, { lat: loc.lat!, lon: loc.lon! });
                            return { ...loc, distance };
                        })
                        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

                    setSortedLocations(locationsWithDistance.slice(0, 3));
                    setStatus('success');
                },
                (error) => {
                    toast({
                        variant: 'default',
                        title: 'Location Info',
                        description: 'Could not get your location. Showing default dispensaries.'
                    });
                    setSortedLocations(locationsToUse.slice(0, 3));
                    setStatus('error');
                }
            );
        } else {
            toast({
                variant: 'default',
                title: 'Location Info',
                description: 'Geolocation is not supported by your browser.'
            });
            setSortedLocations(locationsToUse.slice(0, 3));
            setStatus('error');
        }
    }, [menuLocations, areLocationsLoading, toast, storeLocations, _hasHydrated]);


    if (status === 'loading' || areLocationsLoading) {
         return (
             <div className="mb-12">
                <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">Find a Dispensary Near You</h2>
                <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
         )
    }
    
    if (sortedLocations.length === 0) {
        return null; // Don't render anything if there are no locations to show
    }

    return (
        <div className="mb-12">
            <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">1. Select a Dispensary</h2>
             <div className="md:grid md:grid-cols-3 md:gap-4">
                <ScrollArea className="w-full md:w-auto md:col-span-3">
                   <div className="flex space-x-4 pb-4 md:grid md:grid-cols-3 md:gap-4 md:space-x-0">
                     {sortedLocations.map(loc => (
                         <DispensaryCard 
                            key={loc.id} 
                            location={loc} 
                            isSelected={selectedLocationId === loc.id}
                            onSelect={setSelectedLocationId}
                         />
                     ))}
                   </div>
                   <ScrollBar orientation="horizontal" className="md:hidden" />
                </ScrollArea>
             </div>
        </div>
    );
}
