
'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { MapPin, Navigation } from 'lucide-react';
import type { Location } from '@/hooks/use-store';
import { useMenuData } from '@/hooks/use-menu-data';

// Simple distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function DispensaryLocator() {
  const { locations: storeLocations, setLocations, selectedLocationId, setSelectedLocationId, _hasHydrated } = useStore();
  const { locations: menuLocations, isLoading: areMenuLocationsLoading } = useMenuData();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sortedLocations, setSortedLocations] = useState<Location[]>([]);

  useEffect(() => {
    // This effect ensures that the fetched locations are persisted in the Zustand store.
    if (_hasHydrated && menuLocations && menuLocations.length > 0 && storeLocations.length === 0) {
        setLocations(menuLocations);
    }
  }, [_hasHydrated, menuLocations, storeLocations, setLocations]);

  // Main logic effect for sorting and display
  useEffect(() => {
    if (!_hasHydrated) {
        setStatus('loading');
        return;
    }
    
    const locationsToUse = storeLocations.length > 0 ? storeLocations : menuLocations;

    if (!locationsToUse || locationsToUse.length === 0) {
        setStatus(areMenuLocationsLoading ? 'loading' : 'error');
        return;
    }

    setStatus('ready');

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      setSortedLocations(locationsToUse);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        
        const sorted = [...locationsToUse]
          .map(loc => ({
            ...loc,
            distance: (loc.lat && loc.lon) 
              ? calculateDistance(userLoc.lat, userLoc.lon, loc.lat, loc.lon)
              : 999,
          }))
          .sort((a, b) => a.distance - b.distance);
        
        setSortedLocations(sorted);
      },
      (error) => {
        console.error('Geolocation error:', error.message);
        setSortedLocations(locationsToUse); // Fallback to unsorted list on error
      },
      {
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [_hasHydrated, storeLocations, menuLocations, areMenuLocationsLoading]);
  
  const handleSelectLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
  };
  
  if (status === 'loading') {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Finding dispensaries near you...</p>
      </div>
    );
  }
  
  if (status === 'error') {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Could not load dispensaries.</p>
      </div>
    );
  }
  
  const displayLocations = sortedLocations.slice(0, 3);
  
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold font-teko tracking-wider uppercase mb-4 text-center">1. Find a Dispensary Near You</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        {displayLocations.map((location) => (
          <div
            key={location.id}
            className={`bg-card rounded-lg shadow-lg p-6 border-2 transition-all cursor-pointer hover:shadow-xl ${
              selectedLocationId === location.id 
                ? 'border-primary bg-primary/5' 
                : 'border-border'
            }`}
            onClick={() => handleSelectLocation(location.id)}
          >
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            
            <h3 className="text-lg font-bold mb-2">{location.name}</h3>
            
            <p className="text-sm text-muted-foreground mb-1">{location.address}</p>
            <p className="text-sm text-muted-foreground mb-3">
              {location.city}, {location.state} {location.zip}
            </p>
            
            {location.distance && location.distance < 999 && (
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                <Navigation className="h-4 w-4" />
                <span>{location.distance.toFixed(1)} miles away</span>
              </div>
            )}
            
            <button
              className={`w-full py-2 px-4 rounded-lg font-semibold text-sm transition-colors ${
                selectedLocationId === location.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {selectedLocationId === location.id ? '✓ Selected' : 'Select Location'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
