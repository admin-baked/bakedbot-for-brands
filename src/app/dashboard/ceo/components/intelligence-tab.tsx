'use client';

/**
 * MERIDIAN Intelligence Tab for CEO Dashboard
 *
 * System-wide view of all MERIDIAN features:
 * - LiveHud for all agents
 * - Memory health across agents
 * - Completeness metrics
 * - Cursed input security
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LiveHudDashboard } from '@/components/meridian/livehud-dashboard';
import { MemoryHealthDashboard } from '@/components/meridian/memory-health-dashboard';
import {
    getMeridianSystemMetrics,
    getAllAgentCognitiveStates,
    getCursedInputStats,
} from '@/server/actions/meridian-intelligence';
import { AgentCognitiveState } from '@/types/agent-cognitive-state';
import { Brain, Shield, Target, TrendingUp, AlertTriangle } from 'lucide-react';

export function MeridianTab() {
    const [systemMetrics, setSystemMetrics] = useState<any>(null);
    const [agents, setAgents] = useState<AgentCognitiveState[]>([]);
    const [securityStats, setSecurityStats] = useState<any>(null);
    const [selectedAgent, setSelectedAgent] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [metrics, agentStates, security] = await Promise.all([
                getMeridianSystemMetrics(),
                getAllAgentCognitiveStates(),
                getCursedInputStats(30),
            ]);
            setSystemMetrics(metrics);
            setAgents(agentStates);
            setSecurityStats(security);

            // Select first agent by default
            if (agentStates.length > 0 && !selectedAgent) {
                setSelectedAgent(agentStates[0].agentId);
            }
        } catch (error) {
            console.error('Failed to load MERIDIAN data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Brain className="h-12 w-12 animate-pulse text-primary" />
            </div>
        );
    }

    const selectedAgentState = agents.find((a) => a.agentId === selectedAgent);

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Brain className="h-8 w-8 text-primary" />
                            <div>
                                <CardTitle className="text-2xl">MERIDIAN Intelligence</CardTitle>
                                <CardDescription>
                                    Advanced cognitive state management and memory health monitoring
                                </CardDescription>
                            </div>
                        </div>
                        <Button onClick={loadData} variant="outline">
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* System Overview Cards */}
            {systemMetrics && (
                <div className="grid grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Active Agents
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {systemMetrics.activeAgents}/{systemMetrics.totalAgents}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                Avg Confidence
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {(systemMetrics.averageConfidence * 100).toFixed(0)}%
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Completeness
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {(systemMetrics.averageCompleteness * 100).toFixed(0)}%
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Memory Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {systemMetrics.averageMemoryHealth.toFixed(0)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Security Alert */}
            {securityStats && securityStats.total > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                            <div>
                                <p className="font-semibold text-yellow-900">
                                    {securityStats.total} cursed input incidents in last 30 days
                                </p>
                                <p className="text-sm text-yellow-800">
                                    {securityStats.blocked} blocked automatically
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Agent Selector */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Select Agent</CardTitle>
                        <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Choose an agent..." />
                            </SelectTrigger>
                            <SelectContent>
                                {agents.map((agent) => (
                                    <SelectItem key={agent.agentId} value={agent.agentId}>
                                        <div className="flex items-center gap-2">
                                            <span>{agent.agentName}</span>
                                            <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                                                {agent.status}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
            </Card>

            {/* Main Tabs */}
            {selectedAgentState && (
                <Tabs defaultValue="livehud" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="livehud">LiveHud Dashboard</TabsTrigger>
                        <TabsTrigger value="memory">Memory Health</TabsTrigger>
                    </TabsList>

                    <TabsContent value="livehud">
                        <LiveHudDashboard
                            agentId={selectedAgentState.agentId}
                            agentName={selectedAgentState.agentName}
                        />
                    </TabsContent>

                    <TabsContent value="memory">
                        <MemoryHealthDashboard
                            agentId={selectedAgentState.agentId}
                            agentName={selectedAgentState.agentName}
                        />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
