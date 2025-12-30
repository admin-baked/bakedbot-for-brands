'use client';
import { useState, useEffect } from 'react';
import { InvitationsList } from '@/components/invitations/invitations-list';

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
import { getCustomerDashboardData, type CustomerDashboardData } from './actions';

export default function CustomerDashboardClient() {
    const [liveData, setLiveData] = useState<CustomerDashboardData | null>(null);

    // Fetch data on mount
    useEffect(() => {
        async function loadData() {
            const data = await getCustomerDashboardData();
            if (data) setLiveData(data);
        }
        loadData();
    }, []);

    // Use live data or fallbacks
    const dispensaryName = liveData?.profile?.preferredDispensary || 'Select Dispensary';
    const fulfillmentType = liveData?.profile?.fulfillmentType || 'Pickup';
    const zipCode = liveData?.profile?.zipCode || '—';

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
                                {dispensaryName}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Switch Dispensary</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>{dispensaryName}</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button variant="outline" size="sm" className="gap-2">
                        {fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                        {zipCode}
                    </Button>
                </div>
            </div>

            {/* 2. KPI Row */}
            <CustomerKPIs data={{
                rewards: liveData?.rewards,
                deals: liveData?.deals,
                favorites: liveData?.favorites,
                activeOrder: liveData?.activeOrder
            }} />

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
                <div className="lg:col-span-2 space-y-6">
                    {/* Refer a Friend */}
                    <div className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="font-semibold">Refer a Friend</h3>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Earn $10</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Invite friends to join BakedBot. You'll get $10 credit for each friend who verifies.
                        </p>
                        <InvitationsList allowedRoles={['customer']} />
                    </div>

                    <CustomerRightRail />
                </div>
            </div>

            {/* 6. Sticky Bottom Bar (View Cart) */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 shadow-lg z-50">
                <div className="container flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Total ({liveData?.cart?.itemCount ?? 0} items)</span>
                            <span className="font-bold text-lg">${(liveData?.cart?.total ?? 0).toFixed(2)}</span>
                        </div>
                        {liveData?.cart?.hasDealApplied && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 gap-1 hidden sm:flex">
                            <CheckCircle className="h-3 w-3" />
                            Best deal applied
                        </Badge>
                        )}
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
