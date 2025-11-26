'use client';

// src/app/(customer-menu)/page.tsx
/**
 * Dispensary selection page - shows 3 nearby dispensaries
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, MapPin, Phone, Clock, Navigation, Search } from 'lucide-react';
import { searchNearbyRetailers, type RetailerLocation } from '@/lib/cannmenus-api';
import { getUserLocation, getLocationFromZipCode, getSavedLocation, saveLocation, isValidZipCode } from '@/lib/geolocation';
import Link from 'next/link';
import Image from 'next/image';

export default function DispensarySelectionPage() {
    const [retailers, setRetailers] = useState<RetailerLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [locationMethod, setLocationMethod] = useState<'auto' | 'manual'>('auto');
    const [zipCode, setZipCode] = useState('');
    const [zipError, setZipError] = useState('');
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        initializeLocation();
    }, []);

    const initializeLocation = async () => {
        setLoading(true);

        // Check for saved location first
        const saved = getSavedLocation();
        if (saved) {
            setUserLocation({ lat: saved.coordinates.latitude, lng: saved.coordinates.longitude });
            await loadNearbyRetailers(saved.coordinates.latitude, saved.coordinates.longitude);
            return;
        }

        // Try to get user location
        const location = await getUserLocation();
        if (location) {
            setUserLocation({ lat: location.coordinates.latitude, lng: location.coordinates.longitude });
            saveLocation(location);
            await loadNearbyRetailers(location.coordinates.latitude, location.coordinates.longitude);
        } else {
            setLoading(false);
            setLocationMethod('manual');
        }
    };

    const loadNearbyRetailers = async (lat: number, lng: number) => {
        try {
            const nearby = await searchNearbyRetailers(lat, lng, 3);
            setRetailers(nearby);
        } catch (error) {
            console.error('Failed to load retailers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleZipCodeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setZipError('');

        if (!isValidZipCode(zipCode)) {
            setZipError('Please enter a valid US ZIP code');
            return;
        }

        setLoading(true);
        const location = await getLocationFromZipCode(zipCode);

        if (location) {
            setUserLocation({ lat: location.coordinates.latitude, lng: location.coordinates.longitude });
            saveLocation(location);
            await loadNearbyRetailers(location.coordinates.latitude, location.coordinates.longitude);
            setLocationMethod('auto');
        } else {
            setZipError('Unable to find location for this ZIP code');
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-lg text-muted-foreground">Finding dispensaries near you...</p>
                </div>
            </div>
        );
    }

    if (locationMethod === 'manual' && !userLocation) {
        return (
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-md mx-auto space-y-6">
                    <div className="text-center space-y-2">
                        <MapPin className="h-12 w-12 mx-auto text-primary" />
                        <h1 className="text-3xl font-bold">Find Dispensaries Near You</h1>
                        <p className="text-muted-foreground">
                            Enter your ZIP code to see nearby dispensaries
                        </p>
                    </div>

                    <form onSubmit={handleZipCodeSubmit} className="space-y-4">
                        <div>
                            <Input
                                type="text"
                                placeholder="Enter ZIP code"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                className="text-lg"
                                maxLength={10}
                            />
                            {zipError && (
                                <p className="text-sm text-destructive mt-2">{zipError}</p>
                            )}
                        </div>
                        <Button type="submit" className="w-full" size="lg">
                            <Search className="h-4 w-4 mr-2" />
                            Find Dispensaries
                        </Button>
                    </form>

                    <div className="text-center">
                        <Button
                            variant="link"
                            onClick={initializeLocation}
                            className="text-sm"
                        >
                            <Navigation className="h-3 w-3 mr-1" />
                            Or use my current location
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Welcome to BakedBot</h1>
                    <p className="text-xl text-muted-foreground">
                        Choose a dispensary to start shopping
                    </p>
                    {userLocation && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocationMethod('manual')}
                            className="mt-4"
                        >
                            <MapPin className="h-3 w-3 mr-2" />
                            Change Location
                        </Button>
                    )}
                </div>

                {/* Retailers List */}
                {retailers.length === 0 ? (
                    <Alert>
                        <MapPin className="h-4 w-4" />
                        <AlertDescription>
                            No dispensaries found nearby. Try adjusting your location.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="grid gap-6">
                        {retailers.map((retailer, index) => (
                            <Card key={retailer.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="md:flex">
                                    {/* Image Section */}
                                    <div className="md:w-48 bg-muted relative h-48 md:h-auto">
                                        {retailer.imageUrl ? (
                                            <Image
                                                src={retailer.imageUrl}
                                                alt={retailer.name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <MapPin className="h-12 w-12 text-muted-foreground" />
                                            </div>
                                        )}
                                        {index === 0 && (
                                            <Badge className="absolute top-2 left-2">Closest</Badge>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex-1 p-6">
                                        <CardHeader className="p-0 mb-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-2xl">{retailer.name}</CardTitle>
                                                    <CardDescription className="flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {retailer.distance && (
                                                            <span>{retailer.distance.toFixed(1)} miles away</span>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="p-0 space-y-4">
                                            {/* Address */}
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                <div>
                                                    <p>{retailer.address}</p>
                                                    <p>{retailer.city}, {retailer.state} {retailer.postalCode}</p>
                                                </div>
                                            </div>

                                            {/* Phone */}
                                            {retailer.phone && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <a href={`tel:${retailer.phone}`} className="hover:underline">
                                                        {retailer.phone}
                                                    </a>
                                                </div>
                                            )}

                                            {/* Hours */}
                                            {retailer.hours && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span>{retailer.hours}</span>
                                                </div>
                                            )}

                                            {/* Action Button */}
                                            <div className="pt-4">
                                                <Link href={`/shop/${retailer.id}`}>
                                                    <Button size="lg" className="w-full">
                                                        Shop This Location
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Info Alert */}
                <Alert>
                    <AlertDescription className="text-center">
                        All orders are for in-store pickup only. You must be 21+ to purchase.
                    </AlertDescription>
                </Alert>
            </div>
        </div>
    );
}
