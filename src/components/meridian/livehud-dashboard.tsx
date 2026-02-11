'use client';

/**
 * LiveHud Dashboard Component (MERIDIAN)
 *
 * Real-time visualization of agent cognitive state with adjustable behavior sliders.
 * Inspired by: https://github.com/mattvideoproductions/MERIDIAN_Brain
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    AgentCognitiveState,
    AgentPersonalityMode,
    AgentBehaviorSliders,
    SLIDER_PRESETS,
    PERSONALITY_MODE_DEFINITIONS,
} from '@/types/agent-cognitive-state';
import {
    getAgentCognitiveState,
    setAgentPersonalityMode,
    updateAgentSliders,
    applySliderPreset,
} from '@/server/actions/meridian-intelligence';
import { Activity, Brain, Gauge, MemoryStick, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveHudDashboardProps {
    agentId: string;
    agentName: string;
}

export function LiveHudDashboard({ agentId, agentName }: LiveHudDashboardProps) {
    const [state, setState] = useState<AgentCognitiveState | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Load agent state
    useEffect(() => {
        loadState();
        const interval = setInterval(loadState, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [agentId]);

    const loadState = async () => {
        try {
            const data = await getAgentCognitiveState(agentId);
            setState(data);
        } catch (error) {
            console.error('Failed to load agent state:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePersonalityChange = async (mode: AgentPersonalityMode) => {
        setUpdating(true);
        try {
            const updated = await setAgentPersonalityMode(agentId, mode);
            setState(updated);
        } catch (error) {
            console.error('Failed to update personality:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleSliderChange = async (key: keyof AgentBehaviorSliders, value: number) => {
        if (!state) return;

        // Optimistic update
        setState({
            ...state,
            behaviorSliders: {
                ...state.behaviorSliders,
                [key]: value,
            },
        });

        // Debounced server update
        try {
            const updated = await updateAgentSliders(agentId, { [key]: value });
            setState(updated);
        } catch (error) {
            console.error('Failed to update slider:', error);
            // Revert on error
            loadState();
        }
    };

    const handlePresetApply = async (presetName: string) => {
        setUpdating(true);
        try {
            const updated = await applySliderPreset(agentId, presetName as keyof typeof SLIDER_PRESETS);
            setState(updated);
        } catch (error) {
            console.error('Failed to apply preset:', error);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="flex items-center justify-center">
                        <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!state) {
        return (
            <Card>
                <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                        <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                        <p>No cognitive state found for {agentName}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header: Agent Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Brain className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="text-2xl">{agentName} LiveHud</CardTitle>
                                <CardDescription>Real-time cognitive state monitoring</CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <StatusBadge status={state.status} />
                            <Button variant="outline" size="sm" onClick={loadState}>
                                Refresh
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Main Tabs */}
            <Tabs defaultValue="sliders" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="sliders">Behavior Sliders</TabsTrigger>
                    <TabsTrigger value="context">Context Window</TabsTrigger>
                    <TabsTrigger value="memory">Memory Health</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                {/* Behavior Sliders Tab */}
                <TabsContent value="sliders" className="space-y-6">
                    {/* Personality Mode Selector */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Personality Mode</CardTitle>
                            <CardDescription>
                                Switch between pre-configured personality modes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    value={state.personalityMode}
                                    onValueChange={(v) => handlePersonalityChange(v as AgentPersonalityMode)}
                                    disabled={updating}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.values(PERSONALITY_MODE_DEFINITIONS).map((mode) => (
                                            <SelectItem key={mode.mode} value={mode.mode}>
                                                {mode.icon} {mode.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* Preset Selector */}
                                <Select onValueChange={handlePresetApply} disabled={updating}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Apply Preset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.keys(SLIDER_PRESETS)
                                            .filter((key) => key.startsWith(agentName.toLowerCase()))
                                            .map((key) => (
                                                <SelectItem key={key} value={key}>
                                                    {key.split('_').slice(1).join(' ')}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                {PERSONALITY_MODE_DEFINITIONS[state.personalityMode].description}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Behavior Sliders */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Behavior Configuration</CardTitle>
                            <CardDescription>
                                Adjust agent behavior parameters (0-100 scale)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {Object.entries(state.behaviorSliders).map(([key, value]) => (
                                <SliderControl
                                    key={key}
                                    label={key}
                                    value={value}
                                    onChange={(v) => handleSliderChange(key as keyof AgentBehaviorSliders, v)}
                                    disabled={updating}
                                />
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Context Window Tab */}
                <TabsContent value="context" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Context Window Usage</CardTitle>
                            <CardDescription>Real-time token usage and memory retrieval metrics</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Token Usage Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Token Usage</span>
                                    <span className="font-mono">
                                        {state.contextWindow.tokensUsed.toLocaleString()} / {state.contextWindow.tokensAvailable.toLocaleString()}
                                    </span>
                                </div>
                                <Progress value={state.contextWindow.utilizationPercent} />
                                <p className="text-xs text-muted-foreground">
                                    {state.contextWindow.utilizationPercent.toFixed(1)}% utilized
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <StatCard
                                    icon={MemoryStick}
                                    label="Messages Loaded"
                                    value={state.contextWindow.messagesLoaded.toString()}
                                />
                                <StatCard
                                    icon={Activity}
                                    label="Memory Retrievals"
                                    value={state.contextWindow.memoryRetrievals.toString()}
                                />
                            </div>

                            {state.contextWindow.lastMemoryGarden && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>
                                        Last memory garden: {new Date(state.contextWindow.lastMemoryGarden).toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cognitive Load */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Cognitive Load</CardTitle>
                            <CardDescription>Current processing metrics</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span>Current Load</span>
                                <LoadBadge load={state.cognitiveLoad.currentLoad} />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <StatCard
                                    icon={Activity}
                                    label="Active Tools"
                                    value={state.cognitiveLoad.activeToolCalls.toString()}
                                />
                                <StatCard
                                    icon={Clock}
                                    label="Queued Requests"
                                    value={state.cognitiveLoad.queuedRequests.toString()}
                                />
                                <StatCard
                                    icon={Gauge}
                                    label="Avg Response"
                                    value={`${state.cognitiveLoad.avgResponseTimeMs.toFixed(0)}ms`}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Memory Health Tab */}
                <TabsContent value="memory" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Memory Health Score</CardTitle>
                            <CardDescription>Overall memory system health (0-100)</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-center">
                                <div className="relative h-32 w-32">
                                    <svg className="h-full w-full" viewBox="0 0 100 100">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            className="text-muted"
                                        />
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="10"
                                            strokeDasharray={`${state.memoryHealth.healthScore * 2.827} 282.7`}
                                            strokeDashoffset="0"
                                            className={cn(
                                                'transition-all',
                                                state.memoryHealth.healthScore >= 80 && 'text-green-500',
                                                state.memoryHealth.healthScore >= 60 && state.memoryHealth.healthScore < 80 && 'text-yellow-500',
                                                state.memoryHealth.healthScore < 60 && 'text-red-500'
                                            )}
                                            transform="rotate(-90 50 50)"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-3xl font-bold">
                                            {state.memoryHealth.healthScore}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <StatCard
                                    icon={MemoryStick}
                                    label="Total Memories"
                                    value={state.memoryHealth.totalMemories.toString()}
                                />
                                <StatCard
                                    icon={AlertCircle}
                                    label="Stale Memories"
                                    value={state.memoryHealth.staleMemories.toString()}
                                    alert={state.memoryHealth.staleMemories > 10}
                                />
                                <StatCard
                                    icon={AlertCircle}
                                    label="Conflicts"
                                    value={state.memoryHealth.conflictsDetected.toString()}
                                    alert={state.memoryHealth.conflictsDetected > 0}
                                />
                                <StatCard
                                    icon={Clock}
                                    label="Last Gardening"
                                    value={
                                        state.memoryHealth.lastGardeningRun
                                            ? new Date(state.memoryHealth.lastGardeningRun).toLocaleDateString()
                                            : 'Never'
                                    }
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Performance Tab */}
                <TabsContent value="performance" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Response Quality Metrics</CardTitle>
                            <CardDescription>Confidence and completeness tracking</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Average Confidence</span>
                                    <span className="font-mono">
                                        {(state.averageConfidence * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <Progress value={state.averageConfidence * 100} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Completeness Score</span>
                                    <span className="font-mono">
                                        {(state.completenessScore * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <Progress value={state.completenessScore * 100} />
                            </div>

                            {state.lastResponseConfidence !== null && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Last Response Confidence</span>
                                        <span className="font-mono">
                                            {(state.lastResponseConfidence * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <Progress value={state.lastResponseConfidence * 100} />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Uptime & Activity</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Status</span>
                                <StatusBadge status={state.status} />
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Uptime</span>
                                <span className="font-mono text-sm">
                                    {formatUptime(state.uptime)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Last Active</span>
                                <span className="text-sm text-muted-foreground">
                                    {new Date(state.lastActive).toLocaleString()}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface SliderControlProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}

function SliderControl({ label, value, onChange, disabled }: SliderControlProps) {
    const sliderDescriptions: Record<string, { low: string; high: string; icon: string }> = {
        verbosity: { low: 'Concise', high: 'Detailed', icon: '📝' },
        creativity: { low: 'Conservative', high: 'Innovative', icon: '💡' },
        directness: { low: 'Diplomatic', high: 'Direct', icon: '🎯' },
        technicality: { low: 'Simple', high: 'Technical', icon: '🔧' },
        proactivity: { low: 'Reactive', high: 'Proactive', icon: '⚡' },
        humor: { low: 'Serious', high: 'Playful', icon: '😄' },
        compliance: { low: 'Flexible', high: 'Strict', icon: '⚖️' },
        speed: { low: 'Thorough', high: 'Fast', icon: '🚀' },
    };

    const desc = sliderDescriptions[label] || { low: 'Low', high: 'High', icon: '🎚️' };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <span className="text-sm font-medium flex items-center gap-2">
                                <span>{desc.icon}</span>
                                <span className="capitalize">{label}</span>
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{desc.low} ← → {desc.high}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <span className="font-mono text-sm">{value}</span>
            </div>
            <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-20">{desc.low}</span>
                <Slider
                    value={[value]}
                    onValueChange={([v]) => onChange(v)}
                    max={100}
                    step={1}
                    disabled={disabled}
                    className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-20 text-right">{desc.high}</span>
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: React.ElementType;
    label: string;
    value: string;
    alert?: boolean;
}

function StatCard({ icon: Icon, label, value, alert }: StatCardProps) {
    return (
        <div className={cn('rounded-lg border p-3', alert && 'border-destructive bg-destructive/5')}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <p className="text-xl font-bold">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: AgentCognitiveState['status'] }) {
    const variants = {
        active: { variant: 'default' as const, icon: CheckCircle2, label: 'Active' },
        idle: { variant: 'secondary' as const, icon: Clock, label: 'Idle' },
        busy: { variant: 'default' as const, icon: Activity, label: 'Busy' },
        offline: { variant: 'destructive' as const, icon: AlertCircle, label: 'Offline' },
        error: { variant: 'destructive' as const, icon: AlertCircle, label: 'Error' },
    };

    const { variant, icon: Icon, label } = variants[status];

    return (
        <Badge variant={variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {label}
        </Badge>
    );
}

function LoadBadge({ load }: { load: string }) {
    const variants = {
        idle: 'secondary' as const,
        light: 'default' as const,
        moderate: 'default' as const,
        heavy: 'destructive' as const,
        overloaded: 'destructive' as const,
    };

    return (
        <Badge variant={variants[load as keyof typeof variants]}>
            {load.charAt(0).toUpperCase() + load.slice(1)}
        </Badge>
    );
}

function formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}
