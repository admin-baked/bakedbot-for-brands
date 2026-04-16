'use client';

/**
 * Agent Task Board — Super User Dashboard Panel
 *
 * Renders the agent_tasks collection as a readable markdown-style board.
 * Tasks can be created by agents, crons, or Opencode via /api/agent-tasks.
 * Super users can claim and resolve tasks from this panel.
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    CheckCircle2,
    Circle,
    Clock,
    AlertTriangle,
    XCircle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentTask, AgentTaskStatus, AgentTaskPriority } from '@/types/agent-task';

// --- Helpers ---

const statusConfig: Record<AgentTaskStatus, { icon: typeof Circle; color: string; label: string }> = {
    open: { icon: Circle, color: 'text-blue-500', label: 'Open' },
    claimed: { icon: Clock, color: 'text-amber-500', label: 'Claimed' },
    in_progress: { icon: Clock, color: 'text-amber-500', label: 'In Progress' },
    escalated: { icon: Clock, color: 'text-orange-500', label: 'Escalated' },
    done: { icon: CheckCircle2, color: 'text-green-500', label: 'Done' },
    wont_fix: { icon: XCircle, color: 'text-muted-foreground', label: "Won't Fix" },
};

const priorityConfig: Record<AgentTaskPriority, { color: string; bg: string }> = {
    critical: { color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
    high: { color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200' },
    normal: { color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
    low: { color: 'text-muted-foreground', bg: 'bg-muted border-border' },
};

// --- Task Card ---

function TaskCard({
    task,
    onClaim,
    onComplete,
}: {
    task: AgentTask;
    onClaim: (id: string) => void;
    onComplete: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const status = statusConfig[task.status];
    const priority = priorityConfig[task.priority];
    const StatusIcon = status.icon;

    return (
        <div className={cn("rounded-lg border p-3 space-y-2", priority.bg)}>
            <div className="flex items-start gap-2">
                <StatusIcon className={cn("h-4 w-4 mt-0.5 shrink-0", status.color)} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{task.title}</p>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.color)}>
                            {task.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {task.category}
                        </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        by {task.reportedBy} &middot; {new Date(task.createdAt).toLocaleDateString()}
                        {task.assignedTo && ` &middot; assigned to ${task.assignedTo}`}
                    </p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => setExpanded(!expanded)}
                >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </Button>
            </div>

            {expanded && (
                <div className="pl-6 space-y-2">
                    {/* Render body as simple text with line breaks */}
                    <div className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                        {task.body}
                    </div>

                    {task.filePath && (
                        <p className="text-[11px] text-muted-foreground">
                            File: <code className="bg-background px-1 py-0.5 rounded text-[10px]">{task.filePath}</code>
                        </p>
                    )}

                    {task.errorSnippet && (
                        <pre className="text-[10px] bg-background rounded p-2 overflow-x-auto border">
                            {task.errorSnippet}
                        </pre>
                    )}

                    {task.resolutionNote && (
                        <div className="border-t pt-2 mt-2">
                            <p className="text-[11px] font-medium text-green-700">Resolution:</p>
                            <p className="text-xs text-foreground/80">{task.resolutionNote}</p>
                            {task.resolvedCommit && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    Fixed in: <code>{task.resolvedCommit}</code>
                                </p>
                            )}
                        </div>
                    )}

                    {/* Action buttons */}
                    {task.status === 'open' && (
                        <div className="flex gap-2 pt-1">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => onClaim(task.id)}
                            >
                                Claim Task
                            </Button>
                        </div>
                    )}
                    {(task.status === 'claimed' || task.status === 'in_progress') && (
                        <div className="flex gap-2 pt-1">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                onClick={() => onComplete(task.id)}
                            >
                                Mark Done
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Main Board Component ---

export default function AgentTaskBoard() {
    const [tasks, setTasks] = useState<AgentTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDone, setShowDone] = useState(false);

    const loadTasks = useCallback(async () => {
        setLoading(true);
        try {
            const { listAgentTasks } = await import('@/server/actions/agent-tasks');
            const [activeResult, doneResult] = await Promise.all([
                listAgentTasks({ status: ['open', 'claimed', 'in_progress'], limit: 30 }),
                listAgentTasks({ status: ['done', 'wont_fix'], limit: 10 }),
            ]);
            setTasks([...(activeResult.tasks || []), ...(doneResult.tasks || [])]);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    const handleClaim = async (taskId: string) => {
        const { claimTask } = await import('@/server/actions/agent-tasks');
        const result = await claimTask(taskId, 'super_user');
        if (result.success) loadTasks();
    };

    const handleComplete = async (taskId: string) => {
        const { updateTaskStatus } = await import('@/server/actions/agent-tasks');
        const result = await updateTaskStatus(taskId, 'done');
        if (result.success) loadTasks();
    };

    const activeTasks = tasks.filter(t => t.status === 'open' || t.status === 'claimed' || t.status === 'in_progress');
    const doneTasks = tasks.filter(t => t.status === 'done' || t.status === 'wont_fix');

    return (
        <Card>
            <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                            Agent Task Board
                        </CardTitle>
                        <CardDescription className="text-[11px]">
                            Work items filed by agents, crons, and tools
                        </CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={loadTasks}
                        disabled={loading}
                    >
                        <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
                {loading && tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : activeTasks.length === 0 ? (
                    <div className="text-center py-6">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No open tasks</p>
                        <p className="text-[11px] text-muted-foreground">Agents will file findings here automatically</p>
                    </div>
                ) : (
                    activeTasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onClaim={handleClaim}
                            onComplete={handleComplete}
                        />
                    ))
                )}

                {/* Completed tasks toggle */}
                {doneTasks.length > 0 && (
                    <>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground"
                            onClick={() => setShowDone(!showDone)}
                        >
                            {showDone ? 'Hide' : 'Show'} {doneTasks.length} completed task{doneTasks.length !== 1 ? 's' : ''}
                        </Button>
                        {showDone && doneTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onClaim={handleClaim}
                                onComplete={handleComplete}
                            />
                        ))}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
