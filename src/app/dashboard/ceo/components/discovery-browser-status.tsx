'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Globe, 
    CheckCircle2, 
    XCircle, 
    Loader2,
    Zap,
    Monitor,
    CreditCard,
    Activity,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveryStatus {
    isAvailable: boolean;
    devices: Array<{
        id: string;
        name: string;
        online: boolean;
    }>;
    credits: {
        used: number;
        remaining: number;
        plan: string;
    } | null;
    lastCheck: Date | null;
}

/**
 * Discovery Browser Status Widget
 * 
 * Displays the status of browser automation capabilities in the Executive Boardroom.
 * Shows: API availability, connected devices, credit balance.
 */
export function DiscoveryBrowserStatus() {
    const [status, setStatus] = useState<DiscoveryStatus>({
        isAvailable: false,
        devices: [],
        credits: null,
        lastCheck: null,
    });
    const [isLoading, setIsLoading] = useState(false);

    const checkStatus = async () => {
        setIsLoading(true);
        try {
            // Call server action to check status
            const response = await fetch('/api/discovery/status', {
                method: 'GET',
            });
            
            if (response.ok) {
                const data = await response.json();
                setStatus({
                    isAvailable: data.isAvailable,
                    devices: data.devices || [],
                    credits: data.credits,
                    lastCheck: new Date(),
                });
            }
        } catch (error) {
            console.error('Failed to check Discovery status:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const onlineDevices = status.devices.filter(d => d.online);

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "p-1.5 rounded-lg",
                        status.isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    )}>
                        <Globe className="h-4 w-4" />
                    </div>
                    <div>
                        <CardTitle className="text-sm">Discovery Browser</CardTitle>
                        <CardDescription className="text-xs">
                            Autonomous web automation
                        </CardDescription>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={checkStatus}
                    disabled={isLoading}
                >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                </Button>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* API Status */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        API Status
                    </span>
                    <Badge variant={status.isAvailable ? "default" : "destructive"} className="text-xs">
                        {status.isAvailable ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Connected</>
                        ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Offline</>
                        )}
                    </Badge>
                </div>

                {/* Devices */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                        <Monitor className="h-3.5 w-3.5" />
                        Devices
                    </span>
                    <span className="font-medium">
                        {onlineDevices.length} / {status.devices.length} online
                    </span>
                </div>

                {/* Credits */}
                {status.credits && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5" />
                            Credits
                        </span>
                        <span className="font-medium">
                            {status.credits.remaining.toLocaleString()} remaining
                        </span>
                    </div>
                )}

                {/* Device List */}
                {status.devices.length > 0 && (
                    <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Connected Browsers</p>
                        <div className="space-y-1.5">
                            {status.devices.slice(0, 3).map(device => (
                                <div 
                                    key={device.id} 
                                    className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                                >
                                    <span className="truncate max-w-[120px]">{device.name}</span>
                                    <span className={cn(
                                        "h-2 w-2 rounded-full",
                                        device.online ? "bg-green-500" : "bg-gray-300"
                                    )} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Last Check */}
                {status.lastCheck && (
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                        Last checked: {status.lastCheck.toLocaleTimeString()}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * Discovery execution log entry
 */
interface ExecutionLogEntry {
    id: string;
    timestamp: Date;
    tool: string;
    status: 'success' | 'error' | 'pending';
    input: string;
    output?: string;
    creditsUsed?: number;
}

/**
 * Discovery Execution Log Widget
 * 
 * Shows recent browser automation executions.
 */
export function DiscoveryExecutionLog({ limit = 5 }: { limit?: number }) {
    const [logs, setLogs] = useState<ExecutionLogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // In production, this would fetch from Firestore
        setLogs([
            {
                id: '1',
                timestamp: new Date(),
                tool: 'discovery.browserAutomate',
                status: 'success',
                input: 'Go to example.com and extract pricing',
                creditsUsed: 5,
            },
        ]);
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center h-32">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Recent Automations</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No automations yet
                    </p>
                ) : (
                    <div className="space-y-2">
                        {logs.slice(0, limit).map(log => (
                            <div 
                                key={log.id}
                                className="flex items-start justify-between text-xs border-b last:border-0 pb-2 last:pb-0"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        {log.status === 'success' ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                        ) : log.status === 'error' ? (
                                            <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                                        ) : (
                                            <Loader2 className="h-3 w-3 text-blue-500 animate-spin shrink-0" />
                                        )}
                                        <span className="font-medium truncate">{log.tool}</span>
                                    </div>
                                    <p className="text-muted-foreground truncate mt-0.5 pl-[18px]">
                                        {log.input}
                                    </p>
                                </div>
                                <span className="text-muted-foreground shrink-0 ml-2">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
