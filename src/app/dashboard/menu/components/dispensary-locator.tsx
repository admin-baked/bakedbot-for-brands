'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MapPin } from 'lucide-react';
import { useStore, type Location } from '@/hooks/use-store';
import { useToast } from '@/hooks/use-toast';
import { haversineDistance } from '@/lib/utils';


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
    const [hasMounted, setHasMounted] = useState(false);
    
    // We must use the store hook conditionally to avoid hydration errors.
    const store = useStore();


    useEffect(() => {
      setHasMounted(true);
    }, []);

    useEffect(() => {
        // This entire effect runs only on the client-side, avoiding hydration errors.
        if (!hasMounted) return;
        
        // Now it's safe to access the store
        const isDemoMode = store.isDemoMode;
        const storeLocations = store.locations;

        const demoLocations = [
            { id: 'demo1', name: 'Green Leaf Central', address: '123 Main St', city: 'Metropolis', state: 'IL', zip: '12345', phone: '(555) 123-4567', lat: 40.7128, lon: -74.0060 },
            { id: 'demo2', name: 'Herbal Haven Downtown', address: '456 Oak Ave', city: 'Metropolis', state: 'IL', zip: '12346', phone: '(555) 987-6543', lat: 40.7580, lon: -73.9855 },
            { id: 'demo3', name: 'Bloom Apothecary North', address: '789 Pine Ln', city: 'Springfield', state: 'IL', zip: '67890', phone: '(555) 234-5678', lat: 39.7817, lon: -89.6501 },
            { id: 'demo4', name: 'The Grove', address: '1010 Maple Rd', city: 'Metropolis', state: 'IL', zip: '12347', phone: '(555) 111-2222', lat: 40.730, lon: -73.990 },
        ];
        
        const locations = isDemoMode ? demoLocations : storeLocations;

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userCoords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    const locationsWithDistance = locations
                        .map(loc => {
                            if (loc.lat && loc.lon) {
                                const distance = haversineDistance(userCoords, { lat: loc.lat, lon: loc.lon });
                                return { ...loc, distance };
                            }
                            return loc;
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
    }, [hasMounted, store.isDemoMode, store.locations, toast]);


    if (!hasMounted || isLocating) {
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
