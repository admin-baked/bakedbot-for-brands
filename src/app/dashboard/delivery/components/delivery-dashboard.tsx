'use client';

/**
 * Delivery Dashboard - Main Component
 *
 * 4 tabs: Active Deliveries, Drivers, Zones, Analytics
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, Users, MapPin, BarChart3 } from 'lucide-react';
import { DriversTab } from './drivers-tab';
import { ZonesTab } from './zones-tab';

export function DeliveryDashboard() {
    const [activeTab, setActiveTab] = useState('drivers');

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
                    <div className="p-8 text-center border rounded-lg bg-muted/50">
                        <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Active Deliveries</h3>
                        <p className="text-sm text-muted-foreground">
                            Coming in Phase 3: Real-time delivery tracking with live map
                        </p>
                    </div>
                </TabsContent>

                <TabsContent value="drivers" className="space-y-4">
                    <DriversTab />
                </TabsContent>

                <TabsContent value="zones" className="space-y-4">
                    <ZonesTab />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <div className="p-8 text-center border rounded-lg bg-muted/50">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-semibold mb-2">Analytics & Reports</h3>
                        <p className="text-sm text-muted-foreground">
                            Coming in Phase 5: Success rate, avg delivery time, driver performance
                        </p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
