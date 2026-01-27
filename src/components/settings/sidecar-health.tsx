'use client';

/**
 * Sidecar Health Check Component
 *
 * Displays connection status and health of the Python sidecar for heavy tasks.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface SidecarHealth {
    healthy: boolean;
    version?: string;
    uptime?: number;
    error?: string;
}

export function SidecarHealthCheck() {
    const [health, setHealth] = useState<SidecarHealth | null>(null);
    const [isChecking, setIsChecking] = useState(false);

    const checkHealth = async () => {
        setIsChecking(true);
        try {
            const response = await fetch('/api/sidecar/health');
            const data = await response.json();
            setHealth(data);
        } catch (error) {
            setHealth({
                healthy: false,
                error: 'Failed to connect to sidecar',
            });
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        checkHealth();
        // Check every 30 seconds
        const interval = setInterval(checkHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Python Sidecar
                            {health && (
                                health.healthy ? (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Healthy
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Offline
                                    </Badge>
                                )
                            )}
                        </CardTitle>
                        <CardDescription>
                            Status of remote research and analysis server
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={checkHealth}
                        disabled={isChecking}
                    >
                        {isChecking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!health ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : health.healthy ? (
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Version</span>
                            <span className="font-mono">{health.version || 'Unknown'}</span>
                        </div>
                        {health.uptime && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Uptime</span>
                                <span className="font-mono">{formatUptime(health.uptime)}</span>
                            </div>
                        )}
                        <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 border border-green-500/20">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                            <div className="text-sm text-green-700">
                                <p className="font-medium">Sidecar is operational</p>
                                <p className="text-green-600/80">
                                    Heavy research tasks (Big Worm, NotebookLM) are running remotely.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <div className="text-sm text-amber-700">
                                <p className="font-medium">Sidecar unavailable</p>
                                <p className="text-amber-600/80">
                                    {health.error || 'Unable to connect to remote server'}
                                </p>
                            </div>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-2">
                            <p>
                                <strong>Impact:</strong> Heavy research tasks will run locally, which may cause slower response times.
                            </p>
                            <p>
                                <strong>Solution:</strong> Check that <code>PYTHON_SIDECAR_ENDPOINT</code> is configured and the sidecar server is running.
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
