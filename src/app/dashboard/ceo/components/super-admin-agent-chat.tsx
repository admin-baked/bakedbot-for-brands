'use client';

// src/app/dashboard/ceo/components/super-admin-agent-chat.tsx
/**
 * Super Admin Agent Chat - With Chat History Sidebar
 * Uses AgentChat component with real backend via runAgentChat
 * Sidebar includes Chat History, New Chat button, and Run Agents
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { AgentChat, ChatMessage, ToolCallStep } from '@/app/dashboard/playbooks/components/agent-chat';
import {
    Bot,
    Loader2,
    Plus,
    MessageSquare,
    Clock,
} from 'lucide-react';
import { runAgentChat, triggerAgentRun } from '../agents/actions';
import { cn } from '@/lib/utils';

// Types for chat history
interface ChatSession {
    id: string;
    title: string;
    preview: string;
    timestamp: Date;
    messages: ChatMessage[];
}

// Simple date formatter
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
}

export default function SuperAdminAgentChat() {
    const { toast } = useToast();

    // Chat session state
    const [sessions, setSessions] = useState<ChatSession[]>([
        // Initial mock sessions for demonstration
        { id: 'demo-1', title: 'Platform Health Check', preview: 'Run platform health...', timestamp: new Date(Date.now() - 3600000), messages: [] },
        { id: 'demo-2', title: 'Analytics Overview', preview: 'Show analytics summary...', timestamp: new Date(Date.now() - 7200000), messages: [] },
    ]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
    const [chatKey, setChatKey] = useState(0); // Key to force AgentChat remount

    // Agent runner state
    const [runningAgent, setRunningAgent] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<string | null>(null);

    // Create new chat session
    const handleNewChat = useCallback(() => {
        // Save current chat to sessions if it has messages
        if (currentMessages.length > 0) {
            const firstUserMsg = currentMessages.find(m => m.type === 'user');
            const newSession: ChatSession = {
                id: `session-${Date.now()}`,
                title: firstUserMsg?.content.slice(0, 30) || 'New Chat',
                preview: firstUserMsg?.content.slice(0, 50) || '',
                timestamp: new Date(),
                messages: [...currentMessages],
            };
            setSessions(prev => [newSession, ...prev]);
        }

        // Clear current chat
        setActiveSessionId(null);
        setCurrentMessages([]);
        setChatKey(prev => prev + 1); // Force AgentChat remount
    }, [currentMessages]);

    // Load a previous chat session
    const handleLoadSession = useCallback((session: ChatSession) => {
        // Save current chat first if it has messages
        if (currentMessages.length > 0 && !activeSessionId) {
            const firstUserMsg = currentMessages.find(m => m.type === 'user');
            if (firstUserMsg) {
                const newSession: ChatSession = {
                    id: `session-${Date.now()}`,
                    title: firstUserMsg.content.slice(0, 30) || 'New Chat',
                    preview: firstUserMsg.content.slice(0, 50) || '',
                    timestamp: new Date(),
                    messages: [...currentMessages],
                };
                setSessions(prev => [newSession, ...prev.filter(s => s.id !== session.id)]);
            }
        }

        setActiveSessionId(session.id);
        setCurrentMessages(session.messages);
        setChatKey(prev => prev + 1);
    }, [currentMessages, activeSessionId]);

    // Custom simulation handler that calls the real backend
    const handleAgentChatSimulate = async (
        userInput: string,
        setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    ) => {
        // Add a "thinking" message
        const thinkingId = `thinking-${Date.now()}`;
        setMessages(prev => {
            const updated = [...prev, {
                id: thinkingId,
                type: 'agent' as const,
                content: '',
                timestamp: new Date(),
                thinking: {
                    isThinking: true,
                    steps: [{ id: 's1', toolName: 'Connecting to Baked HQ...', status: 'running' as const, description: 'Processing request' }],
                    plan: ['Route to agent', 'Process request', 'Generate response']
                }
            }];
            setCurrentMessages(updated); // Keep track of messages for history
            return updated;
        });

        try {
            const response = await runAgentChat(userInput);

            // Convert tool calls to ToolCallStep format
            const steps: ToolCallStep[] = response.toolCalls?.map(tc => ({
                id: tc.id,
                toolName: tc.name,
                status: tc.status === 'success' ? 'completed' : tc.status === 'error' ? 'failed' : 'running',
                result: tc.result,
                description: tc.result || tc.name,
            })) || [];

            // Replace thinking message with actual response
            setMessages(prev => {
                const updated = prev.map(m =>
                    m.id === thinkingId
                        ? {
                            ...m,
                            content: response.content,
                            thinking: steps.length > 0 ? {
                                isThinking: false,
                                steps,
                                plan: []
                            } : undefined
                        }
                        : m
                );
                setCurrentMessages(updated);
                return updated;
            });
        } catch (error) {
            console.error('Agent Chat Error:', error);
            setMessages(prev => {
                const updated = prev.map(m =>
                    m.id === thinkingId
                        ? {
                            ...m,
                            content: 'I ran into an issue. Please try again.',
                            thinking: {
                                isThinking: false,
                                steps: [{ id: 'err', toolName: 'Error', status: 'failed' as const, description: 'Connection failed' }],
                                plan: []
                            }
                        }
                        : m
                );
                setCurrentMessages(updated);
                return updated;
            });
        }
    };

    const handleRunAgent = async (agentId: string, displayName: string) => {
        if (runningAgent) return;

        setRunningAgent(agentId);
        setAgentStatus(`Running ${displayName}...`);

        try {
            const result = await triggerAgentRun(agentId);
            setAgentStatus(result.message);
            toast({
                title: result.success ? `${displayName} Complete` : `${displayName} Error`,
                description: result.message,
                variant: result.success ? 'default' : 'destructive',
            });
        } catch (error) {
            setAgentStatus('Error running agent');
            toast({
                title: 'Agent Error',
                description: 'Failed to run agent.',
                variant: 'destructive',
            });
        } finally {
            setRunningAgent(null);
            setTimeout(() => setAgentStatus(null), 3000);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chat Area - Using Playbooks AgentChat */}
            <div className="lg:col-span-3">
                <AgentChat
                    key={chatKey}
                    mode="superuser"
                    placeholder="Ask Baked HQ anything... Try: 'Run platform health' or 'Show analytics summary'"
                    defaultThinkingLevel="advanced"
                    onSimulate={handleAgentChatSimulate}
                />
            </div>

            {/* Sidebar - Chat History & Run Agents */}
            <div className="space-y-4">
                {/* New Chat Button */}
                <Button
                    onClick={handleNewChat}
                    className="w-full bg-green-600 hover:bg-green-700"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                </Button>

                {/* Chat History */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-green-500" />
                            Chat History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[200px]">
                            <div className="space-y-1 p-3 pt-0">
                                {sessions.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">
                                        No previous chats
                                    </p>
                                ) : (
                                    sessions.map(session => (
                                        <button
                                            key={session.id}
                                            onClick={() => handleLoadSession(session)}
                                            className={cn(
                                                "w-full text-left p-2 rounded-lg transition-colors hover:bg-muted",
                                                activeSessionId === session.id && "bg-muted border border-green-200"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium truncate flex-1">
                                                    {session.title}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground">
                                                    {formatRelativeTime(session.timestamp)}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Agent Commander - Kept */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Bot className="h-4 w-4 text-green-500" />
                            Run Agents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {[
                            { id: 'craig', name: 'Craig', specialty: 'Marketing' },
                            { id: 'smokey', name: 'Smokey', specialty: 'Operations' },
                            { id: 'pops', name: 'Pops', specialty: 'Analytics' },
                            { id: 'ezal', name: 'Ezal', specialty: 'Intel' },
                            { id: 'money_mike', name: 'Money Mike', specialty: 'Finance' },
                            { id: 'mrs_parker', name: 'Mrs Parker', specialty: 'Customer' },
                        ].map(agent => (
                            <Button
                                key={agent.id}
                                variant="outline"
                                size="sm"
                                className="w-full justify-between text-xs"
                                onClick={() => handleRunAgent(agent.id, agent.name)}
                                disabled={runningAgent !== null}
                            >
                                <span>{agent.name} <span className="text-muted-foreground">({agent.specialty})</span></span>
                                {runningAgent === agent.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">Run</Badge>
                                )}
                            </Button>
                        ))}
                        {agentStatus && (
                            <div className="mt-2 p-2 text-xs bg-green-50 text-green-700 rounded border border-green-200">
                                {agentStatus}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
