'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

export function DeeboComplianceWidget({
    complianceScore = 98,
    openAlerts = []
}: {
    complianceScore?: number;
    openAlerts?: Array<{ title: string; severity: 'info' | 'medium' | 'critical' }>;
}) {

    // Default stub alert if none provided
    const displayAlerts = openAlerts.length > 0 ? openAlerts : [
        { title: "Missing Age Gate on 3 Products", severity: 'medium' }
    ];

    return (
        <Card className="h-full border-l-4 border-l-amber-500 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-amber-500" />
                        Deebo's Watch
                    </CardTitle>
                    <Badge variant={complianceScore < 90 ? "destructive" : "secondary"}>
                        {complianceScore}% Score
                    </Badge>
                </div>
                <CardDescription>Regulatory compliance & safety monitor</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Score Visual */}
                    <div className="flex items-center gap-4">
                        <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-500"
                                style={{ width: `${complianceScore}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">{complianceScore}%</span>
                    </div>

                    {/* Alerts List */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Alerts</p>
                        {displayAlerts.map((alert, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm p-2 rounded-md bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                <span className="text-amber-900 dark:text-amber-200 font-medium">{alert.title}</span>
                            </div>
                        ))}
                        {displayAlerts.length === 0 && (
                            <p className="text-sm text-green-600 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> All Clear
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
