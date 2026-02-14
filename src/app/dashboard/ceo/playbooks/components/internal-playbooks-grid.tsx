'use client';

/**
 * Internal Playbooks Grid
 *
 * Displays BakedBot's internal automation playbooks.
 * Now loads from Firestore (super user org) + merges with built-in defaults.
 */

import { useState, useEffect } from 'react';
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
    Loader2,
    Plus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listSuperUserPlaybooks, toggleSuperUserPlaybook, runSuperUserPlaybook } from '../playbook-actions';

interface InternalPlaybook {
    id: string;
    name: string;
    description: string;
    category: 'email' | 'research' | 'reporting' | 'monitoring' | 'operations' | 'seo' | 'intel' | 'custom';
    agents: string[];
    schedule?: string;
    active: boolean;
    lastRun?: Date;
    runsToday: number;
    isCustom?: boolean;
    isBuiltin?: boolean;
}

// Built-in playbooks that always show (can be overridden by Firestore)
const BUILTIN_PLAYBOOKS: InternalPlaybook[] = [
    {
        id: 'welcome-emails',
        name: 'Welcome Email Automation',
        description: 'Send personalized welcome emails to new signups',
        category: 'email',
        agents: ['Craig', 'Smokey'],
        schedule: '*/30 * * * *',
        active: false,
        runsToday: 0,
        isCustom: false,
        isBuiltin: true,
    },
    {
        id: 'dayday-seo-discovery',
        name: 'Day Day SEO Discovery',
        description: 'Find 5-10 low-competition markets daily and auto-publish optimized pages',
        category: 'seo',
        agents: ['Day Day'],
        schedule: '0 5 * * *',
        active: false,
        runsToday: 0,
        isCustom: false,
        isBuiltin: true,
    },
    {
        id: 'competitor-scan',
        name: 'Competitor Price Monitor',
        description: 'Scan AIQ and competitor pricing daily',
        category: 'research',
        agents: ['Ezal', 'Pops'],
        schedule: '0 6 * * *',
        active: false,
        runsToday: 0,
        isCustom: false,
        isBuiltin: true,
    },
];

const categoryIcons: Record<string, React.ReactNode> = {
    email: <Mail className="h-4 w-4" />,
    research: <Target className="h-4 w-4" />,
    reporting: <BarChart3 className="h-4 w-4" />,
    monitoring: <AlertCircle className="h-4 w-4" />,
    operations: <Settings className="h-4 w-4" />,
    seo: <TrendingUp className="h-4 w-4" />,
    intel: <Target className="h-4 w-4" />,
    custom: <Bot className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
    email: 'bg-purple-100 text-purple-700',
    research: 'bg-blue-100 text-blue-700',
    reporting: 'bg-green-100 text-green-700',
    monitoring: 'bg-yellow-100 text-yellow-700',
    operations: 'bg-gray-100 text-gray-700',
    seo: 'bg-indigo-100 text-indigo-700',
    intel: 'bg-cyan-100 text-cyan-700',
    custom: 'bg-pink-100 text-pink-700',
};

interface InternalPlaybooksGridProps {
    searchQuery: string;
    refreshNonce?: number;
}

export function InternalPlaybooksGrid({ searchQuery, refreshNonce }: InternalPlaybooksGridProps) {
    const { toast } = useToast();
    const [playbooks, setPlaybooks] = useState<InternalPlaybook[]>([]);
    const [loading, setLoading] = useState(true);

    // Load playbooks from Firestore on mount
    useEffect(() => {
        async function loadPlaybooks() {
            try {
                const firestorePlaybooks = await listSuperUserPlaybooks();

                // Merge: Firestore playbooks take priority, then add built-ins that don't exist
                const firestoreIds = new Set(firestorePlaybooks.map(p => p.id));
                const mergedPlaybooks: InternalPlaybook[] = [
                    // Custom playbooks first (from Firestore)
                    ...firestorePlaybooks.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        category: (p.category || 'custom') as InternalPlaybook['category'],
                        agents: [p.agent || 'puff'],
                        schedule: p.triggers?.find(t => t.type === 'schedule')?.cron,
                        active: p.status === 'active',
                        lastRun: p.lastRunAt ? new Date(p.lastRunAt) : undefined,
                        runsToday: p.runCount || 0,
                        isCustom: p.isCustom ?? true,
                    })),
                    // Built-in playbooks that aren't overridden
                    ...BUILTIN_PLAYBOOKS.filter(b => !firestoreIds.has(b.id)),
                ];

                setPlaybooks(mergedPlaybooks);
            } catch (error) {
                console.error('[InternalPlaybooksGrid] Failed to load:', error);
                // Fallback to built-in playbooks
                setPlaybooks(BUILTIN_PLAYBOOKS);
            } finally {
                setLoading(false);
            }
        }
        loadPlaybooks();
    }, [refreshNonce]);

    const filteredPlaybooks = playbooks.filter(pb =>
        pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pb.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const togglePlaybook = async (id: string, currentActive: boolean) => {
        const pb = playbooks.find((p) => p.id === id);
        if (pb?.isBuiltin) {
            toast({
                title: 'Template not installed',
                description: 'Use "Seed Templates" to install system playbooks into Firestore.',
            });
            return;
        }

        // Optimistic update
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, active: !currentActive } : pb
        ));

        try {
            const result = await toggleSuperUserPlaybook(id, !currentActive);
            if (!result.success) {
                // Revert on failure
                setPlaybooks(prev => prev.map(pb =>
                    pb.id === id ? { ...pb, active: currentActive } : pb
                ));
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error) {
            // Revert on failure
            setPlaybooks(prev => prev.map(pb =>
                pb.id === id ? { ...pb, active: currentActive } : pb
            ));
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to toggle playbook' });
        }
    };

    const runPlaybook = async (id: string) => {
        const playbook = playbooks.find(p => p.id === id);
        if (playbook?.isBuiltin) {
            toast({
                title: 'Template not installed',
                description: 'Use "Seed Templates" to install system playbooks into Firestore.',
            });
            return;
        }

        toast({
            title: 'Playbook Started',
            description: `Running ${playbook?.name}...`,
        });

        try {
            const result = await runSuperUserPlaybook(id);
            if (result.success) {
                toast({ title: 'Playbook Complete', description: result.message });
                // Update run count
                setPlaybooks(prev => prev.map(pb =>
                    pb.id === id ? { ...pb, runsToday: pb.runsToday + 1, lastRun: new Date() } : pb
                ));
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to run playbook' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading playbooks...</span>
            </div>
        );
    }

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
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{playbook.name}</CardTitle>
                                        {playbook.isBuiltin ? (
                                            <Badge variant="outline" className="text-[10px] bg-muted/40">
                                                Template
                                            </Badge>
                                        ) : playbook.isCustom ? (
                                            <Badge variant="outline" className="text-[10px] bg-pink-50 text-pink-700 border-pink-200">
                                                Custom
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <CardDescription className="text-xs mt-0.5">
                                        {playbook.description}
                                    </CardDescription>
                                </div>
                            </div>
                            <Switch
                                checked={playbook.active}
                                disabled={playbook.isBuiltin}
                                onCheckedChange={() => togglePlaybook(playbook.id, playbook.active)}
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
                                    disabled={!playbook.active || playbook.isBuiltin}
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
