'use client';

/**
 * InboxResearchCard
 *
 * Animated ChatGPT-style deep research card for inbox threads.
 * Polls live task status and shows plan steps, source count, and progress bar.
 * When complete, shows a "View Full Report" button that opens ResearchReportModal.
 */

import { useState } from 'react';
import { CheckCircle2, Loader2, Circle, HardDrive, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useResearchTaskStatus } from '@/hooks/use-research-task-status';
import { ResearchReportModal } from '@/components/research/research-report-modal';
import type { InboxArtifact, ResearchReportArtifactData } from '@/types/inbox';

interface InboxResearchCardProps {
    artifact: InboxArtifact;
}

export function InboxResearchCard({ artifact }: InboxResearchCardProps) {
    const [reportModalOpen, setReportModalOpen] = useState(false);

    // data holds taskId, reportTitle, plan from ResearchQueryDialog
    const meta = artifact.data as ResearchReportArtifactData | undefined;

    const taskId = meta?.taskId || '';
    const initialPlan = meta?.plan || [];

    const shouldPoll = !!taskId;

    const {
        status,
        progress,
        resultReportId,
        isPolling,
    } = useResearchTaskStatus({
        taskId,
        enabled: shouldPoll,
        pollingInterval: 2500,
    });

    const plan = initialPlan.length > 0 ? initialPlan : [];
    const stepsCompleted = Math.max(0, (progress?.stepsCompleted || 0) - 1);
    const sourcesFound = progress?.sourcesFound || 0;
    const totalSteps = progress?.totalSteps || 7;
    const percentage = Math.round(((progress?.stepsCompleted || 0) / totalSteps) * 100);
    const currentStep = progress?.currentStep || '';
    const driveFileId = meta?.driveFileId;

    const isComplete = status === 'completed';
    const isFailed = status === 'failed';

    return (
        <>
            <div className={cn(
                'border rounded-xl p-4 bg-card transition-all duration-300',
                isComplete && 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20',
                isFailed && 'border-red-500/30 bg-red-50/30 dark:bg-red-950/20',
                !isComplete && !isFailed && isPolling && 'border-primary/20',
            )}>
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🐛</span>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">Big Worm — Deep Research</p>
                        <p className="text-xs text-muted-foreground truncate">
                            {meta?.reportTitle || artifact.rationale || 'Researching...'}
                        </p>
                    </div>
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                    {!isComplete && !isFailed && isPolling && (
                        <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                    )}
                </div>

                {/* Plan steps */}
                {plan.length > 0 && (
                    <ul className="space-y-1.5 mb-3">
                        {plan.map((step, i) => {
                            const done = isComplete || i < stepsCompleted;
                            const active = !isComplete && i === stepsCompleted && isPolling;
                            return (
                                <li key={i} className={cn(
                                    'flex items-start gap-2 text-xs',
                                    done ? 'text-emerald-600 dark:text-emerald-400' :
                                    active ? 'text-foreground' :
                                    'text-muted-foreground'
                                )}>
                                    <span className="shrink-0 mt-0.5">
                                        {done ? (
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                        ) : active ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Circle className="h-3.5 w-3.5 opacity-40" />
                                        )}
                                    </span>
                                    <span className={cn(active && 'font-medium')}>{step}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Progress bar + sources */}
                {!isComplete && !isFailed && (
                    <div className="space-y-2 mb-3">
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${Math.max(percentage, 3)}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="truncate max-w-[200px] animate-pulse">{currentStep || 'Starting...'}</span>
                            {sourcesFound > 0 && (
                                <span className="shrink-0">🔍 {sourcesFound} sources</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Completed state */}
                {isComplete && sourcesFound > 0 && (
                    <p className="text-xs text-muted-foreground mb-3">
                        🔍 {sourcesFound} sources visited
                    </p>
                )}

                {/* Failed state */}
                {isFailed && (
                    <p className="text-xs text-red-500 mb-3">
                        Research failed. Try again from the Research page.
                    </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                    {isComplete && resultReportId && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-7"
                            onClick={() => setReportModalOpen(true)}
                        >
                            <FileText className="h-3 w-3" />
                            View Full Report
                        </Button>
                    )}
                    {driveFileId && (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-xs h-7 text-emerald-600 dark:text-emerald-400"
                            onClick={() => window.open(`/dashboard/drive?file=${driveFileId}`, '_blank')}
                        >
                            <HardDrive className="h-3 w-3" />
                            Open in Drive
                            <ExternalLink className="h-3 w-3 opacity-60" />
                        </Button>
                    )}
                </div>
            </div>

            {resultReportId && (
                <ResearchReportModal
                    reportId={resultReportId}
                    open={reportModalOpen}
                    onOpenChange={setReportModalOpen}
                    driveFileId={driveFileId}
                />
            )}
        </>
    );
}
