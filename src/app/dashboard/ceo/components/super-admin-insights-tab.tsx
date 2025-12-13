'use client';

import React from 'react';
import { PopsMetricsWidget } from './pops-metrics-widget';
import { DeeboComplianceWidget } from './deebo-compliance-widget';
import { SuperAdminRightSidebar } from './super-admin-right-sidebar';

export function SuperAdminInsightsTab() {
    return (
        <div className="flex h-full w-full">
            {/* Main Content Area */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Intelligence Dashboard</h2>
                    <p className="text-muted-foreground">
                        Real-time telemetry from Intuition OS agents (Pops & Deebo).
                    </p>
                </div>

                {/* Top Row: Key Widgets */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <PopsMetricsWidget />
                    <DeeboComplianceWidget />

                    {/* Placeholder for Future Widget (e.g. Patterns) */}
                    <div className="rounded-xl border bg-muted/50 p-6 flex flex-col items-center justify-center text-center space-y-2 border-dashed">
                        <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border shadow-sm">
                            <span className="text-xl">🧩</span>
                        </div>
                        <h3 className="font-semibold">Pattern Clusters</h3>
                        <p className="text-sm text-muted-foreground">Pattern visualizations coming soon.</p>
                    </div>
                </div>

                {/* Detailed Logs / Data Tables could go here */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="p-6 border-b">
                        <h3 className="font-semibold">Recent Anomalies & Alerts</h3>
                    </div>
                    <div className="p-6 text-sm text-muted-foreground text-center py-12">
                        No recent anomalies found in the last 24 hours.
                    </div>
                </div>
            </div>

            {/* Right Sidebar (Shared) */}
            <SuperAdminRightSidebar />
        </div>
    );
}
