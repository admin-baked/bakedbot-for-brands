'use client';

/**
 * POS Sync Status Indicator
 *
 * Shows the status of POS data synchronization
 * - Last sync time
 * - Sync status (success/failed)
 * - Manual sync trigger button
 * - Auto-refresh indicator
 */

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export interface POSSyncStatusProps {
    orgId: string;
    dataType: 'customers' | 'orders' | 'products';
    className?: string;
}

interface SyncStatus {
    lastSync?: Date;
    status: 'idle' | 'syncing' | 'success' | 'error';
    error?: string;
    count?: number;
}

export function POSSyncStatus({ orgId, dataType, className }: POSSyncStatusProps) {
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        status: 'idle',
    });
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Load sync status from localStorage
    useEffect(() => {
        const key = `pos_sync_${orgId}_${dataType}`;
        const stored = localStorage.getItem(key);

        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setSyncStatus({
                    ...parsed,
                    lastSync: parsed.lastSync ? new Date(parsed.lastSync) : undefined,
                });
            } catch {
                // Ignore invalid data
            }
        }
    }, [orgId, dataType]);

    // Save sync status to localStorage
    const updateSyncStatus = (status: Partial<SyncStatus>) => {
        const newStatus = { ...syncStatus, ...status };
        setSyncStatus(newStatus);

        const key = `pos_sync_${orgId}_${dataType}`;
        localStorage.setItem(key, JSON.stringify(newStatus));
    };

    // Trigger manual sync
    const handleManualSync = async () => {
        setIsRefreshing(true);
        updateSyncStatus({ status: 'syncing' });

        try {
            const response = await fetch(`/api/cron/pos-sync?orgId=${orgId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret-change-in-production'}`,
                },
            });

            if (!response.ok) {
                throw new Error('Sync failed');
            }

            const result = await response.json();

            updateSyncStatus({
                status: 'success',
                lastSync: new Date(),
                count: result.details?.[0]?.customersCount || result.details?.[0]?.ordersCount,
            });

            // Reload the page to show fresh data
            window.location.reload();
        } catch (error: any) {
            updateSyncStatus({
                status: 'error',
                error: error.message,
            });
        } finally {
            setIsRefreshing(false);
        }
    };

    const getStatusIcon = () => {
        switch (syncStatus.status) {
            case 'syncing':
                return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
            case 'success':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'error':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-400" />;
        }
    };

    const getStatusText = () => {
        if (syncStatus.status === 'syncing') {
            return 'Syncing...';
        }

        if (!syncStatus.lastSync) {
            return 'Never synced';
        }

        return `Updated ${formatDistanceToNow(syncStatus.lastSync, { addSuffix: true })}`;
    };

    const getStatusBadge = () => {
        if (syncStatus.status === 'syncing') {
            return <Badge variant="outline" className="border-blue-500 text-blue-600">Syncing</Badge>;
        }

        if (syncStatus.status === 'error') {
            return <Badge variant="destructive">Sync Failed</Badge>;
        }

        if (syncStatus.status === 'success' && syncStatus.lastSync) {
            const minutesAgo = Math.floor((Date.now() - syncStatus.lastSync.getTime()) / 60000);

            if (minutesAgo < 5) {
                return <Badge variant="default" className="bg-green-500">Live</Badge>;
            } else if (minutesAgo < 30) {
                return <Badge variant="outline" className="border-green-500 text-green-600">Recent</Badge>;
            }
        }

        return <Badge variant="outline" className="border-gray-300 text-gray-600">Stale</Badge>;
    };

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                            {getStatusIcon()}
                            <span className="text-sm text-gray-600">
                                {getStatusText()}
                            </span>
                            {getStatusBadge()}
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="space-y-1">
                            <p className="font-medium">POS Sync Status</p>
                            {syncStatus.lastSync && (
                                <p className="text-xs">
                                    Last synced: {syncStatus.lastSync.toLocaleString()}
                                </p>
                            )}
                            {syncStatus.count && (
                                <p className="text-xs">
                                    {syncStatus.count} {dataType} synced
                                </p>
                            )}
                            {syncStatus.error && (
                                <p className="text-xs text-red-500">
                                    Error: {syncStatus.error}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                                Auto-syncs every 30 minutes
                            </p>
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isRefreshing || syncStatus.status === 'syncing'}
                className="gap-2"
            >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Syncing...' : 'Sync Now'}
            </Button>
        </div>
    );
}
