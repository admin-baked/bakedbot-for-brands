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

export function DispensaryKPIs() {
    // STUB: Real data would come from context or query
    const stats = {
        orders: { value: 42, trend: '+12%', label: 'vs. yesterday' },
        revenue: { value: '$3,240', trend: '+5%', label: 'Gross Sales' },
        conversion: { value: '4.2%', trend: '-0.5%', label: 'Menu to Checkout' },
        compliance: { status: 'warning', critical: 0, warnings: 3, lastScan: '2 hours ago' }
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
