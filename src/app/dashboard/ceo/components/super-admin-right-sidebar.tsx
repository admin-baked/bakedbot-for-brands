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
} from 'lucide-react';
import { SUPER_ADMIN_SMOKEY } from '@/config/super-admin-smokey-config';
import { triggerAgentRun } from '../agents/actions';

export function SuperAdminRightSidebar() {
    const router = useRouter();
    const { toast } = useToast();

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

    return (
        <div className="space-y-3">
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
    );
}
