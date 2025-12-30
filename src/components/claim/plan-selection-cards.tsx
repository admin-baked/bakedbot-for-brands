'use client';

import { PRICING_PLANS } from '@/lib/config/pricing';
import { cn } from '@/lib/utils';
import { CheckCircle, Flame, Shield } from 'lucide-react';

import { PlanId } from '@/lib/plans';

interface PlanSelectionCardsProps {
    selectedPlan: PlanId;
    onSelectPlan: (planId: PlanId) => void;
    foundersRemaining?: number;
}

export function PlanSelectionCards({
    selectedPlan,
    onSelectPlan,
    foundersRemaining = 247
}: PlanSelectionCardsProps) {
    const claimProPlan = PRICING_PLANS.find(p => p.id === 'claim_pro');
    const foundersPlan = PRICING_PLANS.find(p => p.id === 'founders_claim');

    if (!claimProPlan || !foundersPlan) {
        return <div className="text-red-500">Plans not configured</div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                {/* Claim Pro Card */}
                <div
                    onClick={() => onSelectPlan('claim_pro')}
                    className={cn(
                        "relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg",
                        selectedPlan === 'claim_pro'
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50"
                    )}
                >
                    {selectedPlan === 'claim_pro' && (
                        <div className="absolute right-4 top-4">
                            <CheckCircle className="h-6 w-6 text-primary" />
                        </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">RECOMMENDED</span>
                    </div>

                    <h3 className="text-xl font-bold">{claimProPlan.name}</h3>

                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{claimProPlan.priceDisplay}</span>
                        <span className="text-muted-foreground">{claimProPlan.period}</span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{claimProPlan.desc}</p>

                    <ul className="mt-4 space-y-2">
                        {claimProPlan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Founders Claim Card */}
                <div
                    onClick={() => onSelectPlan('founders_claim')}
                    className={cn(
                        "relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 hover:shadow-lg",
                        selectedPlan === 'founders_claim'
                            ? "border-orange-500 bg-orange-500/5 shadow-md"
                            : "border-border hover:border-orange-500/50"
                    )}
                >
                    {selectedPlan === 'founders_claim' && (
                        <div className="absolute right-4 top-4">
                            <CheckCircle className="h-6 w-6 text-orange-500" />
                        </div>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                        <Flame className="h-5 w-5 text-orange-500" />
                        <span className="text-sm font-medium text-orange-600">LIMITED OFFER</span>
                    </div>

                    <h3 className="text-xl font-bold">{foundersPlan.name}</h3>

                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold">{foundersPlan.priceDisplay}</span>
                        <span className="text-muted-foreground">{foundersPlan.period}</span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{foundersPlan.desc}</p>

                    {/* Scarcity Badge */}
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                        <Flame className="h-3 w-3" />
                        Only {foundersRemaining} of 250 remaining
                    </div>

                    <ul className="mt-4 space-y-2">
                        {foundersPlan.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            
            <div className="text-center">
                <button 
                    type="button" 
                    onClick={() => onSelectPlan('free')}
                    className={cn(
                        "text-sm font-medium transition-colors hover:underline",
                        selectedPlan === 'free' ? "text-primary underline" : "text-muted-foreground"
                    )}
                >
                    Continue with Free Listing (limited features)
                </button>
            </div>
        </div>
    );
}
