'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export function DeeboComplianceWidget({
    complianceScore,
    openAlerts = []
}: {
    complianceScore?: number;
    openAlerts?: Array<{ title: string; severity: 'info' | 'medium' | 'critical' }>;
}) {

    const hasScore = typeof complianceScore === 'number' && Number.isFinite(complianceScore);
    const scoreValue = hasScore ? Math.max(0, Math.min(100, complianceScore)) : null;
    const displayAlerts = Array.isArray(openAlerts) ? openAlerts : [];

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
                    <Badge variant={hasScore ? (scoreValue! < 90 ? 'destructive' : 'secondary') : 'outline'} className="px-3 py-1">
                        {hasScore ? `${scoreValue}% Score` : 'No Telemetry'}
                    </Badge>
                </div>
                <CardDescription>Compliance telemetry (shows real data only)</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {/* Score Visual */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-muted-foreground">System Health</span>
                            <span className={hasScore ? (scoreValue! < 90 ? 'text-red-500' : 'text-green-600') : 'text-muted-foreground'}>
                                {hasScore ? `${scoreValue}/100` : 'N/A'}
                            </span>
                        </div>
                        <div className="relative w-full h-3 bg-secondary rounded-full overflow-hidden shadow-inner">
                            {hasScore && (
                                <div
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-1000 ease-out"
                                    style={{ width: `${scoreValue}%` }}
                                />
                            )}
                        </div>
                        {!hasScore && (
                            <p className="text-xs text-muted-foreground">
                                No compliance scans have been configured for the platform yet.
                            </p>
                        )}
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
                            <div className="text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg border flex items-center justify-center gap-2">
                                <ShieldCheck className="h-5 w-5" />
                                <span className="font-medium">No alerts</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
