'use client';

/**
 * Hook for accessing user's subscription plan information
 * Provides plan details for UI display and feature gating
 */

import { useEffect, useState } from 'react';
import { useFirebase } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { PRICING_PLANS } from '@/lib/config/pricing';

export type PlanId = 'free' | 'claim_pro' | 'founders_claim' | 'growth' | 'scale' | 'enterprise';
export type PlanTier = 'unclaimed' | 'claim' | 'subscription';

export interface PlanInfo {
    planId: PlanId;
    planName: string;
    tier: PlanTier;
    price: number | null;
    isActive: boolean;
    features: {
        maxZips: number;
        advancedReporting: boolean;
        prioritySupport: boolean;
        coveragePacksEnabled: boolean;
        maxPlaybooks: number;
    };
}

const DEFAULT_PLAN: PlanInfo = {
    planId: 'free',
    planName: 'Free Listing',
    tier: 'unclaimed',
    price: 0,
    isActive: false,
    features: {
        maxZips: 1,
        advancedReporting: false,
        prioritySupport: false,
        coveragePacksEnabled: false,
        maxPlaybooks: 0
    }
};

const PLAN_FEATURES: Record<PlanId, PlanInfo['features']> = {
    free: {
        maxZips: 1,
        advancedReporting: false,
        prioritySupport: false,
        coveragePacksEnabled: false,
        maxPlaybooks: 0
    },
    claim_pro: {
        maxZips: 5,
        advancedReporting: false,
        prioritySupport: false,
        coveragePacksEnabled: false,
        maxPlaybooks: 3
    },
    founders_claim: {
        maxZips: 5,
        advancedReporting: false,
        prioritySupport: false,
        coveragePacksEnabled: false,
        maxPlaybooks: 3
    },
    growth: {
        maxZips: 50,
        advancedReporting: true,
        prioritySupport: false,
        coveragePacksEnabled: true,
        maxPlaybooks: 20
    },
    scale: {
        maxZips: 500,
        advancedReporting: true,
        prioritySupport: true,
        coveragePacksEnabled: true,
        maxPlaybooks: 50
    },
    enterprise: {
        maxZips: -1, // unlimited
        advancedReporting: true,
        prioritySupport: true,
        coveragePacksEnabled: true,
        maxPlaybooks: -1 // unlimited
    }
};

export function usePlanInfo() {
    const { user, firestore } = useFirebase();
    const [planInfo, setPlanInfo] = useState<PlanInfo>(DEFAULT_PLAN);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchPlanInfo() {
            if (!user || !firestore) {
                setIsLoading(false);
                return;
            }

            try {
                // First try user document
                const userDoc = await getDoc(doc(firestore, 'users', user.uid));
                const userData = userDoc.data();

                let planId: PlanId = 'free';
                let isActive = false;

                // Check user billing
                if (userData?.billing?.planId) {
                    planId = userData.billing.planId as PlanId;
                    isActive = userData.billing.status === 'active';
                }

                // Check organization billing if user has orgId
                if (userData?.currentOrgId) {
                    const orgDoc = await getDoc(doc(firestore, 'organizations', userData.currentOrgId));
                    const orgData = orgDoc.data();
                    if (orgData?.billing?.planId) {
                        planId = orgData.billing.planId as PlanId;
                        isActive = orgData.billing.subscriptionStatus === 'active';
                    }
                }

                // Get plan details
                const plan = PRICING_PLANS.find(p => p.id === planId);
                const features = PLAN_FEATURES[planId] || PLAN_FEATURES.free;

                setPlanInfo({
                    planId,
                    planName: plan?.name || 'Free Listing',
                    tier: (plan?.tier as PlanTier) || 'unclaimed',
                    price: plan?.price ?? 0,
                    isActive,
                    features
                });
            } catch (error) {
                console.error('Error fetching plan info:', error);
                setPlanInfo(DEFAULT_PLAN);
            } finally {
                setIsLoading(false);
            }
        }

        fetchPlanInfo();
    }, [user, firestore]);

    return {
        ...planInfo,
        isLoading,
        isPaid: planInfo.tier !== 'unclaimed',
        isScale: planInfo.planId === 'scale',
        isEnterprise: planInfo.planId === 'enterprise',
        isGrowthOrHigher: ['growth', 'scale', 'enterprise'].includes(planInfo.planId)
    };
}
