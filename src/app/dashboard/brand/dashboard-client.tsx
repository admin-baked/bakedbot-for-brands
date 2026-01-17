'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Activity, Globe, MapPin } from 'lucide-react';
import { SyncToggle } from '@/components/dashboard/sync-toggle';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { ManagedPagesList } from '@/components/dashboard/managed-pages-list';
import { getBrandDashboardData } from './actions';

import { BrandKPIs } from './components/brand-kpi-grid';
import { BrandChatWidget } from './components/brand-chat-widget';
import { BrandRightRail } from './components/brand-right-sidebar';
import { BrandPlaybooksList } from './components/brand-playbooks-list';

export default function BrandDashboardClient({ brandId }: { brandId: string }) {
    const [liveData, setLiveData] = useState<any>(null);
    const market = "All Markets";

    // Fetch data for widgets
    useEffect(() => {
        async function loadData() {
            const data = await getBrandDashboardData(brandId);
            if (data) setLiveData(data);
        }
        loadData();
    }, [brandId]);

    const brandName = liveData?.meta?.name || brandId || 'Brand';
    const productsCount = liveData?.sync?.products || 0;
    const competitorsCount = liveData?.sync?.competitors || 0;

    return (
        <div className="space-y-6 pb-20" data-testid="brand-dashboard-client">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Brand Console</h1>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {liveData?.meta?.name ? (
                                <span className="font-semibold">{liveData.meta.name}</span>
                            ) : (
                                `Brand Mode • ${brandId.slice(0, 8)}...`
                            )}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">Manage retail distribution, pricing, and campaigns.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DataImportDropdown />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Globe className="h-4 w-4" />
                                {market}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>Market Filter</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>All Markets (Global)</DropdownMenuItem>
                            <DropdownMenuItem>Illinois (IL)</DropdownMenuItem>
                            <DropdownMenuItem>Michigan (MI)</DropdownMenuItem>
                            <DropdownMenuItem>California (CA)</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <SyncToggle
                        brandId={brandId}
                        website={liveData?.meta?.website}
                        type="brand"
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

            {/* KPI Row */}
            <BrandKPIs data={liveData} />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Chat Block */}
                    <BrandChatWidget />

                    {/* Pages */}
                    <ManagedPagesList userRole="brand" />

                    {/* Playbook Library */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Playbooks</h2>
                        </div>
                        <BrandPlaybooksList brandId={brandId} />
                    </div>
                </div>

                {/* Right Rail */}
                <div className="lg:col-span-2">
                    <BrandRightRail
                        userState={liveData?.meta?.state}
                    />
                </div>
            </div>

            {/* Sticky Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg z-50">
                <div className="container flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${(liveData?.alerts?.critical ?? 0) > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                            <span className="text-sm font-medium">{liveData?.alerts?.critical ?? 0} critical alerts</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{liveData?.coverage?.value ?? 0} active retailers</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="text-sm">System Healthy</span>
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
