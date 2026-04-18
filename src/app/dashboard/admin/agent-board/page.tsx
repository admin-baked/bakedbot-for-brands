'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AgentTask, AgentTaskStoplight, TaskStep } from '@/types/agent-task';
import { STOPLIGHT_EMOJI } from '@/types/agent-task';
import type { RevenueGoal } from '@/types/revenue-goal';
import { createGoalAndDecompose } from '@/server/actions/revenue-goals';

// ── Column config ─────────────────────────────────────────────────────────────

type Column = { key: AgentTaskStoplight; label: string; headerClass: string; dotClass: string };

const COLUMNS: Column[] = [
    { key: 'gray',   label: 'Queued',    headerClass: 'border-gray-300   bg-gray-50',    dotClass: 'bg-gray-400'    },
    { key: 'yellow', label: 'Running',   headerClass: 'border-yellow-300 bg-yellow-50',  dotClass: 'bg-yellow-400'  },
    { key: 'orange', label: 'Escalated', headerClass: 'border-orange-300 bg-orange-50',  dotClass: 'bg-orange-400'  },
    { key: 'purple', label: 'Review',    headerClass: 'border-purple-300 bg-purple-50',  dotClass: 'bg-purple-500'  },
    { key: 'green',  label: 'Complete',  headerClass: 'border-green-300  bg-green-50',   dotClass: 'bg-green-500'   },
    { key: 'red',    label: 'Failed',    headerClass: 'border-red-300    bg-red-50',     dotClass: 'bg-red-500'     },
];

type BoardColumns = { gray: AgentTask[]; yellow: AgentTask[]; orange: AgentTask[]; purple: AgentTask[]; green: AgentTask[]; red: AgentTask[] };
const EMPTY_COLUMNS: BoardColumns = { gray: [], yellow: [], orange: [], purple: [], green: [], red: [] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(iso?: string): string {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function daysUntil(iso: string): number {
    return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtUSD(n: number): string {
    return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
}

const PRIORITY_COLOR: Record<AgentTask['priority'], string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high:     'bg-orange-100 text-orange-700 border-orange-200',
    normal:   'bg-blue-100 text-blue-700 border-blue-200',
    low:      'bg-gray-100 text-gray-600 border-gray-200',
};

const STEP_ICON: Record<TaskStep['status'], string> = {
    pending: '○', running: '⏳', complete: '✅', failed: '❌',
};

const BUSINESS_AGENT_EMOJI: Record<string, string> = {
    // Executive Boardroom
    marty: '🎯', jack: '💰', glenda: '📣', mike_exec: '🏦', leo: '⚙️', linus: '🖥️',
    // Specialist agents
    craig: '📱', smokey: '🌿', mrs_parker: '💌', ezal: '👀', pops: '📊', deebo: '⚖️',
};

// ── MRR Progress Header ───────────────────────────────────────────────────────

function MRRHeader({
    goals,
    onSetGoal,
}: {
    goals: RevenueGoal[];
    onSetGoal: () => void;
}) {
    const active = goals.find(g => g.status === 'active') ?? goals[0] ?? null;

    if (!active) {
        return (
            <div className="mx-6 mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-5 py-4 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">No active revenue goal</p>
                    <p className="text-xs text-gray-400 mt-0.5">Set a target and Marty will decompose it into tasks</p>
                </div>
                <Button size="sm" onClick={onSetGoal} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    🎯 Set Revenue Goal
                </Button>
            </div>
        );
    }

    const pct = Math.min(100, Math.round((active.currentMRR / active.targetMRR) * 100));
    const days = daysUntil(active.deadline);
    const gap = active.targetMRR - active.currentMRR;
    const weeklyNeeded = days > 0 ? Math.ceil(gap / (days / 7)) : gap;

    return (
        <div className="mx-6 mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Revenue Goal</span>
                        {active.estimatedTotalImpactUSD && (
                            <span className="text-xs text-indigo-400">· {fmtUSD(active.estimatedTotalImpactUSD)} estimated pipeline</span>
                        )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{active.title}</p>

                    {/* Progress bar */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span className="font-medium">{fmtUSD(active.currentMRR)} MRR</span>
                            <span>{pct}% → {fmtUSD(active.targetMRR)}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-indigo-100">
                            <div
                                className={cn('h-2 rounded-full transition-all', pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-orange-400')}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-center flex-shrink-0">
                    <div>
                        <p className="text-lg font-bold text-gray-900">{days > 0 ? days : 0}</p>
                        <p className="text-[10px] text-gray-400">days left</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-orange-600">{fmtUSD(weeklyNeeded)}</p>
                        <p className="text-[10px] text-gray-400">needed/wk</p>
                    </div>
                    <div>
                        <p className="text-lg font-bold text-gray-900">{active.taskIds?.length ?? 0}</p>
                        <p className="text-[10px] text-gray-400">tasks</p>
                    </div>
                </div>

                <Button size="sm" variant="outline" onClick={onSetGoal} className="flex-shrink-0 text-indigo-600 border-indigo-200 hover:bg-indigo-100">
                    + New Goal
                </Button>
            </div>

            {active.decompositionReasoning && (
                <p className="mt-2 text-xs text-indigo-600 italic">{active.decompositionReasoning}</p>
            )}
        </div>
    );
}

// ── Set Goal Modal ────────────────────────────────────────────────────────────

function SetGoalModal({
    open,
    onClose,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [title, setTitle]         = useState('');
    const [targetMRR, setTargetMRR] = useState('');
    const [currentMRR, setCurrentMRR] = useState('');
    const [deadline, setDeadline]   = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const [status, setStatus]       = useState('');

    async function submit() {
        if (!title || !targetMRR || !currentMRR || !deadline) {
            setError('All fields required');
            return;
        }
        setLoading(true);
        setError('');
        setStatus('🎯 Marty is decomposing your goal into tasks…');
        try {
            const result = await createGoalAndDecompose({
                title,
                targetMRR: Number(targetMRR),
                currentMRR: Number(currentMRR),
                deadline,
            });
            if (!result.success) {
                setError(result.error);
                setStatus('');
            } else {
                setStatus(`✅ ${result.goal.taskIds.length} tasks created!`);
                setTimeout(() => { onSuccess(); onClose(); setStatus(''); }, 1200);
            }
        } catch {
            setError('Something went wrong. Try again.');
            setStatus('');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose(); }}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>🎯 Set Revenue Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Goal title</Label>
                        <Input
                            placeholder="e.g. Grow MRR to $50k by June 1"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>Current MRR ($)</Label>
                            <Input
                                type="number"
                                placeholder="925"
                                value={currentMRR}
                                onChange={e => setCurrentMRR(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Target MRR ($)</Label>
                            <Input
                                type="number"
                                placeholder="50000"
                                value={targetMRR}
                                onChange={e => setTargetMRR(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label>Deadline</Label>
                        <Input
                            type="date"
                            value={deadline}
                            onChange={e => setDeadline(e.target.value)}
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {status && <p className="text-sm text-indigo-600 font-medium">{status}</p>}
                    <p className="text-xs text-gray-400">
                        Marty will use Claude to decompose this goal into tasks and assign them to the right agents.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
                    <Button onClick={submit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        {loading ? 'Decomposing…' : '🎯 Decompose with Marty'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: AgentTask; onClick: () => void }) {
    const col = COLUMNS.find(c => c.key === (task.stoplight ?? 'gray'))!;
    const completedSteps = (task.steps || []).filter(s => s.status === 'complete').length;
    const totalSteps = (task.steps || []).length;
    const agentEmoji = task.businessAgent ? (BUSINESS_AGENT_EMOJI[task.businessAgent] ?? '🔧') : null;
    const isReview = task.status === 'awaiting_approval';
    const hasArtifact = !!task.artifact;

    return (
        <button
            onClick={onClick}
            className="w-full text-left rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md hover:border-gray-300 transition-all group"
        >
            <div className="flex items-start gap-2">
                <span className={cn('mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full', col.dotClass)} />
                <span className="text-sm font-medium text-gray-900 leading-snug group-hover:text-blue-700 line-clamp-2">
                    {task.title}
                </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', PRIORITY_COLOR[task.priority])}>
                    {task.priority}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-500">
                    {task.category}
                </Badge>
                {agentEmoji && (
                    <span className="text-[10px] text-gray-500">{agentEmoji} {task.businessAgent}</span>
                )}
                {task.estimatedImpactUSD !== undefined && (
                    <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0">
                        {fmtUSD(task.estimatedImpactUSD)}
                    </span>
                )}
                {isReview && hasArtifact && (
                    <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0">
                        📎 {task.artifact!.type}
                    </span>
                )}
                {task.subTaskIds && task.subTaskIds.length > 0 && (
                    <span className="text-[10px] text-gray-400">↳ {task.subTaskIds.length} sub</span>
                )}
                {task.parentTaskId && (
                    <span className="text-[10px] text-gray-400">↑ sub-task</span>
                )}
                {(task.rejectionCount ?? 0) > 0 && (
                    <span className="text-[10px] text-red-500">↺ retry {task.rejectionCount}</span>
                )}
            </div>

            {totalSteps > 0 && (
                <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
                        <span>{completedSteps}/{totalSteps} steps</span>
                        <span>{elapsed(task.startedAt || task.createdAt)}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-gray-100">
                        <div
                            className={cn('h-1 rounded-full transition-all', col.dotClass)}
                            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>
            )}

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

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function TaskDrawer({ task, open, onClose, onFeedback }: {
    task: AgentTask | null;
    open: boolean;
    onClose: () => void;
    onFeedback: (taskId: string, rating: string, note: string) => Promise<void>;
}) {
    const [note, setNote]         = useState('');
    const [submitting, setSubmit] = useState(false);
    if (!task) return null;

    const col = COLUMNS.find(c => c.key === (task.stoplight ?? 'gray'))!;
    const hasFeedback = !!task.humanFeedback;
    const isAwaitingApproval = task.status === 'awaiting_approval';
    const canFeedback = !hasFeedback && (isAwaitingApproval || task.stoplight === 'green' || task.stoplight === 'red' || task.stoplight === 'orange');

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
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div><span className="text-gray-400">Agent</span><br /><span className="font-medium">{task.businessAgent ?? task.assignedTo ?? task.reportedBy}</span></div>
                        <div><span className="text-gray-400">Status</span><br /><span className="font-medium capitalize">{task.status.replace('_', ' ')}</span></div>
                        <div><span className="text-gray-400">Priority</span><br /><span className="font-medium capitalize">{task.priority}</span></div>
                        <div><span className="text-gray-400">Category</span><br /><span className="font-medium">{task.category}</span></div>
                        {task.estimatedImpactUSD !== undefined && (
                            <div><span className="text-gray-400">Est. Impact</span><br /><span className="font-semibold text-green-700">{fmtUSD(task.estimatedImpactUSD)}</span></div>
                        )}
                        {task.resolvedImpactUSD !== undefined && (
                            <div><span className="text-gray-400">Actual Impact</span><br /><span className="font-semibold text-green-700">{fmtUSD(task.resolvedImpactUSD)}</span></div>
                        )}
                        {task.playbookId && (
                            <div><span className="text-gray-400">Playbook</span><br /><span className="font-medium font-mono text-xs">{task.playbookId}</span></div>
                        )}
                        {task.orgId && <div><span className="text-gray-400">Org</span><br /><span className="font-medium">{task.orgId}</span></div>}
                        <div><span className="text-gray-400">Created</span><br /><span className="font-medium">{elapsed(task.createdAt)} ago</span></div>
                    </div>

                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
                        <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{task.body}</p>
                    </div>

                    {task.steps && task.steps.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Execution Log</p>
                            <ol className="space-y-1.5">
                                {task.steps.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <span className="text-base leading-none mt-0.5">{STEP_ICON[s.status]}</span>
                                        <div>
                                            <span className={cn('font-medium', s.status === 'failed' ? 'text-red-600' : 'text-gray-800')}>{s.label}</span>
                                            {s.notes && <p className="text-gray-400 text-xs">{s.notes}</p>}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    {task.errorSnippet && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Error</p>
                            <pre className="text-xs bg-red-50 border border-red-100 rounded p-2 overflow-auto max-h-32 text-red-700">{task.errorSnippet}</pre>
                        </div>
                    )}

                    {task.resolutionNote && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resolution</p>
                            <p className="text-gray-700 text-sm">{task.resolutionNote}</p>
                        </div>
                    )}

                    {task.artifact && (
                        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                                    📎 Agent Output — {task.artifact.type}
                                </p>
                                <span className="text-[10px] text-purple-400">by {task.artifact.generatedBy}</span>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{task.artifact.title}</p>
                            <pre className="text-xs bg-white border border-purple-100 rounded p-2 overflow-auto max-h-64 text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {task.artifact.content}
                            </pre>
                        </div>
                    )}

                    {task.subTaskIds && task.subTaskIds.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                Sub-tasks ({task.subTaskIds.length})
                            </p>
                            <p className="text-xs text-gray-400">Specialists spawned to support this task.</p>
                        </div>
                    )}

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

                    {canFeedback && (
                        <div className={cn(
                            'rounded-lg border p-3 space-y-3',
                            isAwaitingApproval
                                ? 'border-purple-200 bg-purple-50'
                                : 'border-blue-100 bg-blue-50'
                        )}>
                            <p className={cn('text-xs font-semibold uppercase tracking-wide', isAwaitingApproval ? 'text-purple-700' : 'text-blue-700')}>
                                {isAwaitingApproval ? '🟣 Review Agent Output' : 'Leave Feedback'}
                            </p>
                            {isAwaitingApproval && (
                                <p className="text-xs text-purple-600">Approve to mark done. Reject to re-queue with your notes — the agent will retry with your feedback.</p>
                            )}
                            <Textarea
                                placeholder="Optional: what went well / what should improve..."
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                rows={3}
                                className="text-sm"
                            />
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => submit('approved')} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white">👍 Approve</Button>
                                <Button size="sm" variant="outline" onClick={() => submit('needs_improvement')} disabled={submitting}>🚩 Needs Work</Button>
                                <Button size="sm" variant="destructive" onClick={() => submit('rejected')} disabled={submitting}>👎 Reject</Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ── Board Column ──────────────────────────────────────────────────────────────

function BoardColumn({ col, tasks, onCardClick }: { col: Column; tasks: AgentTask[]; onCardClick: (t: AgentTask) => void }) {
    const colImpact = tasks.reduce((s, t) => s + (t.estimatedImpactUSD ?? 0), 0);
    return (
        <div className="flex flex-col min-w-[240px] max-w-[280px] flex-shrink-0">
            <div className={cn('rounded-t-lg border-t border-x px-3 py-2 flex items-center justify-between', col.headerClass)}>
                <div className="flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', col.dotClass)} />
                    <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {colImpact > 0 && <span className="text-[10px] font-medium text-green-700">{fmtUSD(colImpact)}</span>}
                    <span className="text-xs font-medium text-gray-400 bg-white rounded-full px-2 py-0.5 border">{tasks.length}</span>
                </div>
            </div>
            <div className={cn('flex-1 rounded-b-lg border border-t-0 p-2 space-y-2 min-h-[200px]', col.headerClass)}>
                {tasks.length === 0 && <p className="text-center text-[11px] text-gray-300 pt-6">No tasks</p>}
                {tasks.map(t => <TaskCard key={t.id} task={t} onClick={() => onCardClick(t)} />)}
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 8_000;

export default function AgentBoardPage() {
    const [columns, setColumns]         = useState<BoardColumns>(EMPTY_COLUMNS);
    const [goals, setGoals]             = useState<RevenueGoal[]>([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [agentFilter, setAgentFilter] = useState('');
    const [orgFilter, setOrgFilter]     = useState('');
    const [selected, setSelected]       = useState<AgentTask | null>(null);
    const [drawerOpen, setDrawerOpen]   = useState(false);
    const [goalModalOpen, setGoalModalOpen] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchBoard = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/agent-board', { credentials: 'same-origin' });
            if (!res.ok) { setError(`Board unavailable (${res.status})`); return; }
            const data = await res.json() as { columns: BoardColumns; activeGoals?: RevenueGoal[] };
            // Backfill purple column if not present (older API responses)
            if (!data.columns.purple) data.columns.purple = [];
            setColumns(data.columns ?? EMPTY_COLUMNS);
            setGoals(data.activeGoals ?? []);
            setError(null);
            setLastUpdated(new Date());
        } catch {
            setError('Failed to load board');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBoard();
        intervalRef.current = setInterval(fetchBoard, POLL_INTERVAL_MS);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [fetchBoard]);

    useEffect(() => {
        if (!selected) return;
        const allTasks = [...columns.gray, ...columns.yellow, ...columns.orange, ...(columns.purple ?? []), ...columns.green, ...columns.red];
        const live = allTasks.find(t => t.id === selected.id);
        if (live) setSelected(live);
    }, [columns, selected?.id]);

    const handleFeedback = useCallback(async (taskId: string, rating: string, note: string) => {
        const resp = await fetch(`/api/agent-tasks/${taskId}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, note, reviewedBy: 'martez@bakedbot.ai' }),
        });
        if (resp.ok) await fetchBoard();
    }, [fetchBoard]);

    const filterTasks = useCallback((tasks: AgentTask[]) => {
        const agent = agentFilter.toLowerCase();
        const org   = orgFilter.toLowerCase();
        return tasks.filter(t => {
            const matchAgent = !agent || (t.assignedTo || '').toLowerCase().includes(agent) || (t.reportedBy || '').toLowerCase().includes(agent) || (t.businessAgent || '').toLowerCase().includes(agent);
            const matchOrg   = !org   || (t.orgId || '').toLowerCase().includes(org);
            return matchAgent && matchOrg;
        });
    }, [agentFilter, orgFilter]);

    const filteredColumns = {
        gray:   filterTasks(columns.gray),
        yellow: filterTasks(columns.yellow),
        orange: filterTasks(columns.orange),
        purple: filterTasks(columns.purple ?? []),
        green:  filterTasks(columns.green),
        red:    filterTasks(columns.red),
    };
    const filteredTotal    = Object.values(filteredColumns).reduce((s, col) => s + col.length, 0);
    const totalPipeline    = [...columns.gray, ...columns.yellow].reduce((s, t) => s + (t.estimatedImpactUSD ?? 0), 0);

    return (
        <div className="flex flex-col h-full">
            {/* Page header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">Agent Board</h1>
                    <p className="text-sm text-gray-500">
                        {filteredTotal} tasks
                        {totalPipeline > 0 && <span className="ml-2 text-green-600 font-medium">· {fmtUSD(totalPipeline)} pipeline</span>}
                        {lastUpdated && <span className="ml-2 text-gray-400">· updated {elapsed(lastUpdated.toISOString())} ago</span>}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Input placeholder="Filter by agent…" value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className="h-8 w-36 text-sm" />
                    <Input placeholder="Filter by org…"   value={orgFilter}   onChange={e => setOrgFilter(e.target.value)}   className="h-8 w-36 text-sm" />
                    {(agentFilter || orgFilter) && (
                        <Button variant="ghost" size="sm" onClick={() => { setAgentFilter(''); setOrgFilter(''); }}>Clear</Button>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchBoard}>Refresh</Button>
                </div>
            </div>

            {/* MRR Progress Header */}
            <MRRHeader goals={goals} onSetGoal={() => setGoalModalOpen(true)} />

            {error && (
                <div className="mx-6 mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>
            )}

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
                                tasks={filteredColumns[col.key]}
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
                <span className="ml-auto">Polls every 8s</span>
            </div>

            <TaskDrawer task={selected} open={drawerOpen} onClose={() => { setDrawerOpen(false); setSelected(null); }} onFeedback={handleFeedback} />
            <SetGoalModal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} onSuccess={fetchBoard} />
        </div>
    );
}
