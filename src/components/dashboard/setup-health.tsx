'use client';

/**
 * Setup Health Component
 * Shows 4 key status tiles: Data Connected, Publishing Live, Compliance Ready, Delivery Channels
 */

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Globe, Shield, Mail, Loader2, AlertCircle } from 'lucide-react';
import type { SetupHealth as SetupHealthType, SetupHealthStatus, UserRole } from '@/types/agent-workspace';
import { getSetupHealth } from '@/server/actions/setup-health';
import { useUserRole } from '@/hooks/use-user-role';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<SetupHealthStatus, string> = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
};

const STATUS_TEXT_COLORS: Record<SetupHealthStatus, string> = {
    green: 'text-green-700 dark:text-green-400',
    yellow: 'text-yellow-700 dark:text-yellow-400',
    red: 'text-red-700 dark:text-red-400'
};

interface HealthTileProps {
    title: string;
    icon: React.ReactNode;
    status: SetupHealthStatus;
    message: string;
    action: string;
    onActionClick: () => void;
}

function HealthTile({ title, icon, status, message, action, onActionClick }: HealthTileProps) {
    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="font-semibold text-sm">{title}</h3>
                    </div>
                    <div className={cn("h-2 w-2 rounded-full", STATUS_COLORS[status])} />
                </div>

                <p className={cn("text-xs mb-3", STATUS_TEXT_COLORS[status])}>
                    {message}
                </p>

                {status !== 'green' && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={onActionClick}
                    >
                        Fix It
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

interface SetupHealthProps {
    onActionClick?: (action: string) => void;
}

export function SetupHealth({ onActionClick }: SetupHealthProps) {
    const { user, role } = useUserRole();
    const [health, setHealth] = useState<SetupHealthType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchHealth() {
            if (!user?.uid || !role) return;

            try {
                setLoading(true);
                const data = await getSetupHealth(user.uid, role as UserRole);
                setHealth(data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch setup health:', err);
                setError('Unable to load setup health');
            } finally {
                setLoading(false);
            }
        }

        fetchHealth();
    }, [user?.uid, role]);

    const handleActionClick = (action: string) => {
        if (onActionClick) {
            onActionClick(action);
        } else {
            // Default: scroll to chat and insert prompt
            console.log('Action clicked:', action);
            // TODO: Implement default action handling
        }
    };

    if (loading) {
        return (
            <div className="space-y-3">
                <h2 className="text-lg font-semibold mb-4">Setup Health</h2>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (error || !health) {
        return (
            <div className="space-y-3">
                <h2 className="text-lg font-semibold mb-4">Setup Health</h2>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <p className="text-sm">{error || 'Unable to load status'}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h2 className="text-lg font-semibold mb-4">Setup Health</h2>

            <HealthTile
                title="Data Connected"
                icon={<Database className="h-4 w-4 text-primary" />}
                status={health.dataConnected.status}
                message={health.dataConnected.message}
                action={health.dataConnected.action}
                onActionClick={() => handleActionClick(health.dataConnected.action)}
            />

            <HealthTile
                title="Publishing Live"
                icon={<Globe className="h-4 w-4 text-primary" />}
                status={health.publishingLive.status}
                message={health.publishingLive.message}
                action={health.publishingLive.action}
                onActionClick={() => handleActionClick(health.publishingLive.action)}
            />

            <HealthTile
                title="Compliance Ready"
                icon={<Shield className="h-4 w-4 text-primary" />}
                status={health.complianceReady.status}
                message={health.complianceReady.message}
                action={health.complianceReady.action}
                onActionClick={() => handleActionClick(health.complianceReady.action)}
            />

            <HealthTile
                title="Delivery Channels"
                icon={<Mail className="h-4 w-4 text-primary" />}
                status={health.deliveryChannels.status}
                message={health.deliveryChannels.message}
                action={health.deliveryChannels.action}
                onActionClick={() => handleActionClick(health.deliveryChannels.action)}
            />
        </div>
    );
}
