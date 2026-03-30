'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Sprout, Store, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/use-user-role';
import { getOrgProfileAction } from '@/server/actions/org-profile';
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

export function InboxWorkspaceBriefing({ className }: InboxWorkspaceBriefingProps) {
    const { role, orgId, user } = useUserRole();
    const [orgName, setOrgName] = useState<string | null>(getFallbackOrgName(user));
    const [isLoadingName, setIsLoadingName] = useState(false);

    const meta = getWorkspaceMeta(role);

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

            <div className="mt-4">
                <InsightCardsGrid maxCards={5} density="dense" />
            </div>
        </section>
    );
}

export default InboxWorkspaceBriefing;
