'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Gift,
    Tag,
    Heart,
    Package
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Trophy, Flame, Star, ChevronRight } from 'lucide-react';

interface CustomerKPIData {
    rewards?: { points: number; discount: string; label: string };
    deals?: { count: number; label: string };
    favorites?: { inStock: number; total: number; label: string };
    activeOrder?: { status: string | null; eta: string | null; active: boolean } | null;
    gamification?: {
        streak: number;
        badges: { id: string; name: string; icon: string }[];
        tierProgress: number;
        nextTier: string;
    };
}

export function CustomerKPIs({ data }: { data?: CustomerKPIData }) {
    const stats = {
        rewards: {
            points: data?.rewards?.points ?? 0,
            discount: data?.rewards?.discount || '—',
            label: data?.rewards?.label || 'Start earning'
        },
        deals: {
            count: data?.deals?.count ?? 0,
            label: data?.deals?.label || 'Check back soon'
        },
        favorites: {
            inStock: data?.favorites?.inStock ?? 0,
            total: data?.favorites?.total ?? 0,
            label: data?.favorites?.label || 'Add favorites'
        },
        order: {
            status: data?.activeOrder?.status || 'No active order',
            eta: data?.activeOrder?.eta || 'Place an order',
            active: data?.activeOrder?.active ?? false
        },
        gamification: {
            streak: data?.gamification?.streak ?? 0,
            badges: data?.gamification?.badges || [],
            tierProgress: data?.gamification?.tierProgress ?? 0,
            nextTier: data?.gamification?.nextTier || 'Gold'
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Rewards & Tier Progress */}
                <Card className="relative overflow-hidden border-2 border-emerald-100 dark:border-emerald-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rewards</CardTitle>
                        <Gift className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-emerald-700">{stats.rewards.points}</span>
                            <span className="text-sm font-medium text-muted-foreground">pts</span>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                <span>Progress to {stats.gamification.nextTier}</span>
                                <span>{stats.gamification.tierProgress}%</span>
                            </div>
                            <Progress value={stats.gamification.tierProgress} className="h-1.5 bg-emerald-100" indicatorClassName="bg-emerald-600" />
                        </div>

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="text-green-600 font-medium">
                                {stats.rewards.discount} available
                            </span>
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Achievements / Gamification */}
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-100 dark:border-amber-900/20">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                        <Trophy className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30">
                                <Flame className={cn("h-6 w-6", stats.gamification.streak > 0 ? "text-orange-600 animate-pulse" : "text-slate-400")} />
                            </div>
                            <div>
                                <div className="text-xl font-bold">{stats.gamification.streak} Day Streak</div>
                                <p className="text-[10px] text-muted-foreground">Keep it going!</p>
                            </div>
                        </div>
                        <div className="flex -space-x-2 overflow-hidden py-1">
                            {stats.gamification.badges.length > 0 ? (
                                stats.gamification.badges.map((badge, i) => (
                                    <div key={badge.id} title={badge.name} className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-white shadow-sm ring-1 ring-amber-100">
                                        <span className="text-sm text-amber-600">{badge.icon}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No badges yet</p>
                            )}
                            {stats.gamification.badges.length > 3 && (
                                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-slate-100 text-[10px] font-bold">
                                    +{stats.gamification.badges.length - 3}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Deals for You */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Deals for You</CardTitle>
                        <Tag className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.deals.count}</div>
                        <p className="text-xs text-muted-foreground flex items-center justify-between">
                            {stats.deals.label}
                            <ChevronRight className="h-3 w-3" />
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Order Status */}
                <Card className={cn(
                    "border-l-4",
                    stats.order.active ? "border-l-blue-500 bg-blue-50/10" : "border-l-slate-200"
                )}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Order Status</CardTitle>
                        <Package className={cn("h-4 w-4", stats.order.active ? "text-blue-600" : "text-muted-foreground")} />
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-lg font-bold truncate", stats.order.active ? "text-blue-700" : "text-muted-foreground")}>
                            {stats.order.status}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.order.eta}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
