'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { VmRunArtifactData, VmRunOutput, VmRunStepStatus } from '@/types/agent-vm';
import {
    AlertCircle,
    CheckCircle2,
    Circle,
    Clock3,
    Loader2,
    ShieldCheck,
} from 'lucide-react';

interface VmRunViewProps {
    vmRun?: VmRunArtifactData;
    fallbackContent?: string;
    className?: string;
    onApproveApproval?: (approvalIndex: number) => void | Promise<void>;
    onRejectApproval?: (approvalIndex: number) => void | Promise<void>;
    isUpdatingApproval?: boolean;
}

const STEP_STATUS_STYLES: Record<VmRunStepStatus, string> = {
    pending: 'text-muted-foreground',
    running: 'text-blue-600 dark:text-blue-400',
    completed: 'text-emerald-600 dark:text-emerald-400',
    failed: 'text-red-600 dark:text-red-400',
};

function getStatusBadgeClass(status?: VmRunArtifactData['status']): string {
    switch (status) {
        case 'completed':
            return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
        case 'awaiting_approval':
            return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
        case 'failed':
        case 'cancelled':
            return 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20';
        case 'queued':
            return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
        case 'running':
        default:
            return 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
    }
}

function StepIcon({ status }: { status: VmRunStepStatus }) {
    switch (status) {
        case 'completed':
            return <CheckCircle2 className="h-4 w-4" />;
        case 'running':
            return <Loader2 className="h-4 w-4 animate-spin" />;
        case 'failed':
            return <AlertCircle className="h-4 w-4" />;
        case 'pending':
        default:
            return <Circle className="h-4 w-4" />;
    }
}

function OutputView({ output }: { output: VmRunOutput }) {
    if (output.url && (output.kind === 'image' || output.kind === 'video')) {
        if (output.kind === 'image') {
            return (
                <img
                    src={output.url}
                    alt={output.title}
                    className="max-w-full rounded-lg border"
                />
            );
        }

        return (
            <video controls className="w-full rounded-lg border">
                <source src={output.url} />
            </video>
        );
    }

    if (output.kind === 'markdown') {
        return (
            <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {output.content || ''}
                </ReactMarkdown>
            </div>
        );
    }

    if (output.kind === 'code' || output.kind === 'json') {
        return (
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                <code>{output.content || ''}</code>
            </pre>
        );
    }

    if (output.url) {
        return (
            <a
                href={output.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary underline underline-offset-4"
            >
                {output.title}
            </a>
        );
    }

    return (
        <div className="text-sm whitespace-pre-wrap">
            {output.content || 'No output content available.'}
        </div>
    );
}

export function VmRunView({
    vmRun,
    fallbackContent,
    className,
    onApproveApproval,
    onRejectApproval,
    isUpdatingApproval = false,
}: VmRunViewProps) {
    if (!vmRun) {
        return fallbackContent ? (
            <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {fallbackContent}
                </ReactMarkdown>
            </div>
        ) : null;
    }

    return (
        <div className={cn('space-y-5', className)}>
            <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getStatusBadgeClass(vmRun.status)}>
                    {vmRun.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                    {vmRun.runtimeBackend}
                </Badge>
                <Badge variant="outline" className="text-xs">
                    {vmRun.roleScope}
                </Badge>
            </div>

            {vmRun.summary && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    {vmRun.summary}
                </div>
            )}

            {vmRun.plan.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        Plan
                    </div>
                    <ol className="space-y-1 text-sm text-muted-foreground">
                        {vmRun.plan.map((step, index) => (
                            <li key={`${step}-${index}`} className="list-decimal ml-5">
                                {step}
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {vmRun.steps.length > 0 && (
                <div className="space-y-2">
                    <div className="text-sm font-medium">Live Steps</div>
                    <div className="space-y-2">
                        {vmRun.steps.map((step) => (
                            <div
                                key={step.id}
                                className="rounded-lg border bg-card/50 p-3"
                            >
                                <div className={cn('flex items-start gap-2 text-sm', STEP_STATUS_STYLES[step.status])}>
                                    <StepIcon status={step.status} />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium">{step.title}</div>
                                        {step.detail && (
                                            <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                                                {step.detail}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {vmRun.approvals.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        Approvals
                    </div>
                    <div className="space-y-2">
                        {vmRun.approvals.map((approval, index) => (
                            <div
                                key={`${approval.type}-${index}`}
                                className="rounded-lg border bg-card/50 p-3 text-sm"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">
                                        {approval.label || approval.type.replace('_', ' ')}
                                    </span>
                                    <Badge variant="outline" className={getStatusBadgeClass(
                                        approval.status === 'pending'
                                            ? 'awaiting_approval'
                                            : approval.status === 'approved'
                                                ? 'completed'
                                                : 'failed'
                                    )}>
                                        {approval.status}
                                    </Badge>
                                </div>
                                {approval.status === 'pending' && (onApproveApproval || onRejectApproval) && (
                                    <div className="mt-3 flex items-center gap-2">
                                        {onApproveApproval && (
                                            <Button
                                                size="sm"
                                                onClick={() => void onApproveApproval(index)}
                                                disabled={isUpdatingApproval}
                                            >
                                                Approve
                                            </Button>
                                        )}
                                        {onRejectApproval && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => void onRejectApproval(index)}
                                                disabled={isUpdatingApproval}
                                            >
                                                Reject
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(vmRun.outputs.length > 0 || fallbackContent) && (
                <>
                    <Separator />
                    <div className="space-y-3">
                        <div className="text-sm font-medium">Outputs</div>
                        {vmRun.outputs.length > 0 ? (
                            vmRun.outputs.map((output, index) => (
                                <div key={`${output.title}-${index}`} className="space-y-2 rounded-lg border p-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                            {output.kind}
                                        </Badge>
                                        <span className="text-sm font-medium">{output.title}</span>
                                    </div>
                                    <OutputView output={output} />
                                </div>
                            ))
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {fallbackContent || ''}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
