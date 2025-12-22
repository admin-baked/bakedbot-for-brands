'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModularDashboard } from '@/components/dashboard/modular/modular-dashboard';
import { LayoutDashboard, Grip, Activity, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';
import { getBrandDashboardData } from './actions';

export default function BrandDashboardClient({ brandId }: { brandId: string }) {
    const [view, setView] = useState<'overview' | 'modular'>('overview');
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

    return (
        <div className="space-y-6">
            {/* Unified Header */}
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
                            Active Retailers: 42
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

            {/* View Toggle */}
            <div className="flex items-center justify-between">
                <Tabs value={view} onValueChange={(v) => setView(v as 'overview' | 'modular')}>
                    <TabsList className="h-8">
                        <TabsTrigger value="overview" className="text-xs gap-1.5 px-3">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="modular" className="text-xs gap-1.5 px-3">
                            <Grip className="h-3.5 w-3.5" />
                            Customize
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content - Unified Dashboard */}
            <ModularDashboard
                role="brand"
                isEditable={view === 'modular'}
                dashboardData={liveData}
            />
        </div>
    );
}
