'use client';

import { useState, useEffect } from 'react';
import { getPlatformStats, PlatformStats } from '@/server/actions/stats';

export function LiveStats() {
    const [stats, setStats] = useState<PlatformStats | null>(null);

    useEffect(() => {
        // Fetch initial stats
        getPlatformStats().then(setStats);
    }, []);

    if (!stats) {
        // Skeleton or nothing
        return <div className="h-6 w-full max-w-sm animate-pulse rounded-md bg-muted/20 mx-auto mt-6" />;
    }

    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-foreground font-semibold">{stats.pages.toLocaleString()}</span> Pages Live
            </div>
            <div className="hidden sm:block text-border">|</div>
            <div>
                <span className="text-foreground font-semibold">{stats.brands.toLocaleString()}</span> Brands Tracked
            </div>
            <div className="hidden sm:block text-border">|</div>
            <div>
                <span className="text-foreground font-semibold">{stats.dispensaries.toLocaleString()}</span> Dispensaries
            </div>
        </div>
    );
}
