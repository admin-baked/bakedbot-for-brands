'use client';

import { BrandKPIs } from './brand-kpi-grid';
import { BrandChatWidget } from './brand-chat-widget';
import { BrandRightRail } from './brand-right-sidebar';
import { CompetitiveIntelSnapshot } from './competitive-intel-snapshot';
import { NextBestActions } from './next-best-actions';
import { Button } from '@/components/ui/button';
import { Activity, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

import { useEffect, useState } from 'react';
import { getBrandDashboardData } from '../actions';
import { ManagedPagesList } from '@/components/dashboard/managed-pages-list';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';

export function BrandOverviewView({ brandId }: { brandId: string }) {
    const market = "All Markets";
    const [liveData, setLiveData] = useState<any>(null);

    useEffect(() => {
        async function loadData() {
            const data = await getBrandDashboardData(brandId);
            if (data) setLiveData(data);
        }
        loadData();
    }, [brandId]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            BRAND CONSOLE
                        </h1>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                            {brandId.toUpperCase()}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5 underline decoration-emerald-500/30 underline-offset-4 decoration-2">
                            Active Retailers: {liveData?.coverage?.value || 0}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5">
                            <Activity className="h-3.5 w-3.5 text-emerald-500" />
                            System Healthy
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <DataImportDropdown />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 font-bold border-2">
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

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background border-2 rounded-md shadow-sm">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[11px] font-black uppercase tracking-wider">Live Data ON</span>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <BrandKPIs data={liveData} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Main Cockpit area */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NextBestActions brandId={brandId} />
                        <CompetitiveIntelSnapshot intel={liveData?.competitiveIntel} />
                    </div>

                    <ManagedPagesList userRole="brand" />

                    <div className="p-1 border-2 border-dashed rounded-xl bg-muted/20">
                        <BrandChatWidget />
                    </div>
                </div>

                {/* Side Rail */}
                <div className="lg:col-span-4 space-y-6">
                    <BrandRightRail />
                </div>
            </div>
        </div>
    );
}
