'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStreakAction } from '@/app/actions/gamification';
import { UserStreak } from '@/types/engagement';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserStreakProps {
    className?: string;
}

export function UserStreakComponent({ className }: UserStreakProps) {
    const [streak, setStreak] = useState<UserStreak | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadStreak() {
            const result = await getStreakAction();
            if (result.success && result.data) {
                setStreak(result.data);
            }
            setLoading(false);
        }
        loadStreak();
    }, []);

    if (loading) {
        return <Skeleton className="h-9 w-16 rounded-full" />;
    }

    if (!streak || streak.currentStreak === 0) {
        return null;
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-600 font-bold text-sm",
                        className
                    )}>
                        <Flame className="h-4 w-4 fill-orange-500 animate-pulse" />
                        <span>{streak.currentStreak}d</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{streak.currentStreak} day streak! Keep it up. 🔥</p>
                    <p className="text-xs text-muted-foreground">Longest: {streak.longestStreak} days</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
