'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
    Bot,
    Loader2,
    BarChart3,
    Bug,
    Building2,
    FileText,
    Sparkles,
    Terminal,
    Activity,
    MessageSquarePlus,
    History,
    Trash2,
} from 'lucide-react';
import { SUPER_ADMIN_SMOKEY } from '@/config/super-admin-smokey-config';
import { triggerAgentRun } from '../agents/actions';
import { triggerPatternAnalysis, triggerComplianceScan, generateDailyReport } from '@/app/dashboard/ceo/actions/intuition-actions';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';

export function SuperAdminRightSidebar() {
    const router = useRouter();
    const { toast } = useToast();

    // Chat store
    const { sessions, activeSessionId, clearCurrentSession, setActiveSession } = useAgentChatStore();

    // Agent runner state
    const [runningAgent, setRunningAgent] = useState<string | null>(null);
    const [agentStatus, setAgentStatus] = useState<string | null>(null);

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
        console.log('Quick action:', prompt);
        toast({ title: 'Quick Action', description: `Action "${prompt}" clicked (Stub)` });
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

    const handleIntuitionAction = async (actionFn: (tid: string) => Promise<any>, name: string) => {
        if (agentStatus) return; // simple lock
        setAgentStatus(`Running ${name}...`);

        try {
            // Using a stub tenantId for now, in prod getting from context/auth
            const result = await actionFn('demo-brand');
            setAgentStatus(result.message);
            toast({
                title: result.success ? `${name} Complete` : `${name} Error`,
                description: result.message,
                variant: result.success ? 'default' : 'destructive'
            });
        } catch (e) {
            setAgentStatus(`Error: ${name}`);
            toast({ title: 'Error', description: 'Action failed', variant: 'destructive' });
        } finally {
            setTimeout(() => setAgentStatus(null), 3000);
        }
    };

    return (
        <div className="space-y-3">
            {/* Chat Controls */}
            <Card>
                <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                        <MessageSquarePlus className="h-3.5 w-3.5 text-blue-500" />
                        Chat Controls
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-2 pt-0">
                    <Button
                        variant="default"
                        size="sm"
                        className="w-full justify-start text-[10px] h-7 bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                            clearCurrentSession();
                            toast({ title: 'New Chat', description: 'Started a new chat session' });
                        }}
                    >
                        <MessageSquarePlus className="h-3 w-3 mr-1.5" />
                        New Chat
                    </Button>

                    {/* Chat History */}
                    {sessions.length > 0 && (
                        <div className="mt-2 space-y-1">
                            <div className="text-[10px] text-muted-foreground px-1 flex items-center justify-between">
                                <span className="flex items-center gap-1">
                                    <History className="h-3 w-3" />
                                    Recent Chats ({sessions.length})
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-1 text-[9px]"
                                    onClick={() => {
                                        // Clear all chat history
                                        localStorage.removeItem('agent-chat-storage');
                                        window.location.reload();
                                    }}
                                >
                                    <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                            </div>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {sessions.slice(0, 5).map((session) => (
                                    <Button
                                        key={session.id}
                                        variant={activeSessionId === session.id ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="w-full justify-start text-[9px] h-6 truncate"
                                        onClick={() => setActiveSession(session.id)}
                                    >
                                        {session.title || 'Untitled Chat'}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

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

            {/* Intuition OS Controls */}
            <Card>
                <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                        Intuition Controls
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 p-2 pt-0">
                    <Button
                        variant="outline" size="sm" className="w-full justify-start text-[10px] h-7"
                        onClick={() => handleIntuitionAction(generateDailyReport, 'Pops Daily Report')}
                    >
                        📊 Generate Daily Report
                    </Button>
                    <Button
                        variant="outline" size="sm" className="w-full justify-start text-[10px] h-7"
                        onClick={() => handleIntuitionAction(triggerComplianceScan, 'Deebo Scan')}
                    >
                        🛡️ Run Compliance Scan
                    </Button>
                    <Button
                        variant="outline" size="sm" className="w-full justify-start text-[10px] h-7"
                        onClick={() => handleIntuitionAction(triggerPatternAnalysis, 'Pattern Analysis')}
                    >
                        🧩 Run Pattern Analysis
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
