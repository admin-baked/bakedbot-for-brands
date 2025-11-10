'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation } from 'lucide-react';
import { useStore } from '@/hooks/use-store';
import { useMenuData } from '@/hooks/use-menu-data';
import { haversineDistance } from '@/lib/utils';
import { cn } from '@/lib/utils';

export function DispensaryLocator() {
  const { locations, isLoading: areLocationsLoading } = useMenuData();
  const { selectedLocationId, setSelectedLocationId } = useStore();
  
  const [isLocating, setIsLocating] = useState(false);
  const [closestLocations, setClosestLocations] = useState<typeof locations>([]);

  const handleFindClosest = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const userCoords = { lat: latitude, lon: longitude };

        const sortedLocations = [...locations]
          .map((loc) => ({
            ...loc,
            distance: haversineDistance(userCoords, { lat: loc.lat!, lon: loc.lon! }),
          }))
          .sort((a, b) => a.distance - b.distance);
        
        setClosestLocations(sortedLocations.slice(0, 3));
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Could not get your location. Please ensure location services are enabled.');
        setIsLocating(false);
      }
    );
  };
  
  const handleSelectLocation = (id: string) => {
    setSelectedLocationId(id);
    const element = document.getElementById('locator');
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  const displayLocations = closestLocations.length > 0 ? closestLocations : locations.slice(0,3);

  return (
    <div className="py-12 bg-muted/40 rounded-lg" id="locator">
      <div className="container mx-auto text-center">
        <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4">
          Find a Dispensary Near You
        </h2>
        <Button onClick={handleFindClosest} disabled={isLocating}>
          {isLocating ? <Loader2 className="mr-2 animate-spin" /> : <Navigation className="mr-2" />}
          Use My Current Location
        </Button>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-8">
            {displayLocations.map(loc => (
                <Card 
                    key={loc.id} 
                    className={cn(
                        "text-left cursor-pointer transition-all",
                        selectedLocationId === loc.id ? 'border-primary ring-2 ring-primary' : 'border-border'
                    )}
                    onClick={() => handleSelectLocation(loc.id)}
                >
                    <CardHeader>
                        <CardTitle className="flex items-start gap-2">
                            <MapPin className="h-5 w-5 mt-1 text-primary shrink-0" />
                            <span>{loc.name}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{loc.address}</p>
                        <p className="text-sm text-muted-foreground">{loc.city}, {loc.state} {loc.zip}</p>
                        {loc.distance && (
                            <p className="text-sm font-semibold mt-2">{loc.distance.toFixed(1)} miles away</p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
