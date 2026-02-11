'use client';

/**
 * Memory Health Dashboard (MERIDIAN)
 *
 * View and manage memory gardening reports, conflicts, and health metrics.
 * Inspired by: https://github.com/mattvideoproductions/MERIDIAN_Brain
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
    getMemoryHealthMetrics,
    runMemoryGardening,
    getMemoryGardeningReports,
    getUnresolvedConflicts,
    resolveMemoryConflict,
} from '@/server/actions/meridian-intelligence';
import {
    MemoryHealthMetrics,
    MemoryGardeningReport,
    MemoryConflict,
} from '@/server/services/letta/memory-types';
import {
    AlertCircle,
    CheckCircle2,
    Clock,
    Trash2,
    Play,
    Leaf,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryHealthDashboardProps {
    agentId: string;
    agentName: string;
}

export function MemoryHealthDashboard({ agentId, agentName }: MemoryHealthDashboardProps) {
    const [metrics, setMetrics] = useState<MemoryHealthMetrics | null>(null);
    const [reports, setReports] = useState<MemoryGardeningReport[]>([]);
    const [conflicts, setConflicts] = useState<MemoryConflict[]>([]);
    const [loading, setLoading] = useState(true);
    const [gardening, setGardening] = useState(false);
    const [selectedConflict, setSelectedConflict] = useState<MemoryConflict | null>(null);

    useEffect(() => {
        loadData();
    }, [agentId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [metricsData, reportsData, conflictsData] = await Promise.all([
                getMemoryHealthMetrics(agentId),
                getMemoryGardeningReports(10),
                getUnresolvedConflicts(),
            ]);
            setMetrics(metricsData);
            setReports(reportsData);
            setConflicts(conflictsData);
        } catch (error) {
            console.error('Failed to load memory health data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRunGardening = async () => {
        setGardening(true);
        try {
            await runMemoryGardening(agentId);
            await loadData();
        } catch (error) {
            console.error('Failed to run memory gardening:', error);
        } finally {
            setGardening(false);
        }
    };

    const handleResolveConflict = async (conflictId: string, resolution: MemoryConflict['resolution']) => {
        try {
            await resolveMemoryConflict(conflictId, resolution);
            setSelectedConflict(null);
            await loadData();
        } catch (error) {
            console.error('Failed to resolve conflict:', error);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <Clock className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Leaf className="h-8 w-8 text-green-600" />
                            <div>
                                <CardTitle className="text-2xl">Memory Health</CardTitle>
                                <CardDescription>
                                    Gardening reports, conflicts, and health metrics for {agentName}
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            onClick={handleRunGardening}
                            disabled={gardening}
                            className="gap-2"
                        >
                            {gardening ? (
                                <>
                                    <Clock className="h-4 w-4 animate-spin" />
                                    Gardening...
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4" />
                                    Run Gardening
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Health Score Overview */}
            {metrics && (
                <Card>
                    <CardHeader>
                        <CardTitle>Memory Health Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Memories</p>
                                <p className="text-2xl font-bold">{metrics.totalMemories}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Stale Memories</p>
                                <p className={cn('text-2xl font-bold', metrics.staleMemories > 10 && 'text-destructive')}>
                                    {metrics.staleMemories}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Conflicts</p>
                                <p className={cn('text-2xl font-bold', metrics.conflictsDetected > 0 && 'text-destructive')}>
                                    {metrics.conflictsDetected}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                                <p className="text-2xl font-bold">
                                    {(metrics.averageConfidence * 100).toFixed(0)}%
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Average Age</span>
                                <span className="font-mono">
                                    {metrics.averageAgeHours.toFixed(1)} hours
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Fact vs Speculation Ratio</span>
                                <span className="font-mono">
                                    {metrics.factVsSpeculationRatio.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {metrics.gardeningRecommended && (
                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <span className="text-yellow-800">
                                    Memory gardening recommended - health metrics indicate cleanup needed
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="reports" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="reports">Gardening Reports</TabsTrigger>
                    <TabsTrigger value="conflicts">
                        Conflicts {conflicts.length > 0 && `(${conflicts.length})`}
                    </TabsTrigger>
                </TabsList>

                {/* Gardening Reports Tab */}
                <TabsContent value="reports">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Gardening Runs</CardTitle>
                            <CardDescription>
                                History of memory cleanup operations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {reports.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    <Leaf className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No gardening reports yet</p>
                                    <p className="text-sm mt-2">Run your first gardening operation above</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Scanned</TableHead>
                                            <TableHead>Removed</TableHead>
                                            <TableHead>Conflicts</TableHead>
                                            <TableHead>Health Change</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reports.map((report) => (
                                            <TableRow key={report.id}>
                                                <TableCell className="font-mono text-sm">
                                                    {new Date(report.startedAt).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge status={report.status} />
                                                </TableCell>
                                                <TableCell>{report.memoriesScanned}</TableCell>
                                                <TableCell>
                                                    <span className={cn(report.memoriesRemoved > 0 && 'text-destructive font-semibold')}>
                                                        {report.memoriesRemoved}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {report.conflictsDetected} detected, {report.conflictsResolved} resolved
                                                </TableCell>
                                                <TableCell>
                                                    <HealthChange
                                                        before={report.healthScoreBefore}
                                                        after={report.healthScoreAfter}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Conflicts Tab */}
                <TabsContent value="conflicts">
                    <Card>
                        <CardHeader>
                            <CardTitle>Unresolved Memory Conflicts</CardTitle>
                            <CardDescription>
                                Contradictory facts that need manual review
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {conflicts.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    <CheckCircle2 className="mx-auto h-12 w-12 mb-4 text-green-600" />
                                    <p>No unresolved conflicts</p>
                                    <p className="text-sm mt-2">Memory system is healthy!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {conflicts.map((conflict) => (
                                        <div
                                            key={conflict.id}
                                            className="rounded-lg border p-4 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <SeverityBadge severity={conflict.severity} />
                                                    <Badge variant="outline">
                                                        {conflict.conflictType.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedConflict(conflict)}
                                                >
                                                    Resolve
                                                </Button>
                                            </div>

                                            <div className="text-sm">
                                                <p className="text-muted-foreground mb-1">
                                                    Detected by {conflict.detectedBy} on{' '}
                                                    {new Date(conflict.detectedAt).toLocaleString()}
                                                </p>
                                                <p className="font-mono text-xs">
                                                    Memory 1: {conflict.memoryId1}
                                                    <br />
                                                    Memory 2: {conflict.memoryId2}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Conflict Resolution Dialog */}
            {selectedConflict && (
                <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Resolve Memory Conflict</DialogTitle>
                            <DialogDescription>
                                Choose how to handle this contradiction
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <SeverityBadge severity={selectedConflict.severity} />
                                <Badge variant="outline" className="ml-2">
                                    {selectedConflict.conflictType.replace('_', ' ')}
                                </Badge>
                            </div>

                            <div className="text-sm">
                                <p className="font-semibold mb-2">Conflicting Memories:</p>
                                <div className="space-y-2">
                                    <div className="rounded bg-muted p-2 font-mono text-xs">
                                        Memory 1: {selectedConflict.memoryId1}
                                    </div>
                                    <div className="rounded bg-muted p-2 font-mono text-xs">
                                        Memory 2: {selectedConflict.memoryId2}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm font-semibold">Resolution Options:</p>
                                <div className="grid gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleResolveConflict(selectedConflict.id, 'keep_both')}
                                    >
                                        Keep Both (context-dependent)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleResolveConflict(selectedConflict.id, 'keep_newer')}
                                    >
                                        Keep Newer Memory
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => handleResolveConflict(selectedConflict.id, 'keep_higher_confidence')}
                                    >
                                        Keep Higher Confidence
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => handleResolveConflict(selectedConflict.id, 'manual_review')}
                                    >
                                        Flag for Manual Review
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setSelectedConflict(null)}>
                                Cancel
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: MemoryGardeningReport['status'] }) {
    const variants = {
        running: { variant: 'default' as const, icon: Clock, label: 'Running' },
        completed: { variant: 'default' as const, icon: CheckCircle2, label: 'Completed' },
        failed: { variant: 'destructive' as const, icon: AlertCircle, label: 'Failed' },
    };

    const { variant, icon: Icon, label } = variants[status];

    return (
        <Badge variant={variant} className="flex items-center gap-1 w-fit">
            <Icon className="h-3 w-3" />
            {label}
        </Badge>
    );
}

function SeverityBadge({ severity }: { severity: MemoryConflict['severity'] }) {
    const variants = {
        critical: 'destructive' as const,
        warning: 'default' as const,
        minor: 'secondary' as const,
    };

    return (
        <Badge variant={variants[severity]}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
        </Badge>
    );
}

function HealthChange({ before, after }: { before: number; after: number }) {
    const change = after - before;
    const improved = change > 0;

    return (
        <div className="flex items-center gap-1">
            {improved ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={cn('font-mono text-sm', improved ? 'text-green-600' : 'text-red-600')}>
                {improved ? '+' : ''}{change.toFixed(0)}
            </span>
            <span className="text-muted-foreground text-sm">
                ({before} → {after})
            </span>
        </div>
    );
}
