'use client';

/**
 * ResearchTaskList Component
 * 
 * Client component for displaying research tasks with real-time status polling.
 * Uses useResearchTaskStatus hook to poll for updates while tasks are processing.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Clock, AlertCircle, CheckCircle2, Loader2, Search, Globe, FileSearch } from "lucide-react";
import { ResearchTask, ResearchTaskProgress, ResearchTaskStatus } from "@/types/research";
import { formatDistanceToNow } from "date-fns";
import { useResearchTaskStatus } from "@/hooks/use-research-task-status";
import { cn } from "@/lib/utils";

interface ResearchTaskListProps {
    tasks: ResearchTask[];
}

export function ResearchTaskList({ tasks }: ResearchTaskListProps) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (tasks.length === 0) {
        return (
            <div className="col-span-full py-10 text-center text-muted-foreground">
                No research tasks found. Start one above!
            </div>
        );
    }

    return (
        <>
            {tasks.map((task) => (
                <ResearchTaskCard 
                    key={task.id} 
                    task={task} 
                    hasMounted={hasMounted}
                />
            ))}
        </>
    );
}

// Individual task card with real-time polling
function ResearchTaskCard({ task, hasMounted }: { task: ResearchTask; hasMounted: boolean }) {
    // Enable polling for pending/processing tasks
    const shouldPoll = task.status === 'pending' || task.status === 'processing';
    
    const { 
        status: liveStatus, 
        progress: liveProgress, 
        resultReportId: liveReportId,
        error: liveError,
        isPolling 
    } = useResearchTaskStatus({
        taskId: task.id,
        enabled: shouldPoll,
        pollingInterval: 2000 // Poll every 2 seconds
    });

    // Use live data if polling, fallback to initial data
    const status = liveStatus || task.status;
    const progress = liveProgress || task.progress;
    const reportId = liveReportId || task.resultReportId;
    const error = liveError || task.error;

    return (
        <Card className={cn(
            "transition-all duration-300",
            isPolling && "ring-2 ring-emerald-500/20"
        )}>
            <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                    <span className="truncate pr-2" title={task.query}>{task.query}</span>
                    <StatusBadge status={status} isPolling={isPolling} />
                </CardTitle>
                <CardDescription className="text-xs">
                    {hasMounted 
                        ? formatDistanceToNow(task.createdAt, { addSuffix: true })
                        : 'Loading...'
                    } • Depth: {task.depth}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {status === 'processing' || status === 'pending' ? (
                    <ProgressDisplay progress={progress} status={status} />
                ) : status === 'completed' ? (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        Research complete. {reportId ? 'Report generated.' : 'View details.'}
                    </p>
                ) : status === 'failed' ? (
                    <p className="text-sm text-red-500 line-clamp-3 mb-4">
                        {error || 'Research failed. Please try again.'}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        Status: {status}
                    </p>
                )}

                <Button 
                    variant={status === 'completed' ? 'outline' : 'ghost'} 
                    size="sm" 
                    className="w-full gap-1"
                    disabled={status !== 'completed'}
                >
                    {status === 'completed' ? (
                        <><FileText className="h-3 w-3" /> View Report</>
                    ) : status === 'failed' ? (
                        'Failed'
                    ) : (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Processing...</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}

// Progress display component
function ProgressDisplay({ progress, status }: { progress?: ResearchTaskProgress | null; status: ResearchTaskStatus }) {
    const stepsCompleted = progress?.stepsCompleted || 0;
    const totalSteps = progress?.totalSteps || 5;
    const currentStep = progress?.currentStep || (status === 'pending' ? 'Queued' : 'Processing...');
    const sourcesFound = progress?.sourcesFound;
    const percentage = Math.round((stepsCompleted / totalSteps) * 100);

    // Step icons mapping
    const stepIcons: Record<string, React.ReactNode> = {
        'Queued': <Clock className="h-3 w-3" />,
        'Searching': <Search className="h-3 w-3" />,
        'Browsing': <Globe className="h-3 w-3" />,
        'Analyzing': <FileSearch className="h-3 w-3" />,
        'Synthesizing': <FileText className="h-3 w-3" />,
        'Complete': <CheckCircle2 className="h-3 w-3" />,
    };

    const icon = stepIcons[currentStep] || <Loader2 className="h-3 w-3 animate-spin" />;

    return (
        <div className="space-y-3 mb-4">
            {/* Progress bar */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{percentage}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                </div>
            </div>

            {/* Current step */}
            <div className="flex items-center gap-2 text-sm">
                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    {icon}
                </div>
                <span className="text-muted-foreground animate-pulse">{currentStep}</span>
            </div>

            {/* Sources found */}
            {sourcesFound !== undefined && sourcesFound > 0 && (
                <p className="text-xs text-muted-foreground">
                    📚 {sourcesFound} sources found
                </p>
            )}
        </div>
    );
}

function StatusBadge({ status, isPolling }: { status: ResearchTaskStatus; isPolling?: boolean }) {
    switch (status) {
        case 'completed':
            return (
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Done
                </span>
            );
        case 'processing':
            return (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                    <Loader2 className={cn("h-3 w-3", isPolling && "animate-spin")} /> Running
                </span>
            );
        case 'pending':
            return (
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Queued
                </span>
            );
        case 'failed':
            return (
                <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Failed
                </span>
            );
        default:
            return (
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">
                    {status}
                </span>
            );
    }
}

