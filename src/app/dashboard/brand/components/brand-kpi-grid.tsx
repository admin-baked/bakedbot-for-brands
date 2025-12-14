'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Store,
    TrendingUp,
    DollarSign,
    ShieldCheck,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

export function BrandKPIs() {
    // STUB: Real data would come from context or query
    const stats = {
        coverage: { value: 42, trend: '+2', label: 'Stores Carrying' },
        velocity: { value: '18', unit: 'units/wk', trend: '+5%', label: 'Avg per Store' },
        priceIndex: { value: '+6%', status: 'good', label: 'vs. Market Avg' },
        compliance: { approved: 8, blocked: 1, label: 'Active Campaigns' }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Retail Coverage */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Retail Coverage</CardTitle>
                    <Store className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.coverage.value}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="text-green-500 font-medium flex items-center">
                            <ArrowUpRight className="h-3 w-3" /> {stats.coverage.trend}
                        </span>
                        {stats.coverage.label}
                    </p>
                </CardContent>
            </Card>

            {/* 2. Velocity (Sell-Through) */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Velocity</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{stats.velocity.value}</span>
                        <span className="text-sm text-muted-foreground">{stats.velocity.unit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="text-green-500 font-medium flex items-center">
                            <ArrowUpRight className="h-3 w-3" /> {stats.velocity.trend}
                        </span>
                        {stats.velocity.label}
                    </p>
                </CardContent>
            </Card>

            {/* 3. Price Index */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Price Index</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.priceIndex.value}</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.priceIndex.label}
                    </p>
                </CardContent>
            </Card>

            {/* 4. Compliance Status */}
            <Card className={stats.compliance.blocked > 0 ? "border-l-4 border-l-amber-500" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Compliance</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl font-bold">{stats.compliance.approved}</span>
                        {stats.compliance.blocked > 0 && (
                            <Badge variant="outline" className="text-xs border-amber-200 bg-amber-50 text-amber-700 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {stats.compliance.blocked} Blocked
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stats.compliance.label}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
