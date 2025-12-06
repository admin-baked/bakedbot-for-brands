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
    Bot
} from 'lucide-react';

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

export default function SuperAdminPlaybooksTab() {
    const [playbooks, setPlaybooks] = useState(INTERNAL_PLAYBOOKS);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

    const filteredPlaybooks = playbooks.filter(pb => {
        const matchesSearch = pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pb.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || pb.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const togglePlaybook = (id: string) => {
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, active: !pb.active } : pb
        ));
    };

    const runPlaybook = (id: string) => {
        // In production, this would trigger the playbook
        console.log('Running playbook:', id);
    };

    const stats = {
        active: playbooks.filter(p => p.active).length,
        total: playbooks.length,
        runsToday: playbooks.reduce((sum, p) => sum + p.runsToday, 0),
    };

    return (
        <div className="space-y-6">
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
                    <Card key={playbook.id} className={!playbook.active ? 'opacity-60' : ''}>
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
                                    onCheckedChange={() => togglePlaybook(playbook.id)}
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
                                        onClick={() => runPlaybook(playbook.id)}
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
        </div>
    );
}
