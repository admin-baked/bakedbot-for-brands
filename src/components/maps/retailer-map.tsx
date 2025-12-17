'use client';

/**
 * Retailer Map Component
 * Shows dispensary locations on an interactive Google Map
 */

import { useCallback, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Card, CardContent } from '@/components/ui/card';
import { GOOGLE_MAPS_CONFIG } from '@/lib/config';
import { Loader2, MapPin } from 'lucide-react';

export interface MapRetailer {
    id: string;
    name: string;
    address: string;
    lat?: number;
    lng?: number;
}

interface RetailerMapProps {
    retailers: MapRetailer[];
    centerLat?: number;
    centerLng?: number;
    zoom?: number;
    height?: string;
    className?: string;
}

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem',
};

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    styles: [
        {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
        }
    ]
};

export function RetailerMap({
    retailers,
    centerLat,
    centerLng,
    zoom = 12,
    height = '400px',
    className = ''
}: RetailerMapProps) {
    const [selectedRetailer, setSelectedRetailer] = useState<MapRetailer | null>(null);

    const apiKey = GOOGLE_MAPS_CONFIG.API_KEY;

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: apiKey,
        id: 'google-map-script'
    });

    // Filter retailers with valid coordinates
    const validRetailers = useMemo(() =>
        retailers.filter(r => r.lat && r.lng && !isNaN(r.lat) && !isNaN(r.lng)),
        [retailers]
    );

    // Calculate center based on retailers or provided center
    const center = useMemo(() => {
        if (centerLat && centerLng) {
            return { lat: centerLat, lng: centerLng };
        }
        if (validRetailers.length > 0) {
            const avgLat = validRetailers.reduce((sum, r) => sum + (r.lat || 0), 0) / validRetailers.length;
            const avgLng = validRetailers.reduce((sum, r) => sum + (r.lng || 0), 0) / validRetailers.length;
            return { lat: avgLat, lng: avgLng };
        }
        // Default to LA if no data
        return { lat: 34.0522, lng: -118.2437 };
    }, [centerLat, centerLng, validRetailers]);

    const onLoad = useCallback((map: google.maps.Map) => {
        if (validRetailers.length > 1) {
            const bounds = new google.maps.LatLngBounds();
            validRetailers.forEach(r => {
                if (r.lat && r.lng) {
                    bounds.extend({ lat: r.lat, lng: r.lng });
                }
            });
            map.fitBounds(bounds, 50);
        }
    }, [validRetailers]);

    // No API key configured
    if (!apiKey) {
        return (
            <Card className={`bg-muted/30 ${className}`}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                        Map unavailable - Google Maps API key not configured
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Loading state
    if (!isLoaded) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center justify-center py-12" style={{ height }}>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    // Error state
    if (loadError) {
        return (
            <Card className={`bg-destructive/10 ${className}`}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <MapPin className="h-12 w-12 text-destructive mb-4" />
                    <p className="text-sm text-destructive">
                        Failed to load map. Please try again later.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // No valid locations
    if (validRetailers.length === 0) {
        return (
            <Card className={`bg-muted/30 ${className}`}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                        No locations with coordinates available to display
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={className}>
            <CardContent className="p-0 overflow-hidden rounded-lg" style={{ height }}>
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={zoom}
                    options={mapOptions}
                    onLoad={onLoad}
                >
                    {validRetailers.map((retailer) => (
                        <Marker
                            key={retailer.id}
                            position={{ lat: retailer.lat!, lng: retailer.lng! }}
                            title={retailer.name}
                            onClick={() => setSelectedRetailer(retailer)}
                        />
                    ))}

                    {selectedRetailer && selectedRetailer.lat && selectedRetailer.lng && (
                        <InfoWindow
                            position={{ lat: selectedRetailer.lat, lng: selectedRetailer.lng }}
                            onCloseClick={() => setSelectedRetailer(null)}
                        >
                            <div className="p-2 max-w-[200px]">
                                <h3 className="font-semibold text-sm mb-1">{selectedRetailer.name}</h3>
                                <p className="text-xs text-gray-600">{selectedRetailer.address}</p>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>
            </CardContent>
        </Card>
    );
}
