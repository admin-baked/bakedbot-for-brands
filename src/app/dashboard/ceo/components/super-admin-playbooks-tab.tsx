'use client';

// src/app/dashboard/ceo/components/super-admin-playbooks-tab.tsx
/**
 * Super Admin Playbooks Tab
 * Internal playbook management for the BakedBot team
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Play,
    Pause,
    Plus,
    Search,
    Clock,
    Zap,
    BarChart3,
    Users,
    Bug,
    TrendingUp,
    AlertCircle,
    Settings,
    Bot,
    Sparkles
} from 'lucide-react';
import { executePlaybook } from '../agents/actions';
import { useToast } from '@/hooks/use-toast';


interface InternalPlaybook {
    id: string;
    name: string;
    description: string;
    category: 'analytics' | 'operations' | 'monitoring' | 'reporting';
    agents: string[];
    schedule?: string;
    active: boolean;
    lastRun?: Date;
    nextRun?: Date;
    runsToday: number;
}

const INTERNAL_PLAYBOOKS: InternalPlaybook[] = [
    {
        id: 'platform-health',
        name: 'Platform Health Monitor',
        description: 'Hourly check of API health, error rates, and system metrics',
        category: 'monitoring',
        agents: ['Pops', 'Ezal'],
        schedule: '0 * * * *',
        active: true,
        lastRun: new Date(Date.now() - 3600000),
        nextRun: new Date(Date.now() + 3600000),
        runsToday: 12,
    },
    {
        id: 'daily-revenue',
        name: 'Daily Revenue Summary',
        description: 'Generate daily revenue report across all orgs',
        category: 'reporting',
        agents: ['Pops', 'Money Mike'],
        schedule: '0 8 * * *',
        active: true,
        lastRun: new Date(Date.now() - 86400000),
        nextRun: new Date(Date.now() + 43200000),
        runsToday: 1,
    },
    {
        id: 'competitor-scan',
        name: 'Competitor Price Scan',
        description: 'Scan competitor menus for pricing intelligence',
        category: 'analytics',
        agents: ['Ezal'],
        schedule: '0 6 * * *',
        active: true,
        lastRun: new Date(Date.now() - 172800000),
        runsToday: 0,
    },
    {
        id: 'error-triage',
        name: 'Error Ticket Triage',
        description: 'AI-analyze new error tickets and suggest fixes',
        category: 'operations',
        agents: ['Pops', 'Craig'],
        schedule: '*/15 * * * *',
        active: true,
        lastRun: new Date(Date.now() - 900000),
        runsToday: 48,
    },
    {
        id: 'onboarding-monitor',
        name: 'Onboarding Funnel Monitor',
        description: 'Track new signups and alert on drop-offs',
        category: 'monitoring',
        agents: ['Pops'],
        schedule: '0 9,14,18 * * *',
        active: true,
        runsToday: 2,
    },
    {
        id: 'weekly-digest',
        name: 'Weekly Platform Digest',
        description: 'Comprehensive weekly summary for the team',
        category: 'reporting',
        agents: ['Pops', 'Money Mike', 'Craig'],
        schedule: '0 9 * * 1',
        active: true,
        runsToday: 0,
    },
    {
        id: 'foot-traffic-report',
        name: 'Foot Traffic Report',
        description: 'SEO page performance and checkout routing analytics',
        category: 'analytics',
        agents: ['Pops', 'Ezal'],
        schedule: '0 7 * * *',
        active: false,
        runsToday: 0,
    },
    {
        id: 'churn-predictor',
        name: 'Churn Prediction Alert',
        description: 'Identify at-risk orgs and suggest retention actions',
        category: 'operations',
        agents: ['Pops', 'Mrs. Parker'],
        schedule: '0 10 * * *',
        active: false,
        runsToday: 0,
    },
];

const categoryIcons: Record<string, React.ReactNode> = {
    analytics: <BarChart3 className="h-4 w-4" />,
    operations: <Settings className="h-4 w-4" />,
    monitoring: <AlertCircle className="h-4 w-4" />,
    reporting: <TrendingUp className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
    analytics: 'bg-blue-100 text-blue-700',
    operations: 'bg-purple-100 text-purple-700',
    monitoring: 'bg-yellow-100 text-yellow-700',
    reporting: 'bg-green-100 text-green-700',
};


import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { SuperAdminRightSidebar } from './super-admin-right-sidebar';

import { TaskletChat } from './tasklet-chat';
import { useAgentChatStore } from '@/lib/store/agent-chat-store';
import { useEffect } from 'react';

// ... (existing imports)

export default function SuperAdminPlaybooksTab() {
    // ... (existing state)
    const [playbooks, setPlaybooks] = useState(INTERNAL_PLAYBOOKS);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [selectedPlaybook, setSelectedPlaybook] = useState<InternalPlaybook | null>(null);

    // Chat State
    const { activeSessionId, createSession } = useAgentChatStore();
    const [chatKey, setChatKey] = useState(0);

    useEffect(() => {
        setChatKey(prev => prev + 1);
    }, [activeSessionId]);

    // ... (existing filter logic)
    const filteredPlaybooks = playbooks.filter(pb => {
        const matchesSearch = pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pb.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || pb.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const togglePlaybook = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, active: !pb.active } : pb
        ));
    };

    const { toast } = useToast();

    const runPlaybook = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toast({ title: 'Starting Playbook...', description: `Executing ${id}` });

        try {
            const result = await executePlaybook(id);
            if (result.success) {
                toast({
                    title: 'Playbook Completed',
                    description: result.message,
                    variant: 'default'
                });
            } else {
                toast({
                    title: 'Playbook Failed',
                    description: result.message,
                    variant: 'destructive'
                });
            }
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to trigger playbook.', variant: 'destructive' });
        }
    };

    const stats = {
        active: playbooks.filter(p => p.active).length,
        total: playbooks.length,
        runsToday: playbooks.reduce((sum, p) => sum + p.runsToday, 0),
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
            {/* MAIN CONTENT */}
            <div className="lg:col-span-5 space-y-6">
                {/* Stats Header */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Playbooks</p>
                                    <p className="text-2xl font-bold">{stats.active}/{stats.total}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <Zap className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Runs Today</p>
                                    <p className="text-2xl font-bold">{stats.runsToday}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Clock className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Agents Active</p>
                                    <p className="text-2xl font-bold">6</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Bot className="h-6 w-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Error Rate</p>
                                    <p className="text-2xl font-bold text-green-600">0.2%</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                    <Bug className="h-6 w-6 text-red-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Super Agent Chat Interface */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="bg-muted/30 p-4 border-b">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Ask Baked HQ
                        </h3>
                    </div>
                    <div className="h-[400px]">
                        <TaskletChat
                            key={chatKey}
                            initialTitle={activeSessionId ? "Chat Session" : "New Chat"}
                            onBack={() => createSession()}
                        />
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search playbooks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'analytics', 'operations', 'monitoring', 'reporting'].map(cat => (
                            <Button
                                key={cat}
                                variant={categoryFilter === cat ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCategoryFilter(cat)}
                                className="capitalize"
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>
                    <Button className="ml-auto gap-2">
                        <Plus className="h-4 w-4" />
                        New Playbook
                    </Button>
                </div>

                {/* Playbooks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPlaybooks.map(playbook => (
                        <Card
                            key={playbook.id}
                            className={`transition-colors hover:bg-muted/50 cursor-pointer ${!playbook.active ? 'opacity-60' : ''}`}
                            onClick={() => setSelectedPlaybook(playbook)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${categoryColors[playbook.category]}`}>
                                            {categoryIcons[playbook.category]}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{playbook.name}</CardTitle>
                                            <CardDescription className="text-xs mt-0.5">
                                                {playbook.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={playbook.active}
                                        onCheckedChange={(c) => {
                                            const syntheticEvent = { stopPropagation: () => { } } as React.MouseEvent;
                                            togglePlaybook(playbook.id, syntheticEvent);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">Agents:</span>
                                        <div className="flex gap-1">
                                            {playbook.agents.map(agent => (
                                                <Badge key={agent} variant="secondary" className="text-xs">
                                                    {agent}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {playbook.runsToday} today
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={(e) => runPlaybook(playbook.id, e)}
                                            className="h-7 px-2"
                                        >
                                            <Play className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                                {playbook.lastRun && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Last run: {playbook.lastRun.toLocaleString()}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Playbook Details Dialog */}
                <Dialog open={!!selectedPlaybook} onOpenChange={(open) => !open && setSelectedPlaybook(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedPlaybook ? categoryColors[selectedPlaybook.category] : ''}`}>
                                    {selectedPlaybook && categoryIcons[selectedPlaybook.category]}
                                </div>
                                <div>
                                    <DialogTitle>{selectedPlaybook?.name}</DialogTitle>
                                    <DialogDescription>{selectedPlaybook?.description}</DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedPlaybook && (
                            <div className="space-y-6">
                                <Tabs defaultValue="overview" className="w-full">
                                    <TabsList className="w-full justify-start">
                                        <TabsTrigger value="overview">Overview</TabsTrigger>
                                        <TabsTrigger value="configuration">Configuration</TabsTrigger>
                                        <TabsTrigger value="logs">Execution Logs</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="overview" className="space-y-4 mt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Schedule</p>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-mono text-sm">{selectedPlaybook.schedule}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                                <Badge variant={selectedPlaybook.active ? "default" : "secondary"}>
                                                    {selectedPlaybook.active ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Last Run</p>
                                                <p className="text-sm">{selectedPlaybook.lastRun?.toLocaleString() || 'Never'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Next Run</p>
                                                <p className="text-sm">{selectedPlaybook.nextRun?.toLocaleString() || 'Not scheduled'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-muted-foreground">Participating Agents</p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedPlaybook.agents.map(agent => (
                                                    <div key={agent} className="flex items-center gap-2 rounded-md border p-2 bg-muted/50">
                                                        <Bot className="h-4 w-4 text-primary" />
                                                        <span className="text-sm font-medium">{agent}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="configuration" className="mt-4">
                                        <div className="rounded-md bg-muted p-4">
                                            <pre className="text-xs font-mono whitespace-pre-wrap">
                                                {`# Playbook Configuration
name: ${selectedPlaybook.name}
type: ${selectedPlaybook.category}
schedule: "${selectedPlaybook.schedule}"
agents:
${selectedPlaybook.agents.map(a => `  - ${a}`).join('\n')}

# Steps
1. Initialize environment
2. Check preconditions
3. Execute main task
4. Report results
`}
                                            </pre>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="logs" className="mt-4">
                                        <div className="space-y-2">
                                            {selectedPlaybook.lastRun ? (
                                                <div className="rounded-md border p-3 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-medium">Execution Success</p>
                                                            <p className="text-xs text-muted-foreground">{selectedPlaybook.lastRun.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm">View Output</Button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No recent execution logs.</p>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedPlaybook(null)}>Close</Button>
                            {selectedPlaybook?.active ? (
                                <Button variant="destructive" onClick={(e) => selectedPlaybook && togglePlaybook(selectedPlaybook.id, e as any)}>Pause Playbook</Button>
                            ) : (
                                <Button onClick={(e) => selectedPlaybook && togglePlaybook(selectedPlaybook.id, e as any)}>Activate Playbook</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* RIGHT SIDEBAR */}
            <div className="lg:col-span-1">
                <SuperAdminRightSidebar />
            </div>
        </div>
    );
}


