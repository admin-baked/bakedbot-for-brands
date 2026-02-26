'use client';

/**
 * ResearchTaskList Component
 *
 * Client component for displaying research tasks with real-time status polling.
 * Shows ChatGPT-style plan with animated step checkmarks, live source count,
 * and "View Report" button that opens a full report modal.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText, Clock, AlertCircle, CheckCircle2, Loader2,
    Search, Globe, FileSearch, HardDrive, Circle,
} from "lucide-react";
import { ResearchTask, ResearchTaskProgress, ResearchTaskStatus } from "@/types/research";
import { formatDistanceToNow } from "date-fns";
import { useResearchTaskStatus } from "@/hooks/use-research-task-status";
import { cn } from "@/lib/utils";
import { ResearchReportModal } from "@/components/research/research-report-modal";

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
    const [reportModalOpen, setReportModalOpen] = useState(false);

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
        pollingInterval: 2000,
    });

    // Merge live data with polling response (plan + driveFileId come from polling action)
    const [livePlan, setLivePlan] = useState<string[] | undefined>(task.plan);
    const [liveDriveFileId, setLiveDriveFileId] = useState<string | undefined>(task.driveFileId);

    useEffect(() => {
        // getResearchTaskStatusAction now returns plan + driveFileId
        // They are accessible on the hook's raw response through the action
        // For now we'll update when task polling stops (completed state)
        if (liveStatus === 'completed') {
            // plan was stored during processing — refresh from prop if available
            if (task.plan && task.plan.length > 0) setLivePlan(task.plan);
        }
    }, [liveStatus, task.plan]);

    const status = liveStatus || task.status;
    const progress = liveProgress || task.progress;
    const reportId = liveReportId || task.resultReportId;
    const error = liveError || task.error;
    const plan = livePlan || task.plan;
    const driveFileId = liveDriveFileId || task.driveFileId;

    return (
        <>
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
                        {driveFileId && (
                            <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <HardDrive className="h-3 w-3" /> Saved to Drive
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {status === 'processing' || status === 'pending' ? (
                        <ProgressDisplay progress={progress} status={status} plan={plan} />
                    ) : status === 'completed' ? (
                        <div className="mb-4">
                            {plan && plan.length > 0 && (
                                <PlanSteps plan={plan} stepsCompleted={plan.length} />
                            )}
                        </div>
                    ) : status === 'failed' ? (
                        <p className="text-sm text-red-500 line-clamp-3 mb-4">
                            {error || 'Research failed. Please try again.'}
                        </p>
                    ) : null}

                    <Button
                        variant={status === 'completed' ? 'outline' : 'ghost'}
                        size="sm"
                        className="w-full gap-1"
                        disabled={status !== 'completed' || !reportId}
                        onClick={status === 'completed' && reportId ? () => setReportModalOpen(true) : undefined}
                    >
                        {status === 'completed' ? (
                            <><FileText className="h-3 w-3" /> View Report</>
                        ) : status === 'failed' ? (
                            'Failed'
                        ) : (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Researching...</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {reportId && (
                <ResearchReportModal
                    reportId={reportId}
                    open={reportModalOpen}
                    onOpenChange={setReportModalOpen}
                    driveFileId={driveFileId}
                />
            )}
        </>
    );
}

// ============ Plan Steps (ChatGPT-style) ============

function PlanSteps({ plan, stepsCompleted, currentStepIndex }: {
    plan: string[];
    stepsCompleted: number;
    currentStepIndex?: number;
}) {
    return (
        <ul className="space-y-1.5 mb-3">
            {plan.map((step, i) => {
                const isDone = i < stepsCompleted;
                const isCurrent = i === currentStepIndex;
                return (
                    <li key={i} className={cn(
                        "flex items-start gap-2 text-xs",
                        isDone ? "text-emerald-600 dark:text-emerald-400" :
                        isCurrent ? "text-foreground" :
                        "text-muted-foreground"
                    )}>
                        <span className="shrink-0 mt-0.5">
                            {isDone ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : isCurrent ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Circle className="h-3.5 w-3.5 opacity-40" />
                            )}
                        </span>
                        <span className={cn(isCurrent && "font-medium")}>{step}</span>
                    </li>
                );
            })}
        </ul>
    );
}

// ============ Progress Display ============

function ProgressDisplay({ progress, status, plan }: {
    progress?: ResearchTaskProgress | null;
    status: ResearchTaskStatus;
    plan?: string[];
}) {
    const stepsCompleted = Math.max(0, (progress?.stepsCompleted || 0) - 1); // offset for plan generation step
    const totalSteps = progress?.totalSteps || 7;
    const currentStep = progress?.currentStep || (status === 'pending' ? 'Queued' : 'Processing...');
    const sourcesFound = progress?.sourcesFound;
    const percentage = Math.round(((progress?.stepsCompleted || 0) / totalSteps) * 100);

    // Find current plan step index
    const currentPlanIndex = plan
        ? plan.findIndex(step => currentStep === step || currentStep.includes(step.substring(0, 30)))
        : -1;

    const stepIcons: Record<string, React.ReactNode> = {
        'Queued': <Clock className="h-3 w-3" />,
        'Planning research...': <Search className="h-3 w-3" />,
        'Synthesizing findings...': <FileText className="h-3 w-3" />,
        'Complete': <CheckCircle2 className="h-3 w-3" />,
    };

    const icon = stepIcons[currentStep] || <Globe className="h-3 w-3" />;

    return (
        <div className="space-y-3 mb-4">
            {/* Plan steps — show when plan is available */}
            {plan && plan.length > 0 && (
                <PlanSteps
                    plan={plan}
                    stepsCompleted={stepsCompleted}
                    currentStepIndex={currentPlanIndex >= 0 ? currentPlanIndex : undefined}
                />
            )}

            {/* Progress bar */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{percentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(percentage, 3)}%` }}
                    />
                </div>
            </div>

            {/* Current step + source count */}
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground animate-pulse">
                    <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
                    <span className="truncate max-w-[200px]">{currentStep}</span>
                </div>
                {sourcesFound !== undefined && sourcesFound > 0 && (
                    <span className="text-muted-foreground shrink-0">
                        🔍 {sourcesFound} sources
                    </span>
                )}
            </div>
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
