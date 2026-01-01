'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Search, Plus, Play, Clock, Bot, TrendingUp, AlertCircle, ShoppingBag, FileText, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Playbook {
    id: string;
    name: string;
    description: string;
    category: 'menu' | 'compliance' | 'marketing' | 'inventory' | 'reporting' | 'loyalty';
    agents: string[];
    active: boolean;
    runsToday: number;
    lastRun?: string;
}

const DISPENSARY_PLAYBOOKS: Playbook[] = [
    {
        id: 'menu-health',
        name: 'Menu Health Monitor',
        description: 'Sync menu, check for broken images, missing categories, and OOS %',
        category: 'menu',
        agents: ['Smokey', 'Deebo'],
        active: true,
        runsToday: 12,
        lastRun: '10 mins ago'
    },
    {
        id: 'compliance-preflight',
        name: 'Compliance Pre-Flight',
        description: 'Blocks risky copy and offers before send/publish',
        category: 'compliance',
        agents: ['Deebo', 'Craig'],
        active: true,
        runsToday: 4,
        lastRun: '1 hour ago'
    },
    {
        id: 'slow-mover',
        name: 'Slow-Mover Promo Generator',
        description: 'Identifies stagnant inventory and creates compliant bundles',
        category: 'inventory',
        agents: ['Money Mike', 'Craig'],
        active: false,
        runsToday: 0
    },
    {
        id: 'oos-alert',
        name: 'OOS / Low Stock Alert',
        description: 'Alerts manager and suggests substitutions for low stock',
        category: 'inventory',
        agents: ['Smokey'],
        active: true,
        runsToday: 24,
        lastRun: '5 mins ago'
    },
    {
        id: 'vip-nudge',
        name: 'VIP / High-Value Nudge',
        description: 'Smart outreach cadence for top customers',
        category: 'loyalty',
        agents: ['Mrs. Parker'],
        active: true,
        runsToday: 2,
        lastRun: '3 hours ago'
    },
    {
        id: 'competitor-watch',
        name: 'Competitor Price Watch',
        description: 'Monitors top SKUs, deltas, and promo detection',
        category: 'reporting',
        agents: ['Ezal'],
        active: true,
        runsToday: 1,
        lastRun: '6:00 AM'
    },
    {
        id: 'ops-digest',
        name: 'Daily Ops Digest',
        description: 'Manager summary of wins, risks, and recommended actions',
        category: 'reporting',
        agents: ['Pops'],
        active: true,
        runsToday: 1,
        lastRun: '9:00 PM' // yesterday likely
    }
];

export function DispensaryPlaybooksList() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [playbooks, setPlaybooks] = useState(DISPENSARY_PLAYBOOKS);

    const togglePlaybook = (id: string) => {
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, active: !pb.active } : pb
        ));
        toast({
            title: "Playbook Updated",
            description: "Status changed successfully."
        });
    };

    const runPlaybook = (id: string, category: string) => {
        toast({
            title: "Accessing Playbook",
            description: `Opening ${id}...`
        });
        
        // Wire up playbooks to actual tools
        const routes: Record<string, string> = {
            'menu-health': '/dashboard/menu',
            'compliance-preflight': '/dashboard/compliance', // Assuming this exists or settings
            'slow-mover': '/dashboard/inventory',
            'oos-alert': '/dashboard/inventory',
            'vip-nudge': '/dashboard/marketing', // or loyalty
            'competitor-watch': '/dashboard/intelligence',
            'ops-digest': '/dashboard/dispensary'
        };

        if (routes[id]) {
            setTimeout(() => window.location.href = routes[id], 500);
        }
    };

    const filtered = playbooks.filter(pb => {
        const matchesSearch = pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pb.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || pb.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-4">
            {/* Header / Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 no-scrollbar">
                    {['all', 'menu', 'marketing', 'inventory', 'compliance', 'reporting', 'loyalty'].map(cat => (
                        <Button
                            key={cat}
                            variant={categoryFilter === cat ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCategoryFilter(cat)}
                            className="capitalize whitespace-nowrap"
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search playbooks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-9"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(pb => (
                    <Card key={pb.id} className="hover:bg-muted/30 transition-colors">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{pb.name}</CardTitle>
                                        {!pb.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                                    </div>
                                    <CardDescription className="text-xs">{pb.description}</CardDescription>
                                </div>
                                <Switch
                                    checked={pb.active}
                                    onCheckedChange={() => togglePlaybook(pb.id)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {pb.agents.map(agent => (
                                            <Badge key={agent} variant="secondary" className="text-[10px] px-1.5 h-5">
                                                {agent}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {pb.runsToday > 0 && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {pb.runsToday} runs today
                                        </span>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => runPlaybook(pb.id, pb.category)}>
                                        <Play className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
