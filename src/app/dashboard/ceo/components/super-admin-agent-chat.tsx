'use client';

// src/app/dashboard/ceo/components/super-admin-agent-chat.tsx
/**
 * Super Admin Agent Chat - Upgraded with Playbooks UX
 * Uses AgentChat component with real backend via runAgentChat
 * Sidebar includes Capabilities, Quick Actions, and Run Agents
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AgentChat, ChatMessage, ToolCallStep } from '@/app/dashboard/playbooks/components/agent-chat';
import {
    Bot,
    Loader2,
    BarChart3,
    Bug,
    Building2,
    FileText,
    Sparkles,
    Terminal,
} from 'lucide-react';
import { SUPER_ADMIN_SMOKEY } from '@/config/super-admin-smokey-config';
import { runAgentChat, triggerAgentRun } from '../agents/actions';

export default function SuperAdminAgentChat() {
    const router = useRouter();
    const { toast } = useToast();
    const [runningAgent, setRunningAgent] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<string | null>(null);
    const [externalInput, setExternalInput] = useState<string>('');

    // Custom simulation handler that calls the real backend
    const handleAgentChatSimulate = async (
        userInput: string,
        setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
    ) => {
        // Add a "thinking" message
        const thinkingId = `thinking-${Date.now()}`;
        setMessages(prev => [...prev, {
            id: thinkingId,
            type: 'agent' as const,
            content: '',
            timestamp: new Date(),
            thinking: {
                isThinking: true,
                steps: [{ id: 's1', toolName: 'Connecting to Baked HQ...', status: 'running' as const, description: 'Processing request' }],
                plan: ['Route to agent', 'Process request', 'Generate response']
            }
        }]);

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
            setMessages(prev => prev.map(m =>
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
            ));
        } catch (error) {
            console.error('Agent Chat Error:', error);
            setMessages(prev => prev.map(m =>
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
            ));
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

    const handleQuickAction = (prompt: string) => {
        setExternalInput(prompt);
        // Clear after a tick to allow the AgentChat to pick it up
        setTimeout(() => setExternalInput(''), 100);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Chat Area - Using Playbooks AgentChat */}
            <div className="lg:col-span-3">
                <AgentChat
                    mode="superuser"
                    placeholder="Ask Baked HQ anything... Try: 'Run platform health' or 'Show analytics summary'"
                    defaultThinkingLevel="advanced"
                    externalInput={externalInput}
                    onSimulate={handleAgentChatSimulate}
                />
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
