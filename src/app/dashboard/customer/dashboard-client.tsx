'use client';

import { CustomerKPIs } from './components/customer-kpi-grid';
import { CustomerChatWidget } from './components/customer-chat-widget';
import { CustomerRightRail } from './components/customer-right-sidebar';
import { CustomerRoutinesList } from './components/customer-routines-list';
import { Button } from '@/components/ui/button';
import { MapPin, ShoppingCart, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

export default function CustomerDashboardClient() {
    return (
        <div className="space-y-6 pb-24">
            {/* 1. Header (Concierge Style) */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">My Cannabis Concierge</h1>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Customer Mode • Verified ✅
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">Personalized picks, deals, and reorders—fast.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <MapPin className="h-4 w-4" />
                                California Cannabis
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Switch Dispensary</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>California Cannabis</DropdownMenuItem>
                            <DropdownMenuItem>Green Dragon</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="sm" className="gap-2">
                        Pickup
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        90210
                    </Button>
                </div>
            </div>

            {/* 2. KPI Row */}
            <CustomerKPIs />

            <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                {/* Main Column */}
                <div className="lg:col-span-4 space-y-6">
                    {/* 3. Chat Block (Hero) */}
                    <CustomerChatWidget />

                    {/* 5. Routines (Playbooks) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">My Routines</h2>
                            <span className="text-xs text-muted-foreground">Automated helpers</span>
                        </div>
                        <CustomerRoutinesList />
                    </div>
                </div>

                {/* Right Rail */}
                <div className="lg:col-span-2">
                    <CustomerRightRail />
                </div>
            </div>

            {/* 6. Sticky Bottom Bar (View Cart) */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg z-50">
                <div className="container flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Total (3 items)</span>
                            <span className="font-bold text-lg">$48.50</span>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 gap-1 hidden sm:flex">
                            <CheckCircle className="h-3 w-3" />
                            Best deal applied
                        </Badge>
                    </div>
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-md">
                        <ShoppingCart className="h-4 w-4" />
                        Checkout
                    </Button>
                </div>
            </div>
        </div>
    );
}
