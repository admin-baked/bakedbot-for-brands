
import { useState, useEffect, type ComponentType } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Play, Clock, MoreHorizontal, LineChart, FileText, ShieldAlert, BarChart3, Zap, Brain, Mail, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { listBrandPlaybooks, togglePlaybookStatus, runPlaybookTest, updatePlaybook } from '@/server/actions/playbooks';
import type { Playbook, PlaybookTrigger } from '@/types/playbook';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PlaybookEditor } from '../../playbooks/components/playbook-editor';
import { PlaybookEditSheet } from '../../playbooks/components/playbook-edit-sheet';
import type { DeliveryConfig } from '../../playbooks/components/playbook-edit-sheet';

// ── Category → visual config (PlaybookCardModern palette) ────────────────────

const CATEGORY_DISPLAY: Record<string, {
    icon: ComponentType<{ className?: string }>;
    iconBg: string;
    badgeBg: string;
    badgeText: string;
    label: string;
}> = {
    outreach:   { icon: Mail,        iconBg: 'bg-yellow-600', badgeBg: 'bg-yellow-900/50', badgeText: 'text-yellow-300', label: 'OUTREACH'   },
    marketing:  { icon: Mail,        iconBg: 'bg-blue-600',   badgeBg: 'bg-blue-900/50',   badgeText: 'text-blue-300',   label: 'MARKETING'  },
    intel:      { icon: LineChart,   iconBg: 'bg-purple-600', badgeBg: 'bg-purple-900/50', badgeText: 'text-purple-300', label: 'INTEL'      },
    pricing:    { icon: BarChart3,   iconBg: 'bg-green-600',  badgeBg: 'bg-green-900/50',  badgeText: 'text-green-300',  label: 'PRICING'    },
    compliance: { icon: ShieldAlert, iconBg: 'bg-red-600',    badgeBg: 'bg-red-900/50',    badgeText: 'text-red-300',    label: 'COMPLIANCE' },
    reporting:  { icon: Brain,       iconBg: 'bg-cyan-600',   badgeBg: 'bg-cyan-900/50',   badgeText: 'text-cyan-300',   label: 'REPORTING'  },
    content:    { icon: FileText,    iconBg: 'bg-blue-600',   badgeBg: 'bg-blue-900/50',   badgeText: 'text-blue-300',   label: 'CONTENT'    },
    automation: { icon: Zap,         iconBg: 'bg-yellow-600', badgeBg: 'bg-yellow-900/50', badgeText: 'text-yellow-300', label: 'AUTOMATION' },
};

const DEFAULT_DISPLAY = { icon: Settings, iconBg: 'bg-slate-600', badgeBg: 'bg-slate-900/50', badgeText: 'text-slate-300', label: 'CUSTOM' };

// ─────────────────────────────────────────────────────────────────────────────

export function BrandPlaybooksList({ brandId }: { brandId: string }) {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
    const [configuringPlaybook, setConfiguringPlaybook] = useState<Playbook | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await listBrandPlaybooks(brandId);
                setPlaybooks(data || []);
            } catch (error: any) {
                console.error("Failed to load playbooks", error);
                // Don't show toast for auth errors - user is likely just being redirected
                if (!error?.message?.includes('Unauthorized') && !error?.message?.includes('session cookie')) {
                    toast({ variant: "destructive", title: "Error", description: "Failed to load playbooks" });
                }
            } finally {
                setLoading(false);
            }
        }
        if (brandId) {
            load();
        } else {
            setLoading(false);
        }
    }, [brandId, toast]);

    const togglePlaybook = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        const newStatus = !currentStatus ? 'active' : 'paused';
        setPlaybooks(prev => prev.map(pb =>
            pb.id === id ? { ...pb, status: newStatus } : pb
        ));

        try {
            await togglePlaybookStatus(brandId, id, !currentStatus);
            toast({
                title: !currentStatus ? "Playbook Activated" : "Playbook Paused",
                description: "Status updated successfully."
            });
        } catch (error) {
            // Revert on failure
            setPlaybooks(prev => prev.map(pb =>
                pb.id === id ? { ...pb, status: currentStatus ? 'active' : 'paused' } : pb
            ));
            toast({ variant: "destructive", title: "Error", description: "Failed to update status" });
        }
    };

    const runPlaybook = async (id: string, name: string) => {
        toast({
            title: "Initiating Test Run",
            description: `Starting simulated run for ${name}...`
        });

        try {
            await runPlaybookTest(brandId, id);
            toast({
                title: "Test Run Complete",
                description: `Successfully executed ${name}. Check your email for results.`
            });

            // Update local state to show incremented run count
            setPlaybooks(prev => prev.map(pb =>
                pb.id === id ? { ...pb, runsToday: (pb.runCount || 0) + 1 } : pb
            ));
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to execute test run." });
        }
    };

    const handleSavePlaybook = async (data: Partial<Playbook>) => {
        if (!editingPlaybook) return;
        try {
            const result = await updatePlaybook(brandId, editingPlaybook.id, {
                name: data.name,
                description: data.description,
                agent: data.agent,
                category: data.category,
                triggers: data.triggers,
                steps: data.steps,
                status: data.status,
            });
            if (result.success) {
                toast({ title: "Playbook Updated", description: "Your changes have been saved." });
                // Update local state
                setPlaybooks(prev => prev.map(pb =>
                    pb.id === editingPlaybook.id ? { ...pb, ...data, updatedAt: new Date() } : pb
                ));
                setEditingPlaybook(null);
            } else {
                toast({ variant: "destructive", title: "Error", description: result.error || "Failed to save" });
            }
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to save playbook." });
        }
    };

    const handleSaveTrigger = async (trigger: PlaybookTrigger, delivery: DeliveryConfig) => {
        if (!configuringPlaybook) return;
        const result = await updatePlaybook(brandId, configuringPlaybook.id, {
            triggers: [trigger],
            metadata: { ...(configuringPlaybook.metadata ?? {}), delivery },
        });
        if (!result.success) throw new Error(result.error ?? 'Failed to save');
        toast({ title: 'Playbook updated', description: 'Schedule and delivery settings saved.' });
        setPlaybooks(prev => prev.map(pb =>
            pb.id === configuringPlaybook.id
                ? { ...pb, triggers: [trigger], metadata: { ...(pb.metadata ?? {}), delivery } }
                : pb
        ));
        setConfiguringPlaybook(null);
    };

    const filtered = playbooks.filter(pb => {
        const matchesSearch = pb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pb.description.toLowerCase().includes(searchQuery.toLowerCase());
        // @ts-ignore - Category typing match
        const matchesCategory = categoryFilter === 'all' || (pb.category || 'other') === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (loading) {
        return <div className="text-center py-10 text-muted-foreground animate-pulse">Loading operational playbooks...</div>;
    }

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
                {filtered.map(pb => {
                    const display = CATEGORY_DISPLAY[pb.category ?? ''] ?? DEFAULT_DISPLAY;
                    const Icon = display.icon;
                    const scheduleLabel = (() => {
                        const cron = (pb.triggers as any[])?.find((t: any) => t?.type === 'schedule')?.cron;
                        if (!cron) return (pb.triggers as any[])?.[0]?.type === 'event' ? 'Event-driven' : 'Manual';
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
                        <Card key={pb.id} className="glass-card glass-card-hover rounded-xl p-5 flex flex-col justify-between transition-all duration-200">
                            {/* Top row */}
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4 min-w-0">
                                    <div className={`p-3 rounded-lg h-min shrink-0 ${display.iconBg}`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-semibold text-foreground line-clamp-1">{pb.name}</h3>
                                        <p className="text-muted-foreground text-sm mt-1 line-clamp-2">{pb.description}</p>
                                    </div>
                                </div>
                                {/* Controls */}
                                <div className="flex items-center gap-3 ml-2 shrink-0" onClick={e => e.stopPropagation()}>
                                    <Switch
                                        checked={pb.status === 'active'}
                                        onCheckedChange={() => togglePlaybook(pb.id, pb.status === 'active')}
                                        aria-label={`Toggle ${pb.name}`}
                                    />
                                    <DropdownMenu>
                                        <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                                            <MoreHorizontal className="w-5 h-5" />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setConfiguringPlaybook(pb)}>
                                                Configure
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setEditingPlaybook(pb)}>
                                                Edit Steps
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => runPlaybook(pb.id, pb.name)}>
                                                <Play className="h-3.5 w-3.5 mr-2" />
                                                Run Test
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                            {/* Footer */}
                            <div className="flex items-center justify-between mt-5 gap-2 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={pb.status === 'active'}
                                        onCheckedChange={() => togglePlaybook(pb.id, pb.status === 'active')}
                                        className="scale-90"
                                    />
                                    <span className="text-sm font-medium text-foreground">{scheduleLabel}</span>
                                    {(pb.runCount || 0) > 0 && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {pb.runCount} runs
                                        </span>
                                    )}
                                </div>
                                <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${display.badgeBg} ${display.badgeText}`}>
                                    {display.label}
                                </span>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Edit Playbook Dialog (full step editor) */}
            <Dialog open={!!editingPlaybook} onOpenChange={(open) => !open && setEditingPlaybook(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Playbook</DialogTitle>
                    </DialogHeader>
                    {editingPlaybook && (
                        <PlaybookEditor
                            playbook={editingPlaybook}
                            onSave={handleSavePlaybook}
                            onCancel={() => setEditingPlaybook(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* Configure trigger + delivery sheet */}
            {configuringPlaybook && (
                <PlaybookEditSheet
                    open={!!configuringPlaybook}
                    onOpenChange={(open) => { if (!open) setConfiguringPlaybook(null); }}
                    playbookName={configuringPlaybook.name}
                    playbookDescription={configuringPlaybook.description}
                    initialTrigger={configuringPlaybook.triggers?.[0] ?? { type: 'manual' }}
                    hasDelivery={configuringPlaybook.steps?.some((s) =>
                        ['send_email', 'email.send', 'gmail.send', 'notify'].includes(s.action ?? '')
                    )}
                    initialDelivery={configuringPlaybook.metadata?.delivery as DeliveryConfig | undefined}
                    onSave={handleSaveTrigger}
                />
            )}
        </div>
    );
}
