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

    const [tickerIndex, setTickerIndex] = useState(0);
    const activities = [
        "Craig just drafted a win-back email campaign...",
        "Smokey recommended 'Blue Dream' to a customer...",
        "Ezal blocked a competitor price undercut...",
        "Deebo flagged a non-compliant SMS message...",
        "Pops forecasted Q3 inventory needs..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setTickerIndex((prev) => (prev + 1) % activities.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="mt-8 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Live Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-foreground font-bold font-teko text-lg">{stats.pages.toLocaleString()}</span> Pages Live
                </div>
                <div className="hidden sm:block text-border/40">|</div>
                <div>
                    <span className="text-foreground font-bold font-teko text-lg">{stats.brands.toLocaleString()}</span> Brands Tracked
                </div>
                <div className="hidden sm:block text-border/40">|</div>
                <div>
                    <span className="text-foreground font-bold font-teko text-lg">{stats.dispensaries.toLocaleString()}</span> Dispensaries
                </div>
            </div>

            {/* Agent Activity Ticker */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/30 border border-white/5 backdrop-blur-sm text-xs text-muted-foreground animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span key={tickerIndex} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                    {activities[tickerIndex]}
                </span>
            </div>
        </div>
    );
}
