'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    RefreshCw,
    Zap,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    TrendingUp,
    Info,
} from 'lucide-react';
import {
    getGLMUsageAction,
    setGLMProviderAction,
} from '@/server/actions/glm-actions';
import type { GLMUsageStatus } from '@/server/services/glm-usage';
import { logger } from '@/lib/logger';

// Helper to format numbers
const fmt = (n: number) => new Intl.NumberFormat().format(n);
const fmtPct = (n: number) => `${n}%`;

export default function GLMSettingsTab() {
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);
    const [data, setData] = useState<GLMUsageStatus | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getGLMUsageAction();
            if (result.success && result.data) {
                setData(result.data);
            }
        } catch (error) {
            logger.error('[GLMSettingsTab] Failed to load GLM usage', {
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleProviderSwitch = async (newProvider: 'glm' | 'anthropic') => {
        if (newProvider === data?.provider) return;
        setSwitching(true);
        try {
            const result = await setGLMProviderAction(newProvider);
            if (result.success) {
                await loadData();
            }
        } catch (error) {
            logger.error('[GLMSettingsTab] Failed to switch provider', {
                provider: newProvider,
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setSwitching(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Calculate days until reset
    const daysUntilReset = data ? Math.floor((data.cycleEnd - Date.now()) / (24 * 60 * 60 * 1000)) : 0;

    // Color coding based on usage
    const getUsageColor = (percent: number) => {
        if (percent >= 90) return 'text-red-600';
        if (percent >= 75) return 'text-amber-600';
        return 'text-green-600';
    };

    const getUsageBgColor = (percent: number) => {
        if (percent >= 90) return 'bg-red-100';
        if (percent >= 75) return 'bg-amber-100';
        return 'bg-green-100';
    };

    if (loading && !data) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">AI Model Settings</h2>
                    <p className="text-muted-foreground">
                        Manage GLM vs Anthropic model provider and monitor usage.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={loadData}
                    disabled={loading}
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </div>

            {/* Provider Toggle Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        Active Provider
                    </CardTitle>
                    <CardDescription>
                        Switch between GLM (z.ai) and Anthropic based on usage and availability.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between py-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`h-4 w-4 rounded-full ${data?.provider === 'glm' ? 'bg-purple-500' : 'bg-gray-400'}`}
                                />
                                <div className="flex flex-col">
                                    <span className="font-semibold">{data?.provider === 'glm' ? 'GLM (z.ai)' : 'Anthropic'}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {data?.provider === 'glm' ? 'Cost-optimized models' : 'Premium quality'}
                                    </span>
                                </div>
                            </div>
                            {data?.provider === 'glm' && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    Reset in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                        <Button
                            variant={data?.provider === 'glm' ? 'destructive' : 'default'}
                            onClick={() => handleProviderSwitch(data?.provider === 'glm' ? 'anthropic' : 'glm')}
                            disabled={switching}
                        >
                            {switching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Switch'}
                            {data?.provider === 'glm' ? 'to Anthropic' : 'to GLM'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Usage Overview Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        GLM Usage Overview
                    </CardTitle>
                    <CardDescription>
                        Current cycle usage and limits. GLM is active for cost optimization.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-4">
                        {/* Usage Gauge */}
                        <div className="md:col-span-2 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Used</span>
                                <span className={`text-2xl font-bold ${getUsageColor(data?.percentUsed || 0)}`}>
                                    {fmtPct(data?.percentUsed || 0)}
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${getUsageBgColor(data?.percentUsed || 0)}`}
                                    style={{ width: `${data?.percentUsed || 0}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-2 text-sm">
                                <span className="text-muted-foreground">Limit: {fmt(data?.limit || 0)}</span>
                                <span className="text-muted-foreground">Remaining: {fmt(data?.remaining || 0)}</span>
                            </div>
                        </div>

                        {/* Call Count */}
                        <div className="md:col-span-2 space-y-2">
                            <div className="text-sm font-medium">Calls This Cycle</div>
                            <div className="text-3xl font-bold text-primary">
                                {fmt(data?.used || 0)}
                            </div>
                        </div>
                    </div>

                    {/* Cycle Info */}
                    <div className="mt-6 pt-4 border-t">
                        <div className="grid gap-4 md:grid-cols-2 text-sm">
                            <div>
                                <div className="text-muted-foreground">Cycle Start</div>
                                <div className="font-medium">
                                    {data?.cycleStart
                                        ? new Date(data.cycleStart).toLocaleDateString()
                                        : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Cycle End</div>
                                <div className="font-medium">
                                    {data?.cycleEnd
                                        ? new Date(data.cycleEnd).toLocaleDateString()
                                        : 'N/A'}
                                </div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Last Updated</div>
                                <div className="font-medium">
                                    {data?.lastUpdated
                                        ? new Date(data.lastUpdated).toLocaleString()
                                        : 'N/A'}
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Alert Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Alert Settings
                    </CardTitle>
                    <CardDescription>
                        Configure when to receive alerts about GLM usage.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium">90% Usage Alert</div>
                                <div className="text-sm text-muted-foreground">
                                    Get notified when GLM usage reaches 90%
                                </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                                Coming Soon
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div>
                                <div className="font-medium">Cycle Reset Reminder</div>
                                <div className="text-sm text-muted-foreground">
                                    Get notified when GLM cycle resets
                                </div>
                            </div>
                            <Badge variant="outline" className="ml-2">
                                Coming Soon
                            </Badge>
                        </div>
                    </div>
                    {/* Info Box */}
                    <div className="mt-4 p-4 bg-muted/30 rounded-md">
                        <div className="flex items-start gap-2 text-sm">
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                            <div>
                                <div className="font-medium mb-1">How Switching Works</div>
                                <p className="text-muted-foreground">
                                    Switching the provider here updates your preference in Firestore.
                                    Actual API switching requires updating the
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">ZAI_API_KEY</code>
                                    environment variable in apphosting.yaml.
                                    To enable GLM: Set a valid API key. To enable Anthropic:
                                    Remove or comment out the ZAI_API_KEY secret.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Banner */}
            {data?.provider === 'glm' && data?.percentUsed >= 90 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                    <div>
                        <div className="font-semibold text-amber-900 mb-1">
                            GLM usage at {fmtPct(data.percentUsed)}%
                        </div>
                        <div className="text-sm text-amber-800">
                            Consider switching to Anthropic to avoid service interruption.
                        </div>
                    </div>
                    <Button
                        variant="destructive"
                        onClick={() => handleProviderSwitch('anthropic')}
                        disabled={switching}
                    >
                        {switching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Switch to Anthropic Now'}
                    </Button>
                </div>
            )}

            {data?.provider === 'anthropic' && (
                <div className="rounded-lg border border-green-300 bg-green-50 p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div>
                        <div className="font-semibold text-green-900 mb-1">
                            Currently using Anthropic
                        </div>
                        <div className="text-sm text-green-800">
                            GLM is disabled. Switch back to GLM when cycle resets for cost savings.
                        </div>
                    </div>
                    <Button
                        variant="default"
                        onClick={() => handleProviderSwitch('glm')}
                        disabled={switching}
                    >
                        {switching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 'Switch Back to GLM'}
                    </Button>
                </div>
            )}
        </div>
    );
}
