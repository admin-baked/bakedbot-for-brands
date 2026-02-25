'use client';

/**
 * Driver Delivery Details Page
 *
 * Individual delivery management for drivers
 * Phase 4 enhanced with:
 * - Full OCM-compliant ID verification form
 * - Signature capture pad
 * - Proof of delivery photo
 * - Real-time GPS location updates
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import {
    getDeliveryDetails,
    updateDriverLocation,
    startDelivery,
    markArrived,
    completeDelivery,
    validatePickupQr,
    validateDeliveryQr,
} from '@/server/actions/delivery-driver';
import { QrScanner } from '@/components/driver/qr-scanner';
import type { Delivery } from '@/types/delivery';
import { IDVerificationForm } from '@/components/delivery/id-verification-form';
import { SignaturePad } from '@/components/delivery/signature-pad';
import { ProofPhotoCapture } from '@/components/delivery/proof-photo-capture';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Truck,
    MapPin,
    Clock,
    Phone,
    Navigation,
    CheckCircle,
    Loader2,
    ArrowLeft,
    PenLine,
    Camera,
    ScanLine,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface IDVerificationResult {
    verified: boolean;
    idType?: string;
    idNumber?: string;
    birthDate?: string;
    rejectionReason?: string;
}

export function DriverDeliveryDetailsClient({ deliveryId }: { deliveryId: string }) {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [idVerification, setIdVerification] = useState<IDVerificationResult>({ verified: false });
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
    const [gpsEnabled, setGpsEnabled] = useState(false);
    const [lastLocationUpdate, setLastLocationUpdate] = useState<Date | null>(null);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/driver/login');
            return;
        }
        if (user) loadDelivery();
    }, [user, isUserLoading, router]);

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
            const result = await getDeliveryDetails(deliveryId);
            if (result.success && result.delivery) {
                setDelivery(result.delivery);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error || 'Delivery not found' });
                router.push('/driver/dashboard');
            }
        } catch (error) {
            console.error('Load delivery error:', error);
        } finally {
            setLoading(false);
        }
    };

    const startGPSTracking = () => {
        if (gpsEnabled || !('geolocation' in navigator)) return;
        setGpsEnabled(true);
        updateLocation();
        (window as any).gpsInterval = setInterval(updateLocation, 30000);
    };

    const stopGPSTracking = () => {
        if ((window as any).gpsInterval) {
            clearInterval((window as any).gpsInterval);
            (window as any).gpsInterval = null;
        }
        setGpsEnabled(false);
    };

    const updateLocation = () => {
        navigator.geolocation?.getCurrentPosition(
            async ({ coords }) => {
                const result = await updateDriverLocation(coords.latitude, coords.longitude);
                if (result.success) setLastLocationUpdate(new Date());
            },
            (err) => console.error('GPS error:', err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleStartDelivery = async () => {
        if (!delivery) return;
        setActionLoading(true);
        const result = await startDelivery(delivery.id);
        if (result.success) {
            toast({ title: 'Delivery Started', description: 'GPS tracking is now active' });
            await loadDelivery();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setActionLoading(false);
    };

    const handleMarkArrived = async () => {
        if (!delivery) return;
        setActionLoading(true);
        const result = await markArrived(delivery.id);
        if (result.success) {
            toast({ title: 'Arrival Confirmed', description: 'Complete ID verification to finish delivery' });
            await loadDelivery();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
        setActionLoading(false);
    };

    const handleCompleteDelivery = async () => {
        if (!delivery || !idVerification.verified) return;
        setActionLoading(true);
        const result = await completeDelivery(delivery.id, {
            idVerified: true,
            idType: idVerification.idType,
            idNumber: idVerification.idNumber,
            birthDate: idVerification.birthDate,
            signatureUrl: signatureDataUrl || undefined,
            proofPhotoUrl: photoDataUrl || undefined,
        });
        if (result.success) {
            toast({ title: 'Delivery Complete!', description: 'Returning to dashboard...' });
            setTimeout(() => router.push('/driver/dashboard'), 2000);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setActionLoading(false);
        }
    };

    const handleRejectedDelivery = async () => {
        if (!delivery) return;
        setActionLoading(true);
        await completeDelivery(delivery.id, { idVerified: false });
        toast({ title: 'Delivery Returned', description: 'Return product to dispensary' });
        setTimeout(() => router.push('/driver/dashboard'), 2000);
    };

    const handlePickupScan = async (token: string) => {
        if (!delivery) return;
        setActionLoading(true);
        const result = await validatePickupQr(delivery.id, token);
        if (result.success) {
            toast({ title: 'Pickup Confirmed!', description: 'En route to customer — GPS tracking active' });
            await loadDelivery();
        } else {
            toast({ variant: 'destructive', title: 'Invalid QR', description: result.error || 'QR code not recognized' });
        }
        setActionLoading(false);
    };

    const handleDeliveryScan = async (token: string) => {
        if (!delivery) return;
        setActionLoading(true);
        const result = await validateDeliveryQr(delivery.id, token);
        if (result.success) {
            toast({ title: 'Arrival Confirmed!', description: 'Complete ID verification to finish delivery' });
            await loadDelivery();
        } else {
            toast({ variant: 'destructive', title: 'Invalid QR', description: result.error || 'QR code not recognized' });
        }
        setActionLoading(false);
    };

    const openNavigation = () => {
        if (!delivery) return;
        const a = delivery.deliveryAddress;
        const dest = encodeURIComponent(`${a.street}, ${a.city}, ${a.state} ${a.zip}`);
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, '_blank');
    };

    const formatTime = (ts: any) => {
        if (!ts) return 'N/A';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    if (isUserLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!delivery) return null;

    const isArrived = delivery.status === 'arrived';
    const canComplete = isArrived && idVerification.verified;

    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Header */}
            <div className="bg-card border-b sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/driver/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold">
                            Order #{delivery.orderId.slice(-8).toUpperCase()}
                        </h1>
                        <p className="text-sm text-muted-foreground">Delivery #{delivery.id.slice(-8).toUpperCase()}</p>
                    </div>
                    <Badge variant={delivery.status === 'delivered' ? 'default' : 'secondary'}>
                        {delivery.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6 space-y-6">
                {/* GPS Status */}
                {gpsEnabled && (
                    <Card className="border-green-500 bg-green-50 dark:bg-green-950">
                        <CardContent className="py-3">
                            <div className="flex items-center gap-2 text-sm">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-medium">GPS Active</span>
                                {lastLocationUpdate && (
                                    <span className="text-muted-foreground">
                                        • {lastLocationUpdate.toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Address + Navigation */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Delivery Address
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <div className="font-medium">{delivery.deliveryAddress.street}</div>
                            <div className="text-sm text-muted-foreground">
                                {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state} {delivery.deliveryAddress.zip}
                            </div>
                        </div>
                        {(delivery.deliveryAddress.deliveryInstructions || delivery.deliveryInstructions) && (
                            <div className="bg-muted p-3 rounded-lg text-sm">
                                <strong>Instructions: </strong>
                                {delivery.deliveryAddress.deliveryInstructions || delivery.deliveryInstructions}
                            </div>
                        )}
                        <Button className="w-full" variant="outline" onClick={openNavigation}>
                            <Navigation className="mr-2 h-4 w-4" /> Open in Maps
                        </Button>
                    </CardContent>
                </Card>

                {/* Delivery Window */}
                {delivery.deliveryWindow && (
                    <Card>
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <div className="text-sm text-muted-foreground">Delivery Window</div>
                                    <div className="font-semibold">
                                        {formatTime(delivery.deliveryWindow.start)} – {formatTime(delivery.deliveryWindow.end)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Customer Contact */}
                {delivery.deliveryAddress.phone && (
                    <Card>
                        <CardContent className="py-4">
                            <Button variant="outline" className="w-full"
                                onClick={() => window.open(`tel:${delivery.deliveryAddress.phone}`)}>
                                <Phone className="mr-2 h-4 w-4" /> {delivery.deliveryAddress.phone}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* ETA Display (in_transit only) */}
                {delivery.status === 'in_transit' && delivery.estimatedArrival && (
                    <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                        <CardContent className="py-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="font-medium text-blue-800 dark:text-blue-200">
                                    ETA: {formatTime(delivery.estimatedArrival)}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Pickup QR Scanner (assigned = at dispensary counter) */}
                {delivery.status === 'assigned' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ScanLine className="h-4 w-4" /> Scan Pickup QR
                            </CardTitle>
                            <CardDescription>
                                Scan the QR code at the dispensary counter to confirm pickup and start delivery
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <QrScanner
                                onScan={handlePickupScan}
                                disabled={actionLoading}
                                label="Scan Pickup QR Code"
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Customer QR Scanner (in_transit = at customer door) */}
                {delivery.status === 'in_transit' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <ScanLine className="h-4 w-4" /> Scan Customer QR
                            </CardTitle>
                            <CardDescription>
                                Ask customer to open their BakedBot link and show the QR code
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <QrScanner
                                onScan={handleDeliveryScan}
                                disabled={actionLoading}
                                label="Scan Customer QR Code"
                            />
                        </CardContent>
                    </Card>
                )}

                {/* ===================== */}
                {/* PHASE 4: ARRIVED FLOW */}
                {/* ===================== */}
                {isArrived && (
                    <>
                        {/* Step 1: ID Verification */}
                        <IDVerificationForm onVerification={setIdVerification} disabled={actionLoading} />

                        {/* Step 2: Signature (only after ID verified) */}
                        {idVerification.verified && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <PenLine className="h-4 w-4" /> Customer Signature
                                    </CardTitle>
                                    <CardDescription>Have customer sign to confirm receipt</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <SignaturePad onSignature={setSignatureDataUrl} height={160} disabled={actionLoading} />
                                </CardContent>
                            </Card>
                        )}

                        {/* Step 3: Proof of Delivery Photo */}
                        {idVerification.verified && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Camera className="h-4 w-4" /> Proof of Delivery Photo
                                    </CardTitle>
                                    <CardDescription>Optional: Take a photo confirming delivery</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ProofPhotoCapture onPhoto={setPhotoDataUrl} disabled={actionLoading} />
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>

            {/* Fixed Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg">
                <div className="container mx-auto space-y-2">
                    {delivery.status === 'assigned' && (
                        <Button className="w-full" size="lg" onClick={handleStartDelivery} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Truck className="mr-2 h-5 w-5" />}
                            Start Delivery
                        </Button>
                    )}

                    {delivery.status === 'in_transit' && (
                        <Button className="w-full" size="lg" onClick={handleMarkArrived} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <MapPin className="mr-2 h-5 w-5" />}
                            I&apos;ve Arrived
                        </Button>
                    )}

                    {canComplete && !idVerification.rejectionReason && (
                        <Button className="w-full" size="lg" onClick={handleCompleteDelivery} disabled={actionLoading}>
                            {actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-2 h-5 w-5" />}
                            Complete Delivery
                        </Button>
                    )}

                    {isArrived && idVerification.rejectionReason && (
                        <Button className="w-full" size="lg" variant="destructive" onClick={handleRejectedDelivery} disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Return Product to Dispensary
                        </Button>
                    )}

                    {isArrived && !idVerification.verified && !idVerification.rejectionReason && (
                        <p className="text-center text-sm text-muted-foreground py-1">
                            Complete ID verification above to proceed
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
