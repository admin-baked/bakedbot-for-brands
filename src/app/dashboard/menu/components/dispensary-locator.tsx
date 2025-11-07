
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';
import { useStore, type Location } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { haversineDistance } from '@/lib/utils';
import { demoLocations } from '@/lib/data';


type LocationWithDistance = Location & { distance?: number };

const DispensaryCard = ({ location }: { location: LocationWithDistance }) => (
    <Card className="w-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                {location.name}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{location.address}, {location.city}, {location.state}</p>
             {location.distance && (
                <p className="text-sm font-bold mt-2">{location.distance.toFixed(1)} miles away</p>
            )}
        </CardContent>
    </Card>
);

export default function DispensaryLocator() {
    const { toast } = useToast();
    const [nearbyLocations, setNearbyLocations] = useState<LocationWithDistance[]>([]);
    const [isLocating, setIsLocating] = useState(true);

    const isDemoMode = useStore((state) => state.isDemoMode);
    const storeLocations = useStore((state) => state.locations);
    const isHydrated = useStore((state) => state._hasHydrated);

    useEffect(() => {
        if (!isHydrated) {
            setIsLocating(true);
            return;
        }
        
        const locations = isDemoMode ? demoLocations : storeLocations;
        
        if (isDemoMode) {
            const userCoords = { lat: 41.8781, lon: -87.6298 }; // Central Chicago coordinates
            const demoLocationsWithDistance = demoLocations.map(loc => {
                 const distance = haversineDistance(userCoords, { lat: loc.lat!, lon: loc.lon! });
                 return { ...loc, distance };
            }).sort((a, b) => a.distance - b.distance);
            
            setNearbyLocations(demoLocationsWithDistance.slice(0, 3));
            setIsLocating(false);
            return;
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    const locationsWithDistance = locations
                        .filter(loc => loc.lat && loc.lon)
                        .map(loc => {
                            const distance = haversineDistance(userCoords, { lat: loc.lat!, lon: loc.lon! });
                            return { ...loc, distance };
                        })
                        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

                    setNearbyLocations(locationsWithDistance.slice(0, 3));
                    setIsLocating(false);
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    toast({
                        variant: 'default',
                        title: 'Location Info',
                        description: 'Could not get your location. Showing default dispensaries.'
                    });
                    setNearbyLocations(locations.slice(0, 3));
                    setIsLocating(false);
                }
            );
        } else {
            toast({
                variant: 'default',
                title: 'Location Info',
                description: 'Geolocation is not supported by your browser.'
            });
            setNearbyLocations(locations.slice(0, 3));
            setIsLocating(false);
        }
    }, [isHydrated, isDemoMode, storeLocations]);


    if (isLocating || !isHydrated) {
         return (
             <div className="mb-12">
                <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">Find a Dispensary Near You</h2>
                <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
         )
    }
    
    if (nearbyLocations.length === 0) {
        return null; // Don't render anything if there are no locations to show
    }

    return (
        <div className="mb-12">
            <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">Find a Dispensary Near You</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {nearbyLocations.map(loc => (
                    <DispensaryCard key={loc.id} location={loc} />
                ))}
            </div>
        </div>
    );
}
