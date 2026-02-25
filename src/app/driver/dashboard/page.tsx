'use client';

/**
 * Driver Dashboard Page
 *
 * Main dashboard for delivery drivers
 * Shows assigned deliveries, current delivery, and delivery history
 * Requires delivery_driver role
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { getDriverDeliveries } from '@/server/actions/delivery-driver';
import type { Delivery } from '@/types/delivery';
import { DriverFcmRegistrar } from '@/components/driver/fcm-registrar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Clock, Package, LogOut, Loader2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase/client';
import { useToast } from '@/hooks/use-toast';

export default function DriverDashboardPage() {
    const router = useRouter();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check authentication and role
        if (!isUserLoading && !user) {
            router.push('/driver/login');
            return;
        }

        if (user) {
            loadDeliveries();
        }
    }, [user, isUserLoading, router]);

    const loadDeliveries = async () => {
        try {
            setLoading(true);
            const result = await getDriverDeliveries();
            if (result.success) {
                setDeliveries(result.deliveries);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: result.error || 'Failed to load deliveries',
                });
            }
        } catch (error) {
            console.error('Load deliveries error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
            }
            router.push('/driver/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            assigned: 'default',
            in_transit: 'default',
            arrived: 'default',
            delivered: 'secondary',
            failed: 'destructive',
        };

        return (
            <Badge variant={variants[status] || 'outline'}>
                {status.replace('_', ' ').toUpperCase()}
            </Badge>
        );
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
                    <p className="text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const activeDeliveries = deliveries.filter((d) =>
        ['assigned', 'in_transit', 'arrived'].includes(d.status)
    );
    const completedDeliveries = deliveries.filter((d) => d.status === 'delivered');

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="bg-card border-b">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary rounded-full p-2">
                            <Truck className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">Driver Dashboard</h1>
                            <p className="text-sm text-muted-foreground">
                                {user?.displayName || user?.email || 'Driver'}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 space-y-6">
                {/* Push Notification Opt-In */}
                <DriverFcmRegistrar />
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{activeDeliveries.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">
                                Completed Today
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{completedDeliveries.length}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge variant="default" className="text-sm">
                                On Duty
                            </Badge>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Deliveries */}
                <div>
                    <h2 className="text-lg font-semibold mb-4">Active Deliveries</h2>
                    {activeDeliveries.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-semibold mb-2">No Active Deliveries</h3>
                                <p className="text-sm text-muted-foreground">
                                    You'll be notified when a delivery is assigned
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {activeDeliveries.map((delivery) => (
                                <Card
                                    key={delivery.id}
                                    className="cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() => router.push(`/driver/delivery/${delivery.id}`)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">
                                                    Order #{delivery.orderId.slice(-8).toUpperCase()}
                                                </CardTitle>
                                                <CardDescription>
                                                    {delivery.deliveryAddress.city},{' '}
                                                    {delivery.deliveryAddress.state}
                                                </CardDescription>
                                            </div>
                                            {getStatusBadge(delivery.status)}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-start gap-2 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                            <div>
                                                <div className="font-medium">
                                                    {delivery.deliveryAddress.street}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {delivery.deliveryAddress.city},{' '}
                                                    {delivery.deliveryAddress.state}{' '}
                                                    {delivery.deliveryAddress.zip}
                                                </div>
                                            </div>
                                        </div>

                                        {delivery.deliveryWindow && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Clock className="h-4 w-4" />
                                                <span>
                                                    Window: {formatTime(delivery.deliveryWindow.start)} -{' '}
                                                    {formatTime(delivery.deliveryWindow.end)}
                                                </span>
                                            </div>
                                        )}

                                        <Button className="w-full" variant="default">
                                            View Details
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
