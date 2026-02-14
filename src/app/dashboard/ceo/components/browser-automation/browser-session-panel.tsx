'use client';

/**
 * Browser Session Panel
 *
 * Live browser view with tab list, action toolbar, and agent chat interface.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Globe,
  ArrowRight,
  MousePointer,
  Type,
  Camera,
  RefreshCw,
  ExternalLink,
  Monitor,
  Loader2,
  AlertCircle,
  MessageSquare,
  Wrench,
} from 'lucide-react';

import {
  browserNavigate,
  browserClick,
  browserType,
  browserScreenshot,
  getBrowserSession,
} from '@/server/actions/browser-automation';

import { BrowserAgentChat } from './browser-agent-chat';

import type { BrowserSession, SessionState, BrowserTab } from '@/types/browser-automation';

interface BrowserSessionPanelProps {
  session: BrowserSession | null;
  sessionState: SessionState | null;
  onSessionUpdate: (state: SessionState) => void;
  onConfirmationRequired: (token: string) => void;
}

export function BrowserSessionPanel({
  session,
  sessionState,
  onSessionUpdate,
  onConfirmationRequired,
}: BrowserSessionPanelProps) {
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [textValue, setTextValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    const result = await getBrowserSession(session.id);
    if (result.success && result.data) {
      onSessionUpdate(result.data);
    }
    setIsLoading(false);
  }, [session, onSessionUpdate]);

  const handleNavigate = async () => {
    if (!session || !url) return;

    setIsLoading(true);
    setError(null);

    const result = await browserNavigate(session.id, url);

    if (result.requiresConfirmation && result.confirmationToken) {
      onConfirmationRequired(result.confirmationToken);
    } else if (!result.success) {
      setError(result.error || 'Navigation failed');
    } else {
      await refreshSession();
      setUrl('');
    }

    setIsLoading(false);
  };

  const handleClick = async () => {
    if (!session || !selector) return;

    setIsLoading(true);
    setError(null);

    const result = await browserClick(session.id, selector);

    if (result.requiresConfirmation && result.confirmationToken) {
      onConfirmationRequired(result.confirmationToken);
    } else if (!result.success) {
      setError(result.error || 'Click failed');
    } else {
      await refreshSession();
      setSelector('');
    }

    setIsLoading(false);
  };

  const handleType = async () => {
    if (!session || !selector || !textValue) return;

    setIsLoading(true);
    setError(null);

    const result = await browserType(session.id, selector, textValue);

    if (result.requiresConfirmation && result.confirmationToken) {
      onConfirmationRequired(result.confirmationToken);
    } else if (!result.success) {
      setError(result.error || 'Type failed');
    } else {
      await refreshSession();
      setTextValue('');
    }

    setIsLoading(false);
  };

  const handleScreenshot = async () => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    const result = await browserScreenshot(session.id);

    if (result.success && result.data) {
      setScreenshot(result.data);
    } else {
      setError(result.error || 'Screenshot failed');
    }

    setIsLoading(false);
  };

  // No session state
  if (!session) {
    return (
      <Card className="h-[600px]">
        <CardContent className="flex h-full flex-col items-center justify-center text-center">
          <Monitor className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No Active Session</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start a new browser session to begin automating tasks.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Make sure the RTRVR Chrome extension is installed and active.
          </p>
        </CardContent>
      </Card>
    );
  }

  const browserTabs = sessionState?.session.tabs || [];
  const [activeTab, setActiveTab] = useState<'chat' | 'manual'>('chat');

  // Handler for browser actions from chat
  const handleBrowserAction = useCallback(async (action: { type: string; target?: string; value?: string }) => {
    if (!session) return;

    setIsLoading(true);
    setError(null);

    try {
      let result;
      switch (action.type) {
        case 'navigate':
          if (action.target) {
            result = await browserNavigate(session.id, action.target);
          }
          break;
        case 'click':
          if (action.target) {
            result = await browserClick(session.id, action.target);
          }
          break;
        case 'type':
          if (action.target && action.value) {
            result = await browserType(session.id, action.target, action.value);
          }
          break;
        case 'screenshot':
          result = await browserScreenshot(session.id);
          if (result?.success && result.data) {
            setScreenshot(result.data);
          }
          break;
      }

      if (result && !result.success) {
        setError(result.error || 'Action failed');
      } else {
        await refreshSession();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [session, refreshSession]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Browser Session</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
              {session.status}
            </Badge>
            <Button variant="ghost" size="icon" onClick={refreshSession} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-2 overflow-hidden p-0">
        {/* Error display */}
        {error && (
          <div className="mx-4 flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Mode Tabs: Chat vs Manual */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'manual')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 grid w-auto grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat with Agent
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Wrench className="h-4 w-4" />
              Manual Controls
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab - Agent Interface */}
          <TabsContent value="chat" className="flex-1 overflow-hidden m-0 p-0">
            <BrowserAgentChat
              session={session}
              sessionState={sessionState}
              onBrowserAction={handleBrowserAction}
              className="h-full border-0 shadow-none rounded-none"
            />
          </TabsContent>

          {/* Manual Tab - Direct Controls */}
          <TabsContent value="manual" className="flex-1 overflow-hidden m-0 p-4 space-y-4">
            {/* URL Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Enter URL to navigate..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleNavigate} disabled={isLoading || !url}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap gap-2">
              <div className="flex flex-1 gap-2">
                <Input
                  placeholder="CSS selector..."
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                  className="min-w-[150px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClick}
                  disabled={isLoading || !selector}
                >
                  <MousePointer className="mr-1 h-3 w-3" />
                  Click
                </Button>
              </div>
              <div className="flex flex-1 gap-2">
                <Input
                  placeholder="Text to type..."
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  className="min-w-[150px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleType}
                  disabled={isLoading || !selector || !textValue}
                >
                  <Type className="mr-1 h-3 w-3" />
                  Type
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleScreenshot} disabled={isLoading}>
                <Camera className="mr-1 h-3 w-3" />
                Screenshot
              </Button>
            </div>

            {/* Browser Tabs List */}
            <div className="flex-1 overflow-hidden rounded-md border">
              <div className="border-b bg-muted/50 px-3 py-2">
                <span className="text-sm font-medium">Open Tabs ({browserTabs.length})</span>
              </div>
              <ScrollArea className="h-[180px]">
                {browserTabs.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No tabs detected. Make sure the browser extension is connected.
                  </div>
                ) : (
                  <div className="divide-y">
                    {browserTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className={`flex items-center gap-3 p-3 hover:bg-muted/50 ${
                          tab.active ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        {tab.favIconUrl ? (
                          <img src={tab.favIconUrl} alt="" className="h-4 w-4" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{tab.title || 'Untitled'}</p>
                          <p className="truncate text-xs text-muted-foreground">{tab.url}</p>
                        </div>
                        {tab.active && (
                          <Badge variant="secondary" className="text-xs">
                            Active
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => window.open(tab.url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Screenshot Preview */}
            {screenshot && (
              <div className="relative rounded-md border p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => setScreenshot(null)}
                >
                  ×
                </Button>
                <img
                  src={screenshot}
                  alt="Screenshot"
                  className="max-h-[150px] w-full rounded object-contain"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Current Page Info - always visible */}
        {sessionState?.currentUrl && (
          <div className="mx-4 mb-4 flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">{sessionState.currentUrl}</span>
            {sessionState.pageTitle && (
              <span className="truncate text-xs text-muted-foreground">
                {sessionState.pageTitle}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
