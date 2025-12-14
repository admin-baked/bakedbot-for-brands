'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Search, Play, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Playbook {
    id: string;
    name: string;
    description: string;
    category: 'outreach' | 'marketing' | 'intel' | 'pricing' | 'compliance' | 'reporting' | 'content';
    agents: string[];
    active: boolean;
    runsToday: number;
    lastRun?: string;
}

const BRAND_PLAYBOOKS: Playbook[] = [
    {
        id: 'retail-coverage',
        name: 'Retail Coverage Builder',
        description: 'Identifies target doors and sequences outreach emails.',
        category: 'outreach',
        agents: ['Craig', 'Ezal'],
        active: true,
        runsToday: 1,
        lastRun: '2 hours ago'
    },
    {
        id: 'velocity-watch',
        name: 'Velocity Watch',
        description: 'Flags stores with slowing sell-through and suggests actions.',
        category: 'reporting',
        agents: ['Pops', 'Money Mike'],
        active: true,
        runsToday: 24, // Hourly check?
        lastRun: '5 mins ago'
    },
    {
        id: 'competitor-price',
        name: 'Competitor Price Monitor',
        description: 'Tracks category price deltas and promo detection.',
        category: 'pricing',
        agents: ['Ezal'],
        active: true,
        runsToday: 4,
        lastRun: '1 hour ago'
    },
    {
        id: 'oos-restock',
        name: 'OOS / Restock Nudge',
        description: 'Notifies retailers of low stock and recommends reorder.',
        category: 'outreach',
        agents: ['Smokey', 'Craig'],
        active: true,
        runsToday: 3,
        lastRun: '4 hours ago'
    },
    {
        id: 'compliance-preflight',
        name: 'Campaign Compliance Pre-Flight',
        description: 'Scans campaign copy for risky language before send.',
        category: 'compliance',
        agents: ['Deebo'],
        active: true,
        runsToday: 6,
        lastRun: '30 mins ago'
    },
    {
        id: 'weekly-digest',
        name: 'Weekly Brand Digest',
        description: 'Summary of wins, risks, and next best actions.',
        category: 'reporting',
        agents: ['Pops'],
        active: true,
        runsToday: 0,
        lastRun: 'Yesterday'
    },
    {
        id: 'content-engine',
        name: 'Content Engine',
        description: 'Generates product education and budtender notes.',
        category: 'content',
        agents: ['Smokey'],
        active: false,
        runsToday: 0
    }
];

export function BrandPlaybooksList() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [playbooks, setPlaybooks] = useState(BRAND_PLAYBOOKS);

    const togglePlaybook = (id: string) => {
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, active: !pb.active } : pb
        ));
        toast({
            title: "Playbook Updated",
            description: "Status changed successfully."
        });
    };

    const runPlaybook = (id: string) => {
        toast({
            title: "Playbook Started",
            description: `Executing ${id}...`
        });
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
                    {['all', 'outreach', 'marketing', 'intel', 'pricing', 'compliance', 'reporting', 'content'].map(cat => (
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
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => runPlaybook(pb.id)}>
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
