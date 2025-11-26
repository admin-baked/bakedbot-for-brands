// Task Execution View - orchestrates the display of a running task

'use client';

import { useEffect, useState, useRef } from 'react';
import { Task, TaskStep, TaskExecutionEvent } from '@/types/task';
import { StepCard } from './step-card';
import { ConfidenceMeter } from './confidence-meter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface TaskExecutionViewProps {
    initialTask: Task;
    autoStart?: boolean;
}

export function TaskExecutionView({ initialTask, autoStart = false }: TaskExecutionViewProps) {
    const [task, setTask] = useState<Task>(initialTask);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Polling interval reference
    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Start execution if autoStart is true and task is draft
    useEffect(() => {
        if (autoStart && task.status === 'draft') {
            startExecution();
        }
    }, [autoStart]);

    // Poll for updates
    // In a production app, this would use WebSocket or Firestore onSnapshot
    useEffect(() => {
        if (task.status === 'running') {
            startPolling();
        } else {
            stopPolling();
        }

        return () => stopPolling();
    }, [task.status]);

    const startPolling = () => {
        if (pollInterval.current) return;

        setIsConnected(true);
        pollInterval.current = setInterval(async () => {
            try {
                // Fetch latest task state
                // Note: In a real implementation, we'd use the stream endpoint or Firestore
                // For now, we'll just re-fetch the task to simulate updates if the backend supports it
                // Or rely on the execute response if it streams

                // Since we don't have a persistent store yet, we'll rely on the execute call's stream
                // But for this UI component, let's assume we can fetch the task status
                // const res = await fetch(`/api/tasks/${task.id}`);
                // const updatedTask = await res.json();
                // setTask(updatedTask);
            } catch (err) {
                console.error('Polling error:', err);
                setIsConnected(false);
            }
        }, 1000);
    };

    const stopPolling = () => {
        if (pollInterval.current) {
            clearInterval(pollInterval.current);
            pollInterval.current = null;
        }
        setIsConnected(false);
    };

    const startExecution = async () => {
        try {
            setError(null);
            setTask(prev => ({ ...prev, status: 'running' }));

            // Call execute endpoint
            const response = await fetch(`/api/tasks/${task.id}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task)
            });

            if (!response.ok) {
                throw new Error('Failed to start execution');
            }

            // If the response is a stream, we'd handle it here
            // For now, we'll assume it returns the completed task (since we don't have streaming yet)
            const data = await response.json();
            if (data.success) {
                setTask(data.task);
            } else {
                throw new Error(data.error || 'Execution failed');
            }

        } catch (err) {
            console.error('Execution error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setTask(prev => ({ ...prev, status: 'failed' }));
        }
    };

    const progress = (task.metrics.completedSteps / task.metrics.totalSteps) * 100;

    return (
        <div className="space-y-6">
            {/* Task Header */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl">{task.name}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant={
                                task.status === 'completed' ? 'default' :
                                    task.status === 'running' ? 'secondary' :
                                        task.status === 'failed' ? 'destructive' : 'outline'
                            }>
                                {task.status.toUpperCase()}
                            </Badge>
                            <span>•</span>
                            <span>{task.steps.length} Steps</span>
                            <span>•</span>
                            <span>{task.assignedAgents.length} Agents</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {task.status === 'draft' && (
                            <Button onClick={startExecution} className="gap-2">
                                <Play className="h-4 w-4" /> Start Task
                            </Button>
                        )}
                        {task.status === 'running' && (
                            <Button variant="outline" className="gap-2 animate-pulse">
                                <Pause className="h-4 w-4" /> Running...
                            </Button>
                        )}
                        {(task.status === 'completed' || task.status === 'failed') && (
                            <Button variant="outline" onClick={startExecution} className="gap-2">
                                <RotateCcw className="h-4 w-4" /> Restart
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="space-y-4">
                        <p className="text-muted-foreground">{task.description}</p>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>

                        {/* Overall Confidence */}
                        <div className="pt-2">
                            <ConfidenceMeter
                                score={task.confidenceScore}
                                label="Overall Confidence"
                                deeboApproved={task.deeboApproved}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Error Alert */}
            {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* Steps List */}
            <div className="space-y-0">
                {task.steps.map((step, index) => (
                    <StepCard
                        key={step.id}
                        step={step}
                        isActive={index === task.currentStepIndex}
                        isLast={index === task.steps.length - 1}
                    />
                ))}
            </div>

            {/* Completion Message */}
            {task.status === 'completed' && (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/50">
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">Task Completed Successfully!</h3>
                        <p className="text-green-600/80 dark:text-green-400/80">
                            All {task.steps.length} steps executed with {Math.round(task.confidenceScore * 100)}% confidence.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => window.print()}>Download Report</Button>
                        <Button onClick={() => setTask({ ...task, status: 'draft' })}>New Task</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
