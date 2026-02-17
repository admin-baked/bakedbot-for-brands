'use client';

/**
 * Driver Delivery Details Page
 *
 * Individual delivery management for drivers
 * Features:
 * - Real-time GPS location updates (every 30 seconds)
 * - Status transitions (Start → Arrived → Complete)
 * - Turn-by-turn navigation integration
 * - ID verification and proof of delivery
 * - Customer contact information
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import {
    getDeliveryDetails,
    updateDriverLocation,
    startDelivery,
    markArrived,
    completeDelivery,
} from '@/server/actions/delivery-driver';
import type { Delivery } from '@/types/delivery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Truck,
    MapPin,
    Clock,
    Phone,
    Navigation,
    CheckCircle,
    Loader2,
    ArrowLeft,
    CreditCard,
    Camera,
    PenTool,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { IDVerificationForm } from '@/components/delivery/id-verification-form';
import { ProofPhotoCapture } from '@/components/delivery/proof-photo-capture';
import { SignaturePad } from '@/components/delivery/signature-pad';

export default function DriverDeliveryDetailsPage({
    params,
}: {
    params: { id: string };
}) {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // ID Verification state
    const [idVerified, setIdVerified] = useState(false);
    const [idType, setIdType] = useState<string | undefined>(undefined);
    const [idNumber, setIdNumber] = useState<string | undefined>(undefined);
    const [birthDate, setBirthDate] = useState<string | undefined>(undefined);

    // Proof of Delivery state
    const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

    // GPS tracking
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/driver/login');
            return;
        }

        if (user) {
            loadDelivery();
        }
    }, [user, isUserLoading, router, params.id]);

    // Enable GPS tracking when delivery is in_transit
    useEffect(() => {
        if (delivery?.status === 'in_transit' || delivery?.status === 'arrived') {
            startGPSTracking();
        } else {
            stopGPSTracking();
        }

        return () => stopGPSTracking();
    }, [delivery?.status]);

    const loadDelivery = async () => {
        try {
            setLoading(true);
            const result = await getDeliveryDetails(params.id);
            if (result.success && result.delivery) {
                setDelivery(result.delivery);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to load delivery',
                });
                router.push('/driver/dashboard');
            }
        } catch (error) {
            console.error('Load delivery error:', error);
        } finally {
            setLoading(false);
        }
    };

    const startGPSTracking = () => {
        if (gpsEnabled) return;

        if ('geolocation' in navigator) {
            setGpsEnabled(true);
            updateLocation(); // Initial update
            const interval = setInterval(updateLocation, 30000); // Every 30 seconds
            (window as any).gpsInterval = interval;
        } else {
            toast({
                variant: 'destructive',
                title: 'GPS Not Available',
                description: 'Location services are not available on this device',
            });
        }
    };

    const stopGPSTracking = () => {
        if ((window as any).gpsInterval) {
            clearInterval((window as any).gpsInterval);
            (window as any).gpsInterval = null;
        }
        setGpsEnabled(false);
    };

    const updateLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const result = await updateDriverLocation(latitude, longitude);
                    if (result.success) {
                        setLastLocationUpdate(new Date());
                    }
                },
                (error) => {
                    console.error('GPS error:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        }
    };

    const handleStartDelivery = async () => {
        if (!delivery) return;

        setActionLoading(true);
        const result = await startDelivery(delivery.id);
        if (result.success) {
            toast({
                title: 'Delivery Started',
                description: 'GPS tracking is now active',
            });
            await loadDelivery();
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to start delivery',
            });
        }
        setActionLoading(false);
    };

    const handleMarkArrived = async () => {
        if (!delivery) return;

        setActionLoading(true);
        const result = await markArrived(delivery.id);
        if (result.success) {
            toast({
                title: 'Arrival Confirmed',
                description: 'Ready to complete delivery',
            });
            await loadDelivery();
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to mark arrival',
            });
        }
        setActionLoading(false);
    };

    const handleCompleteDelivery = async () => {
        if (!delivery || !idVerified) {
            toast({
                variant: 'destructive',
                title: 'ID Verification Required',
                description: 'You must verify customer ID before completing',
            });
            return;
        }

        if (!proofPhotoUrl) {
            toast({
                variant: 'destructive',
                title: 'Proof of Delivery Photo Required',
                description: 'You must capture a proof of delivery photo',
            });
            return;
        }

        if (!signatureUrl) {
            toast({
                variant: 'destructive',
                title: 'Customer Signature Required',
                description: 'Customer must sign to complete delivery',
            });
            return;
        }

        setActionLoading(true);
        const result = await completeDelivery(delivery.id, {
            idVerified: true,
            idType,
            idNumber,
            birthDate,
            proofPhotoUrl,
            signatureUrl,
        });

        if (result.success) {
            toast({
                title: 'Delivery Complete!',
                description: 'Great job! Returning to dashboard...',
            });
            setTimeout(() => {
                router.push('/driver/dashboard');
            }, 2000);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to complete delivery',
            });
            setActionLoading(false);
        }
    };

    const openNavigation = () => {
        if (!delivery) return;
        const address = delivery.deliveryAddress;
        const destination = encodeURIComponent(
            `${address.street}, ${address.city}, ${address.state} ${address.zip}`
        );
        // Google Maps navigation
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);
    };

    if (isUserLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading delivery...</p>
                </div>
            </div>
        );
    }

    if (!delivery) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <div className="bg-card border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/driver/dashboard')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold">
                                Order #{delivery.orderId.slice(-8).toUpperCase()}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Delivery #{delivery.id.slice(-8).toUpperCase()}
                            </p>
                        </div>
                        <Badge
                            variant={delivery.status === 'delivered' ? 'default' : 'secondary'}
                        >
                            {delivery.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* GPS Status */}
                {gpsEnabled && (
                    <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                        <CardContent className="py-3">
                            <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-medium">GPS Tracking Active</span>
                                {lastLocationUpdate && (
                                    <span className="text-muted-foreground">
                                        • Updated {lastLocationUpdate.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Delivery Address */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Delivery Address
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="font-medium">{delivery.deliveryAddress.street}</div>
                            <div className="text-muted-foreground">
                                {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state}{' '}
                                {delivery.deliveryAddress.zip}
                            </div>
                        </div>

                        {delivery.deliveryInstructions && (
                            <div className="bg-muted p-3 rounded-lg">
                                <div className="text-sm font-medium mb-1">Delivery Instructions:</div>
                                <div className="text-sm">{delivery.deliveryInstructions}</div>
                            </div>
                        )}

                        <Button className="w-full" variant="outline" onClick={openNavigation}>
                            <Navigation className="mr-2 h-4 w-4" />
                            Open in Maps
                        </Button>
                    </CardContent>
                </Card>

                {/* Delivery Window */}
                {delivery.deliveryWindow && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Delivery Window
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-lg font-semibold">
                                {formatTime(delivery.deliveryWindow.start)} -{' '}
                                {formatTime(delivery.deliveryWindow.end)}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Customer Contact */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Phone className="h-5 w-5" />
                            Customer Contact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {delivery.deliveryAddress.phone ? (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() =>
                                    window.open(`tel:${delivery.deliveryAddress.phone}`)
                                }
                            >
                                <Phone className="mr-2 h-4 w-4" />
                                {delivery.deliveryAddress.phone}
                            </Button>
                        ) : (
                            <p className="text-sm text-muted-foreground">No phone number provided</p>
                        )}
                    </CardContent>
                </Card>

                {/* ID Verification (shown when arrived) */}
                {delivery.status === 'arrived' && (
                    <IDVerificationForm
                        onVerification={(result) => {
                            setIdVerified(result.verified);
                            setIdType(result.idType);
                            setIdNumber(result.idNumber);
                            setBirthDate(result.birthDate);
                        }}
                        disabled={actionLoading}
                    />
                )}

                {/* Proof of Delivery Photo (shown when arrived) */}
                {delivery.status === 'arrived' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Camera className="h-5 w-5" />
                                Proof of Delivery Photo
                            </CardTitle>
                            <CardDescription>
                                NY OCM Requirement: Photographic proof of delivery
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProofPhotoCapture
                                onPhoto={(photoUrl) => setProofPhotoUrl(photoUrl)}
                                disabled={actionLoading}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Customer Signature (shown when arrived) */}
                {delivery.status === 'arrived' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <PenTool className="h-5 w-5" />
                                Customer Signature
                            </CardTitle>
                            <CardDescription>
                                NY OCM Requirement: Customer must sign for proof of delivery
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SignaturePad
                                onSignature={(signatureDataUrl) =>
                                    setSignatureUrl(signatureDataUrl)
                                }
                                disabled={actionLoading}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4">
                <div className="container mx-auto">
                    {delivery.status === 'assigned' && (
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleStartDelivery}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Truck className="mr-2 h-5 w-5" />
                            )}
                            Start Delivery
                        </Button>
                    )}

                    {delivery.status === 'in_transit' && (
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleMarkArrived}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <MapPin className="mr-2 h-5 w-5" />
                            )}
                            I've Arrived
                        </Button>
                    )}

                    {delivery.status === 'arrived' && (
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleCompleteDelivery}
                            disabled={
                                actionLoading ||
                                !idVerified ||
                                !proofPhotoUrl ||
                                !signatureUrl
                            }
                        >
                            {actionLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <CheckCircle className="mr-2 h-5 w-5" />
                            )}
                            Complete Delivery
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
