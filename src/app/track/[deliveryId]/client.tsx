'use client';

/**
 * Customer Delivery Tracking Page
 *
 * Public page for customers to track their delivery in real-time
 * No authentication required - uses delivery ID from URL
 * Features:
 * - Real-time status updates
 * - Driver location (when in transit)
 * - Estimated arrival time
 * - Order details
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Clock, Package, CheckCircle, Loader2 } from 'lucide-react';
import { getPublicDeliveryStatus } from '@/server/actions/delivery-tracking';
import type { Delivery } from '@/types/delivery';

export function TrackDeliveryPageClient({ deliveryId }: { deliveryId: string }) {
    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadDeliveryStatus();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadDeliveryStatus, 30000);
        return () => clearInterval(interval);
    }, [deliveryId]);

    const loadDeliveryStatus = async () => {
        try {
            const result = await getPublicDeliveryStatus(deliveryId);
            if (result.success && result.delivery) {
                setDelivery(result.delivery);
                setError(null);
            } else {
                setError(result.error || 'Delivery not found');
            }
        } catch (err) {
            console.error('Load delivery error:', err);
            setError('Failed to load delivery status');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStep = (status: string) => {
        const steps = ['pending', 'assigned', 'in_transit', 'arrived', 'delivered'];
        return steps.indexOf(status);
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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
                    <p className="text-lg">Loading delivery status...</p>
                </div>
            </div>
        );
    }

    if (error || !delivery) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="py-12 text-center">
                        <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Delivery Not Found</h3>
                        <p className="text-sm text-muted-foreground">
                            {error || 'Please check your tracking link and try again'}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentStep = getStatusStep(delivery.status);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 py-12">
            <div className="container mx-auto max-w-2xl space-y-6">
                {/* Header */}
                <div className="text-center text-white mb-8">
                    <h1 className="text-3xl font-bold mb-2">Track Your Delivery</h1>
                    <p className="text-white/70">
                        Order #{delivery.orderId.slice(-8).toUpperCase()}
                    </p>
                </div>

                {/* Status Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl">Delivery Status</CardTitle>
                            <Badge
                                variant={delivery.status === 'delivered' ? 'default' : 'secondary'}
                                className="text-sm"
                            >
                                {delivery.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                        </div>
                        <CardDescription>
                            Last updated: {new Date().toLocaleTimeString()}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Progress Steps */}
                        <div className="space-y-4">
                            {/* Step 1: Order Confirmed */}
                            <div className="flex items-start gap-4">
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                        currentStep >= 0
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                    }`}
                                >
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">Order Confirmed</div>
                                    <div className="text-sm text-muted-foreground">
                                        {delivery.createdAt && formatTime(delivery.createdAt)}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Driver Assigned */}
                            <div className="flex items-start gap-4">
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                        currentStep >= 1
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                    }`}
                                >
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">Driver Assigned</div>
                                    <div className="text-sm text-muted-foreground">
                                        {currentStep >= 1
                                            ? 'Your driver is preparing your order'
                                            : 'Waiting for driver assignment'}
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Out for Delivery */}
                            <div className="flex items-start gap-4">
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                        currentStep >= 2
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                    }`}
                                >
                                    <MapPin className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">Out for Delivery</div>
                                    <div className="text-sm text-muted-foreground">
                                        {currentStep >= 2
                                            ? delivery.departedAt
                                                ? `Started ${formatTime(delivery.departedAt)}`
                                                : 'Driver is on the way'
                                            : 'Not started yet'}
                                    </div>
                                    {currentStep === 2 && delivery.driverLocation && (
                                        <div className="mt-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-2 rounded-lg">
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="font-medium">
                                                    Driver location updating in real-time
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 4: Driver Arrived */}
                            <div className="flex items-start gap-4">
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                        currentStep >= 3
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                    }`}
                                >
                                    <Clock className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">Driver Arrived</div>
                                    <div className="text-sm text-muted-foreground">
                                        {currentStep >= 3
                                            ? delivery.arrivedAt
                                                ? `Arrived ${formatTime(delivery.arrivedAt)}`
                                                : 'Driver is at your location'
                                            : 'Not arrived yet'}
                                    </div>
                                </div>
                            </div>

                            {/* Step 5: Delivered */}
                            <div className="flex items-start gap-4">
                                <div
                                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                        currentStep >= 4
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-400'
                                    }`}
                                >
                                    <CheckCircle className="h-5 w-5" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold">Delivered</div>
                                    <div className="text-sm text-muted-foreground">
                                        {currentStep >= 4
                                            ? delivery.deliveredAt
                                                ? `Completed ${formatTime(delivery.deliveredAt)}`
                                                : 'Delivery complete!'
                                            : 'Pending delivery'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Delivery Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="text-sm font-medium text-muted-foreground mb-1">
                                Delivery Address
                            </div>
                            <div className="font-medium">{delivery.deliveryAddress.street}</div>
                            <div className="text-sm text-muted-foreground">
                                {delivery.deliveryAddress.city}, {delivery.deliveryAddress.state}{' '}
                                {delivery.deliveryAddress.zip}
                            </div>
                        </div>

                        {delivery.deliveryWindow && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">
                                    Delivery Window
                                </div>
                                <div className="font-medium">
                                    {formatTime(delivery.deliveryWindow.start)} -{' '}
                                    {formatTime(delivery.deliveryWindow.end)}
                                </div>
                            </div>
                        )}

                        {delivery.deliveryFee && (
                            <div>
                                <div className="text-sm font-medium text-muted-foreground mb-1">
                                    Delivery Fee
                                </div>
                                <div className="font-medium">
                                    ${delivery.deliveryFee.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Auto-refresh notice */}
                <div className="text-center text-white/70 text-sm">
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Status updates automatically every 30 seconds</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
