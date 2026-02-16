'use client';

/**
 * Drivers Tab Component
 *
 * Displays driver roster with add/edit/delete functionality
 * Allows toggling driver availability (on/off duty)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, User, Phone, Mail, Car } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getDrivers, toggleDriverAvailability, deleteDriver } from '@/server/actions/driver';
import type { Driver } from '@/types/delivery';
import { AddDriverDialog } from './add-driver-dialog';
import { useUser } from '@/firebase/auth/use-user';

export function DriversTab() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const { toast } = useToast();
    const { user } = useUser();

    // Get orgId from user (for Thrive Syracuse, this will be org_thrive_syracuse)
    const orgId = (user as any)?.orgId || 'org_thrive_syracuse';

    const loadDrivers = async () => {
        setLoading(true);
        const result = await getDrivers(orgId);
        if (result.success) {
            setDrivers(result.drivers);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to load drivers',
            });
        }
        setLoading(false);
    };

    useEffect(() => {
        loadDrivers();
    }, [orgId]);

    const handleToggleAvailability = async (driverId: string) => {
        const result = await toggleDriverAvailability(driverId);
        if (result.success && result.isAvailable !== undefined) {
            // Update local state
            setDrivers((prev) =>
                prev.map((d) =>
                    d.id === driverId ? { ...d, isAvailable: result.isAvailable! } : d
                )
            );
            toast({
                title: 'Success',
                description: result.isAvailable
                    ? 'Driver is now on duty'
                    : 'Driver is now off duty',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to update availability',
            });
        }
    };

    const handleDeleteDriver = async (driverId: string, driverName: string) => {
        if (!confirm(`Are you sure you want to delete ${driverName}? This action cannot be undone.`)) {
            return;
        }

        const result = await deleteDriver(driverId);
        if (result.success) {
            setDrivers((prev) => prev.filter((d) => d.id !== driverId));
            toast({
                title: 'Success',
                description: 'Driver deleted successfully',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Failed to delete driver',
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading drivers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Driver Roster</h3>
                    <p className="text-sm text-muted-foreground">
                        Manage delivery drivers and their availability
                    </p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Driver
                </Button>
            </div>

            {drivers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">No Drivers Yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Add your first driver to start managing deliveries
                        </p>
                        <Button onClick={() => setShowAddDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Driver
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {drivers.map((driver) => (
                        <Card key={driver.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg">
                                            {driver.firstName} {driver.lastName}
                                        </CardTitle>
                                        <CardDescription className="mt-1">
                                            {driver.vehicleType.charAt(0).toUpperCase() +
                                                driver.vehicleType.slice(1)}{' '}
                                            Driver
                                        </CardDescription>
                                    </div>
                                    <Badge
                                        variant={
                                            driver.status === 'active'
                                                ? 'default'
                                                : driver.status === 'inactive'
                                                ? 'secondary'
                                                : 'destructive'
                                        }
                                    >
                                        {driver.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span>{driver.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Mail className="h-3.5 w-3.5" />
                                        <span className="truncate">{driver.email}</span>
                                    </div>
                                    {driver.vehicleMake && (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Car className="h-3.5 w-3.5" />
                                            <span>
                                                {driver.vehicleMake} {driver.vehicleModel}
                                                {driver.vehicleYear && ` (${driver.vehicleYear})`}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={driver.isAvailable}
                                            onCheckedChange={() => handleToggleAvailability(driver.id)}
                                            disabled={driver.status !== 'active'}
                                        />
                                        <span className="text-sm font-medium">
                                            {driver.isAvailable ? 'On Duty' : 'Off Duty'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            handleDeleteDriver(
                                                driver.id,
                                                `${driver.firstName} ${driver.lastName}`
                                            )
                                        }
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AddDriverDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onSuccess={loadDrivers}
                orgId={orgId}
            />
        </div>
    );
}
