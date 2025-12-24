'use client';

import React from 'react';
import { PopsMetricsWidget } from './pops-metrics-widget';
import { DeeboComplianceWidget } from './deebo-compliance-widget';
import { SuperAdminRightSidebar } from './super-admin-right-sidebar';
import { Sparkles } from 'lucide-react';

export function SuperAdminInsightsTab() {
    return (
        <div className="flex h-full w-full overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                            Intelligence Dashboard
                        </h2>
                        <p className="text-muted-foreground">
                            Real-time telemetry from Intuition OS agents.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-xs font-medium">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Premium Features Active</span>
                    </div>
                </div>

                {/* Top Row: Key Widgets */}
                <div className="grid gap-6 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                    <PopsMetricsWidget />
                    <DeeboComplianceWidget />

                    {/* Placeholder for Future Widget (e.g. Patterns) */}
                    <div className="rounded-xl border bg-muted/30 border-dashed p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
                        <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center border shadow-sm animate-pulse">
                            <span className="text-3xl">🧩</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">Pattern Clusters</h3>
                            <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                                Advanced pattern recognition & anomaly visualization engine coming soon.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Detailed Logs / Data Tables could go here */}
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h3 className="font-semibold">Recent Anomalies & Alerts</h3>
                        <span className="text-xs text-muted-foreground">Last updated: Just now</span>
                    </div>
                    <div className="p-12 text-center">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
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
                        <h3 className="text-lg font-medium text-foreground">All Systems Nominal</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            No active anomalies detected in the last 24 hours. Pops is monitoring 24/7.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Sidebar (Shared) - Constrained Width */}
            <div className="w-80 flex-none border-l bg-background/50 backdrop-blur-sm p-4 overflow-y-auto hidden xl:block">
                <SuperAdminRightSidebar />
            </div>
        </div>
    );
}

