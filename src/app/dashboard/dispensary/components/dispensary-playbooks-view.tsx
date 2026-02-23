'use client';

/**
 * Dispensary Playbooks View
 *
 * Tier-aware playbook management for dispensary roles.
 * Shows all playbooks included in the org's plan with clear
 * explanations, toggle controls, and "Activate All" CTA.
 */

import React, { useState, useEffect, useTransition } from 'react';
import { motion } from 'framer-motion';
import {
    Zap, Mail, MessageSquare, BarChart3, Shield, TrendingUp,
    Users, ShoppingBag, Loader2, CheckCircle2, Clock,
    ChevronRight, Sparkles, Bell, Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PLAYBOOKS, getPlaybookIdsForTier } from '@/config/playbooks';
import type { PlaybookDefinition, PlaybookAgent, PlaybookTrigger as ConfigTrigger } from '@/config/playbooks';
import type { TierId } from '@/config/tiers';
import type { PlaybookTrigger } from '@/types/playbook';
import {
    getDispensaryPlaybookAssignments,
    toggleDispensaryPlaybookAssignment,
    activateAllTierPlaybooks,
    updatePlaybookAssignmentConfig,
} from '@/server/actions/dispensary-playbooks';
import type { PlaybookCustomConfig } from '@/server/actions/dispensary-playbooks';
import { PlaybookEditSheet } from '../../playbooks/components/playbook-edit-sheet';
import type { DeliveryConfig } from '../../playbooks/components/playbook-edit-sheet';

// ─── Agent Display Config ────────────────────────────────────────────────────

const AGENT_CONFIG: Record<PlaybookAgent, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    tab: string;
}> = {
    craig: {
        label: 'Marketing & Engagement',
        icon: Mail,
        color: 'text-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        tab: 'marketing',
    },
    smokey: {
        label: 'Menu & Products',
        icon: ShoppingBag,
        color: 'text-green-600',
        bg: 'bg-green-50 dark:bg-green-950/30',
        tab: 'menu',
    },
    ezal: {
        label: 'Competitive Intelligence',
        icon: TrendingUp,
        color: 'text-purple-600',
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        tab: 'intel',
    },
    deebo: {
        label: 'Compliance',
        icon: Shield,
        color: 'text-orange-600',
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        tab: 'compliance',
    },
    big_worm: {
        label: 'Analytics & Reporting',
        icon: BarChart3,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 dark:bg-indigo-950/30',
        tab: 'analytics',
    },
    system: {
        label: 'System',
        icon: Bell,
        color: 'text-muted-foreground',
        bg: 'bg-muted/50',
        tab: 'system',
    },
};

const TIER_LABELS: Record<string, string> = {
    scout: 'Scout',
    pro: 'Pro',
    growth: 'Growth',
    empire: 'Empire',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTriggerLabel(playbook: PlaybookDefinition): string {
    if (playbook.trigger.type === 'schedule') {
        const freq = playbook.trigger.frequency;
        return freq.charAt(0).toUpperCase() + freq.slice(1);
    }
    const evt = playbook.trigger.event.replace(/\./g, ' › ').replace(/_/g, ' ');
    return `On: ${evt}`;
}

function getChannelIcons(playbook: PlaybookDefinition) {
    return playbook.channels.map((ch) => {
        if (ch === 'email') return { icon: Mail, label: 'Email' };
        if (ch === 'sms_customer') return { icon: MessageSquare, label: 'Customer SMS' };
        if (ch === 'sms_internal') return { icon: MessageSquare, label: 'Internal SMS' };
        return { icon: Bell, label: 'Dashboard' };
    });
}

// ─── Helpers: convert config trigger to editable PlaybookTrigger ──────────────

const FREQ_TO_CRON: Record<string, string> = {
    daily: '0 7 * * *',
    weekly: '0 9 * * 1',
    monthly: '0 8 1 * *',
    quarterly: '0 8 1 1,4,7,10 *',
    one_time: '0 7 * * *',
};

function configTriggerToPlaybookTrigger(configTrigger: ConfigTrigger): PlaybookTrigger {
    if (configTrigger.type === 'schedule') {
        return {
            type: 'schedule',
            cron: FREQ_TO_CRON[configTrigger.frequency] ?? '0 7 * * *',
            timezone: 'America/New_York',
        };
    }
    return { type: 'event', eventName: configTrigger.event };
}

function hasDeliveryChannels(playbook: PlaybookDefinition): boolean {
    return playbook.channels.some((ch) => ch === 'email' || ch === 'sms_customer' || ch === 'sms_internal');
}

// ─── Playbook Card ────────────────────────────────────────────────────────────

interface PlaybookCardProps {
    playbook: PlaybookDefinition;
    isActive: boolean;
    onToggle: (id: string, active: boolean) => void;
    isToggling: boolean;
    onConfigure: (playbook: PlaybookDefinition) => void;
    customScheduleLabel?: string;
}

function PlaybookCard({ playbook, isActive, onToggle, isToggling, onConfigure, customScheduleLabel }: PlaybookCardProps) {
    const agent = AGENT_CONFIG[playbook.agent];
    const AgentIcon = agent.icon;
    const triggerLabel = customScheduleLabel ?? getTriggerLabel(playbook);
    const channels = getChannelIcons(playbook);

    return (
        <Card className={cn(
            'group transition-all duration-200 hover:shadow-md border',
            isActive
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card hover:border-muted-foreground/30'
        )}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    {/* Left: Icon + Info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                            'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            agent.bg
                        )}>
                            <AgentIcon className={cn('h-4 w-4', agent.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold leading-tight">{playbook.name}</p>
                                {isActive && (
                                    <Badge variant="default" className="text-xs h-4 px-1.5 bg-green-500 hover:bg-green-500">
                                        Active
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {playbook.description}
                            </p>
                            {/* Metadata row */}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {triggerLabel}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {channels.map((ch, i) => (
                                        <ch.icon key={i} className="h-3 w-3" />
                                    ))}
                                    {channels.map((ch) => ch.label).join(', ')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Configure + Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); onConfigure(playbook); }}
                            title="Configure trigger and delivery"
                        >
                            <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                        {isToggling && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                        <Switch
                            checked={isActive}
                            onCheckedChange={(checked) => onToggle(playbook.id, checked)}
                            disabled={isToggling}
                            className="data-[state=checked]:bg-green-500"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DispensaryPlaybooksViewProps {
    orgId: string;
}

export function DispensaryPlaybooksView({ orgId }: DispensaryPlaybooksViewProps) {
    const { toast } = useToast();
    const [activeIds, setActiveIds] = useState<Set<string>>(new Set());
    const [tierId, setTierId] = useState<TierId>('empire');
    const [tierPlaybooks, setTierPlaybooks] = useState<PlaybookDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
    const [isActivatingAll, startActivatingAll] = useTransition();
    const [customConfigs, setCustomConfigs] = useState<Record<string, PlaybookCustomConfig>>({});
    const [editingPlaybook, setEditingPlaybook] = useState<PlaybookDefinition | null>(null);

    // Load playbook assignments on mount
    useEffect(() => {
        async function load() {
            try {
                const data = await getDispensaryPlaybookAssignments(orgId);
                setActiveIds(new Set(data.activeIds));
                setTierId(data.tierId);
                setCustomConfigs(data.customConfigs);

                // Get tier playbooks from config
                const tierIds = new Set(getPlaybookIdsForTier(data.tierId));
                const playbooks = Object.values(PLAYBOOKS).filter((p) => tierIds.has(p.id));
                setTierPlaybooks(playbooks);
            } catch (error) {
                toast({
                    title: 'Could not load playbooks',
                    description: 'Please refresh the page.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleToggle = async (playbookId: string, active: boolean) => {
        // Optimistic update
        setActiveIds((prev) => {
            const next = new Set(prev);
            if (active) next.add(playbookId);
            else next.delete(playbookId);
            return next;
        });
        setTogglingIds((prev) => new Set(prev).add(playbookId));

        try {
            const result = await toggleDispensaryPlaybookAssignment(orgId, playbookId, active);
            if (!result.success) throw new Error(result.error);
            toast({
                title: active ? 'Playbook activated' : 'Playbook paused',
                description: active
                    ? 'This automation is now running in the background.'
                    : 'This automation has been paused.',
            });
        } catch {
            // Revert optimistic update
            setActiveIds((prev) => {
                const next = new Set(prev);
                if (active) next.delete(playbookId);
                else next.add(playbookId);
                return next;
            });
            toast({
                title: 'Failed to update playbook',
                description: 'Please try again.',
                variant: 'destructive',
            });
        } finally {
            setTogglingIds((prev) => {
                const next = new Set(prev);
                next.delete(playbookId);
                return next;
            });
        }
    };

    const handleActivateAll = () => {
        startActivatingAll(async () => {
            try {
                const result = await activateAllTierPlaybooks(orgId, tierId);
                if (!result.success) throw new Error(result.error);

                // Update local state to reflect all as active
                const tierIds = new Set(getPlaybookIdsForTier(tierId));
                setActiveIds(tierIds);

                toast({
                    title: `${result.activated} playbooks activated!`,
                    description: 'All automations are now running in the background.',
                });
            } catch {
                toast({
                    title: 'Failed to activate playbooks',
                    description: 'Please try again.',
                    variant: 'destructive',
                });
            }
        });
    };

    const handleConfigure = (playbook: PlaybookDefinition) => {
        setEditingPlaybook(playbook);
    };

    const handleSaveConfig = async (trigger: PlaybookTrigger, delivery: DeliveryConfig) => {
        if (!editingPlaybook) return;

        const config: PlaybookCustomConfig = {
            schedule: trigger.type === 'schedule' && trigger.cron
                ? { cron: trigger.cron, timezone: trigger.timezone ?? 'America/New_York' }
                : undefined,
            delivery: {
                channels: delivery.channels,
                emailTo: delivery.emailTo,
                phoneNumber: delivery.phoneNumber,
                reportFormat: delivery.reportFormat,
            },
        };

        const result = await updatePlaybookAssignmentConfig(orgId, editingPlaybook.id, config);
        if (!result.success) throw new Error(result.error ?? 'Failed to save');

        setCustomConfigs((prev) => ({ ...prev, [editingPlaybook.id]: config }));
        toast({
            title: 'Configuration saved',
            description: 'Schedule and delivery settings updated.',
        });
        setEditingPlaybook(null);
    };

    // Group playbooks by agent
    const groupedPlaybooks = tierPlaybooks.reduce<Record<string, PlaybookDefinition[]>>((acc, p) => {
        const tab = AGENT_CONFIG[p.agent]?.tab || 'system';
        if (!acc[tab]) acc[tab] = [];
        acc[tab].push(p);
        return acc;
    }, {});

    const availableTabs = Object.keys(groupedPlaybooks).filter((t) => groupedPlaybooks[t].length > 0);
    const activeCount = activeIds.size;
    const totalCount = tierPlaybooks.length;
    const allActive = activeCount === totalCount && totalCount > 0;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Loading your playbooks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 max-w-5xl mx-auto">

            {/* ── Hero: What are Playbooks? ─────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center gap-5">
                            {/* Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Zap className="h-7 w-7 text-primary" />
                            </div>

                            {/* Copy */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-xl font-bold">Playbooks</h1>
                                    <Badge variant="outline" className="text-xs font-medium">
                                        {TIER_LABELS[tierId] || tierId} Plan
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                                    Playbooks are <strong>automated workflows</strong> that run quietly in the background —
                                    sending the right message to the right customer at exactly the right moment.
                                    Toggle them on and they just work. No code, no setup, no manual effort.
                                </p>
                                {/* How they work */}
                                <div className="flex flex-wrap gap-4 mt-3">
                                    {[
                                        { icon: Users, text: 'Triggered by customer behavior' },
                                        { icon: Sparkles, text: 'AI-written, always compliant' },
                                        { icon: BarChart3, text: 'Revenue tracked automatically' },
                                    ].map(({ icon: Icon, text }) => (
                                        <span key={text} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Icon className="h-3.5 w-3.5 text-primary" />
                                            {text}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Stats + CTA */}
                            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                                        <p className="text-xs text-muted-foreground">Active</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{totalCount}</p>
                                        <p className="text-xs text-muted-foreground">Available</p>
                                    </div>
                                </div>
                                {!allActive && (
                                    <Button
                                        size="sm"
                                        onClick={handleActivateAll}
                                        disabled={isActivatingAll}
                                        className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        {isActivatingAll ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Zap className="h-3.5 w-3.5" />
                                        )}
                                        Activate All {totalCount} Playbooks
                                    </Button>
                                )}
                                {allActive && (
                                    <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                                        <CheckCircle2 className="h-4 w-4" />
                                        All playbooks active!
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* ── Playbooks by Category ──────────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <Tabs defaultValue={availableTabs[0] || 'marketing'} className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <TabsList className="flex-wrap h-auto gap-1 bg-muted/50">
                            {availableTabs.map((tab) => {
                                const agentKey = Object.entries(AGENT_CONFIG).find(
                                    ([, cfg]) => cfg.tab === tab
                                )?.[0] as PlaybookAgent | undefined;
                                if (!agentKey) return null;
                                const cfg = AGENT_CONFIG[agentKey];
                                const Icon = cfg.icon;
                                const tabPlaybooks = groupedPlaybooks[tab] || [];
                                const activeInTab = tabPlaybooks.filter((p) => activeIds.has(p.id)).length;

                                return (
                                    <TabsTrigger
                                        key={tab}
                                        value={tab}
                                        className="flex items-center gap-1.5 text-xs"
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {cfg.label}
                                        <span className={cn(
                                            'ml-0.5 px-1 rounded text-xs font-medium',
                                            activeInTab > 0
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-muted text-muted-foreground'
                                        )}>
                                            {activeInTab}/{tabPlaybooks.length}
                                        </span>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    {availableTabs.map((tab) => {
                        const tabPlaybooks = groupedPlaybooks[tab] || [];
                        const agentKey = Object.entries(AGENT_CONFIG).find(
                            ([, cfg]) => cfg.tab === tab
                        )?.[0] as PlaybookAgent | undefined;
                        const cfg = agentKey ? AGENT_CONFIG[agentKey] : null;

                        return (
                            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
                                {/* Tab header */}
                                {cfg && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <cfg.icon className={cn('h-4 w-4', cfg.color)} />
                                        <h2 className="text-sm font-semibold">{cfg.label}</h2>
                                        <span className="text-xs text-muted-foreground">
                                            — {tabPlaybooks.filter((p) => activeIds.has(p.id)).length} of {tabPlaybooks.length} active
                                        </span>
                                    </div>
                                )}

                                {/* Playbook cards */}
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {tabPlaybooks.map((playbook, i) => (
                                        <motion.div
                                            key={playbook.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2, delay: i * 0.03 }}
                                        >
                                            <PlaybookCard
                                                playbook={playbook}
                                                isActive={activeIds.has(playbook.id)}
                                                onToggle={handleToggle}
                                                isToggling={togglingIds.has(playbook.id)}
                                                onConfigure={handleConfigure}
                                                customScheduleLabel={
                                                    customConfigs[playbook.id]?.schedule
                                                        ? 'Custom schedule'
                                                        : undefined
                                                }
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </motion.div>

            {/* ── Footer tip ────────────────────────────────────────────────── */}
            <p className="text-xs text-center text-muted-foreground pb-4">
                Playbooks run automatically — no action needed after activation.
                You'll receive reports in your Inbox and Drive.
                <a href="/dashboard/inbox" className="ml-1 underline underline-offset-2">
                    View Inbox <ChevronRight className="h-3 w-3 inline" />
                </a>
            </p>

            {/* ── Configure Sheet ──────────────────────────────────────────── */}
            {editingPlaybook && (
                <PlaybookEditSheet
                    open={!!editingPlaybook}
                    onOpenChange={(open) => { if (!open) setEditingPlaybook(null); }}
                    playbookName={editingPlaybook.name}
                    playbookDescription={editingPlaybook.description}
                    initialTrigger={
                        customConfigs[editingPlaybook.id]?.schedule
                            ? {
                                type: 'schedule',
                                cron: customConfigs[editingPlaybook.id].schedule!.cron,
                                timezone: customConfigs[editingPlaybook.id].schedule!.timezone,
                            }
                            : configTriggerToPlaybookTrigger(editingPlaybook.trigger)
                    }
                    hasDelivery={hasDeliveryChannels(editingPlaybook)}
                    initialDelivery={customConfigs[editingPlaybook.id]?.delivery}
                    onSave={handleSaveConfig}
                />
            )}
        </div>
    );
}

export default DispensaryPlaybooksView;
