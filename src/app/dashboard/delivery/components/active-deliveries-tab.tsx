'use client';

/**
 * Active Deliveries Tab
 *
 * Real-time delivery tracking for dispatchers
 * Shows all active deliveries with driver locations
 * Features:
 * - Live status updates
 * - Driver GPS location tracking
 * - Delivery timeline
 * - Reassignment capability
 */

import { useState, useEffect } from 'react';
import { getActiveDeliveries, reassignDriver } from '@/server/actions/delivery';
import { getDrivers } from '@/server/actions/driver';
import type { Delivery, Driver } from '@/types/delivery';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, MapPin, Clock, User, Truck, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ActiveDeliveriesTab({ locationId }: { locationId: string }) {
    const { toast } = useToast();
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [reassigning, setReassigning] = useState<string | null>(null);

    useEffect(() => {
        loadData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [locationId]);

    const loadData = async () => {
        try {
            const [deliveriesResult, driversResult] = await Promise.all([
                getActiveDeliveries(locationId),
                getDrivers(locationId),
            ]);

            if (deliveriesResult.success) {
                setDeliveries(deliveriesResult.deliveries);
            }

            if (driversResult.success) {
                setDrivers(driversResult.drivers);
            }
        } catch (error) {
            console.error('Load data error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReassign = async (deliveryId: string, newDriverId: string) => {
        setReassigning(deliveryId);
        const result = await reassignDriver(deliveryId, newDriverId);

        if (result.success) {
            toast({
                title: 'Driver Reassigned',
                description: 'Delivery has been reassigned successfully',
            });
            await loadData();
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to reassign driver',
            });
        }
        setReassigning(null);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-500',
            assigned: 'bg-blue-500',
            in_transit: 'bg-green-500',
            arrived: 'bg-purple-500',
            delivered: 'bg-gray-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'outline',
            assigned: 'default',
            in_transit: 'default',
            arrived: 'default',
            delivered: 'secondary',
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

    const getDriverName = (driverId?: string) => {
        if (!driverId) return 'Unassigned';
        const driver = drivers.find((d) => d.id === driverId);
        return driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown';
    };

    const getAvailableDrivers = (excludeDriverId?: string) => {
        return drivers.filter(
            (d) => d.status === 'active' && (!excludeDriverId || d.id !== excludeDriverId)
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading active deliveries...</p>
                </div>
            </div>
        );
    }

    if (deliveries.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Active Deliveries</h3>
                    <p className="text-sm text-muted-foreground">
                        Active deliveries will appear here when orders are placed
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">
                        Active Deliveries ({deliveries.length})
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Real-time tracking updates every 30 seconds
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadData}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4">
                {deliveries.map((delivery) => (
                    <Card key={delivery.id}>
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-lg">
                                        Order #{delivery.orderId.slice(-8).toUpperCase()}
                                    </CardTitle>
                                    <CardDescription>
                                        Delivery #{delivery.id.slice(-8).toUpperCase()}
                                    </CardDescription>
                                </div>
                                {getStatusBadge(delivery.status)}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Delivery Timeline */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 flex-1">
                                    <div
                                        className={`h-2 w-2 rounded-full ${getStatusColor(
                                            delivery.status
                                        )}`}
                                    />
                                    <span className="text-sm font-medium">
                                        {delivery.status === 'pending' && 'Awaiting Assignment'}
                                        {delivery.status === 'assigned' && 'Driver Assigned'}
                                        {delivery.status === 'in_transit' && 'En Route'}
                                        {delivery.status === 'arrived' && 'Driver Arrived'}
                                        {delivery.status === 'delivered' && 'Completed'}
                                    </span>
                                </div>
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    {formatTime(delivery.createdAt)}
                                </span>
                            </div>

                            {/* Address */}
                            <div className="flex items-start gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <div className="font-medium">{delivery.deliveryAddress.street}</div>
                                    <div className="text-muted-foreground">
                                        {delivery.deliveryAddress.city},{' '}
                                        {delivery.deliveryAddress.state}{' '}
                                        {delivery.deliveryAddress.zip}
                                    </div>
                                </div>
                            </div>

                            {/* Driver Assignment */}
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="text-sm font-medium">
                                        {getDriverName(delivery.driverId)}
                                    </span>
                                    {delivery.driverId && (
                                        <Badge variant="outline" className="text-xs">
                                            {drivers.find((d) => d.id === delivery.driverId)
                                                ?.vehicleType || 'N/A'}
                                        </Badge>
                                    )}
                                </div>

                                {/* Reassignment */}
                                {delivery.status !== 'delivered' && (
                                    <Select
                                        disabled={reassigning === delivery.id}
                                        onValueChange={(newDriverId) =>
                                            handleReassign(delivery.id, newDriverId)
                                        }
                                    >
                                        <SelectTrigger className="w-[140px] h-8 text-xs">
                                            <SelectValue placeholder="Reassign" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getAvailableDrivers(delivery.driverId).map((driver) => (
                                                <SelectItem key={driver.id} value={driver.id}>
                                                    {driver.firstName} {driver.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>

                            {/* Delivery Window */}
                            {delivery.deliveryWindow && (
                                <div className="bg-muted p-2 rounded-lg text-sm">
                                    <span className="font-medium">Window: </span>
                                    {formatTime(delivery.deliveryWindow.start)} -{' '}
                                    {formatTime(delivery.deliveryWindow.end)}
                                </div>
                            )}

                            {/* GPS Location (if active) */}
                            {delivery.driverLocation && (
                                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-2 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="font-medium">Live GPS Tracking</span>
                                        <span className="text-muted-foreground">
                                            Updated{' '}
                                            {delivery.driverLocation.updatedAt
                                                ? formatTime(delivery.driverLocation.updatedAt)
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
