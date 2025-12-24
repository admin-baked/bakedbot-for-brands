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
        <Card className="h-full border-l-4 border-l-amber-500 shadow-lg shadow-amber-500/5 hover:shadow-amber-500/10 transition-all">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                            <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        Deebo's Watch
                    </CardTitle>
                    <Badge variant={complianceScore < 90 ? "destructive" : "secondary"} className="px-3 py-1">
                        {complianceScore}% Score
                    </Badge>
                </div>
                <CardDescription>Regulatory compliance & safety monitor</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Score Visual */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-muted-foreground">System Health</span>
                            <span className={complianceScore < 90 ? "text-red-500" : "text-green-600"}>{complianceScore}/100</span>
                        </div>
                        <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden shadow-inner">
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000 ease-out"
                                style={{ width: `${complianceScore}%` }}
                            />
                        </div>
                    </div>

                    {/* Alerts List */}
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            Active Alerts
                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">{displayAlerts.length}</Badge>
                        </p>
                        <div className="space-y-2">
                            {displayAlerts.map((alert, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 hover:bg-amber-100/50 transition-colors cursor-pointer">
                                    <div className="p-1 rounded-full bg-amber-200/50 dark:bg-amber-900/50 shrink-0">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                                    </div>
                                    <span className="text-amber-900 dark:text-amber-200 font-medium line-clamp-1">{alert.title}</span>
                                </div>
                            ))}
                        </div>
                        {displayAlerts.length === 0 && (
                            <div className="text-sm text-green-600 bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-100 dark:border-green-900/20 flex items-center justify-center gap-2">
                                <ShieldCheck className="h-5 w-5" /> 
                                <span className="font-medium">All systems compliant</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
