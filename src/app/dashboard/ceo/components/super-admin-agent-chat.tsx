'use client';

// src/app/dashboard/ceo/components/super-admin-agent-chat.tsx
/**
 * Super Admin Agent Chat
 * Internal agentic chat for the BakedBot team
 * Uses "Baked HQ" persona with full platform access
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
    Send,
    Bot,
    User,
    Loader2,
    BarChart3,
    Bug,
    Building2,
    FileText,
    Sparkles,
    Terminal,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { SUPER_ADMIN_SMOKEY } from '@/config/super-admin-smokey-config';
import { cn } from '@/lib/utils';
import { getPlatformAnalytics } from '../actions';
import { runAgentChat, triggerAgentRun } from '../agents/actions';




interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    toolCalls?: ToolCall[];
    isThinking?: boolean;
}

interface ToolCall {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    agent?: string;
    result?: string;
}

export default function SuperAdminAgentChat() {
    const router = useRouter();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: SUPER_ADMIN_SMOKEY.welcomeMessage,
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [runningAgent, setRunningAgent] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleCapabilityClick = (capName: string) => {
        const map: Record<string, string> = {
            'Platform Analytics': 'analytics',
            'Debugging & Tickets': 'tickets',
            'All AI Agents': 'agent-chat',
            'Multi-Org Access': 'analytics', // Shows platform analytics with multi-org view
            'Reports & Exports': 'analytics'
        };
        const tab = map[capName];
        if (tab) {
            router.push(`?tab=${tab}`);
        } else {
            console.warn(`No tab mapping for capability: ${capName}`);
        }
    };

    const handleRunAgent = async (agentId: string, displayName: string) => {
        if (runningAgent) return; // Prevent multiple runs

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
                description: 'Failed to run agent. Check console for details.',
                variant: 'destructive',
            });
        } finally {
            setRunningAgent(null);
            // Clear status after 3 seconds
            setTimeout(() => setAgentStatus(null), 3000);
        }
    };

    const handleSubmit = async (overrideInput?: string) => {
        const queryText = overrideInput || input;
        if (!queryText.trim() || isLoading) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: queryText.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // Add thinking message
        const thinkingId = `thinking-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: thinkingId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isThinking: true,
            toolCalls: [
                { id: '1', name: 'Analyzing request...', status: 'running' }
            ]
        }]);



        // --- Real Data Logic (Genkit Powered) ---
        try {
            // Call Server Action
            const response = await runAgentChat(queryText);

            // Format for UI
            setMessages(prev => prev.map(m =>
                m.id === thinkingId
                    ? {
                        ...m,
                        content: response.content,
                        isThinking: false,
                        toolCalls: response.toolCalls?.map((tc: any) => ({

                            ...tc,
                            status: tc.status as 'success' | 'error' | 'running' // Cast to match UI types
                        })),
                    }
                    : m
            ));

        } catch (error) {
            console.error("Chat Action Error:", error);
            // ... error handling
            setMessages(prev => prev.map(m =>
                m.id === thinkingId
                    ? {
                        ...m,
                        content: "I ran into an issue connecting to the AI brain.",
                        isThinking: false,
                        toolCalls: [{ id: 'err-fatal', name: 'Action Failed', status: 'error' as const, result: 'Server Error' }]
                    } : m
            ));
        }
        setIsLoading(false);
    };


    const handleQuickAction = (prompt: string) => {
        handleSubmit(prompt);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chat Area */}
            <div className="lg:col-span-3">
                <Card className="h-[600px] flex flex-col">
                    <CardHeader className="border-b bg-gradient-to-r from-violet-50 to-purple-50 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                    <Bot className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{SUPER_ADMIN_SMOKEY.displayName}</CardTitle>
                                    <p className="text-xs text-muted-foreground">Internal Platform Assistant</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <span className="h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                                Online
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col p-0">
                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={cn(
                                            "flex gap-3",
                                            message.role === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        {message.role === 'assistant' && (
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                                <Bot className="h-4 w-4 text-white" />
                                            </div>
                                        )}

                                        <div className={cn(
                                            "max-w-[80%] rounded-lg px-4 py-2",
                                            message.role === 'user'
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}>
                                            {message.isThinking ? (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>Thinking...</span>
                                                </div>
                                            ) : (
                                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                            )}

                                            {/* Tool Calls */}
                                            {message.toolCalls && message.toolCalls.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                                    {message.toolCalls.map(tool => (
                                                        <div key={tool.id} className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs">
                                                                {tool.status === 'running' && <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />}
                                                                {tool.status === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                                                {tool.status === 'error' && <AlertCircle className="h-3 w-3 text-red-500" />}
                                                                <span className="text-muted-foreground font-medium">{tool.name}</span>
                                                                {tool.agent && <Badge variant="secondary" className="text-[10px] py-0">{tool.agent}</Badge>}
                                                            </div>
                                                            {tool.result && (
                                                                <div className="ml-5 p-2 bg-black/5 rounded text-[10px] font-mono text-muted-foreground whitespace-pre-wrap border border-black/5">
                                                                    {tool.result.slice(0, 300)}
                                                                    {tool.result.length > 300 && '...'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {message.role === 'user' && (
                                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                                <User className="h-4 w-4 text-primary-foreground" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="p-4 border-t">
                            <div className="flex gap-2">
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask Baked HQ anything..."
                                    className="min-h-[60px] resize-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                />
                                <Button
                                    onClick={() => handleSubmit()}
                                    disabled={!input.trim() || isLoading}
                                    size="icon"
                                    className="h-[60px] w-[60px]"
                                >
                                    {isLoading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sidebar - Capabilities & Quick Actions */}
            <div className="space-y-4">
                {/* Capabilities */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-500" />
                            Capabilities
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {SUPER_ADMIN_SMOKEY.capabilities.map(cap => (
                            <div
                                key={cap.id}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted p-1 rounded transition-colors"
                                onClick={() => handleCapabilityClick(cap.name)}
                            >
                                {cap.icon === 'BarChart3' && <BarChart3 className="h-4 w-4 text-muted-foreground" />}
                                {cap.icon === 'Bug' && <Bug className="h-4 w-4 text-muted-foreground" />}
                                {cap.icon === 'Bot' && <Bot className="h-4 w-4 text-muted-foreground" />}
                                {cap.icon === 'Building2' && <Building2 className="h-4 w-4 text-muted-foreground" />}
                                {cap.icon === 'FileText' && <FileText className="h-4 w-4 text-muted-foreground" />}
                                <span>{cap.name}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-violet-500" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {SUPER_ADMIN_SMOKEY.quickActions.map((action, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={() => handleQuickAction(action.prompt)}
                            >
                                {action.label}
                            </Button>
                        ))}
                    </CardContent>
                </Card>

                {/* Agent Commander */}
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
