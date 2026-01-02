'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ModularDashboard } from '@/components/dashboard/modular/modular-dashboard';
import { LayoutDashboard, Grip, Activity, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Server } from 'lucide-react';
import { DataImportDropdown } from '@/components/dashboard/data-import-dropdown';
import { SetupHealth } from '@/components/dashboard/setup-health';
import { QuickStartCards } from '@/components/dashboard/quick-start-cards';
import { TaskFeed } from '@/components/dashboard/task-feed';
import { SetupChecklist } from '@/components/dashboard/setup-checklist';
import { getBrandDashboardData } from './actions';
import { BrandRightRail } from './components/brand-right-sidebar';

export default function BrandDashboardClient({ brandId }: { brandId: string }) {
    const [view, setView] = useState<'hq' | 'classic' | 'customize'>('hq');
    const [liveData, setLiveData] = useState<any>(null);
    const market = "All Markets";

    // Persist view preference
    useEffect(() => {
        const savedView = localStorage.getItem(`dash_view_${brandId}`);
        if (savedView === 'classic' || savedView === 'hq') {
            setView(savedView);
        }
    }, [brandId]);

    const handleViewChange = (newView: 'hq' | 'classic' | 'customize') => {
        setView(newView);
        if (newView !== 'customize') {
            localStorage.setItem(`dash_view_${brandId}`, newView);
        }
    };

    // Fetch data for widgets
    useEffect(() => {
        async function loadData() {
            const data = await getBrandDashboardData(brandId);
            if (data) setLiveData(data);
        }
        loadData();
    }, [brandId]);

    const brandName = liveData?.meta?.name || brandId;
    const productsCount = liveData?.sync?.products || 0;
    const competitorsCount = liveData?.sync?.competitors || 0;

    return (
        <div className="space-y-6" data-testid="brand-dashboard-client">
            {/* Unified Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                            BRAND CONSOLE
                        </h1>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                             {liveData?.meta?.name ? (
                                <span className="uppercase">{liveData.meta.name}</span>
                             ) : (
                                `${brandId.toUpperCase().slice(0, 12)}...`
                             )}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                        <span className="flex items-center gap-1.5 underline decoration-emerald-500/30 underline-offset-4 decoration-2">
                            Active Retailers: {liveData?.coverage?.value ?? '—'}
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

                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-background border-2 rounded-md shadow-sm cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-wider">Live Data ON</span>
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" align="end">
                            <div className="p-3 bg-slate-950 text-white rounded-t-lg border-b border-slate-800">
                                <div className="text-xs font-mono text-slate-400 mb-1">DATA STREAM</div>
                                <div className="text-sm font-semibold flex items-center gap-2">
                                    <Server className="h-4 w-4 text-emerald-400" />
                                    Active Sync
                                </div>
                            </div>
                            <div className="p-3 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Products Indexed</span>
                                    <span className="font-mono font-bold">{productsCount}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground">Competitors Found</span>
                                    <span className="font-mono font-bold">{competitorsCount}</span>
                                </div>
                                <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
                                    <span>Last Sync:</span>
                                    <span>{liveData?.sync?.lastSynced ? new Date(liveData.sync.lastSynced).toLocaleTimeString() : 'Just now'}</span>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Setup Checklist - Onboarding v2 progressive disclosure */}
            <SetupChecklist />

            {/* View Toggle */}
            <div className="flex items-center justify-between">
                <Tabs value={view} onValueChange={(v) => handleViewChange(v as any)} data-testid="dashboard-view-tabs">
                    <TabsList className="h-8">
                        <TabsTrigger value="hq" className="text-xs gap-1.5 px-3" data-testid="tab-hq">
                            <Activity className="h-3.5 w-3.5" />
                            Command Center
                        </TabsTrigger>
                        <TabsTrigger value="classic" className="text-xs gap-1.5 px-3" data-testid="tab-classic">
                            <LayoutDashboard className="h-3.5 w-3.5" />
                            Classic
                        </TabsTrigger>
                        <TabsTrigger value="customize" className="text-xs gap-1.5 px-3" data-testid="tab-customize">
                            <Grip className="h-3.5 w-3.5" />
                            Customize
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content - Unified Dashboard */}
            {view === 'hq' ? (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-1 space-y-4">
                        <SetupHealth />
                        <QuickStartCards />
                        <TaskFeed />
                    </div>
                    <div className="lg:col-span-3">
                        <ModularDashboard
                            role="brand"
                            isEditable={false}
                            dashboardData={liveData}
                        />
                    </div>
                </div>
            ) : (
                <ModularDashboard
                    role="brand"
                    isEditable={view === 'customize'}
                    dashboardData={liveData}
                />
            )}
        </div>
    );
}
