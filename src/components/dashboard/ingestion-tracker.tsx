'use client';

/**
 * Ingestion Tracker Component
 * 
 * Visual component showing real-time data sync status for newly onboarded entities.
 * Displays progress, status changes, and error recovery options.
 */

import React, { useEffect } from 'react';
import {
    useNotificationStore,
    type IngestionNotification,
    NotificationMessages
} from '@/lib/store/notification-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    X,
    RefreshCw,
    Sparkles,
    Building2,
    Package
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngestionTrackerProps {
    className?: string;
    showCompleted?: boolean;
    autoHideAfterMs?: number;
}

export function IngestionTracker({
    className,
    showCompleted = true,
    autoHideAfterMs = 30000
}: IngestionTrackerProps) {
    const {
        ingestionNotifications,
        removeIngestionNotification,
        clearCompletedNotifications,
        hasActiveJobs
    } = useNotificationStore();

    // Auto-clear completed notifications after delay
    useEffect(() => {
        if (autoHideAfterMs > 0) {
            const timer = setInterval(() => {
                const now = Date.now();
                ingestionNotifications
                    .filter(n => n.status === 'complete')
                    .forEach(n => {
                        if (now - n.updatedAt.getTime() > autoHideAfterMs) {
                            removeIngestionNotification(n.id);
                        }
                    });
            }, 5000);

            return () => clearInterval(timer);
        }
    }, [autoHideAfterMs, ingestionNotifications, removeIngestionNotification]);

    // Filter notifications based on showCompleted
    const visibleNotifications = showCompleted
        ? ingestionNotifications
        : ingestionNotifications.filter(n => n.status !== 'complete');

    if (visibleNotifications.length === 0) {
        return null;
    }

    return (
        <div className={cn("space-y-3", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Setup Progress</span>
                    {hasActiveJobs() && (
                        <Badge variant="secondary" className="text-xs animate-pulse">
                            Syncing...
                        </Badge>
                    )}
                </div>
                {!hasActiveJobs() && ingestionNotifications.length > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={clearCompletedNotifications}
                    >
                        Clear All
                    </Button>
                )}
            </div>

            {/* Notification Cards */}
            {visibleNotifications.map(notification => (
                <IngestionNotificationCard
                    key={notification.id}
                    notification={notification}
                    onDismiss={() => removeIngestionNotification(notification.id)}
                />
            ))}
        </div>
    );
}

interface NotificationCardProps {
    notification: IngestionNotification;
    onDismiss: () => void;
    onRetry?: () => void;
}

function IngestionNotificationCard({ notification, onDismiss, onRetry }: NotificationCardProps) {
    const { status, entityName, entityType, message, progress, error, jobType } = notification;

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
        switch (entityType) {
            case 'brand':
                return <Package className="h-4 w-4 text-muted-foreground" />;
            case 'dispensary':
                return <Building2 className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'pending':
                return 'border-l-amber-500';
            case 'syncing':
                return 'border-l-primary';
            case 'complete':
                return 'border-l-green-500';
            case 'error':
                return 'border-l-destructive';
        }
    };

    return (
        <Card className={cn(
            "border-l-4 transition-all",
            getStatusColor(),
            status === 'complete' && "opacity-80"
        )}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon()}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {getEntityIcon()}
                                <span className="font-medium text-sm truncate">
                                    {entityName}
                                </span>
                                <Badge variant="outline" className="text-xs capitalize">
                                    {entityType}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {message}
                            </p>

                            {/* Progress bar for syncing status */}
                            {(status === 'syncing' && progress !== undefined) && (
                                <div className="mt-2">
                                    <Progress value={progress} className="h-1.5" />
                                    <span className="text-xs text-muted-foreground mt-1">
                                        {progress}% complete
                                    </span>
                                </div>
                            )}

                            {/* Error details */}
                            {status === 'error' && error && (
                                <p className="text-xs text-destructive mt-1 bg-destructive/10 p-2 rounded">
                                    {error}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                        {status === 'error' && onRetry && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={onRetry}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        )}
                        {(status === 'complete' || status === 'error') && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={onDismiss}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Compact version for sidebar or header
export function IngestionTrackerCompact({ className }: { className?: string }) {
    const { ingestionNotifications, hasActiveJobs } = useNotificationStore();

    const activeCount = ingestionNotifications.filter(
        n => n.status === 'pending' || n.status === 'syncing'
    ).length;

    const errorCount = ingestionNotifications.filter(
        n => n.status === 'error'
    ).length;

    if (activeCount === 0 && errorCount === 0) {
        return null;
    }

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border",
            className
        )}>
            {activeCount > 0 && (
                <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span className="text-xs font-medium">
                        {activeCount} syncing
                    </span>
                </div>
            )}
            {errorCount > 0 && (
                <div className="flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-medium text-destructive">
                        {errorCount} failed
                    </span>
                </div>
            )}
        </div>
    );
}
