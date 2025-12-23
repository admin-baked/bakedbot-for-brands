'use client';

/**
 * Data Import Notification Dropdown
 * 
 * Shows real-time progress of data imports and sync operations
 * Appears next to the "Live Data" toggle in the dashboard header
 */

import React from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Bell,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Package,
    Building2,
    RefreshCw,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useNotificationStore,
    type IngestionNotification
} from '@/lib/store/notification-store';
import { useDataJobsListener } from '@/lib/firebase/data-jobs-listener';

interface DataImportDropdownProps {
    userId?: string | null;
    className?: string;
}

import { useUser } from '@/hooks/use-user';

export function DataImportDropdown({ userId, className }: DataImportDropdownProps) {
    const { user } = useUser();
    const effectiveUserId = userId || user?.uid;

    // Listen for data job updates
    useDataJobsListener(effectiveUserId);

    const {
        ingestionNotifications,
        hasActiveJobs,
        removeIngestionNotification,
        clearCompletedNotifications
    } = useNotificationStore();

    const activeCount = ingestionNotifications.filter(
        n => n.status === 'pending' || n.status === 'syncing'
    ).length;

    const errorCount = ingestionNotifications.filter(
        n => n.status === 'error'
    ).length;

    const completedCount = ingestionNotifications.filter(
        n => n.status === 'complete'
    ).length;

    const totalCount = ingestionNotifications.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn("relative gap-1.5 h-8", className)}
                >
                    {hasActiveJobs() ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : errorCount > 0 ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                        <Bell className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline text-sm">Imports</span>

                    {/* Badge for active/error count */}
                    {(activeCount > 0 || errorCount > 0) && (
                        <Badge
                            variant={errorCount > 0 ? "destructive" : "default"}
                            className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px]"
                        >
                            {activeCount > 0 ? activeCount : errorCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Data Imports</span>
                    {completedCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={clearCompletedNotifications}
                        >
                            Clear completed
                        </Button>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {totalCount === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No active imports</p>
                        <p className="text-xs mt-1">Data syncs will appear here</p>
                    </div>
                ) : (
                    <div className="max-h-80 overflow-y-auto">
                        {ingestionNotifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onDismiss={() => removeIngestionNotification(notification.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Summary footer */}
                {totalCount > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <div className="p-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {activeCount > 0 && `${activeCount} syncing`}
                                {activeCount > 0 && completedCount > 0 && ' • '}
                                {completedCount > 0 && `${completedCount} complete`}
                                {errorCount > 0 && ` • ${errorCount} failed`}
                            </span>
                            {hasActiveJobs() && (
                                <div className="flex items-center gap-1 text-primary">
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                    <span>Syncing...</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

interface NotificationItemProps {
    notification: IngestionNotification;
    onDismiss: () => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
    const { status, entityName, entityType, message, progress, error } = notification;

    const getStatusIcon = () => {
        switch (status) {
            case 'pending':
            case 'syncing':
                return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
            case 'complete':
                return <CheckCircle2 className="h-4 w-4 text-green-600" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-destructive" />;
        }
    };

    const getEntityIcon = () => {
        return entityType === 'brand'
            ? <Package className="h-3 w-3" />
            : <Building2 className="h-3 w-3" />;
    };

    return (
        <div className={cn(
            "p-3 border-b last:border-0 hover:bg-muted/50 transition-colors",
            status === 'error' && "bg-destructive/5"
        )}>
            <div className="flex items-start gap-3">
                {getStatusIcon()}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{entityName}</span>
                        <Badge variant="outline" className="text-[10px] h-4 gap-0.5 capitalize">
                            {getEntityIcon()}
                            {entityType}
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{message}</p>

                    {/* Progress bar */}
                    {status === 'syncing' && progress !== undefined && (
                        <div className="mt-2">
                            <Progress value={progress} className="h-1" />
                            <span className="text-[10px] text-muted-foreground">{progress}%</span>
                        </div>
                    )}

                    {/* Error message */}
                    {status === 'error' && error && (
                        <p className="text-[10px] text-destructive mt-1 truncate">{error}</p>
                    )}
                </div>

                {/* Dismiss button for completed/error */}
                {(status === 'complete' || status === 'error') && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-50 hover:opacity-100"
                        onClick={onDismiss}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>
        </div>
    );
}
