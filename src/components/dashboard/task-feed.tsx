'use client';

/**
 * Task Feed Component
 * Shows running, pending approval, and completed tasks
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Loader2,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    FileText,
    Link as LinkIcon
} from 'lucide-react';
import type { Task, TaskStatus } from '@/types/agent-workspace';
import { useUserRole } from '@/hooks/use-user-role';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<TaskStatus, string> = {
    running: 'bg-blue-500',
    needs_approval: 'bg-yellow-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500'
};

const STATUS_LABELS: Record<TaskStatus, string> = {
    running: 'Running',
    needs_approval: 'Needs Approval',
    completed: 'Completed',
    failed: 'Failed'
};

interface TaskItemProps {
    task: Task;
    onViewDetails?: (taskId: string) => void;
    onApprove?: (taskId: string) => void;
}

function TaskItem({ task, onViewDetails, onApprove }: TaskItemProps) {
    const showProgress = task.status === 'running' && task.steps && task.currentStep;
    const showApproval = task.status === 'needs_approval';
    const showArtifacts = task.status === 'completed' && task.artifacts && task.artifacts.length > 0;

    return (
        <Card className="mb-3">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm">{task.title}</h4>
                            <Badge
                                variant="secondary"
                                className={cn("text-xs", STATUS_COLORS[task.status])}
                            >
                                {STATUS_LABELS[task.status]}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {new Date(task.createdAt).toLocaleString()}
                        </p>
                    </div>
                </div>

                {showProgress && (
                    <div className="mb-3">
                        <div className="text-xs text-muted-foreground mb-1">
                            Step {task.currentStep} of {task.steps!.length}
                        </div>
                        <div className="text-xs font-medium">{task.steps![task.currentStep! - 1]}</div>
                    </div>
                )}

                {showApproval && task.approvalData && (
                    <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md">
                        <div className="text-xs font-medium text-yellow-800 dark:text-yellow-400 mb-2">
                            Approval Required
                        </div>
                        <div className="text-xs text-yellow-700 dark:text-yellow-500 mb-2">
                            {task.approvalData.details?.summary || 'Review before proceeding'}
                        </div>
                        <Button
                            size="sm"
                            className="w-full"
                            onClick={() => onApprove && onApprove(task.taskId)}
                        >
                            Review & Approve
                        </Button>
                    </div>
                )}

                {showArtifacts && (
                    <div className="space-y-2">
                        {task.artifacts!.map((artifact, idx) => (
                            <a
                                key={idx}
                                href={artifact.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-primary hover:underline"
                            >
                                {artifact.type === 'file' ? <FileText className="h-3 w-3" /> : <LinkIcon className="h-3 w-3" />}
                                {artifact.label}
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export function TaskFeed() {
    const { user } = useUserRole();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchTasks() {
            if (!user?.uid) return;

            try {
                setLoading(true);
                // TODO: Implement server action to fetch tasks
                // const data = await getTasks(user.uid);

                // Mock data for now
                const mockTasks: Task[] = [
                    // No tasks yet
                ];

                setTasks(mockTasks);
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchTasks();
    }, [user?.uid]);

    const runningTasks = tasks.filter(t => t.status === 'running');
    const approvalTasks = tasks.filter(t => t.status === 'needs_approval');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Task Feed</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const EmptyState = ({ message }: { message: string }) => (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Task Feed</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="running" className="w-full">
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="running" className="text-xs">
                            Running {runningTasks.length > 0 && `(${runningTasks.length})`}
                        </TabsTrigger>
                        <TabsTrigger value="approvals" className="text-xs">
                            Approvals {approvalTasks.length > 0 && `(${approvalTasks.length})`}
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="text-xs">
                            Completed {completedTasks.length > 0 && `(${completedTasks.length})`}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="running" className="mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            {runningTasks.length === 0 ? (
                                <EmptyState message="No tasks running" />
                            ) : (
                                runningTasks.map(task => (
                                    <TaskItem key={task.taskId} task={task} />
                                ))
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="approvals" className="mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            {approvalTasks.length === 0 ? (
                                <EmptyState message="No approvals needed" />
                            ) : (
                                approvalTasks.map(task => (
                                    <TaskItem key={task.taskId} task={task} />
                                ))
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="completed" className="mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            {completedTasks.length === 0 ? (
                                <EmptyState message="No completed tasks yet. Try a Quick Start!" />
                            ) : (
                                completedTasks.map(task => (
                                    <TaskItem key={task.taskId} task={task} />
                                ))
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
