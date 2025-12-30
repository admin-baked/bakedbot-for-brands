'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ShoppingBag,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock
} from 'lucide-react';

interface DispensaryKPIData {
    ordersToday?: { value: number; trend: string; label: string };
    revenueToday?: { value: string; trend: string; label: string };
    conversion?: { value: string; trend: string; label: string };
    compliance?: { status: 'ok' | 'warning' | 'critical'; warnings: number; lastScan: string };
}

export function DispensaryKPIs({ data }: { data?: DispensaryKPIData }) {
    const stats = {
        orders: { 
            value: data?.ordersToday?.value ?? 0, 
            trend: data?.ordersToday?.trend || '—', 
            label: data?.ordersToday?.label || 'vs. yesterday' 
        },
        revenue: { 
            value: data?.revenueToday?.value || '$0', 
            trend: data?.revenueToday?.trend || '—', 
            label: data?.revenueToday?.label || 'Gross Sales' 
        },
        conversion: { 
            value: data?.conversion?.value || '—', 
            trend: data?.conversion?.trend || '—', 
            label: data?.conversion?.label || 'Menu to Checkout' 
        },
        compliance: { 
            status: data?.compliance?.status || 'ok', 
            warnings: data?.compliance?.warnings ?? 0, 
            lastScan: data?.compliance?.lastScan || 'Never' 
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Orders Today */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.orders.value}</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="text-green-500 font-medium">{stats.orders.trend}</span> {stats.orders.label}
                    </p>
                </CardContent>
            </Card>

            {/* 2. Revenue Today */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.revenue.value}</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="text-green-500 font-medium">{stats.revenue.trend}</span> {stats.revenue.label}
                    </p>
                </CardContent>
            </Card>

            {/* 3. Conversion */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.conversion.value}</div>
                    <p className="text-xs text-muted-foreground">
                        <span className="text-red-500 font-medium">{stats.conversion.trend}</span> {stats.conversion.label}
                    </p>
                </CardContent>
            </Card>

            {/* 4. Compliance Status */}
            <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold text-amber-600">Review</span>
                        <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700">
                            {stats.compliance.warnings} Warnings
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Scanned {stats.compliance.lastScan}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
