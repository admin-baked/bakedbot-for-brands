'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Play, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Routine {
    id: string;
    name: string;
    description: string;
    category: 'deals' | 'reorder' | 'explore' | 'budget';
    active: boolean;
    lastRun?: string;
}

const CUSTOMER_ROUTINES: Routine[] = [
    {
        id: 'weekly-restock',
        name: 'Weekly Restock',
        description: 'Auto-build cart with my usuals at best price.',
        category: 'reorder',
        active: true,
        lastRun: '1 week ago'
    },
    {
        id: 'budget-builder',
        name: 'Budget Builder',
        description: 'Build a high-quality cart under $60.',
        category: 'budget',
        active: true,
        lastRun: 'Never'
    },
    {
        id: 'deal-hunter',
        name: 'Deal Hunter',
        description: 'Find best deals matching my preferences.',
        category: 'deals',
        active: true,
        lastRun: 'Yesterday'
    },
    {
        id: 'back-in-stock',
        name: 'Back-in-Stock Watch',
        description: 'Monitor favorites and suggest substitutes.',
        category: 'reorder',
        active: true,
        lastRun: '2 days ago'
    },
    {
        id: 'try-something-new',
        name: 'Try Something New',
        description: 'Recommend products based on my favorite effects.',
        category: 'explore',
        active: false
    },
    {
        id: 'weekend-bundle',
        name: 'Weekend Bundle',
        description: 'Prebuilt "social vibe" cart for groups.',
        category: 'explore',
        active: false
    }
];

export function CustomerRoutinesList() {
    const { toast } = useToast();
    const [routines, setRoutines] = useState(CUSTOMER_ROUTINES);
    const [filter, setFilter] = useState('all');

    const toggleRoutine = (id: string) => {
        setRoutines(prev => prev.map(r =>
            r.id === id ? { ...r, active: !r.active } : r
        ));
        toast({
            title: "Routine Updated",
            description: "Preferences saved."
        });
    };

    const runRoutine = (name: string) => {
        toast({
            title: "Running Routine",
            description: `Starting ${name}...`
        });
    };

    const filtered = routines.filter(r => filter === 'all' || r.category === filter);

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                {['all', 'deals', 'reorder', 'budget', 'explore'].map(cat => (
                    <Button
                        key={cat}
                        variant={filter === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(cat)}
                        className="capitalize rounded-full px-4"
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(routine => (
                    <Card key={routine.id} className="hover:bg-muted/30 transition-colors border-dashed border-border/60 hover:border-solid">
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                                        {routine.name}
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                        {routine.description}
                                    </CardDescription>
                                </div>
                                <Switch
                                    checked={routine.active}
                                    onCheckedChange={() => toggleRoutine(routine.id)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                    Uses: Smokey
                                </Badge>
                                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1" onClick={() => runRoutine(routine.name)}>
                                    <Play className="h-3 w-3" />
                                    Run
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
