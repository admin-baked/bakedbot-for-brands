'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/hooks/use-store';
import { MapPin, Navigation } from 'lucide-react';
import type { Location } from '@/hooks/use-store';

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
  const { locations, setLocations, selectedLocationId, setSelectedLocationId } = useStore();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sortedLocations, setSortedLocations] = useState<Location[]>([]);
  
  // Step 1: Load locations on mount (if empty)
  useEffect(() => {
    console.log('🔍 DispensaryLocator mounted');
    console.log('📍 Locations in store:', locations.length);
    
    if (locations.length === 0) {
      console.log('⚠️ No locations in store, loading static data...');
      
      // Use static fallback locations
      const staticLocations: Location[] = [
        {
          id: '1',
          name: 'High Altitude Herbs',
          address: '456 Mountain View',
          city: 'Boulder',
          state: 'CO',
          zip: '80301',
          lat: 40.0150,
          lon: -105.2705,
        },
        {
          id: '2',
          name: 'The Green Spot',
          address: '123 Leafy Lane',
          city: 'Denver',
          state: 'CO',
          zip: '80202',
          lat: 39.7392,
          lon: -104.9903,
        },
        {
          id: '3',
          name: 'City Cannabis Collective',
          address: '789 Urban Avenue',
          city: 'Denver',
          state: 'CO',
          zip: '80203',
          lat: 39.7294,
          lon: -104.9619,
        },
      ];
      
      console.log('✅ Setting static locations:', staticLocations.length);
      setLocations(staticLocations);
      setSortedLocations(staticLocations);
      setStatus('ready');
    } else {
      console.log('✅ Locations already loaded');
      setSortedLocations(locations);
      setStatus('ready');
    }
  }, []); // Only run once on mount
  
  // Step 2: Request geolocation after locations are loaded
  useEffect(() => {
    if (status !== 'ready' || locations.length === 0) return;
    
    console.log('📍 Requesting geolocation...');
    
    if (!navigator.geolocation) {
      console.log('⚠️ Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Got user location:', position.coords);
        const userLoc = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        
        // Sort locations by distance
        const sorted = [...locations]
          .map(loc => ({
            ...loc,
            distance: loc.lat && loc.lon 
              ? calculateDistance(userLoc.lat, userLoc.lon, loc.lat, loc.lon)
              : 999,
          }))
          .sort((a, b) => a.distance - b.distance);
        
        console.log('📍 Sorted locations:', sorted.map(l => `${l.name}: ${l.distance.toFixed(1)} mi`));
        setSortedLocations(sorted);
      },
      (error) => {
        console.log('⚠️ Geolocation error:', error.message);
        // Just use unsorted locations
        setSortedLocations(locations);
      },
      {
        timeout: 5000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, [status, locations]);
  
  const handleSelectLocation = (locationId: string) => {
    console.log('📍 User selected location:', locationId);
    setSelectedLocationId(locationId);
  };
  
  if (status === 'loading') {
    return (
      <div className="py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading dispensaries...</p>
      </div>
    );
  }
  
  if (locations.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600">No dispensaries available</p>
      </div>
    );
  }
  
  // Show top 3 locations
  const displayLocations = sortedLocations.slice(0, 3);
  
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold text-center mb-8">FIND A DISPENSARY NEAR YOU</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
        {displayLocations.map((location) => (
          <div
            key={location.id}
            className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all cursor-pointer hover:shadow-xl ${
              selectedLocationId === location.id 
                ? 'border-green-600 bg-green-50' 
                : 'border-gray-200'
            }`}
            onClick={() => handleSelectLocation(location.id)}
          >
            {/* Location Icon */}
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            
            {/* Name */}
            <h3 className="text-lg font-bold mb-2">{location.name}</h3>
            
            {/* Address */}
            <p className="text-sm text-gray-600 mb-1">{location.address}</p>
            <p className="text-sm text-gray-600 mb-3">
              {location.city}, {location.state} {location.zip}
            </p>
            
            {/* Distance */}
            {location.distance && location.distance < 999 && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
                <Navigation className="h-4 w-4" />
                <span>{location.distance.toFixed(1)} miles away</span>
              </div>
            )}
            
            {/* Select Button */}
            <button
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                selectedLocationId === location.id
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
