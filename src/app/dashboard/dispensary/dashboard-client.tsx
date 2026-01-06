'use client';

import { useState, useEffect } from 'react';
import { DispensaryKPIs } from './components/dispensary-kpi-grid';
import { DispensaryChatWidget } from './components/dispensary-chat-widget';
import { DispensaryRightRail } from './components/dispensary-right-sidebar';
import { DispensaryPlaybooksList } from './components/dispensary-playbooks-list';
import { Button } from '@/components/ui/button';
import { MapPin, Power, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Server } from 'lucide-react';
import { SyncToggle } from '@/components/dashboard/sync-toggle';

import { ManagedPagesList } from '@/components/dashboard/managed-pages-list';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { getDispensaryDashboardData, type DispensaryDashboardData } from './actions';

export default function DispensaryDashboardClient({ brandId }: { brandId: string }) {
    const [liveData, setLiveData] = useState<DispensaryDashboardData | null>(null);
    const [dispensaryName, setDispensaryName] = useState<string | null>(null);

    // Fetch data for widgets
    useEffect(() => {
        async function loadData() {
            const data = await getDispensaryDashboardData(brandId);
            if (data) setLiveData(data);
        }
        loadData();
    }, [brandId]);

    // Use live data or fallback
    const locationName = liveData?.location?.name || brandId || 'Dispensary';
    const displayName = liveData?.location?.name || brandId || 'Dispensary';

    // Calculate sync stats
    const productsCount = liveData?.sync?.products || 0;
    const competitorsCount = liveData?.sync?.competitors || 0;

    return (
        <div className="space-y-6 pb-20"> {/* pb-20 availability for sticky footer */}
{/* Updated Header with SyncToggle */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Dispensary Console</h1>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {liveData?.location?.name ? (
                                <span className="font-semibold">{liveData.location.name}</span>
                            ) : (
                                `Dispensary Mode • ${brandId.slice(0, 8)}...`
                            )}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">Run daily ops, menu, marketing, and compliance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <MapPin className="h-4 w-4" />
                                {locationName}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Switch Location</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Downtown • Delivery Hub</DropdownMenuItem>
                            <DropdownMenuItem>Westside • Pickup</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>All Locations</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <SyncToggle 
                        brandId={brandId} 
                        website={liveData?.location?.website}
                        type="dispensary"
                        initialStats={{
                            products: productsCount,
                            competitors: competitorsCount,
                            lastSynced: liveData?.sync?.lastSynced ? new Date(liveData.sync.lastSynced).toISOString() : null
                        }}
                    />
                </div>
            </div>

            {/* Setup Checklist - Onboarding v2 progressive disclosure */}
            <SetupChecklist />

            {/* 2. KPI Row */}
            <DispensaryKPIs data={liveData?.stats} />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 3. Chat Block */}
                    <DispensaryChatWidget />

                    {/* 4. Pages */}
                    <ManagedPagesList userRole="dispensary" />

                    {/* 5. Playbook Library */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Playbooks</h2>
                        </div>
                        <DispensaryPlaybooksList dispensaryId={brandId} />
                    </div>
                </div>

                {/* Right Rail */}
                <div className="lg:col-span-2">
                    <DispensaryRightRail 
                        userState={liveData?.location?.state} 
                        alerts={liveData?.alerts}
                    />
                </div>
            </div>

            {/* 6. Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg z-50">
                <div className="container flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${(liveData?.operations?.criticalAlerts ?? 0) > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                            <span className="text-sm font-medium">{liveData?.operations?.criticalAlerts ?? 0} critical alerts</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{liveData?.operations?.openOrders ?? 0} open orders</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-sm">Avg {liveData?.operations?.avgFulfillmentMinutes ?? '—'}m fulfillment</span>
                        </div>
                    </div>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Review Queue
                    </Button>
                </div>
            </div>
        </div>
    );
}
