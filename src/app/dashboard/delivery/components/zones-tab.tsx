'use client';

/**
 * Zones Tab Component
 *
 * Displays delivery zones with configuration
 * Shows radius, fees, minimum orders, and status
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { MapPin, DollarSign, Ruler } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDeliveryZones, updateDeliveryZone } from '@/server/actions/delivery';
import type { DeliveryZone } from '@/types/delivery';
import { useUser } from '@/firebase/auth/use-user';

export function ZonesTab() {
    const [zones, setZones] = useState<DeliveryZone[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user } = useUser();

    // For Thrive Syracuse
    const locationId = 'loc_thrive_syracuse';

    const loadZones = async () => {
        setLoading(true);
        const result = await getDeliveryZones(locationId);
        if (result.success) {
            setZones(result.zones);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to load zones',
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadZones();
    }, []);

    const handleToggleZone = async (zoneId: string, currentStatus: boolean) => {
        const result = await updateDeliveryZone(zoneId, {
            isActive: !currentStatus,
        });

        if (result.success) {
            setZones((prev) =>
                prev.map((z) => (z.id === zoneId ? { ...z, isActive: !currentStatus } : z))
            );
            toast({
                title: 'Success',
                description: !currentStatus ? 'Zone enabled' : 'Zone disabled',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to update zone',
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading zones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold">Delivery Zones</h3>
                <p className="text-sm text-muted-foreground">
                    Manage delivery zones, pricing, and service areas
                </p>
            </div>

            {zones.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Zones Configured</h3>
                        <p className="text-sm text-muted-foreground">
                            Contact support to configure delivery zones for your location
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {zones
                        .sort((a, b) => a.radiusMiles - b.radiusMiles) // Sort by radius
                        .map((zone) => (
                            <Card key={zone.id}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg">{zone.name}</CardTitle>
                                            {zone.description && (
                                                <CardDescription className="mt-1">
                                                    {zone.description}
                                                </CardDescription>
                                            )}
                                        </div>
                                        <Badge variant={zone.isActive ? 'default' : 'secondary'}>
                                            {zone.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Ruler className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <div className="font-semibold">
                                                    {zone.radiusMiles} miles
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Radius
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <div className="font-semibold">
                                                    ${zone.baseFee.toFixed(2)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Delivery Fee
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <div className="text-xs text-muted-foreground mb-1">
                                                Minimum Order
                                            </div>
                                            <div className="font-semibold">
                                                ${zone.minimumOrder.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <span className="text-sm font-medium">
                                            {zone.isActive ? 'Enabled' : 'Disabled'}
                                        </span>
                                        <Switch
                                            checked={zone.isActive}
                                            onCheckedChange={() =>
                                                handleToggleZone(zone.id, zone.isActive)
                                            }
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            )}

            <Card className="mt-6 bg-muted/50">
                <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Zone configuration determines delivery fees and
                        service areas. Customers will be matched to the appropriate zone based on
                        their address during checkout.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
