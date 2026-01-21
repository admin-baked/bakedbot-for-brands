'use client';

/**
 * Scheduled Tasks Card
 *
 * Manage scheduled browser automation tasks.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Clock,
  Plus,
  Trash2,
  PlayCircle,
  Loader2,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

import {
  scheduleBrowserTask,
  deleteBrowserTask,
  runBrowserTaskNow,
  enableBrowserTask,
  disableBrowserTask,
} from '@/server/actions/browser-automation';

import type { BrowserTask, RecordedWorkflow, BrowserTaskCreate, TaskSchedule } from '@/types/browser-automation';

interface ScheduledTasksCardProps {
  tasks: BrowserTask[];
  workflows: RecordedWorkflow[];
  onTasksChange: (tasks: BrowserTask[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

export function ScheduledTasksCard({
  tasks,
  workflows,
  onTasksChange,
}: ScheduledTasksCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [workflowId, setWorkflowId] = useState<string>('');
  const [scheduleType, setScheduleType] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [time, setTime] = useState('09:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);

  const handleScheduleTask = async () => {
    if (!name) return;

    setIsLoading(true);

    const schedule: TaskSchedule = {
      type: scheduleType,
      time,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    if (scheduleType === 'weekly') {
      schedule.daysOfWeek = selectedDays;
    } else if (scheduleType === 'monthly') {
      schedule.dayOfMonth = dayOfMonth;
    }

    const taskCreate: BrowserTaskCreate = {
      name,
      workflowId: workflowId || undefined,
      schedule,
      enabled: true,
    };

    const result = await scheduleBrowserTask(taskCreate);

    if (result.success && result.data) {
      onTasksChange([result.data, ...tasks]);
      setName('');
      setWorkflowId('');
      setScheduleType('daily');
      setTime('09:00');
      setSelectedDays([1]);
      setDayOfMonth(1);
      setIsDialogOpen(false);
    }

    setIsLoading(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsLoading(true);
    const result = await deleteBrowserTask(taskId);
    if (result.success) {
      onTasksChange(tasks.filter((t) => t.id !== taskId));
    }
    setIsLoading(false);
  };

  const handleRunNow = async (taskId: string) => {
    setRunningTaskId(taskId);
    await runBrowserTaskNow(taskId);
    setRunningTaskId(null);
  };

  const handleToggleEnabled = async (task: BrowserTask) => {
    setIsLoading(true);
    if (task.enabled) {
      await disableBrowserTask(task.id);
    } else {
      await enableBrowserTask(task.id);
    }
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, enabled: !t.enabled } : t
    );
    onTasksChange(updated);
    setIsLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatSchedule = (schedule: TaskSchedule) => {
    const time12 = new Date(`2000-01-01T${schedule.time || '09:00'}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    switch (schedule.type) {
      case 'once':
        return 'One-time';
      case 'daily':
        return `Daily at ${time12}`;
      case 'weekly':
        const days = schedule.daysOfWeek?.map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label).join(', ');
        return `Weekly on ${days} at ${time12}`;
      case 'monthly':
        return `Monthly on day ${schedule.dayOfMonth} at ${time12}`;
      default:
        return schedule.type;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Scheduled Tasks</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Task</DialogTitle>
                <DialogDescription>
                  Schedule a workflow to run automatically.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Task Name</Label>
                  <Input
                    placeholder="Daily Report"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Workflow (optional)</Label>
                  <Select value={workflowId} onValueChange={setWorkflowId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a workflow..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No workflow</SelectItem>
                      {workflows.map((workflow) => (
                        <SelectItem key={workflow.id} value={workflow.id}>
                          {workflow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Schedule Type</Label>
                  <Select
                    value={scheduleType}
                    onValueChange={(v) => setScheduleType(v as typeof scheduleType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>

                {scheduleType === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Button
                          key={day.value}
                          type="button"
                          size="sm"
                          variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                          onClick={() => {
                            if (selectedDays.includes(day.value)) {
                              setSelectedDays(selectedDays.filter((d) => d !== day.value));
                            } else {
                              setSelectedDays([...selectedDays, day.value]);
                            }
                          }}
                        >
                          {day.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {scheduleType === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select
                      value={dayOfMonth.toString()}
                      onValueChange={(v) => setDayOfMonth(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleScheduleTask} disabled={isLoading || !name}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Schedule Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Run workflows on a schedule</CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[250px]">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No scheduled tasks.
              </p>
              <p className="text-xs text-muted-foreground">
                Schedule a workflow to run automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {getStatusIcon(task.status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{task.name}</span>
                        {!task.enabled && (
                          <Badge variant="secondary" className="text-xs">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatSchedule(task.schedule)}
                      </p>
                      {task.nextRunAt && task.enabled && (
                        <p className="text-xs text-muted-foreground">
                          Next: {new Date(task.nextRunAt.toDate()).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={task.enabled}
                      onCheckedChange={() => handleToggleEnabled(task)}
                      disabled={isLoading}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRunNow(task.id)}
                      disabled={runningTaskId === task.id}
                    >
                      {runningTaskId === task.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlayCircle className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteTask(task.id)}
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
