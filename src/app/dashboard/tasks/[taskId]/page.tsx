
// Task Execution Page - dynamic route for viewing a specific task

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { TaskExecutionView } from '@/components/tasks/task-execution-view';
import { Task } from '@/types/task';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { logger } from '@/lib/logger';
export default function TaskPage() {
    const params = useParams();
    const taskId = params && typeof params.taskId === 'string' ? params.taskId : null;

    // ✅ All hooks are now at the top level
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const startExecution = useCallback(async (taskToExecute: Task) => {
      try {
          setError(null);
          setTask(prev => prev ? { ...prev, status: 'running' } : null);

          const response = await fetch(`/api/tasks/${taskToExecute.id}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(taskToExecute)
          });

          if (!response.ok) {
              const data = await response.json();
              throw new Error(data.error || 'Failed to start execution');
          }

          const data = await response.json();
          if (data.success) {
              setTask(data.task);
          } else {
              throw new Error(data.error || 'Execution failed');
          }

      } catch (err) {
          logger.error('Execution error:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setTask(prev => prev ? { ...prev, status: 'failed' } : null);
      }
    }, []);

    useEffect(() => {
        if (!taskId) {
            setError("Task ID is missing from the URL.");
            setLoading(false);
            return;
        }

        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem(`task_${taskId}`);
            if (stored) {
                try {
                    const storedTask = JSON.parse(stored) as Task;
                    setTask(storedTask);
                    setLoading(false);
                    if (storedTask.status === 'draft') {
                        startExecution(storedTask);
                    }
                } catch (e) {
                    logger.error("Failed to parse stored task", e);
                    setError("Could not load task data from session.");
                    setLoading(false);
                }
            } else {
                setError("Task not found. Please create a new task.");
                setLoading(false);
            }
        }
    }, [taskId, startExecution]);

    // ✅ Conditional rendering happens after all hooks
    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="container max-w-4xl mx-auto py-8 space-y-4">
                <Link href="/dashboard/tasks">
                    <Button variant="ghost" className="gap-2 pl-0">
                        <ArrowLeft className="h-4 w-4" /> Back to Tasks
                    </Button>
                </Link>
                <div className="p-8 rounded-lg border border-dashed text-center space-y-4">
                    <h2 className="text-xl font-semibold">Task Not Found</h2>
                    <p className="text-muted-foreground">{error || "Could not load task data."}</p>
                    <Link href="/dashboard/tasks">
                        <Button>Create New Task</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-6">
            <Link href="/dashboard/tasks">
                <Button variant="ghost" className="gap-2 pl-0">
                    <ArrowLeft className="h-4 w-4" /> Back to Tasks
                </Button>
            </Link>

            <TaskExecutionView initialTask={task} autoStart={false} />
        </div>
    );
}
