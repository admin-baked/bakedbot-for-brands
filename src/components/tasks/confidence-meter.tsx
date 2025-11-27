
// Confidence Meter Component - shows and animates confidence scores

'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConfidenceMeterProps {
    score: number; // 0-1
    previousScore?: number;
    showTrend?: boolean;
    size?: 'sm' | 'md' | 'lg';
    label?: string;
    deeboApproved?: boolean;
}

export function ConfidenceMeter({
    score,
    previousScore,
    showTrend = true,
    size = 'md',
    label,
    deeboApproved = false
}: ConfidenceMeterProps) {
    const [animatedScore, setAnimatedScore] = useState(previousScore || 0);

    useEffect(() => {
        // Animate score change
        const duration = 1000;
        const steps = 60;
        const increment = (score - animatedScore) / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            setAnimatedScore(prev => {
                const newScore = prev + increment;
                if (currentStep >= steps) {
                    clearInterval(interval);
                    return score;
                }
                return newScore;
            });
        }, duration / steps);

        return () => clearInterval(interval);
    }, [score, animatedScore]);

    const percentage = Math.round(animatedScore * 100);
    const trend = previousScore !== undefined ? score - previousScore : 0;

    // Color based on score
    const getColor = (score: number) => {
        if (score >= 0.9) return 'text-green-600 dark:text-green-400';
        if (score >= 0.7) return 'text-blue-600 dark:text-blue-400';
        if (score >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getBarColor = (score: number) => {
        if (score >= 0.9) return 'bg-green-600';
        if (score >= 0.7) return 'bg-blue-600';
        if (score >= 0.5) return 'bg-yellow-600';
        return 'bg-red-600';
    };

    const sizeClasses = {
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4'
    };

    return (
        <div className="space-y-2">
            {/* Label and Score */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {label && <span className="text-sm font-medium">{label}</span>}
                    {deeboApproved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Deebo Approved
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className={cn('text-lg font-bold tabular-nums', getColor(animatedScore))}>
                        {percentage}%
                    </span>

                    {showTrend && trend !== 0 && (
                        <span className={cn(
                            'inline-flex items-center gap-0.5 text-xs font-medium',
                            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600'
                        )}>
                            {trend > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                            ) : trend < 0 ? (
                                <TrendingDown className="h-3 w-3" />
                            ) : (
                                <Minus className="h-3 w-3" />
                            )}
                            {Math.abs(Math.round(trend * 100))}%
                        </span>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                    className={cn(
                        sizeClasses[size],
                        getBarColor(animatedScore),
                        'transition-all duration-500 ease-out rounded-full'
                    )}
                    style={{ width: `${percentage}%` }}
                >
                    {/* Shimmer effect for high confidence */}
                    {animatedScore >= 0.9 && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                    )}
                </div>
            </div>

            {/* Confidence Level Label */}
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                    {animatedScore >= 0.9 ? 'Very High' :
                        animatedScore >= 0.7 ? 'High' :
                            animatedScore >= 0.5 ? 'Medium' : 'Low'}
                </span>
                <span className="text-xs text-muted-foreground">
                    {animatedScore >= 0.9 ? '✓ Ready to execute' :
                        animatedScore >= 0.7 ? 'Review recommended' :
                            'Needs improvement'}
                </span>
            </div>
        </div>
    );
}
