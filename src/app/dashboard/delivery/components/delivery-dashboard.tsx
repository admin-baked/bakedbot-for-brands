'use client';

/**
 * Delivery Dashboard - Main Component
 *
 * 4 tabs: Active Deliveries, Drivers, Zones, Analytics
 */

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Users, MapPin, BarChart3, Loader2 } from 'lucide-react';
import { ActiveDeliveriesTab } from './active-deliveries-tab';
import { DriversTab } from './drivers-tab';
import { ZonesTab } from './zones-tab';
import { AnalyticsTab } from './analytics-tab';

export function DeliveryDashboard() {
    const { user, isUserLoading } = useUser();
    const [activeTab, setActiveTab] = useState('active');
    const [locationId, setLocationId] = useState<string>('');

    useEffect(() => {
        // Get locationId from user org (default to Thrive Syracuse for now)
        if (user) {
            // In production, fetch from user claims or profile
            setLocationId('loc_thrive_syracuse');
        }
    }, [user]);

    if (isUserLoading || !locationId) {
        return (
            <div className="container mx-auto py-8">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Delivery Management</h1>
                <p className="text-muted-foreground mt-2">
                    Manage drivers, delivery zones, and track deliveries
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="active" className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="hidden sm:inline">Active Deliveries</span>
                        <span className="sm:hidden">Active</span>
                    </TabsTrigger>
                    <TabsTrigger value="drivers" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Drivers</span>
                        <span className="sm:hidden">Drivers</span>
                    </TabsTrigger>
                    <TabsTrigger value="zones" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span className="hidden sm:inline">Zones</span>
                        <span className="sm:hidden">Zones</span>
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="hidden sm:inline">Analytics</span>
                        <span className="sm:hidden">Stats</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    <ActiveDeliveriesTab locationId={locationId} />
                </TabsContent>

                <TabsContent value="drivers" className="space-y-4">
                    <DriversTab />
                </TabsContent>

                <TabsContent value="zones" className="space-y-4">
                    <ZonesTab />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <AnalyticsTab locationId={locationId} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
