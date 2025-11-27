
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

export default function TaskPage() {
    const params = useParams();
    const taskId = params.taskId as string;
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const startExecution = useCallback(async (taskToExecute: Task) => {
      try {
          setError(null);
          setTask(prev => ({ ...prev!, status: 'running' }));

          const response = await fetch(`/api/tasks/${taskToExecute.id}/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(taskToExecute)
          });

          if (!response.ok) {
              throw new Error('Failed to start execution');
          }

          const data = await response.json();
          if (data.success) {
              setTask(data.task);
          } else {
              throw new Error(data.error || 'Execution failed');
          }

      } catch (err) {
          console.error('Execution error:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setTask(prev => ({ ...prev!, status: 'failed' }));
      }
    }, []);

    useEffect(() => {
        // Check session storage for the task data
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem(`task_${taskId}`);
            if (stored) {
                try {
                    const storedTask = JSON.parse(stored);
                    setTask(storedTask);
                    setLoading(false);
                    // Check if auto-start is needed
                    if (storedTask.status === 'draft') {
                        startExecution(storedTask);
                    }
                    return;
                } catch (e) {
                    console.error("Failed to parse stored task", e);
                }
            }
        }
        setLoading(false);
        setError("Task not found. Please create a new task.");
    }, [taskId, startExecution]);

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
