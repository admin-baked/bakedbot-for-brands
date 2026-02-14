'use client';

/**
 * Browser Agent Chat Component
 *
 * Chat interface for communicating with the BakedBot browser agent.
 * Allows users to give natural language commands that the agent
 * translates into browser automation actions.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Bot,
  User,
  Loader2,
  Globe,
  MousePointer,
  Type,
  Camera,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import type { BrowserSession, SessionState } from '@/types/browser-automation';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  actions?: BrowserAction[];
}

interface BrowserAction {
  type: 'navigate' | 'click' | 'type' | 'screenshot' | 'scroll';
  target?: string;
  value?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: string;
}

interface BrowserAgentChatProps {
  session: BrowserSession | null;
  sessionState: SessionState | null;
  onBrowserAction?: (action: BrowserAction) => void;
  className?: string;
}

// Suggested commands for quick access
const SUGGESTED_COMMANDS = [
  'Go to google.com and search for cannabis dispensaries',
  'Take a screenshot of this page',
  'Click on the first search result',
  'Fill in the contact form with test data',
];

export function BrowserAgentChat({
  session,
  sessionState,
  onBrowserAction,
  className,
}: BrowserAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "I'm your browser automation assistant. Tell me what you'd like me to do in the browser, and I'll execute the actions for you.\n\nFor example:\n- \"Navigate to google.com\"\n- \"Click on the login button\"\n- \"Type 'hello world' in the search box\"\n- \"Take a screenshot\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when session becomes active
  useEffect(() => {
    if (session && inputRef.current) {
      inputRef.current.focus();
    }
  }, [session]);

  const handleSubmit = useCallback(
    async (overrideInput?: string) => {
      const userInput = overrideInput ?? input;
      if (!userInput.trim() || isProcessing) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: userInput,
        timestamp: new Date(),
      };

      const thinkingMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isThinking: true,
        actions: [],
      };

      setMessages((prev) => [...prev, userMessage, thinkingMessage]);
      setInput('');
      setIsProcessing(true);

      try {
        // Build context for the agent
        const browserContext = {
          hasSession: !!session,
          sessionId: session?.id,
          currentUrl: sessionState?.currentUrl,
          pageTitle: sessionState?.pageTitle,
          openTabs: sessionState?.session.tabs?.length ?? 0,
          isBrowserAutomation: true,
        };

        // Call the agent with browser automation context
        const response = await runAgentChat(
          userInput,
          'leo', // Use Leo (COO) for browser automation orchestration
          {
            modelLevel: 'standard',
            context: browserContext,
          }
        );

        // Parse response for browser actions
        const actions = parseBrowserActions(response.content ?? '');

        // Update the thinking message with the response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingMessage.id
              ? {
                  ...msg,
                  content:
                    typeof response.content === 'string'
                      ? response.content
                      : JSON.stringify(response.content, null, 2),
                  isThinking: false,
                  actions,
                }
              : msg
          )
        );

        // Trigger browser actions if detected
        if (actions.length > 0 && onBrowserAction) {
          for (const action of actions) {
            onBrowserAction(action);
          }
        }
      } catch (error) {
        console.error('[BrowserAgentChat] Error:', error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === thinkingMessage.id
              ? {
                  ...msg,
                  content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  isThinking: false,
                }
              : msg
          )
        );
      } finally {
        setIsProcessing(false);
        inputRef.current?.focus();
      }
    },
    [input, isProcessing, session, sessionState, onBrowserAction]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSubmit(suggestion);
  };

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            Browser Agent
          </CardTitle>
          <Badge variant={session ? 'default' : 'secondary'} className="text-xs">
            {session ? 'Connected' : 'No Session'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        </ScrollArea>

        {/* Suggestions (show when no input) */}
        {!input && messages.length <= 2 && (
          <div className="px-4 pb-2">
            <p className="text-xs text-muted-foreground mb-2">Quick commands:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_COMMANDS.map((cmd, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => handleSuggestionClick(cmd)}
                  disabled={isProcessing || !session}
                >
                  {cmd.length > 40 ? cmd.slice(0, 40) + '...' : cmd}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder={
                session
                  ? "Tell me what to do in the browser..."
                  : "Start a session to begin..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing || !session}
              className="flex-1"
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={isProcessing || !input.trim() || !session}
              size="icon"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {sessionState?.currentUrl && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              <span className="truncate">{sessionState.currentUrl}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Message bubble component
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4 text-primary" />}
      </div>

      {/* Content */}
      <div className={cn('flex-1 space-y-2', isUser && 'text-right')}>
        <div
          className={cn(
            'inline-block rounded-lg px-4 py-2 max-w-[85%]',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {message.isThinking ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Browser Actions */}
        {message.actions && message.actions.length > 0 && (
          <div className="space-y-1">
            {message.actions.map((action, i) => (
              <ActionBadge key={i} action={action} />
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Action badge component
function ActionBadge({ action }: { action: BrowserAction }) {
  const icons = {
    navigate: Globe,
    click: MousePointer,
    type: Type,
    screenshot: Camera,
    scroll: MousePointer,
  };

  const statusIcons = {
    pending: Clock,
    executing: Loader2,
    completed: CheckCircle2,
    failed: AlertCircle,
  };

  const Icon = icons[action.type] || Globe;
  const StatusIcon = statusIcons[action.status];

  return (
    <Badge
      variant={action.status === 'failed' ? 'destructive' : 'outline'}
      className="gap-1 text-xs"
    >
      <Icon className="h-3 w-3" />
      {action.type}
      {action.target && <span className="text-muted-foreground">: {action.target}</span>}
      <StatusIcon
        className={cn('h-3 w-3 ml-1', action.status === 'executing' && 'animate-spin')}
      />
    </Badge>
  );
}

// Parse browser actions from agent response
function parseBrowserActions(content: string): BrowserAction[] {
  const actions: BrowserAction[] = [];

  // Look for common action patterns in the response
  const navigateMatch = content.match(/navigat(?:e|ing) to ["`']?([^"`'\n]+)["`']?/i);
  if (navigateMatch) {
    actions.push({
      type: 'navigate',
      target: navigateMatch[1],
      status: 'pending',
    });
  }

  const clickMatch = content.match(/click(?:ed|ing)? (?:on )?["`']?([^"`'\n]+)["`']?/i);
  if (clickMatch) {
    actions.push({
      type: 'click',
      target: clickMatch[1],
      status: 'pending',
    });
  }

  const typeMatch = content.match(/typ(?:e|ing|ed) ["`']([^"`']+)["`']/i);
  if (typeMatch) {
    actions.push({
      type: 'type',
      value: typeMatch[1],
      status: 'pending',
    });
  }

  const screenshotMatch = content.match(/screenshot|capture/i);
  if (screenshotMatch) {
    actions.push({
      type: 'screenshot',
      status: 'pending',
    });
  }

  return actions;
}
