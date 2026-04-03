'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { Building2, Sprout, Store, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/use-user-role';
import {
    getDefaultOnboardingPrimaryGoal,
    getOnboardingGoalDefinition,
    getOnboardingGoalHref,
    getOnboardingGoalPreview,
    normalizeOnboardingPrimaryGoal,
} from '@/lib/onboarding/activation';
import { getOrgProfileAction } from '@/server/actions/org-profile';
import type { OnboardingPrimaryGoal } from '@/types/onboarding';
import { isDispensaryRole, isGrowerRole } from '@/types/roles';
import { InsightCardsGrid } from './insight-cards-grid';

interface InboxWorkspaceBriefingProps {
    className?: string;
}

interface WorkspaceMeta {
    label: string;
    title: string;
    Icon: LucideIcon;
    accentClassName: string;
    description: (orgName: string | null) => string;
}

interface AgentGuideMeta {
    name: string;
    description: string;
}

const WORKSPACE_GUIDE_CARDS = [
    {
        eyebrow: 'Inbox',
        title: 'Where work lands',
        description: 'Threads collect drafts, briefings, approvals, and reports so the team can act from one place.',
    },
    {
        eyebrow: 'Playbooks',
        title: 'What repeats automatically',
        description: 'Automations keep welcome, follow-up, and recurring execution running after you turn them on.',
    },
    {
        eyebrow: 'Agents',
        title: 'Who helps you execute',
        description: 'Craig drives creative, Smokey supports check-in, Mrs. Parker handles welcome email, and Ezal covers intel.',
    },
] as const;

function getFallbackOrgName(user: unknown): string | null {
    if (!user || typeof user !== 'object') {
        return null;
    }

    const candidate = user as Record<string, unknown>;
    const rawName =
        candidate.organizationName
        || candidate.orgName
        || candidate.brandName
        || candidate.locationName
        || candidate.businessName;

    return typeof rawName === 'string' && rawName.trim() ? rawName.trim() : null;
}

function getWorkspaceMeta(role: string | null): WorkspaceMeta {
    if (isGrowerRole(role)) {
        return {
            label: 'Grower Pilot',
            title: 'Cultivation Command Center',
            Icon: Sprout,
            accentClassName: 'bg-emerald-100 text-emerald-800',
            description: (orgName) =>
                `${orgName || 'Your wholesale operation'} can keep yield health, buyer-ready inventory, and brand outreach visible while the conversation workspace stays focused below.`,
        };
    }

    if (isDispensaryRole(role)) {
        return {
            label: 'Dispensary Pilot',
            title: 'Retail Command Center',
            Icon: Store,
            accentClassName: 'bg-orange-100 text-orange-800',
            description: (orgName) =>
                `${orgName || 'Your store'} can keep daily retail signals, compliance, and operator follow-up visible while active threads stay anchored in the workspace below.`,
        };
    }

    return {
        label: 'Brand Pilot',
        title: 'Brand Command Center',
        Icon: Building2,
        accentClassName: 'bg-sky-100 text-sky-800',
        description: (orgName) =>
            `${orgName || 'Your brand'} can watch sell-through, retail coverage, and campaign opportunities from one desktop briefing before dropping into the thread-level work.`,
    };
}

function getAgentGuideMeta(goal: OnboardingPrimaryGoal): AgentGuideMeta {
    switch (goal) {
        case 'checkin_tablet':
            return {
                name: 'Smokey',
                description: 'owns the front-door check-in experience, launch briefings, and staff-facing retail guidance.',
            };
        case 'creative_center':
            return {
                name: 'Craig',
                description: 'turns your Brand Guide into social drafts, campaign angles, and calendar-ready ideas.',
            };
        case 'welcome_playbook':
        default:
            return {
                name: 'Mrs. Parker',
                description: 'personalizes welcome email flows so new contacts get the right follow-up automatically.',
            };
    }
}

export function InboxWorkspaceBriefing({ className }: InboxWorkspaceBriefingProps) {
    const { role, orgId, user } = useUserRole();
    const { userData } = useUser();
    const [orgName, setOrgName] = useState<string | null>(getFallbackOrgName(user));
    const [isLoadingName, setIsLoadingName] = useState(false);

    const meta = getWorkspaceMeta(role);
    const primaryGoal =
        normalizeOnboardingPrimaryGoal(userData?.onboarding?.primaryGoal)
        || getDefaultOnboardingPrimaryGoal(role);
    const goalDefinition = getOnboardingGoalDefinition(primaryGoal);
    const goalHref = getOnboardingGoalHref(primaryGoal, role);
    const goalPreview = getOnboardingGoalPreview(primaryGoal, role);
    const agentGuide = getAgentGuideMeta(primaryGoal);

    useEffect(() => {
        let active = true;
        const fallbackName = getFallbackOrgName(user);

        if (!orgId) {
            setOrgName(fallbackName);
            setIsLoadingName(false);
            return () => {
                active = false;
            };
        }

        setIsLoadingName(true);

        void (async () => {
            try {
                const result = await getOrgProfileAction(orgId);
                if (!active) {
                    return;
                }

                const profileName = result.success ? result.profile?.brand?.name?.trim() || null : null;
                setOrgName(profileName || fallbackName);
            } catch (error) {
                console.warn('[InboxWorkspaceBriefing] Failed to load org profile', {
                    orgId,
                    error,
                });
                if (active) {
                    setOrgName(fallbackName);
                }
            } finally {
                if (active) {
                    setIsLoadingName(false);
                }
            }
        })();

        return () => {
            active = false;
        };
    }, [orgId, user]);

    return (
        <section className={cn('rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm', className)}>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className={cn('border-0 text-[11px]', meta.accentClassName)}>
                            {meta.label}
                        </Badge>
                        <Badge variant="outline" className="bg-background/80 text-[11px] text-foreground">
                            {isLoadingName ? (
                                <Skeleton className="h-3 w-28" />
                            ) : (
                                orgName || 'BakedBot Workspace'
                            )}
                        </Badge>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-background p-1.5 text-primary shadow-sm">
                                <meta.Icon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                    Desktop Briefing
                                </p>
                                <h2 className="text-base font-semibold text-foreground lg:text-lg">
                                    {meta.title}
                                </h2>
                            </div>
                        </div>

                        <p className="max-w-3xl text-[13px] leading-5 text-muted-foreground">
                            {meta.description(orgName)}
                        </p>
                    </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 xl:max-w-[220px]">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                        Pilot Focus
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                        Briefing + conversations
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                        Keep the live daily briefing on screen while your active inbox work stays in the workspace below.
                    </p>
                </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-background text-[11px] text-foreground">
                            Start Here
                        </Badge>
                        <Badge className="border-0 bg-primary/10 text-[11px] text-primary">
                            {agentGuide.name}
                        </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                        <div>
                            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                First Win
                            </p>
                            <h3 className="text-base font-semibold text-foreground">
                                {goalDefinition.title}
                            </h3>
                        </div>

                        <p className="text-[13px] leading-5 text-muted-foreground">
                            Brand Guide comes first. {goalPreview}
                        </p>

                        <p className="text-[12px] leading-5 text-muted-foreground">
                            <span className="font-semibold text-foreground">Lead agent:</span>{' '}
                            {agentGuide.name} {agentGuide.description}
                        </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                            href="/dashboard/settings/brand-guide"
                            className="inline-flex items-center rounded-lg border border-border/70 bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                        >
                            Open Brand Guide
                        </Link>
                        <Link
                            href={goalHref}
                            className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        >
                            {goalDefinition.ctaLabel}
                        </Link>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    {WORKSPACE_GUIDE_CARDS.map((card) => (
                        <div
                            key={card.eyebrow}
                            className="rounded-xl border border-border/60 bg-background/70 px-3 py-3"
                        >
                            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {card.eyebrow}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                                {card.title}
                            </p>
                            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                                {card.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-4">
                <InsightCardsGrid maxCards={5} density="dense" />
            </div>
        </section>
    );
}

export default InboxWorkspaceBriefing;
