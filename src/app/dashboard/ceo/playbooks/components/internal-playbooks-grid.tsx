'use client';

/**
 * Internal Playbooks Grid
 * 
 * Displays BakedBot's internal automation playbooks.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Play,
    Clock,
    Mail,
    BarChart3,
    Users,
    AlertCircle,
    TrendingUp,
    Target,
    Bot,
    Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InternalPlaybook {
    id: string;
    name: string;
    description: string;
    category: 'email' | 'research' | 'reporting' | 'monitoring' | 'operations' | 'seo';
    agents: string[];
    schedule?: string;
    active: boolean;
    lastRun?: Date;
    runsToday: number;
}

const INTERNAL_PLAYBOOKS: InternalPlaybook[] = [
    {
        id: 'welcome-emails',
        name: 'Welcome Email Automation',
        description: 'Send personalized welcome emails to new signups',
        category: 'email',
        agents: ['Craig', 'Smokey'],
        schedule: '*/30 * * * *', // Every 30 mins
        active: true,
        lastRun: new Date(Date.now() - 1800000),
        runsToday: 24,
    },
    {
        id: 'dayday-seo-discovery',
        name: 'Day Day SEO Discovery',
        description: 'Find 5-10 low-competition markets daily and auto-publish optimized pages',
        category: 'seo',
        agents: ['Day Day'],
        schedule: '0 5 * * *', // Daily at 5am
        active: true,
        lastRun: new Date(Date.now() - 86400000),
        runsToday: 1,
    },
    {
        id: 'competitor-scan',
        name: 'Competitor Price Monitor',
        description: 'Scan AIQ and competitor pricing daily',
        category: 'research',
        agents: ['Ezal', 'Pops'],
        schedule: '0 6 * * *',
        active: true,
        lastRun: new Date(Date.now() - 43200000),
        runsToday: 1,
    },
    {
        id: 'weekly-report',
        name: 'Weekly Platform Report',
        description: 'Comprehensive weekly summary for the team',
        category: 'reporting',
        agents: ['Pops', 'Money Mike'],
        schedule: '0 9 * * 1',
        active: true,
        lastRun: new Date(Date.now() - 604800000),
        runsToday: 0,
    },
    {
        id: 'churn-alerts',
        name: 'Churn Risk Detection',
        description: 'Identify at-risk tenants before they churn',
        category: 'monitoring',
        agents: ['Pops', 'Mrs. Parker'],
        schedule: '0 10 * * *',
        active: true,
        lastRun: new Date(Date.now() - 86400000),
        runsToday: 1,
    },
    {
        id: 'onboarding-follow-up',
        name: 'Onboarding Follow-up',
        description: 'Check in with new users after 3 days',
        category: 'email',
        agents: ['Craig', 'Smokey'],
        schedule: '0 14 * * *',
        active: true,
        lastRun: new Date(Date.now() - 86400000),
        runsToday: 1,
    },
    {
        id: 'api-health',
        name: 'API Health Monitor',
        description: 'Hourly check of API health and error rates',
        category: 'monitoring',
        agents: ['Ezal'],
        schedule: '0 * * * *',
        active: true,
        lastRun: new Date(Date.now() - 3600000),
        runsToday: 12,
    },
    {
        id: 'daily-revenue',
        name: 'Daily Revenue Summary',
        description: 'Generate daily revenue report',
        category: 'reporting',
        agents: ['Pops', 'Money Mike'],
        schedule: '0 8 * * *',
        active: true,
        lastRun: new Date(Date.now() - 86400000),
        runsToday: 1,
    },
    {
        id: 'feature-usage',
        name: 'Feature Usage Analytics',
        description: 'Track which features are most used',
        category: 'research',
        agents: ['Pops'],
        schedule: '0 7 * * *',
        active: false,
        runsToday: 0,
    },
];

const categoryIcons: Record<string, React.ReactNode> = {
    email: <Mail className="h-4 w-4" />,
    research: <Target className="h-4 w-4" />,
    reporting: <BarChart3 className="h-4 w-4" />,
    monitoring: <AlertCircle className="h-4 w-4" />,
    operations: <Settings className="h-4 w-4" />,
    seo: <TrendingUp className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
    email: 'bg-purple-100 text-purple-700',
    research: 'bg-blue-100 text-blue-700',
    reporting: 'bg-green-100 text-green-700',
    monitoring: 'bg-yellow-100 text-yellow-700',
    operations: 'bg-gray-100 text-gray-700',
    seo: 'bg-indigo-100 text-indigo-700',
};

interface InternalPlaybooksGridProps {
    searchQuery: string;
}

export function InternalPlaybooksGrid({ searchQuery }: InternalPlaybooksGridProps) {
    const { toast } = useToast();
    const [playbooks, setPlaybooks] = useState(INTERNAL_PLAYBOOKS);

    const filteredPlaybooks = playbooks.filter(pb =>
        pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pb.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const togglePlaybook = (id: string) => {
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, active: !pb.active } : pb
        ));
    };

    const runPlaybook = (id: string) => {
        toast({
            title: 'Playbook Started',
            description: `Running ${playbooks.find(p => p.id === id)?.name}...`,
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlaybooks.map(playbook => (
                <Card
                    key={playbook.id}
                    className={`transition-colors hover:bg-muted/50 ${!playbook.active ? 'opacity-60' : ''}`}
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
                                    disabled={!playbook.active}
                                >
                                    <Play className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                        {playbook.lastRun && (
                            <p className="text-xs text-muted-foreground mt-2" suppressHydrationWarning>
                                Last run: {playbook.lastRun.toLocaleString()}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
