'use client';

/**
 * Internal Playbooks Grid
 *
 * Displays BakedBot's internal automation playbooks with PlaybookCardModern
 * visual design: colored category icons, toggle, category badge, and ··· menu.
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
    MoreHorizontal,
    LineChart,
    FileText,
    AlertTriangle,
    ShieldAlert,
    BarChart3,
    Zap,
    Brain,
    Settings,
    Mail,
    Target,
    Clock,
    Loader2,
    Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { listSuperUserPlaybooks, toggleSuperUserPlaybook, runSuperUserPlaybook } from '../playbook-actions';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InternalPlaybook {
    id: string;
    name: string;
    description: string;
    category: string;
    agents: string[];
    schedule?: string;
    triggers?: any[];
    active: boolean;
    lastRun?: Date;
    runsToday: number;
    isCustom?: boolean;
    isBuiltin?: boolean;
}

// ── Category → visual config (matches PlaybookCardModern palette) ─────────────

const CATEGORY_CONFIG: Record<string, {
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    badgeBg: string;
    badgeText: string;
    label: string;
}> = {
    intel: { icon: LineChart, iconBg: 'bg-purple-600', badgeBg: 'bg-purple-900/50', badgeText: 'text-purple-300', label: 'INTEL' },
    seo: { icon: FileText, iconBg: 'bg-blue-600', badgeBg: 'bg-blue-900/50', badgeText: 'text-blue-300', label: 'SEO' },
    monitoring: { icon: AlertTriangle, iconBg: 'bg-orange-600', badgeBg: 'bg-orange-900/50', badgeText: 'text-orange-300', label: 'OPS' },
    operations: { icon: AlertTriangle, iconBg: 'bg-orange-600', badgeBg: 'bg-orange-900/50', badgeText: 'text-orange-300', label: 'OPS' },
    compliance: { icon: ShieldAlert, iconBg: 'bg-red-600', badgeBg: 'bg-red-900/50', badgeText: 'text-red-300', label: 'COMPLIANCE' },
    reporting: { icon: Brain, iconBg: 'bg-cyan-600', badgeBg: 'bg-cyan-900/50', badgeText: 'text-cyan-300', label: 'REPORTING' },
    email: { icon: Mail, iconBg: 'bg-yellow-600', badgeBg: 'bg-yellow-900/50', badgeText: 'text-yellow-300', label: 'AUTOMATION' },
    research: { icon: Target, iconBg: 'bg-blue-600', badgeBg: 'bg-blue-900/50', badgeText: 'text-blue-300', label: 'INTEL' },
    finance: { icon: BarChart3, iconBg: 'bg-green-600', badgeBg: 'bg-green-900/50', badgeText: 'text-green-300', label: 'FINANCE' },
    automation: { icon: Zap, iconBg: 'bg-yellow-600', badgeBg: 'bg-yellow-900/50', badgeText: 'text-yellow-300', label: 'AUTOMATION' },
    custom: { icon: Settings, iconBg: 'bg-slate-600', badgeBg: 'bg-slate-900/50', badgeText: 'text-slate-300', label: 'CUSTOM' },
};

const DEFAULT_CONFIG = CATEGORY_CONFIG.custom;

// ── Built-in defaults (shown when Firestore is empty) ─────────────────────────

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
        isBuiltin: true,
    },
];

// ── Single card ───────────────────────────────────────────────────────────────

function PlaybookCard({
    playbook,
    onToggle,
    onRun,
    onEdit,
}: {
    playbook: InternalPlaybook;
    onToggle: (id: string, active: boolean) => void;
    onRun: (id: string) => void;
    onEdit?: (pb: InternalPlaybook) => void;
}) {
    const config = CATEGORY_CONFIG[playbook.category] ?? DEFAULT_CONFIG;
    const Icon = config.icon;

    const schedule = (() => {
        const cron = playbook.schedule ??
            playbook.triggers?.find((t: any) => t?.type === 'schedule')?.cron;
        if (!cron) return 'Manual';
        const parts = String(cron).trim().split(/\s+/);
        if (parts.length === 5) {
            const [, , dom, , dow] = parts;
            if (dom === '*' && dow === '*') return 'Runs daily';
            if (dow !== '*') return 'Runs weekly';
            if (dom !== '*') return 'Runs monthly';
        }
        return 'Scheduled';
    })();

    return (
        <Card className={cn(
            'glass-card glass-card-hover rounded-xl p-5 flex flex-col justify-between transition-all duration-200',
            !playbook.active && 'opacity-60',
        )}>
            {/* Top row */}
            <div className="flex justify-between items-start">
                <div className="flex gap-4 min-w-0">
                    <div className={cn('p-3 rounded-lg h-min shrink-0', config.iconBg)}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground line-clamp-1">
                                {playbook.name}
                            </h3>
                            {playbook.isBuiltin && (
                                <Badge variant="outline" className="text-[10px] bg-muted/40 shrink-0">Template</Badge>
                            )}
                            {playbook.isCustom && !playbook.isBuiltin && (
                                <Badge variant="outline" className="text-[10px] bg-pink-50 text-pink-700 border-pink-200 shrink-0">Custom</Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                            {playbook.description}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <Switch
                        checked={playbook.active}
                        disabled={!!playbook.isBuiltin}
                        onCheckedChange={() => onToggle(playbook.id, playbook.active)}
                        aria-label={`Toggle ${playbook.name}`}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {!playbook.isBuiltin && onEdit && (
                                <DropdownMenuItem onClick={() => onEdit(playbook)}>
                                    Edit
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                                onClick={() => onRun(playbook.id)}
                                disabled={!playbook.active || !!playbook.isBuiltin}
                            >
                                <Play className="h-3.5 w-3.5 mr-2" />
                                Run now
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-5 gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                    <Switch
                        checked={playbook.active}
                        disabled={!!playbook.isBuiltin}
                        onCheckedChange={() => onToggle(playbook.id, playbook.active)}
                        className="scale-90"
                    />
                    <span className="text-sm font-medium text-foreground">{schedule}</span>
                    {playbook.runsToday > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {playbook.runsToday} today
                        </span>
                    )}
                </div>
                <span className={cn(
                    'text-xs font-bold px-2 py-1 rounded-md uppercase',
                    config.badgeBg,
                    config.badgeText,
                )}>
                    {config.label}
                </span>
            </div>

            {/* Agent tags */}
            {playbook.agents.length > 0 && (
                <div className="flex gap-1 mt-3 flex-wrap">
                    {playbook.agents.map(agent => (
                        <Badge key={agent} variant="secondary" className="text-xs">{agent}</Badge>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ── Grid component ─────────────────────────────────────────────────────────────

interface InternalPlaybooksGridProps {
    searchQuery: string;
    refreshNonce?: number;
    onEdit?: (playbook: InternalPlaybook) => void;
}

export function InternalPlaybooksGrid({ searchQuery, refreshNonce, onEdit }: InternalPlaybooksGridProps) {
    const { toast } = useToast();
    const [playbooks, setPlaybooks] = useState<InternalPlaybook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        listSuperUserPlaybooks()
            .then(firestorePlaybooks => {
                if (cancelled) return;
                const firestoreIds = new Set(firestorePlaybooks.map(p => p.id));
                const merged: InternalPlaybook[] = [
                    ...firestorePlaybooks.map(p => ({
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        category: p.category || 'custom',
                        agents: [p.agent || 'puff'],
                        schedule: p.triggers?.find((t: any) => t?.type === 'schedule')?.cron,
                        triggers: p.triggers,
                        active: p.status === 'active',
                        lastRun: p.lastRunAt ? new Date(p.lastRunAt as any) : undefined,
                        runsToday: p.runCount || 0,
                        isCustom: p.isCustom ?? true,
                        isBuiltin: false,
                    })),
                    ...BUILTIN_PLAYBOOKS.filter(b => !firestoreIds.has(b.id)),
                ];
                setPlaybooks(merged);
            })
            .catch(() => {
                if (!cancelled) setPlaybooks(BUILTIN_PLAYBOOKS);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [refreshNonce]);

    const filtered = playbooks.filter(pb =>
        pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pb.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleToggle = async (id: string, currentActive: boolean) => {
        const pb = playbooks.find(p => p.id === id);
        if (pb?.isBuiltin) {
            toast({ title: 'Template not installed', description: 'Use "Seed Templates" to install system playbooks.' });
            return;
        }
        setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, active: !currentActive } : p));
        try {
            const result = await toggleSuperUserPlaybook(id, !currentActive);
            if (!result.success) {
                setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, active: currentActive } : p));
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch {
            setPlaybooks(prev => prev.map(p => p.id === id ? { ...p, active: currentActive } : p));
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to toggle playbook' });
        }
    };

    const handleRun = async (id: string) => {
        const pb = playbooks.find(p => p.id === id);
        if (pb?.isBuiltin) {
            toast({ title: 'Template not installed', description: 'Use "Seed Templates" to install.' });
            return;
        }
        toast({ title: 'Playbook Started', description: `Running ${pb?.name}…` });
        try {
            const result = await runSuperUserPlaybook(id);
            if (result.success) {
                toast({ title: 'Playbook Complete', description: result.message });
                setPlaybooks(prev => prev.map(p =>
                    p.id === id ? { ...p, runsToday: p.runsToday + 1, lastRun: new Date() } : p
                ));
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to run playbook' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading playbooks…</span>
            </div>
        );
    }

    if (filtered.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No playbooks found{searchQuery ? ` for "${searchQuery}"` : ''}.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(playbook => (
                <PlaybookCard
                    key={playbook.id}
                    playbook={playbook}
                    onToggle={handleToggle}
                    onRun={handleRun}
                    onEdit={onEdit}
                />
            ))}
        </div>
    );
}
