'use client';

import { BrandKPIs } from './components/brand-kpi-grid';
import { BrandChatWidget } from './components/brand-chat-widget';
import { BrandRightRail } from './components/brand-right-sidebar';
import { BrandPlaybooksList } from './components/brand-playbooks-list';
import { Button } from '@/components/ui/button';
import { MapPin, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

export default function BrandDashboardClient({ brandId }: { brandId: string }) {

    const market = "All Markets";

    return (
        <div className="space-y-6 pb-20"> {/* pb-20 availability for sticky footer */}
            {/* 1. Header (Custom for Brand) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">Brand Console</h1>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Brand Mode • {brandId} • Active Retailers: 42
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">Grow retail coverage, velocity, and compliant demand.</p>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Globe className="h-4 w-4" />
                                {market}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Market Filter</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>All Markets</DropdownMenuItem>
                            <DropdownMenuItem>Illinois (IL)</DropdownMenuItem>
                            <DropdownMenuItem>Michigan (MI)</DropdownMenuItem>
                            <DropdownMenuItem>California (CA)</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-md text-xs font-medium">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        Live Data
                    </div>
                </div>
            </div>

            {/* 2. KPI Row */}
            <BrandKPIs />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 3. Chat Block */}
                    <BrandChatWidget />

                    {/* 5. Playbook Library */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Playbooks</h2>
                        </div>
                        <BrandPlaybooksList />
                    </div>
                </div>

                {/* Right Rail */}
                <div className="lg:col-span-2">
                    <BrandRightRail />
                </div>
            </div>

            {/* 6. Sticky Bottom Bar (Revenue Queue) */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg z-50">
                <div className="container flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">12 retailers need follow-up</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm font-medium">3 OOS alerts</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="text-sm">2 campaigns scheduled</span>
                        </div>
                    </div>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        Open Revenue Queue
                    </Button>
                </div>
            </div>
        </div>
    );
}
