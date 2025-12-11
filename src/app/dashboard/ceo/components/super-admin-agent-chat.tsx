'use client';

// src/app/dashboard/ceo/components/super-admin-agent-chat.tsx
/**
 * Super Admin Agent Chat - Three Column Layout
 * LEFT: Chat History + New Chat
 * CENTER: AgentChat with Playbooks UX
 * RIGHT: Capabilities, Quick Actions, Run Agents
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AgentChat, ChatMessage, ToolCallStep } from '@/app/dashboard/playbooks/components/agent-chat';
import { TaskletChat } from './tasklet-chat';
import {
    Bot,
    Loader2,
    Plus,
    MessageSquare,
    Clock,
    BarChart3,
    Bug,
    Building2,
    FileText,
    Sparkles,
    Terminal,
} from 'lucide-react';
import { SUPER_ADMIN_SMOKEY } from '@/config/super-admin-smokey-config';
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
    const router = useRouter();
    const { toast } = useToast();

    // Chat session state
    const [sessions, setSessions] = useState<ChatSession[]>([
        { id: 'demo-1', title: 'Platform Health Check', preview: 'Run platform health...', timestamp: new Date(Date.now() - 3600000), messages: [] },
        { id: 'demo-2', title: 'Analytics Overview', preview: 'Show analytics summary...', timestamp: new Date(Date.now() - 7200000), messages: [] },
    ]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
    const [chatKey, setChatKey] = useState(0);
    const [externalInput, setExternalInput] = useState<string>('');

    // Agent runner state
    const [runningAgent, setRunningAgent] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<string | null>(null);

    // Create new chat session
    const handleNewChat = useCallback(() => {
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
        setActiveSessionId(null);
        setCurrentMessages([]);
        setChatKey(prev => prev + 1);
    }, [currentMessages]);

    // Load a previous chat session
    const handleLoadSession = useCallback((session: ChatSession) => {
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

    // Custom simulation handler
    const handleAgentChatSimulate = async (
        userInput: string,
        setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    ) => {
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
            setCurrentMessages(updated);
            return updated;
        });

        try {
            const response = await runAgentChat(userInput);
            const steps: ToolCallStep[] = response.toolCalls?.map(tc => ({
                id: tc.id,
                toolName: tc.name,
                status: tc.status === 'success' ? 'completed' : tc.status === 'error' ? 'failed' : 'running',
                result: tc.result,
                description: tc.result || tc.name,
            })) || [];

            setMessages(prev => {
                const updated = prev.map(m =>
                    m.id === thinkingId
                        ? { ...m, content: response.content, thinking: steps.length > 0 ? { isThinking: false, steps, plan: [] } : undefined }
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
                        ? { ...m, content: 'I ran into an issue. Please try again.', thinking: { isThinking: false, steps: [{ id: 'err', toolName: 'Error', status: 'failed' as const, description: 'Connection failed' }], plan: [] } }
                        : m
                );
                setCurrentMessages(updated);
                return updated;
            });
        }
    };

    const handleCapabilityClick = (capName: string) => {
        const map: Record<string, string> = {
            'Platform Analytics': 'analytics',
            'Debugging & Tickets': 'tickets',
            'All AI Agents': 'agents',
            'Multi-Org Access': 'analytics',
            'Reports & Exports': 'analytics'
        };
        const tab = map[capName];
        if (tab) router.push(`?tab=${tab}`);
    };

    const handleQuickAction = (prompt: string) => {
        setExternalInput(prompt);
        setTimeout(() => setExternalInput(''), 100);
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
            toast({ title: 'Agent Error', description: 'Failed to run agent.', variant: 'destructive' });
        } finally {
            setRunningAgent(null);
            setTimeout(() => setAgentStatus(null), 3000);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {/* LEFT SIDEBAR - Chat History */}
            <div className="lg:col-span-1 space-y-3">
                <Button onClick={handleNewChat} className="w-full bg-green-600 hover:bg-green-700" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Chat
                </Button>

                <Card>
                    <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-green-500" />
                            History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            <div className="space-y-1 p-2 pt-0">
                                {sessions.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground text-center py-4">No chats yet</p>
                                ) : (
                                    sessions.map(session => (
                                        <button
                                            key={session.id}
                                            onClick={() => handleLoadSession(session)}
                                            className={cn(
                                                "w-full text-left p-2 rounded transition-colors hover:bg-muted text-xs",
                                                activeSessionId === session.id && "bg-muted border border-green-200"
                                            )}
                                        >
                                            <span className="font-medium truncate block">{session.title}</span>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground">{formatRelativeTime(session.timestamp)}</span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>

            {/* CENTER - TaskletChat */}
            <div className="lg:col-span-4 h-[600px]">
                <TaskletChat
                    key={chatKey}
                    initialTitle="Baked HQ"
                    onBack={handleNewChat}
                />
            </div>

            {/* RIGHT SIDEBAR - Capabilities, Quick Actions, Run Agents */}
            <div className="lg:col-span-1 space-y-3">
                {/* Capabilities */}
                <Card>
                    <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                            Capabilities
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2 pt-0">
                        {SUPER_ADMIN_SMOKEY.capabilities.map(cap => (
                            <div
                                key={cap.id}
                                className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:bg-muted p-1 rounded transition-colors"
                                onClick={() => handleCapabilityClick(cap.name)}
                            >
                                {cap.icon === 'BarChart3' && <BarChart3 className="h-3 w-3 text-muted-foreground" />}
                                {cap.icon === 'Bug' && <Bug className="h-3 w-3 text-muted-foreground" />}
                                {cap.icon === 'Bot' && <Bot className="h-3 w-3 text-muted-foreground" />}
                                {cap.icon === 'Building2' && <Building2 className="h-3 w-3 text-muted-foreground" />}
                                {cap.icon === 'FileText' && <FileText className="h-3 w-3 text-muted-foreground" />}
                                <span>{cap.name}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5 text-violet-500" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2 pt-0">
                        {SUPER_ADMIN_SMOKEY.quickActions.map((action, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-[10px] h-7"
                                onClick={() => handleQuickAction(action.prompt)}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </CardContent>
                </Card>

                {/* Run Agents */}
                <Card>
                    <CardHeader className="py-2 px-3">
                        <CardTitle className="text-xs flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-green-500" />
                            Run Agents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 p-2 pt-0">
                        {[
                            { id: 'craig', name: 'Craig', specialty: 'Mkt' },
                            { id: 'smokey', name: 'Smokey', specialty: 'Ops' },
                            { id: 'pops', name: 'Pops', specialty: 'Data' },
                            { id: 'ezal', name: 'Ezal', specialty: 'Intel' },
                            { id: 'money_mike', name: 'M.Mike', specialty: 'Fin' },
                            { id: 'mrs_parker', name: 'Parker', specialty: 'CX' },
                        ].map(agent => (
                            <Button
                                key={agent.id}
                                variant="outline"
                                size="sm"
                                className="w-full justify-between text-[10px] h-7"
                                onClick={() => handleRunAgent(agent.id, agent.name)}
                                disabled={runningAgent !== null}
                            >
                                <span>{agent.name}</span>
                                {runningAgent === agent.id ? (
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                ) : (
                                    <Badge variant="outline" className="text-[8px] px-1 bg-green-50 text-green-700">Run</Badge>
                                )}
                            </Button>
                        ))}
                        {agentStatus && (
                            <div className="mt-1 p-1.5 text-[10px] bg-green-50 text-green-700 rounded border border-green-200">
                                {agentStatus}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
