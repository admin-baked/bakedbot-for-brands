'use client';

/**
 * Workflow Recorder Card
 *
 * Record browser actions into reusable workflows.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Circle,
  Square,
  Pause,
  Play,
  Plus,
  Trash2,
  PlayCircle,
  Loader2,
  FileCode,
} from 'lucide-react';

import {
  startWorkflowRecording,
  pauseWorkflowRecording,
  resumeWorkflowRecording,
  stopWorkflowRecording,
  cancelWorkflowRecording,
  runWorkflow,
  deleteWorkflow,
} from '@/server/actions/browser-automation';

import type { RecordedWorkflow, RecordingSession } from '@/types/browser-automation';

interface WorkflowRecorderCardProps {
  recording: RecordingSession | null;
  workflows: RecordedWorkflow[];
  sessionId?: string;
  onRecordingChange: (recording: RecordingSession | null) => void;
  onWorkflowsChange: (workflows: RecordedWorkflow[]) => void;
}

export function WorkflowRecorderCard({
  recording,
  workflows,
  sessionId,
  onRecordingChange,
  onWorkflowsChange,
}: WorkflowRecorderCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);

  const handleStartRecording = async () => {
    if (!name) return;

    setIsLoading(true);
    const result = await startWorkflowRecording(name, description);
    if (result.success && result.data) {
      onRecordingChange(result.data);
      setName('');
      setDescription('');
      setIsDialogOpen(false);
    }
    setIsLoading(false);
  };

  const handlePauseRecording = async () => {
    if (!recording) return;
    setIsLoading(true);
    await pauseWorkflowRecording(recording.id);
    onRecordingChange({ ...recording, status: 'paused' });
    setIsLoading(false);
  };

  const handleResumeRecording = async () => {
    if (!recording) return;
    setIsLoading(true);
    await resumeWorkflowRecording(recording.id);
    onRecordingChange({ ...recording, status: 'recording' });
    setIsLoading(false);
  };

  const handleStopRecording = async () => {
    if (!recording) return;
    setIsLoading(true);
    const result = await stopWorkflowRecording(recording.id);
    if (result.success && result.data) {
      onWorkflowsChange([result.data, ...workflows]);
      onRecordingChange(null);
    }
    setIsLoading(false);
  };

  const handleCancelRecording = async () => {
    if (!recording) return;
    setIsLoading(true);
    await cancelWorkflowRecording(recording.id);
    onRecordingChange(null);
    setIsLoading(false);
  };

  const handleRunWorkflow = async (workflowId: string) => {
    if (!sessionId) return;
    setRunningWorkflowId(workflowId);
    await runWorkflow(workflowId);
    setRunningWorkflowId(null);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    setIsLoading(true);
    const result = await deleteWorkflow(workflowId);
    if (result.success) {
      onWorkflowsChange(workflows.filter((w) => w.id !== workflowId));
    }
    setIsLoading(false);
  };

  const isRecording = recording?.status === 'recording';
  const isPaused = recording?.status === 'paused';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Workflows</CardTitle>
          {recording ? (
            <div className="flex items-center gap-1">
              {isRecording ? (
                <Button size="sm" variant="outline" onClick={handlePauseRecording} disabled={isLoading}>
                  <Pause className="mr-1 h-3 w-3" />
                  Pause
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handleResumeRecording} disabled={isLoading}>
                  <Play className="mr-1 h-3 w-3" />
                  Resume
                </Button>
              )}
              <Button size="sm" onClick={handleStopRecording} disabled={isLoading}>
                <Square className="mr-1 h-3 w-3" />
                Stop
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelRecording}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!sessionId}>
                  <Circle className="mr-1 h-3 w-3 text-red-500" />
                  Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Recording</DialogTitle>
                  <DialogDescription>
                    Record your browser actions to create a reusable workflow.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Workflow Name</Label>
                    <Input
                      placeholder="My Workflow"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Textarea
                      placeholder="What does this workflow do?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleStartRecording} disabled={isLoading || !name}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    <Circle className="mr-1 h-3 w-3 text-red-500" />
                    Start Recording
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <CardDescription>
          {recording
            ? `Recording: ${recording.name} (${recording.steps.length} steps)`
            : 'Record actions to create reusable workflows'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[250px]">
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileCode className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No workflows yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Record actions to create your first workflow.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{workflow.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {workflow.steps.length} steps
                      </Badge>
                    </div>
                    {workflow.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {workflow.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Run {workflow.runCount} times
                      </span>
                      {workflow.status === 'active' && (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRunWorkflow(workflow.id)}
                      disabled={!sessionId || runningWorkflowId === workflow.id}
                    >
                      {runningWorkflowId === workflow.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
