'use client';

/**
 * PlanCreditMeter
 * Shows the current plan name and AI credit usage in the dashboard sidebar/header.
 * Fetches credit data from Firestore organizations/{orgId}/billing/credits.
 */

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { useUserRole } from '@/hooks/use-user-role';
import { usePlanInfo } from '@/hooks/use-plan-info';
import { findPricingPlan } from '@/lib/config/pricing';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditData {
    includedCreditsTotal: number;
    includedCreditsUsed: number;
    rolloverCreditsTotal: number;
    rolloverCreditsUsed: number;
    topUpCreditsTotal: number;
    topUpCreditsUsed: number;
}

export function PlanCreditMeter({ className }: { className?: string }) {
    const { firestore } = useFirebase();
    const { orgId } = useUserRole();
    const { planId, planName } = usePlanInfo();
    const [credits, setCredits] = useState<CreditData | null>(null);

    useEffect(() => {
        if (!firestore || !orgId) return;

        const ref = doc(firestore, 'organizations', orgId, 'billing', 'credits');
        getDoc(ref)
            .then((snap) => {
                if (snap.exists()) {
                    setCredits(snap.data() as CreditData);
                }
            })
            .catch(() => { /* silent — fallback to plan defaults */ });
    }, [firestore, orgId]);

    const plan = findPricingPlan(planId);
    const includedTotal = credits?.includedCreditsTotal ?? plan?.includedCredits ?? 0;
    const includedUsed = credits?.includedCreditsUsed ?? 0;
    const rolloverAvail = (credits?.rolloverCreditsTotal ?? 0) - (credits?.rolloverCreditsUsed ?? 0);
    const topUpAvail = (credits?.topUpCreditsTotal ?? 0) - (credits?.topUpCreditsUsed ?? 0);
    const totalAvail = (includedTotal - includedUsed) + rolloverAvail + topUpAvail;
    const pct = includedTotal > 0 ? Math.min(100, Math.round((includedUsed / includedTotal) * 100)) : 0;

    const isWarning = pct >= 80;
    const isCritical = pct >= 95;

    if (!plan && !credits) return null;

    return (
        <div className={cn('space-y-1.5 px-1', className)}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground font-medium">AI Credits</span>
                {isCritical ? (
                    <Badge variant="destructive" className="text-[10px] h-4 px-1.5">Low</Badge>
                ) : isWarning ? (
                    <Badge className="text-[10px] h-4 px-1.5 bg-amber-500/90 text-white border-0">80%</Badge>
                ) : null}
            </div>
            <Progress
                value={pct}
                className={cn(
                    'h-1.5',
                    isCritical ? '[&>div]:bg-red-500' : isWarning ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'
                )}
            />
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Zap className="h-3 w-3 shrink-0" />
                <span>
                    {totalAvail.toLocaleString()} credits left
                    {rolloverAvail > 0 && (
                        <span className="text-muted-foreground/60"> · {rolloverAvail.toLocaleString()} rolled over</span>
                    )}
                </span>
            </div>
        </div>
    );
}
