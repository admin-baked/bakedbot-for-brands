'use client';

/**
 * BakedBot AI in Chrome - Main Tab Component
 *
 * Browser automation dashboard for Super Users.
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Chrome,
  Plus,
  Play,
  Pause,
  Square,
  Circle,
  RefreshCw,
  Settings,
  Shield,
  Clock,
  Loader2,
  ExternalLink,
  Monitor,
  Download,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

import { BrowserSessionPanel } from './browser-automation/browser-session-panel';
import { SitePermissionsCard } from './browser-automation/site-permissions-card';
import { WorkflowRecorderCard } from './browser-automation/workflow-recorder-card';
import { ScheduledTasksCard } from './browser-automation/scheduled-tasks-card';
import { ActionConfirmationModal } from './browser-automation/action-confirmation-modal';

import {
  createBrowserSession,
  getActiveBrowserSession,
  endBrowserSession,
  getBrowserSession,
  listSitePermissions,
  listWorkflows,
  listBrowserTasks,
  getActiveRecording,
  getPendingConfirmation,
  confirmBrowserAction,
  denyBrowserAction,
} from '@/server/actions/browser-automation';

import type {
  BrowserSession,
  SessionState,
  SitePermission,
  RecordedWorkflow,
  BrowserTask,
  RecordingSession,
  PendingConfirmation,
} from '@/types/browser-automation';

export default function BakedBotBrowserTab() {
  // State
  const [activeSession, setActiveSession] = useState<BrowserSession | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [permissions, setPermissions] = useState<SitePermission[]>([]);
  const [workflows, setWorkflows] = useState<RecordedWorkflow[]>([]);
  const [tasks, setTasks] = useState<BrowserTask[]>([]);
  const [recording, setRecording] = useState<RecordingSession | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle extension download
  const handleDownloadExtension = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/download/chrome-extension');
      if (!response.ok) {
        throw new Error('Failed to download extension');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bakedbot-chrome-extension.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('Failed to download extension');
    } finally {
      setIsDownloading(false);
    }
  };

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [sessionResult, permissionsResult, workflowsResult, tasksResult, recordingResult] =
        await Promise.all([
          getActiveBrowserSession(),
          listSitePermissions(),
          listWorkflows(),
          listBrowserTasks(),
          getActiveRecording(),
        ]);

      if (sessionResult.success && sessionResult.data) {
        setActiveSession(sessionResult.data);
        // Get full session state
        const stateResult = await getBrowserSession(sessionResult.data.id);
        if (stateResult.success && stateResult.data) {
          setSessionState(stateResult.data);
        }
      }

      if (permissionsResult.success && permissionsResult.data) {
        setPermissions(permissionsResult.data);
      }

      if (workflowsResult.success && workflowsResult.data) {
        setWorkflows(workflowsResult.data);
      }

      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data);
      }

      if (recordingResult.success && recordingResult.data) {
        setRecording(recordingResult.data);
      }
    } catch (err) {
      setError('Failed to load browser automation data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh session state periodically when active
  useEffect(() => {
    if (!activeSession || activeSession.status !== 'active') return;

    const interval = setInterval(async () => {
      const result = await getBrowserSession(activeSession.id);
      if (result.success && result.data) {
        setSessionState(result.data);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // Create new session
  const handleCreateSession = async () => {
    setIsCreatingSession(true);
    setError(null);

    try {
      const result = await createBrowserSession();
      if (result.success && result.data) {
        setActiveSession(result.data);
        // Get full state
        const stateResult = await getBrowserSession(result.data.id);
        if (stateResult.success && stateResult.data) {
          setSessionState(stateResult.data);
        }
      } else {
        setError(result.error || 'Failed to create session');
      }
    } catch (err) {
      setError('Failed to create browser session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  // End session
  const handleEndSession = async () => {
    if (!activeSession) return;

    const result = await endBrowserSession(activeSession.id);
    if (result.success) {
      setActiveSession(null);
      setSessionState(null);
    } else {
      setError(result.error || 'Failed to end session');
    }
  };

  // Handle confirmation
  const handleConfirm = async () => {
    if (!pendingConfirmation) return;

    const result = await confirmBrowserAction(pendingConfirmation.token);
    if (result.success) {
      setPendingConfirmation(null);
    }
  };

  const handleDeny = async () => {
    if (!pendingConfirmation) return;

    await denyBrowserAction(pendingConfirmation.token);
    setPendingConfirmation(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Chrome className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">BakedBot AI in Chrome</h2>
            <p className="text-sm text-muted-foreground">
              Browser automation for Super Users
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSession?.status === 'active' ? (
            <>
              <Badge variant="default" className="bg-green-500">
                <Circle className="mr-1 h-2 w-2 fill-current" />
                Session Active
              </Badge>
              <Button variant="outline" size="sm" onClick={handleEndSession}>
                <Square className="mr-2 h-4 w-4" />
                End Session
              </Button>
            </>
          ) : (
            <Button onClick={handleCreateSession} disabled={isCreatingSession}>
              {isCreatingSession ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              New Session
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="py-3">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Chrome Extension Download Card */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 dark:border-blue-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Install Chrome Extension</CardTitle>
                <CardDescription>
                  Record workflows and automate tasks directly in your browser
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleDownloadExtension}
              disabled={isDownloading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download Extension
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                <span className="text-xs font-bold">1</span>
              </div>
              <div>
                <p className="text-sm font-medium">Download</p>
                <p className="text-xs text-muted-foreground">
                  Click the button above to download the .zip file
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                <span className="text-xs font-bold">2</span>
              </div>
              <div>
                <p className="text-sm font-medium">Unzip</p>
                <p className="text-xs text-muted-foreground">
                  Extract the downloaded file to a folder
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
                <span className="text-xs font-bold">3</span>
              </div>
              <div>
                <p className="text-sm font-medium">Load in Chrome</p>
                <p className="text-xs text-muted-foreground">
                  Go to{' '}
                  <code className="rounded bg-muted px-1 text-xs">chrome://extensions</code>
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" />
              </div>
              <div>
                <p className="text-sm font-medium">Enable Developer Mode</p>
                <p className="text-xs text-muted-foreground">
                  Toggle on, then &quot;Load unpacked&quot;
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recording indicator */}
      {recording && recording.status === 'recording' && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" />
              <span className="font-medium">Recording: {recording.name}</span>
              <span className="text-sm text-muted-foreground">
                {recording.steps.length} steps
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Browser View */}
        <div className="col-span-8">
          <BrowserSessionPanel
            session={activeSession}
            sessionState={sessionState}
            onSessionUpdate={(state) => setSessionState(state)}
            onConfirmationRequired={(token) => {
              getPendingConfirmation(token).then((result) => {
                if (result.success && result.data) {
                  setPendingConfirmation(result.data);
                }
              });
            }}
          />
        </div>

        {/* Right: Controls */}
        <div className="col-span-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="text-2xl font-bold">{permissions.length}</span>
                </div>
                <p className="text-xs text-muted-foreground">Sites Allowed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <span className="text-2xl font-bold">
                    {tasks.filter((t) => t.enabled).length}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Scheduled Tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Controls */}
          <Tabs defaultValue="permissions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="permissions">
                <Shield className="mr-1 h-3 w-3" />
                Sites
              </TabsTrigger>
              <TabsTrigger value="workflows">
                <Play className="mr-1 h-3 w-3" />
                Workflows
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <Clock className="mr-1 h-3 w-3" />
                Tasks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="permissions" className="mt-4">
              <SitePermissionsCard
                permissions={permissions}
                onPermissionsChange={setPermissions}
              />
            </TabsContent>

            <TabsContent value="workflows" className="mt-4">
              <WorkflowRecorderCard
                recording={recording}
                workflows={workflows}
                sessionId={activeSession?.id}
                onRecordingChange={setRecording}
                onWorkflowsChange={setWorkflows}
              />
            </TabsContent>

            <TabsContent value="tasks" className="mt-4">
              <ScheduledTasksCard
                tasks={tasks}
                workflows={workflows}
                onTasksChange={setTasks}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ActionConfirmationModal
        confirmation={pendingConfirmation}
        onConfirm={handleConfirm}
        onDeny={handleDeny}
        onClose={() => setPendingConfirmation(null)}
      />
    </div>
  );
}
