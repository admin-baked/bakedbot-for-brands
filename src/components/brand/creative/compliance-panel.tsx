'use client';

/**
 * Compliance Panel (Deebo Redline)
 *
 * Shows compliance scan results from Deebo with flagged issues and suggested fixes.
 * Uses glassmorphism styling and highlights compliance violations.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
    ShieldAlert,
    ShieldCheck,
    XCircle,
    AlertTriangle,
    MoreHorizontal,
    CheckCircle2,
    ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ComplianceCheck, ComplianceStatus } from '@/types/creative-content';

interface ComplianceIssue {
    id: string;
    flaggedText: string;
    reason: string;
    suggestion: string;
    severity: 'error' | 'warning' | 'info';
}

interface CompliancePanelProps {
    score: number;
    status: ComplianceStatus;
    issues: ComplianceIssue[];
    checks?: ComplianceCheck[];
    onApplyFixes?: () => void;
    onDismiss?: (issueId: string) => void;
    className?: string;
}

const STATUS_CONFIG: Record<ComplianceStatus, {
    icon: typeof ShieldCheck;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
}> = {
    active: {
        icon: ShieldCheck,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20',
        label: 'Compliant',
    },
    warning: {
        icon: AlertTriangle,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
        label: 'Warning',
    },
    review_needed: {
        icon: ShieldAlert,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        label: 'Review Needed',
    },
    rejected: {
        icon: XCircle,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        borderColor: 'border-destructive/20',
        label: 'Non-Compliant',
    },
};

export function CompliancePanel({
    score,
    status,
    issues,
    checks = [],
    onApplyFixes,
    onDismiss,
    className,
}: CompliancePanelProps) {
    const config = STATUS_CONFIG[status];
    const StatusIcon = config.icon;
    const hasIssues = issues.length > 0;

    return (
        <Card className={cn('glass-card glass-card-hover', className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                    Deebo Redline & Compliance
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Score Card */}
                <div
                    className={cn(
                        'flex gap-4 p-4 rounded-lg border',
                        config.bgColor,
                        config.borderColor
                    )}
                >
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                        <div
                            className={cn(
                                'flex h-full w-full items-center justify-center rounded-full',
                                config.bgColor
                            )}
                        >
                            <StatusIcon className={cn('h-8 w-8', config.color)} />
                        </div>
                        {hasIssues && (
                            <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                                <XCircle className="h-5 w-5 fill-destructive text-background" />
                            </div>
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={cn('text-lg font-semibold', config.color)}>
                                Compliance Score: {score}%
                            </span>
                            {hasIssues && (
                                <Badge variant="destructive" className="rounded-sm text-xs">
                                    {issues.length} Issue{issues.length !== 1 ? 's' : ''} Found
                                </Badge>
                            )}
                        </div>
                        <Progress value={score} className="h-2 mb-2" />
                        <p className="text-sm text-muted-foreground">
                            {hasIssues
                                ? 'Automated scan detected potential regulatory violations.'
                                : 'All compliance checks passed. Content is safe to publish.'}
                        </p>
                    </div>
                </div>

                {/* Issues List */}
                {hasIssues && (
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-foreground">Flagged Content</h4>
                        {issues.map((issue, index) => (
                            <div
                                key={issue.id}
                                className="p-3 rounded-lg bg-card/50 border border-border/30 space-y-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className="text-sm font-semibold text-destructive flex items-center gap-1">
                                        <span className="text-muted-foreground">{index + 1}.</span>
                                        &quot;{issue.flaggedText}&quot;
                                    </span>
                                    {onDismiss && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => onDismiss(issue.id)}
                                        >
                                            Dismiss
                                        </Button>
                                    )}
                                </div>
                                <div className="text-xs space-y-1">
                                    <p>
                                        <span className="font-medium text-muted-foreground">Flagged:</span>{' '}
                                        <span className="text-amber-400">{issue.reason}</span>
                                    </p>
                                    <p className="flex items-start gap-1">
                                        <span className="font-medium text-muted-foreground">Suggestion:</span>{' '}
                                        <span className="text-primary">{issue.suggestion}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Compliance Checks Summary */}
                {checks.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Checks Performed</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {checks.map((check, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        'flex items-center gap-2 text-xs p-2 rounded-md',
                                        check.passed
                                            ? 'bg-green-500/10 text-green-400'
                                            : 'bg-destructive/10 text-destructive'
                                    )}
                                >
                                    {check.passed ? (
                                        <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                        <XCircle className="w-3 h-3" />
                                    )}
                                    <span>{check.checkType}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                {hasIssues && (
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm">
                            Dismiss All
                        </Button>
                        <Button
                            size="sm"
                            onClick={onApplyFixes}
                            className="bg-zinc-100 text-zinc-900 hover:bg-white gap-1"
                        >
                            Apply Fixes
                            <ArrowRight className="w-3 h-3" />
                        </Button>
                    </div>
                )}

                {/* All Clear State */}
                {!hasIssues && (
                    <div className="flex items-center justify-center gap-2 py-4 text-green-400">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-sm font-medium">Content is compliant and ready to publish</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default CompliancePanel;
