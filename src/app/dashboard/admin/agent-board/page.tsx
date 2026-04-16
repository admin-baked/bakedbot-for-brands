'use client';

/**
 * Agent Board — Kanban stoplight view for all agent tasks
 *
 * Real-time board showing every agent task across 5 columns:
 * ⚪ Queued | 🟡 Running | 🟠 Escalated | 🟢 Complete | 🔴 Failed
 *
 * Features:
 * - Live Firestore subscription (onSnapshot) for in-flight tasks
 * - Click card → step log drawer + feedback panel
 * - 👍 / 🚩 / 👎 feedback buttons write to agent_learning_log
 * - Agent + org filters
 */

import { useEffect, useState, useCallback } from 'react';
import { getFirestore, collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AgentTask, AgentTaskStoplight, TaskStep } from '@/types/agent-task';
import { STOPLIGHT_EMOJI } from '@/types/agent-task';

// ============================================================================
// Column config
// ============================================================================

type Column = {
    key: AgentTaskStoplight;
    label: string;
    statuses: AgentTask['status'][];
    headerClass: string;
    dotClass: string;
};

const COLUMNS: Column[] = [
    { key: 'gray',   label: 'Queued',    statuses: ['open'],                       headerClass: 'border-gray-300  bg-gray-50',   dotClass: 'bg-gray-400'  },
    { key: 'yellow', label: 'Running',   statuses: ['claimed', 'in_progress'],     headerClass: 'border-yellow-300 bg-yellow-50', dotClass: 'bg-yellow-400' },
    { key: 'orange', label: 'Escalated', statuses: ['escalated'],                  headerClass: 'border-orange-300 bg-orange-50', dotClass: 'bg-orange-400' },
    { key: 'green',  label: 'Complete',  statuses: ['done'],                       headerClass: 'border-green-300  bg-green-50',  dotClass: 'bg-green-500'  },
    { key: 'red',    label: 'Failed',    statuses: ['wont_fix'],                   headerClass: 'border-red-300    bg-red-50',    dotClass: 'bg-red-500'    },
];

// ============================================================================
// Helpers
// ============================================================================

function elapsed(iso?: string): string {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
}

const PRIORITY_COLOR: Record<AgentTask['priority'], string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    normal:   'bg-blue-100 text-blue-700 border-blue-200',
    low:      'bg-gray-100 text-gray-600 border-gray-200',
};

const STEP_ICON: Record<TaskStep['status'], string> = {
    pending:  '○',
    running:  '⏳',
    complete: '✅',
    failed:   '❌',
};

// ============================================================================
// Task Card
// ============================================================================

function TaskCard({ task, onClick }: { task: AgentTask; onClick: () => void }) {
    const col = COLUMNS.find(c => c.key === (task.stoplight ?? 'gray'))!;
    const completedSteps = (task.steps || []).filter(s => s.status === 'complete').length;
    const totalSteps = (task.steps || []).length;

    return (
        <button
            onClick={onClick}
            className="w-full text-left rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group"
        >
            {/* Stoplight dot + title */}
            <div className="flex items-start gap-2">
                <span className={cn('mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full', col.dotClass)} />
                <span className="text-sm font-medium text-gray-900 leading-snug group-hover:text-blue-700 line-clamp-2">
                    {task.title}
                </span>
            </div>

            {/* Meta row */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', PRIORITY_COLOR[task.priority])}>
                    {task.priority}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500">
                    {task.category}
                </Badge>
                {task.assignedTo && (
                    <span className="text-[10px] text-gray-400">→ {task.assignedTo}</span>
                )}
            </div>

            {/* Progress bar */}
            {totalSteps > 0 && (
                <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>{completedSteps}/{totalSteps} steps</span>
                        <span>{elapsed(task.startedAt || task.createdAt)}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-gray-100">
                        <div
                            className={cn('h-1 rounded-full transition-all', col.dotClass)}
                            style={{ width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Feedback badge */}
            {task.humanFeedback && (
                <div className="mt-2 text-[10px] text-gray-400">
                    {task.humanFeedback.rating === 'approved'          ? '👍 Approved' :
                     task.humanFeedback.rating === 'needs_improvement' ? '🚩 Needs work' : '👎 Rejected'}
                    {' '}by {task.humanFeedback.reviewedBy}
                </div>
            )}
        </button>
    );
}

// ============================================================================
// Detail Drawer
// ============================================================================

function TaskDrawer({
    task,
    open,
    onClose,
    onFeedback,
}: {
    task: AgentTask | null;
    open: boolean;
    onClose: () => void;
    onFeedback: (taskId: string, rating: string, note: string) => Promise<void>;
}) {
    const [note, setNote]           = useState('');
    const [submitting, setSubmit]   = useState(false);

    if (!task) return null;

    const col = COLUMNS.find(c => c.key === (task.stoplight ?? 'gray'))!;
    const hasFeedback = !!task.humanFeedback;
    const canFeedback = !hasFeedback && (task.stoplight === 'green' || task.stoplight === 'red' || task.stoplight === 'orange');

    async function submit(rating: string) {
        setSubmit(true);
        await onFeedback(task!.id, rating, note);
        setNote('');
        setSubmit(false);
    }

    return (
        <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
            <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <span className={cn('h-3 w-3 rounded-full flex-shrink-0', col.dotClass)} />
                        <span className="line-clamp-2">{task.title}</span>
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-5 text-sm">
                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div><span className="text-gray-400">Agent</span><br /><span className="font-medium">{task.assignedTo || task.reportedBy}</span></div>
                        <div><span className="text-gray-400">Status</span><br /><span className="font-medium capitalize">{task.status.replace('_', ' ')}</span></div>
                        <div><span className="text-gray-400">Priority</span><br /><span className="font-medium capitalize">{task.priority}</span></div>
                        <div><span className="text-gray-400">Category</span><br /><span className="font-medium">{task.category}</span></div>
                        {task.orgId && <div><span className="text-gray-400">Org</span><br /><span className="font-medium">{task.orgId}</span></div>}
                        <div><span className="text-gray-400">Created</span><br /><span className="font-medium">{elapsed(task.createdAt)} ago</span></div>
                    </div>

                    {/* Body */}
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{task.body}</p>
                    </div>

                    {/* Steps */}
                    {task.steps && task.steps.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Execution Log</p>
                            <ol className="space-y-1.5">
                                {task.steps.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="text-base leading-none mt-0.5">{STEP_ICON[s.status]}</span>
                                        <div>
                                            <span className={cn('font-medium', s.status === 'failed' ? 'text-red-600' : 'text-gray-800')}>
                                                {s.label}
                                            </span>
                                            {s.notes && <p className="text-gray-400 text-xs">{s.notes}</p>}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {/* Error snippet */}
                    {task.errorSnippet && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Error</p>
                            <pre className="text-xs bg-red-50 border border-red-100 rounded p-2 overflow-auto max-h-32 text-red-700">
                                {task.errorSnippet}
                            </pre>
                        </div>
                    )}

                    {/* Resolution note */}
                    {task.resolutionNote && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resolution</p>
                            <p className="text-gray-700 text-sm">{task.resolutionNote}</p>
                        </div>
                    )}

                    {/* Existing feedback */}
                    {task.humanFeedback && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Your Feedback</p>
                            <p className="font-medium">
                                {task.humanFeedback.rating === 'approved'          ? '👍 Approved' :
                                 task.humanFeedback.rating === 'needs_improvement' ? '🚩 Needs Work' : '👎 Rejected'}
                            </p>
                            {task.humanFeedback.note && <p className="text-gray-600 mt-1">{task.humanFeedback.note}</p>}
                            <p className="text-[10px] text-gray-400 mt-1">by {task.humanFeedback.reviewedBy}</p>
                        </div>
                    )}

                    {/* Feedback input */}
                    {canFeedback && (
                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
                            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Leave Feedback</p>
                            <Textarea
                                placeholder="Optional: what went well / what should improve..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={3}
                                className="text-sm"
                            />
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={() => submit('approved')}
                                    disabled={submitting}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    👍 Approve
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => submit('needs_improvement')}
                                    disabled={submitting}
                                >
                                    🚩 Needs Work
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => submit('rejected')}
                                    disabled={submitting}
                                >
                                    👎 Reject
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ============================================================================
// Column
// ============================================================================

function BoardColumn({ col, tasks, onCardClick }: { col: Column; tasks: AgentTask[]; onCardClick: (t: AgentTask) => void }) {
    return (
        <div className="flex flex-col min-w-[240px] max-w-[280px] flex-shrink-0">
            {/* Header */}
            <div className={cn('rounded-t-lg border-t border-x px-3 py-2 flex items-center justify-between', col.headerClass)}>
                <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', col.dotClass)} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-white rounded-full px-2 py-0.5 border">{tasks.length}</span>
            </div>

            {/* Cards */}
            <div className={cn('flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px]', col.headerClass)}>
                {tasks.length === 0 && (
                    <p className="text-center text-[11px] text-gray-300 pt-6">No tasks</p>
                )}
                {tasks.map(t => (
                    <TaskCard key={t.id} task={t} onClick={() => onCardClick(t)} />
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Page
// ============================================================================

export default function AgentBoardPage() {
    const [tasks, setTasks]             = useState<AgentTask[]>([]);
    const [loading, setLoading]         = useState(true);
    const [agentFilter, setAgentFilter] = useState('');
    const [orgFilter, setOrgFilter]     = useState('');
    const [selected, setSelected]       = useState<AgentTask | null>(null);
    const [drawerOpen, setDrawerOpen]   = useState(false);
    const [feedback, setFeedback]       = useState<Record<string, string>>({});

    // Live Firestore subscription
    useEffect(() => {
        let db: ReturnType<typeof getFirestore>;
        try {
            db = getFirestore(getApp());
        } catch {
            setLoading(false);
            return;
        }

        const activeQ = query(
            collection(db, 'agent_tasks'),
            where('status', 'in', ['open', 'claimed', 'in_progress', 'escalated']),
            orderBy('createdAt', 'desc'),
            limit(100),
        );

        const recentQ = query(
            collection(db, 'agent_tasks'),
            where('status', 'in', ['done', 'wont_fix']),
            orderBy('updatedAt', 'desc'),
            limit(30),
        );

        const activeTasks  = new Map<string, AgentTask>();
        const recentTasks  = new Map<string, AgentTask>();

        const merge = () => {
            setTasks([...activeTasks.values(), ...recentTasks.values()]);
        };

        const unsubActive = onSnapshot(activeQ, snap => {
            snap.docs.forEach(d => activeTasks.set(d.id, { id: d.id, ...d.data() } as AgentTask));
            snap.docChanges().forEach(c => {
                if (c.type === 'removed') activeTasks.delete(c.doc.id);
            });
            merge();
            setLoading(false);
        });

        const unsubRecent = onSnapshot(recentQ, snap => {
            snap.docs.forEach(d => recentTasks.set(d.id, { id: d.id, ...d.data() } as AgentTask));
            snap.docChanges().forEach(c => {
                if (c.type === 'removed') recentTasks.delete(c.doc.id);
            });
            merge();
        });

        return () => { unsubActive(); unsubRecent(); };
    }, []);

    // Keep drawer task in sync with live updates
    useEffect(() => {
        if (!selected) return;
        const live = tasks.find(t => t.id === selected.id);
        if (live) setSelected(live);
    }, [tasks, selected?.id]);

    const handleFeedback = useCallback(async (taskId: string, rating: string, note: string) => {
        const resp = await fetch(`/api/agent-tasks/${taskId}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, note, reviewedBy: 'martez@bakedbot.ai' }),
        });
        if (resp.ok) {
            setFeedback(prev => ({ ...prev, [taskId]: rating }));
        }
    }, []);

    // Filter tasks
    const filtered = tasks.filter(t => {
        const agent = agentFilter.toLowerCase();
        const org   = orgFilter.toLowerCase();
        const matchAgent = !agent ||
            (t.assignedTo || '').toLowerCase().includes(agent) ||
            (t.reportedBy || '').toLowerCase().includes(agent);
        const matchOrg = !org || (t.orgId || '').toLowerCase().includes(org);
        return matchAgent && matchOrg;
    });

    // Group into columns
    const colTasks = (col: Column) =>
        filtered.filter(t => (t.stoplight ?? 'gray') === col.key);

    return (
        <div className="flex flex-col h-full">
            {/* Page header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Agent Board</h1>
                    <p className="text-sm text-gray-500">Live view of every agent task · {filtered.length} tasks</p>
                </div>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Filter by agent…"
                        value={agentFilter}
                        onChange={e => setAgentFilter(e.target.value)}
                        className="h-8 w-36 text-sm"
                    />
                    <Input
                        placeholder="Filter by org…"
                        value={orgFilter}
                        onChange={e => setOrgFilter(e.target.value)}
                        className="h-8 w-36 text-sm"
                    />
                    {(agentFilter || orgFilter) && (
                        <Button variant="ghost" size="sm" onClick={() => { setAgentFilter(''); setOrgFilter(''); }}>
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Board */}
            <div className="flex-1 overflow-auto p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading tasks…</div>
                ) : (
                    <div className="flex gap-4 items-start min-w-max">
                        {COLUMNS.map(col => (
                            <BoardColumn
                                key={col.key}
                                col={col}
                                tasks={colTasks(col)}
                                onCardClick={t => { setSelected(t); setDrawerOpen(true); }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Legend */}
            <div className="px-6 py-2 border-t bg-gray-50 flex gap-4 text-xs text-gray-400">
                {COLUMNS.map(c => (
                    <span key={c.key} className="flex items-center gap-1">
                        <span className={cn('h-2 w-2 rounded-full', c.dotClass)} />
                        {STOPLIGHT_EMOJI[c.key]} {c.label}
                    </span>
                ))}
            </div>

            {/* Detail drawer */}
            <TaskDrawer
                task={selected}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelected(null); }}
                onFeedback={handleFeedback}
            />
        </div>
    );
}
