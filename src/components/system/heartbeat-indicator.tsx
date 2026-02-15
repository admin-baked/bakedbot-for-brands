'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface HeartbeatStatus {
    pulse: 'alive' | 'warning' | 'error' | 'unknown';
    timestamp: string | null;
    nextExpected: string | null;
    healthy: boolean;
    schedulesExecuted?: number;
    browserTasksExecuted?: number;
}

export function HeartbeatIndicator({
    showLabel = false,
    showTooltip = true,
    className = '',
}: {
    showLabel?: boolean;
    showTooltip?: boolean;
    className?: string;
}) {
    const [status, setStatus] = useState<HeartbeatStatus>({
        pulse: 'unknown',
        timestamp: null,
        nextExpected: null,
        healthy: false,
    });

    const [isLoading, setIsLoading] = useState(true);

    // Fetch heartbeat status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/system/health');
                const data = await res.json();
                setStatus(data);
                setIsLoading(false);
            } catch (error) {
                console.error('[Heartbeat] Failed to fetch status:', error);
                setStatus({
                    pulse: 'error',
                    timestamp: null,
                    nextExpected: null,
                    healthy: false,
                });
                setIsLoading(false);
            }
        };

        // Initial fetch
        fetchStatus();

        // Poll every 30 seconds
        const interval = setInterval(fetchStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    // Get color based on pulse status
    const getColor = () => {
        switch (status.pulse) {
            case 'alive':
                return {
                    bg: 'bg-green-500',
                    shadow: 'shadow-green-500/50',
                    text: 'text-green-600',
                    label: 'System Healthy',
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-500',
                    shadow: 'shadow-yellow-500/50',
                    text: 'text-yellow-600',
                    label: 'Heartbeat Delayed',
                };
            case 'error':
                return {
                    bg: 'bg-red-500',
                    shadow: 'shadow-red-500/50',
                    text: 'text-red-600',
                    label: 'System Error',
                };
            default:
                return {
                    bg: 'bg-gray-400',
                    shadow: 'shadow-gray-400/50',
                    text: 'text-gray-600',
                    label: 'Status Unknown',
                };
        }
    };

    const colors = getColor();

    // Format timestamp
    const getTimeAgo = () => {
        if (!status.timestamp) return 'Never';

        const timestamp = new Date(status.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins === 1) return '1 minute ago';
        if (diffMins < 60) return `${diffMins} minutes ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours === 1) return '1 hour ago';
        return `${diffHours} hours ago`;
    };

    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse" />
                {showLabel && <span className="text-xs text-gray-500">Loading...</span>}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Pulsing dot */}
            <div className="relative">
                <motion.div
                    className={`w-2 h-2 rounded-full ${colors.bg}`}
                    animate={{
                        opacity: [1, 0.4, 1],
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* Outer ring pulse */}
                {status.pulse === 'alive' && (
                    <motion.div
                        className={`absolute inset-0 rounded-full ${colors.bg} ${colors.shadow}`}
                        animate={{
                            opacity: [0.6, 0, 0.6],
                            scale: [1, 2, 1],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeOut',
                        }}
                    />
                )}
            </div>

            {/* Label */}
            {showLabel && (
                <span className={`text-xs font-medium ${colors.text}`}>
                    {colors.label}
                </span>
            )}

            {/* Tooltip */}
            {showTooltip && (
                <div className="group relative">
                    <button
                        type="button"
                        className="text-xs text-gray-400 hover:text-gray-600"
                        aria-label="Heartbeat details"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </button>

                    {/* Tooltip content */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg w-64">
                            <div className="space-y-1.5">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Status:</span>
                                    <span className="font-medium">{colors.label}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Last Pulse:</span>
                                    <span>{getTimeAgo()}</span>
                                </div>
                                {status.schedulesExecuted !== undefined && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Tasks Executed:</span>
                                        <span>{status.schedulesExecuted + (status.browserTasksExecuted || 0)}</span>
                                    </div>
                                )}
                                {status.nextExpected && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Next Pulse:</span>
                                        <span>{new Date(status.nextExpected).toLocaleTimeString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
