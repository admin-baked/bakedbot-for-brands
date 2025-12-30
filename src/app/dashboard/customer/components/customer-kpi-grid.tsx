'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Gift,
    Tag,
    Heart,
    Package
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CustomerKPIData {
    rewards?: { points: number; discount: string; label: string };
    deals?: { count: number; label: string };
    favorites?: { inStock: number; total: number; label: string };
    activeOrder?: { status: string | null; eta: string | null; active: boolean } | null;
}

export function CustomerKPIs({ data }: { data?: CustomerKPIData }) {
    const stats = {
        rewards: { 
            points: data?.rewards?.points ?? 0, 
            discount: data?.rewards?.discount || '—', 
            label: data?.rewards?.label || 'Start earning' 
        },
        deals: { 
            count: data?.deals?.count ?? 0, 
            label: data?.deals?.label || 'Check back soon' 
        },
        favorites: { 
            inStock: data?.favorites?.inStock ?? 0, 
            total: data?.favorites?.total ?? 0, 
            label: data?.favorites?.label || 'Add favorites' 
        },
        order: { 
            status: data?.activeOrder?.status || 'No active order', 
            eta: data?.activeOrder?.eta || 'Place an order', 
            active: data?.activeOrder?.active ?? false 
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Rewards / Points */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Rewards</CardTitle>
                    <Gift className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{stats.rewards.points}</span>
                        <span className="text-sm font-medium text-muted-foreground">pts</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="text-green-600 font-medium">
                            {stats.rewards.discount} available
                        </span>
                    </p>
                </CardContent>
            </Card>

            {/* 2. Deals for You */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Deals for You</CardTitle>
                    <Tag className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.deals.count}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.deals.label}
                    </p>
                </CardContent>
            </Card>

            {/* 3. Favorites In Stock */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Favorites</CardTitle>
                    <Heart className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{stats.favorites.inStock}</span>
                        <span className="text-sm text-muted-foreground">/ {stats.favorites.total}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stats.favorites.label}
                    </p>
                </CardContent>
            </Card>

            {/* 4. Order Status */}
            <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Order Status</CardTitle>
                    <Package className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold truncate text-emerald-700">
                        {stats.order.status}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {stats.order.eta}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
