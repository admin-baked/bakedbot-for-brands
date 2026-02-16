'use client';

/**
 * useInsights Hook
 *
 * Fetches and caches role-based insights with SWR-like behavior.
 * Supports polling, manual refresh, and optimistic loading states.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserRole } from './use-user-role';
import { useMockData } from './use-mock-data';
import { getInsights } from '@/server/actions/insights';
import type {
    InsightsResponse,
    InsightCard,
    DispensaryInsights,
    BrandInsights,
    SuperUserInsights,
} from '@/types/insight-cards';

// ============ Mock Data ============

const MOCK_DISPENSARY_INSIGHTS: DispensaryInsights = {
    velocity: [
        {
            id: 'mock-expiring',
            category: 'velocity',
            agentId: 'money_mike',
            agentName: 'Money Mike',
            title: 'Expiring Soon',
            headline: '12 items expiring',
            subtext: '3 need immediate action',
            value: 12,
            severity: 'warning',
            actionable: true,
            ctaLabel: 'Create Clearance',
            threadType: 'inventory_promo',
            threadPrompt: 'I have 12 items expiring soon. Help me create clearance pricing.',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    efficiency: [
        {
            id: 'mock-orders',
            category: 'efficiency',
            agentId: 'pops',
            agentName: 'Pops',
            title: 'Order Flow',
            headline: '8 pending orders',
            subtext: '3 ready for pickup',
            value: 8,
            severity: 'info',
            actionable: true,
            ctaLabel: 'View Orders',
            threadType: 'performance',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    customer: [
        {
            id: 'mock-loyalty',
            category: 'customer',
            agentId: 'mrs_parker',
            agentName: 'Mrs. Parker',
            title: 'Customer Love',
            headline: '45 new this week',
            subtext: '12% increase',
            trend: 'up',
            trendValue: '+12%',
            severity: 'success',
            actionable: true,
            ctaLabel: 'View Customers',
            threadType: 'customer_health',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    compliance: [
        {
            id: 'mock-compliance',
            category: 'compliance',
            agentId: 'deebo',
            agentName: 'Deebo',
            title: 'Compliance',
            headline: 'All clear',
            subtext: 'No active flags',
            severity: 'success',
            actionable: false,
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    market: [
        {
            id: 'mock-market',
            category: 'market',
            agentId: 'ezal',
            agentName: 'Ezal',
            title: 'Market Intel',
            headline: '2 price alerts',
            subtext: 'Competitors dropped prices',
            severity: 'warning',
            actionable: true,
            ctaLabel: 'Spy',
            threadType: 'market_intel',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    lastFetched: new Date(),
};

const MOCK_BRAND_INSIGHTS: BrandInsights = {
    performance: [
        {
            id: 'mock-velocity',
            category: 'performance',
            agentId: 'pops',
            agentName: 'Pops',
            title: 'Velocity',
            headline: '128 units/week',
            subtext: 'Avg per Store',
            trend: 'up',
            trendValue: '+8%',
            severity: 'success',
            actionable: true,
            ctaLabel: 'Deep Dive',
            threadType: 'performance',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    campaign: [
        {
            id: 'mock-campaign',
            category: 'campaign',
            agentId: 'craig',
            agentName: 'Craig',
            title: 'Campaigns',
            headline: '3 active',
            subtext: 'Running strong',
            severity: 'success',
            actionable: true,
            ctaLabel: 'New Campaign',
            threadType: 'campaign',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    distribution: [
        {
            id: 'mock-coverage',
            category: 'distribution',
            agentId: 'leo',
            agentName: 'Leo',
            title: 'Retail Coverage',
            headline: '12 stores',
            subtext: 'Stores Carrying',
            trend: 'up',
            trendValue: '+2',
            severity: 'success',
            actionable: true,
            ctaLabel: 'Find More',
            threadType: 'retail_partner',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    content: [
        {
            id: 'mock-content',
            category: 'content',
            agentId: 'craig',
            agentName: 'Craig',
            title: 'Content',
            headline: 'Create engaging content',
            subtext: 'Carousels, posts & more',
            severity: 'info',
            actionable: true,
            ctaLabel: 'Create',
            threadType: 'creative',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    competitive: [
        {
            id: 'mock-competitive',
            category: 'competitive',
            agentId: 'ezal',
            agentName: 'Ezal',
            title: 'Price Position',
            headline: '+5% vs Market',
            subtext: 'Healthy margin',
            severity: 'success',
            actionable: true,
            ctaLabel: 'Intel',
            threadType: 'market_intel',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    lastFetched: new Date(),
};

const MOCK_SUPER_USER_INSIGHTS: SuperUserInsights = {
    platform: [
        {
            id: 'mock-system-health',
            category: 'platform',
            agentId: 'leo',
            agentName: 'Leo',
            title: 'System Health',
            headline: '99.9% uptime',
            subtext: 'All systems operational',
            severity: 'success',
            actionable: true,
            ctaLabel: 'View Details',
            threadType: 'general',
            threadPrompt: 'Show me detailed system health metrics',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    growth: [
        {
            id: 'mock-signups',
            category: 'growth',
            agentId: 'jack',
            agentName: 'Jack',
            title: 'New Signups',
            headline: '12 this week',
            subtext: 'Up from 8 last week',
            trend: 'up',
            trendValue: '+50%',
            severity: 'success',
            actionable: true,
            ctaLabel: 'View Leads',
            threadType: 'general',
            threadPrompt: 'Show me new signup details and conversion funnel',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    deployment: [
        {
            id: 'mock-deployment',
            category: 'deployment',
            agentId: 'linus',
            agentName: 'Linus',
            title: 'Deployments',
            headline: '3 today',
            subtext: 'All successful',
            severity: 'success',
            actionable: true,
            ctaLabel: 'View Logs',
            threadType: 'general',
            threadPrompt: 'Show me deployment history and build status',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    support: [
        {
            id: 'mock-support',
            category: 'support',
            agentId: 'mrs_parker',
            agentName: 'Mrs. Parker',
            title: 'Support Queue',
            headline: '2 open tickets',
            subtext: 'Avg response: 4h',
            severity: 'info',
            actionable: true,
            ctaLabel: 'View Tickets',
            threadType: 'general',
            threadPrompt: 'Show me open support tickets and customer issues',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    intelligence: [
        {
            id: 'mock-research',
            category: 'intelligence',
            agentId: 'big_worm',
            agentName: 'Big Worm',
            title: 'Research Queue',
            headline: '5 tasks pending',
            subtext: '2 high priority',
            severity: 'warning',
            actionable: true,
            ctaLabel: 'Prioritize',
            threadType: 'general',
            threadPrompt: 'Show me research queue and prioritize high-value tasks',
            lastUpdated: new Date(),
            dataSource: 'mock',
        },
    ],
    lastFetched: new Date(),
};

// ============ Hook Options ============

interface UseInsightsOptions {
    /** Polling interval in ms (0 to disable) */
    refreshInterval?: number;
    /** Enable/disable auto-fetch on mount */
    autoFetch?: boolean;
}

// ============ Hook Return ============

interface UseInsightsReturn {
    insights: InsightsResponse | null;
    isLoading: boolean;
    isRefreshing: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    lastUpdated: Date | null;
    // Convenience getters
    getAllInsights: () => InsightCard[];
    getInsightsByAgent: (agentId: string) => InsightCard[];
    getActionableInsights: () => InsightCard[];
}

// ============ Hook Implementation ============

export function useInsights(options: UseInsightsOptions = {}): UseInsightsReturn {
    const { refreshInterval = 60000, autoFetch = true } = options;

    const { role, orgId, isLoading: isRoleLoading } = useUserRole();
    const { isMock, isLoading: isMockLoading } = useMockData();

    const [insights, setInsights] = useState<InsightsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);

    const fetchInsights = useCallback(
        async (isRefresh = false) => {
            if (isRefresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setError(null);

            try {
                if (isMock) {
                    // Simulate network delay
                    await new Promise(r => setTimeout(r, 500));

                    if (!isMounted.current) return;

                    const isDispensaryRole =
                        role === 'dispensary' ||
                        role === 'dispensary_admin' ||
                        role === 'dispensary_staff' ||
                        role === 'budtender';

                    const isSuperUserRole = role === 'super_user';

                    if (isSuperUserRole) {
                        setInsights({
                            role: 'super_user',
                            data: MOCK_SUPER_USER_INSIGHTS,
                        });
                    } else if (isDispensaryRole) {
                        setInsights({
                            role: 'dispensary',
                            data: MOCK_DISPENSARY_INSIGHTS,
                        });
                    } else {
                        setInsights({
                            role: 'brand',
                            data: MOCK_BRAND_INSIGHTS,
                        });
                    }
                    setLastUpdated(new Date());
                } else {
                    const result = await getInsights();

                    if (!isMounted.current) return;

                    if (result.success && result.data) {
                        setInsights(result.data);
                        setLastUpdated(new Date());
                    } else {
                        setError(result.error || 'Failed to fetch insights');
                    }
                }
            } catch (err) {
                if (!isMounted.current) return;
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                if (isMounted.current) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                }
            }
        },
        [role, isMock]
    );

    const refresh = useCallback(async () => {
        await fetchInsights(true);
    }, [fetchInsights]);

    // Track mount state
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Initial fetch once role is loaded
    useEffect(() => {
        if (autoFetch && role && !isRoleLoading && !isMockLoading) {
            fetchInsights();
        }
    }, [autoFetch, role, isRoleLoading, isMockLoading, fetchInsights]);

    // Polling
    useEffect(() => {
        if (refreshInterval > 0 && role && !isRoleLoading) {
            intervalRef.current = setInterval(() => {
                fetchInsights(true);
            }, refreshInterval);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [refreshInterval, role, isRoleLoading, fetchInsights]);

    // ============ Convenience Getters ============

    const getAllInsights = useCallback((): InsightCard[] => {
        if (!insights) return [];
        const data = insights.data;
        if (insights.role === 'dispensary') {
            const d = data as DispensaryInsights;
            return [
                ...d.velocity,
                ...d.efficiency,
                ...d.customer,
                ...d.compliance,
                ...d.market,
            ];
        } else if (insights.role === 'super_user') {
            const s = data as SuperUserInsights;
            return [
                ...s.platform,
                ...s.growth,
                ...s.deployment,
                ...s.support,
                ...s.intelligence,
            ];
        } else {
            const b = data as BrandInsights;
            return [
                ...b.performance,
                ...b.campaign,
                ...b.distribution,
                ...b.content,
                ...b.competitive,
            ];
        }
    }, [insights]);

    const getInsightsByAgent = useCallback(
        (agentId: string): InsightCard[] => {
            return getAllInsights().filter(i => i.agentId === agentId);
        },
        [getAllInsights]
    );

    const getActionableInsights = useCallback((): InsightCard[] => {
        return getAllInsights().filter(i => i.actionable);
    }, [getAllInsights]);

    return {
        insights,
        isLoading: isLoading || isRoleLoading || isMockLoading,
        isRefreshing,
        error,
        refresh,
        lastUpdated,
        getAllInsights,
        getInsightsByAgent,
        getActionableInsights,
    };
}
