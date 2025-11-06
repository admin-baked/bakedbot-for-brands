
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
            { id: 'demo1', name: 'Windy City Cannabis', address: '923 W Weed St', city: 'Chicago', state: 'IL', zip: '60642', phone: '(312) 874-7042', email: 'orders@windycity.demo', lat: 41.908, lon: -87.653 },
            { id: 'demo2', name: 'Sunnyside Dispensary', address: '436 N Clark St', city: 'Chicago', state: 'IL', zip: '60654', phone: '(312) 212-0300', email: 'orders@sunnyside.demo', lat: 41.890, lon: -87.632 },
            { id: 'demo3', name: 'Dispensary 33', address: '5001 N Clark St', city: 'Chicago', state: 'IL', zip: '60640', phone: '(773) 754-8822', email: 'orders@dispensary33.demo', lat: 41.973, lon: -87.668 },
            { id: 'demo4', name: 'Zen Leaf', address: '222 S Halsted St, Chicago, IL 60661', city: 'Chicago', state: 'IL', zip: '60661', lat: 41.878, lon: -87.647 },
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
