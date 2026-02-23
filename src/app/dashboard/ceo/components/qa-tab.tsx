'use client';

/**
 * QA Tab — CEO Dashboard
 *
 * Full bug tracker for Pinky (QA Engineering Director).
 * Features:
 * - QA health header: P0/P1/P2/P3 open counts + test coverage
 * - Filterable bug table (status/priority/area/org)
 * - Bug detail Sheet (3-section: header/body/footer)
 * - Report Bug Sheet with form
 * - Triage, assign, verify actions (Super User only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Bug, Plus, RefreshCw, CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';
import { logger } from '@/lib/logger';
import type {
    QABug,
    QABugPriority,
    QABugStatus,
    QABugArea,
    QAReport,
} from '@/types/qa';
import {
    QA_PRIORITY_CONFIG,
    QA_AREA_CONFIG,
    QA_STATUS_CONFIG,
    QA_VALID_TRANSITIONS,
} from '@/types/qa';
import {
    reportBug,
    getBugs,
    updateBugStatus,
    assignBug,
    verifyFix,
    getQAReport,
} from '@/server/actions/qa';

// ============================================================================
// CONSTANTS
// ============================================================================

const AREAS: QABugArea[] = [
    'public_menu', 'compliance', 'auth', 'brand_guide', 'hero_carousel',
    'bundle_system', 'revenue', 'redis_cache', 'competitive_intel', 'inbox',
    'playbooks', 'creative_studio', 'drive', 'campaigns', 'pos_sync',
    'cron_jobs', 'firebase_deploy', 'super_powers', 'goals', 'customer_segments', 'other',
];

const PRIORITIES: QABugPriority[] = ['P0', 'P1', 'P2', 'P3'];

const STATUSES: QABugStatus[] = [
    'open', 'triaged', 'assigned', 'in_progress', 'fixed', 'verified', 'closed', 'wont_fix',
];

// ============================================================================
// HEALTH HEADER
// ============================================================================

function QAHealthHeader({ report }: { report: QAReport | null }) {
    if (!report) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                            <div className="h-8 bg-muted rounded" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const items = [
        { label: 'P0 Critical', count: report.byPriority.P0, color: 'text-red-700 bg-red-50 border-red-200', emoji: '🔴' },
        { label: 'P1 High', count: report.byPriority.P1, color: 'text-orange-700 bg-orange-50 border-orange-200', emoji: '🟠' },
        { label: 'P2 Medium', count: report.byPriority.P2, color: 'text-yellow-700 bg-yellow-50 border-yellow-200', emoji: '🟡' },
        { label: 'P3 Low', count: report.byPriority.P3, color: 'text-green-700 bg-green-50 border-green-200', emoji: '🟢' },
    ];

    const coveragePct = report.testCoverage.coveragePct;
    const coverageColor = coveragePct >= 80 ? 'text-green-700 bg-green-50 border-green-200'
        : coveragePct >= 50 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
            : 'text-red-700 bg-red-50 border-red-200';

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {items.map(item => (
                <Card key={item.label} className={`border ${item.color}`}>
                    <CardContent className="p-4">
                        <div className="text-2xl font-bold">{item.count}</div>
                        <div className="text-xs font-medium mt-1">{item.emoji} {item.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">open</div>
                    </CardContent>
                </Card>
            ))}
            <Card className={`border ${coverageColor}`}>
                <CardContent className="p-4">
                    <div className="text-2xl font-bold">{coveragePct}%</div>
                    <div className="text-xs font-medium mt-1">Coverage</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                        {report.testCoverage.passing}/{report.testCoverage.total} tests
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================================================
// BUG ROW
// ============================================================================

function BugRow({ bug, onClick }: { bug: QABug; onClick: () => void }) {
    const priorityConfig = QA_PRIORITY_CONFIG[bug.priority];
    const areaConfig = QA_AREA_CONFIG[bug.area] || { label: bug.area, emoji: '🐛' };
    const statusConfig = QA_STATUS_CONFIG[bug.status];

    return (
        <tr
            className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={onClick}
        >
            <td className="py-3 px-4">
                <span className="text-xs font-mono text-muted-foreground">
                    #{bug.id.slice(-6).toUpperCase()}
                </span>
            </td>
            <td className="py-3 px-4">
                <Badge className={`text-xs font-medium border ${priorityConfig.color}`} variant="outline">
                    {priorityConfig.emoji} {bug.priority}
                </Badge>
            </td>
            <td className="py-3 px-4">
                <span className="text-xs text-muted-foreground">
                    {areaConfig.emoji} {areaConfig.label}
                </span>
            </td>
            <td className="py-3 px-4 max-w-[300px]">
                <span className="text-sm font-medium line-clamp-1">{bug.title}</span>
                {bug.testCaseId && (
                    <span className="text-xs text-muted-foreground ml-1">#{bug.testCaseId}</span>
                )}
            </td>
            <td className="py-3 px-4">
                <span className="text-xs text-muted-foreground">{bug.assignedTo || '—'}</span>
            </td>
            <td className="py-3 px-4">
                <Badge className={`text-xs ${statusConfig.color}`} variant="secondary">
                    {statusConfig.label}
                </Badge>
            </td>
            <td className="py-3 px-4">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </td>
        </tr>
    );
}

// ============================================================================
// REPORT BUG SHEET
// ============================================================================

interface ReportBugSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (bug: QABug) => void;
}

function ReportBugSheet({ open, onOpenChange, onCreated }: ReportBugSheetProps) {
    const [title, setTitle] = useState('');
    const [area, setArea] = useState<QABugArea>('other');
    const [priority, setPriority] = useState<QABugPriority>('P2');
    const [stepsText, setStepsText] = useState('');
    const [expected, setExpected] = useState('');
    const [actual, setActual] = useState('');
    const [affectedOrgId, setAffectedOrgId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!title.trim() || !expected.trim() || !actual.trim()) {
            setError('Title, expected, and actual are required.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const steps = stepsText.trim()
                ? stepsText.split('\n').map(s => s.trim()).filter(Boolean)
                : [];
            const result = await reportBug({
                title: title.trim(),
                area,
                priority,
                steps,
                expected: expected.trim(),
                actual: actual.trim(),
                environment: 'production',
                affectedOrgId: affectedOrgId.trim() || undefined,
            });
            if (result.success && result.bugId) {
                // Build a minimal QABug for optimistic update
                const newBug: QABug = {
                    id: result.bugId,
                    title: title.trim(),
                    area,
                    priority,
                    steps,
                    expected: expected.trim(),
                    actual: actual.trim(),
                    status: 'open',
                    environment: 'production',
                    reportedBy: 'super_user',
                    affectedOrgId: affectedOrgId.trim() || undefined,
                    createdAt: { toDate: () => new Date() } as any,
                    updatedAt: { toDate: () => new Date() } as any,
                };
                onCreated(newBug);
                // Reset form
                setTitle('');
                setArea('other');
                setPriority('P2');
                setStepsText('');
                setExpected('');
                setActual('');
                setAffectedOrgId('');
                onOpenChange(false);
            } else {
                setError(result.error || 'Failed to report bug.');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            logger.error('[QATab] Failed to report bug', { error: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Bug className="h-5 w-5 text-red-500" />
                        Report a Bug
                    </SheetTitle>
                    <SheetDescription>
                        File a new bug for Pinky to track. P0/P1 bugs trigger immediate Slack alerts.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 py-6">
                    <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                            placeholder="Short, descriptive bug title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Area</Label>
                            <Select value={area} onValueChange={v => setArea(v as QABugArea)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {AREAS.map(a => {
                                        const config = QA_AREA_CONFIG[a];
                                        return (
                                            <SelectItem key={a} value={a}>
                                                {config.emoji} {config.label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={v => setPriority(v as QABugPriority)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITIES.map(p => {
                                        const config = QA_PRIORITY_CONFIG[p];
                                        return (
                                            <SelectItem key={p} value={p}>
                                                {config.emoji} {config.label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Steps to Reproduce (one per line)</Label>
                        <Textarea
                            placeholder={'1. Navigate to /menu\n2. Click product card\n3. See error'}
                            rows={4}
                            value={stepsText}
                            onChange={e => setStepsText(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Expected *</Label>
                        <Textarea
                            placeholder="What should happen"
                            rows={2}
                            value={expected}
                            onChange={e => setExpected(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Actual *</Label>
                        <Textarea
                            placeholder="What actually happened"
                            rows={2}
                            value={actual}
                            onChange={e => setActual(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Affected Org ID (optional)</Label>
                        <Input
                            placeholder="e.g. org_thrive_syracuse"
                            value={affectedOrgId}
                            onChange={e => setAffectedOrgId(e.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bug className="h-4 w-4 mr-2" />}
                        File Bug
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// ============================================================================
// BUG DETAIL SHEET
// ============================================================================

interface BugDetailSheetProps {
    bug: QABug | null;
    onClose: () => void;
    onUpdated: (updated: QABug) => void;
}

function BugDetailSheet({ bug, onClose, onUpdated }: BugDetailSheetProps) {
    const [newStatus, setNewStatus] = useState<QABugStatus | ''>('');
    const [notes, setNotes] = useState('');
    const [assignTo, setAssignTo] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [actionError, setActionError] = useState('');

    useEffect(() => {
        if (bug) {
            setNewStatus('');
            setNotes('');
            setAssignTo(bug.assignedTo || '');
            setActionError('');
        }
    }, [bug]);

    if (!bug) return null;

    const priorityConfig = QA_PRIORITY_CONFIG[bug.priority];
    const areaConfig = QA_AREA_CONFIG[bug.area] || { label: bug.area, emoji: '🐛' };
    const statusConfig = QA_STATUS_CONFIG[bug.status];
    const allowedTransitions = QA_VALID_TRANSITIONS[bug.status];

    const handleUpdateStatus = async () => {
        if (!newStatus) return;
        setIsUpdating(true);
        setActionError('');
        try {
            const result = await updateBugStatus(bug.id, newStatus, notes || undefined);
            if (result.success) {
                onUpdated({ ...bug, status: newStatus, notes: notes || bug.notes });
                setNewStatus('');
                setNotes('');
            } else {
                setActionError(result.error || 'Failed to update status.');
            }
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAssign = async () => {
        if (!assignTo.trim()) return;
        setIsUpdating(true);
        setActionError('');
        try {
            const result = await assignBug(bug.id, assignTo.trim());
            if (result.success) {
                onUpdated({ ...bug, assignedTo: assignTo.trim(), status: 'assigned' });
            } else {
                setActionError(result.error || 'Failed to assign bug.');
            }
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleVerify = async () => {
        setIsUpdating(true);
        setActionError('');
        try {
            const result = await verifyFix(bug.id, notes || undefined);
            if (result.success) {
                onUpdated({ ...bug, status: 'verified' });
                setNotes('');
            } else {
                setActionError(result.error || 'Failed to verify fix.');
            }
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsUpdating(false);
        }
    };

    const createdDate = bug.createdAt?.toDate?.() ?? new Date();

    return (
        <Sheet open={!!bug} onOpenChange={open => { if (!open) onClose(); }}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                {/* Header */}
                <SheetHeader>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs font-bold border ${priorityConfig.color}`} variant="outline">
                            {priorityConfig.emoji} {bug.priority}
                        </Badge>
                        <Badge className={`text-xs ${statusConfig.color}`} variant="secondary">
                            {statusConfig.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                            {areaConfig.emoji} {areaConfig.label}
                        </span>
                    </div>
                    <SheetTitle className="text-lg leading-snug mt-2">{bug.title}</SheetTitle>
                    <SheetDescription className="text-xs text-muted-foreground">
                        #{bug.id.slice(-8).toUpperCase()} · Filed {createdDate.toLocaleDateString()} by {bug.reportedBy}
                        {bug.testCaseId && ` · Test ${bug.testCaseId}`}
                        {bug.affectedOrgId && ` · Org: ${bug.affectedOrgId}`}
                    </SheetDescription>
                </SheetHeader>

                {/* Body */}
                <div className="space-y-6 py-6">
                    {/* Steps */}
                    {bug.steps.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-2">Steps to Reproduce</h4>
                            <ol className="list-decimal list-inside space-y-1">
                                {bug.steps.map((step, i) => (
                                    <li key={i} className="text-sm text-muted-foreground">{step}</li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Expected vs Actual */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="rounded-md bg-green-50 border border-green-200 p-3">
                            <p className="text-xs font-semibold text-green-700 mb-1">Expected</p>
                            <p className="text-sm text-green-900">{bug.expected}</p>
                        </div>
                        <div className="rounded-md bg-red-50 border border-red-200 p-3">
                            <p className="text-xs font-semibold text-red-700 mb-1">Actual</p>
                            <p className="text-sm text-red-900">{bug.actual}</p>
                        </div>
                    </div>

                    {/* Commit info */}
                    {(bug.commitFound || bug.commitFixed) && (
                        <div className="text-xs text-muted-foreground space-y-1">
                            {bug.commitFound && <p>Introduced: <code className="bg-muted px-1 rounded">{bug.commitFound.slice(0, 8)}</code></p>}
                            {bug.commitFixed && <p>Fixed in: <code className="bg-muted px-1 rounded">{bug.commitFixed.slice(0, 8)}</code></p>}
                        </div>
                    )}

                    {/* Notes */}
                    {bug.notes && (
                        <div className="rounded-md bg-muted p-3">
                            <p className="text-xs font-semibold mb-1">Notes</p>
                            <p className="text-sm">{bug.notes}</p>
                        </div>
                    )}

                    {/* Assign section */}
                    {bug.status !== 'closed' && bug.status !== 'wont_fix' && bug.status !== 'verified' && (
                        <div className="border-t pt-4 space-y-3">
                            <h4 className="text-sm font-semibold">Assign To</h4>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="linus, deebo, or user email"
                                    value={assignTo}
                                    onChange={e => setAssignTo(e.target.value)}
                                    className="flex-1"
                                />
                                <Button variant="outline" size="sm" onClick={handleAssign} disabled={isUpdating || !assignTo.trim()}>
                                    Assign
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Status transition */}
                    {allowedTransitions.length > 0 && (
                        <div className="border-t pt-4 space-y-3">
                            <h4 className="text-sm font-semibold">Update Status</h4>
                            <Select value={newStatus} onValueChange={v => setNewStatus(v as QABugStatus)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select next status…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allowedTransitions.map(s => (
                                        <SelectItem key={s} value={s}>
                                            {QA_STATUS_CONFIG[s].label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Textarea
                                placeholder="Add notes (optional)"
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>
                    )}

                    {actionError && (
                        <p className="text-sm text-destructive">{actionError}</p>
                    )}
                </div>

                {/* Footer */}
                <SheetFooter className="flex-wrap gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isUpdating}>
                        Close
                    </Button>
                    {bug.status === 'fixed' && (
                        <Button onClick={handleVerify} disabled={isUpdating} className="bg-green-600 hover:bg-green-700">
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                            Verify Fix
                        </Button>
                    )}
                    {newStatus && (
                        <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Update Status
                        </Button>
                    )}
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

// ============================================================================
// MAIN QA TAB
// ============================================================================

export default function QATab() {
    const [bugs, setBugs] = useState<QABug[]>([]);
    const [report, setReport] = useState<QAReport | null>(null);
    const [isFetching, setIsFetching] = useState(true);
    const [selectedBug, setSelectedBug] = useState<QABug | null>(null);
    const [reportBugOpen, setReportBugOpen] = useState(false);

    // Filters
    const [filterStatus, setFilterStatus] = useState<string>('open');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [filterArea, setFilterArea] = useState<string>('all');

    const loadData = useCallback(async () => {
        setIsFetching(true);
        try {
            const [bugsResult, reportResult] = await Promise.allSettled([
                getBugs({
                    status: filterStatus !== 'all' ? filterStatus as QABugStatus : undefined,
                    priority: filterPriority !== 'all' ? filterPriority as QABugPriority : undefined,
                    area: filterArea !== 'all' ? filterArea as QABugArea : undefined,
                }),
                getQAReport(),
            ]);

            if (bugsResult.status === 'fulfilled') {
                setBugs(bugsResult.value || []);
            }
            if (reportResult.status === 'fulfilled' && reportResult.value) {
                setReport(reportResult.value);
            }
        } catch (err: unknown) {
            logger.error('[QATab] Failed to load data', { error: err instanceof Error ? err.message : String(err) });
        } finally {
            setIsFetching(false);
        }
    }, [filterStatus, filterPriority, filterArea]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleBugCreated = (bug: QABug) => {
        setBugs(prev => [bug, ...prev]);
        // Increment report counters optimistically
        setReport(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                open: prev.open + 1,
                byPriority: {
                    ...prev.byPriority,
                    [bug.priority]: (prev.byPriority[bug.priority] || 0) + 1,
                },
            };
        });
    };

    const handleBugUpdated = (updated: QABug) => {
        setBugs(prev => prev.map(b => b.id === updated.id ? updated : b));
        setSelectedBug(updated);
    };

    const openCount = report?.open ?? bugs.filter(b => !['closed', 'wont_fix', 'verified'].includes(b.status)).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                        <Bug className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">QA Dashboard</h2>
                        <p className="text-sm text-muted-foreground">
                            Pinky — QA Engineering Director · {openCount} open bugs
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={isFetching}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={() => setReportBugOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Report Bug
                    </Button>
                </div>
            </div>

            {/* Health Header */}
            <QAHealthHeader report={report} />

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                {STATUSES.map(s => (
                                    <SelectItem key={s} value={s}>{QA_STATUS_CONFIG[s].label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterPriority} onValueChange={setFilterPriority}>
                            <SelectTrigger className="w-36">
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Priorities</SelectItem>
                                {PRIORITIES.map(p => (
                                    <SelectItem key={p} value={p}>
                                        {QA_PRIORITY_CONFIG[p].emoji} {QA_PRIORITY_CONFIG[p].label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterArea} onValueChange={setFilterArea}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Area" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Areas</SelectItem>
                                {AREAS.map(a => (
                                    <SelectItem key={a} value={a}>
                                        {QA_AREA_CONFIG[a].emoji} {QA_AREA_CONFIG[a].label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Bug Table */}
            <Card>
                <CardContent className="p-0">
                    {isFetching ? (
                        <div className="flex h-48 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : bugs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No bugs match these filters</p>
                            <Button variant="outline" size="sm" onClick={() => setReportBugOpen(true)}>
                                <Plus className="h-4 w-4 mr-2" /> Report a Bug
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground uppercase tracking-wide">
                                        <th className="py-3 px-4 text-left font-medium">ID</th>
                                        <th className="py-3 px-4 text-left font-medium">Priority</th>
                                        <th className="py-3 px-4 text-left font-medium">Area</th>
                                        <th className="py-3 px-4 text-left font-medium">Title</th>
                                        <th className="py-3 px-4 text-left font-medium">Assigned</th>
                                        <th className="py-3 px-4 text-left font-medium">Status</th>
                                        <th className="py-3 px-4" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {bugs.map(bug => (
                                        <BugRow
                                            key={bug.id}
                                            bug={bug}
                                            onClick={() => setSelectedBug(bug)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 border-t text-xs text-muted-foreground">
                                {bugs.length} bug{bugs.length !== 1 ? 's' : ''} shown
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sheets */}
            <ReportBugSheet
                open={reportBugOpen}
                onOpenChange={setReportBugOpen}
                onCreated={handleBugCreated}
            />
            <BugDetailSheet
                bug={selectedBug}
                onClose={() => setSelectedBug(null)}
                onUpdated={handleBugUpdated}
            />
        </div>
    );
}
