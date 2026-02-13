'use client';

import { PopsMetricsWidget } from './pops-metrics-widget';
import { DeeboComplianceWidget } from './deebo-compliance-widget';
import { SuperAdminRightSidebar } from './super-admin-right-sidebar';
import { Sparkles } from 'lucide-react';

export function SuperAdminInsightsTab() {
    return (
        <div className="flex h-full w-full overflow-hidden">
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                            Intelligence Dashboard
                        </h2>
                        <p className="text-muted-foreground">
                            Internal telemetry (beta). Widgets only show live data when available.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Beta</span>
                    </div>
                </div>

                <div className="grid gap-6 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                    <PopsMetricsWidget />
                    <DeeboComplianceWidget />

                    <div className="rounded-xl border bg-muted/30 border-dashed p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[300px]">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">Pattern Clusters</h3>
                            <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
                                Not configured. Connect a telemetry pipeline to enable anomaly detection.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h3 className="font-semibold">Recent Anomalies & Alerts</h3>
                        <span className="text-xs text-muted-foreground">Last updated: &mdash;</span>
                    </div>
                    <div className="p-12 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                            <svg
                                className="h-6 w-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-foreground">No telemetry configured</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Connect a telemetry source to surface alerts here.
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-80 flex-none border-l bg-background/50 backdrop-blur-sm p-4 overflow-y-auto hidden xl:block">
                <SuperAdminRightSidebar />
            </div>
        </div>
    );
}

