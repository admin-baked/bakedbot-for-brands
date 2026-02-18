/**
 * Pro & Enterprise Tier Playbook Templates
 *
 * Exclusive playbooks for paid tiers to differentiate value proposition:
 * - Pro ($49/mo): Daily competitive intel, campaign analytics
 * - Enterprise ($199/mo): Real-time intel, account summaries, API health
 */

export interface PlaybookTemplate {
    id: string;
    name: string;
    description: string;
    tier: 'pro' | 'enterprise';
    category: 'intel' | 'ops' | 'finance' | 'analytics';
    triggerEvent: string;
    enabled: boolean;
    schedule?: {
        type: 'daily' | 'hourly' | 'weekly';
        hour?: number; // 0-23 for daily/hourly
        dayOfWeek?: number; // 0-6 for weekly
    };
    steps: Array<{
        order: number;
        agent: 'craig' | 'ezal' | 'leo' | 'linus' | 'jack';
        action: string;
        config?: Record<string, any>;
    }>;
    channels: {
        email: boolean;
        sms: boolean;
        dashboard: boolean;
        slack?: boolean;
    };
    aiGenerated: boolean;
    personalizationLevel: 'basic' | 'contextual' | 'deep';
}

/**
 * PRO TIER PLAYBOOKS
 */

export const PRO_TIER_PLAYBOOKS: PlaybookTemplate[] = [
    {
        id: 'pro-daily-competitive-intel',
        name: '📊 Daily Competitive Intel',
        description:
            'Daily summary of competitor menu changes, pricing, and new products. Tracks 10 competitors with AI-powered insights.',
        tier: 'pro',
        category: 'intel',
        triggerEvent: 'schedule.daily',
        enabled: true,
        schedule: {
            type: 'daily',
            hour: 9, // 9 AM
        },
        steps: [
            {
                order: 1,
                agent: 'ezal',
                action: 'Scrape 10 competitors',
                config: {
                    maxCompetitors: 10,
                    fields: ['menu', 'pricing', 'products', 'hours', 'deals'],
                    includeAiInsights: true,
                },
            },
            {
                order: 2,
                agent: 'craig',
                action: 'Send daily summary email',
                config: {
                    template: 'pro_daily_intel_email',
                    includeAiAnalysis: true,
                    includeActionItems: true,
                },
            },
        ],
        channels: {
            email: true,
            sms: false,
            dashboard: true,
        },
        aiGenerated: true,
        personalizationLevel: 'contextual',
    },

    {
        id: 'pro-campaign-analyzer',
        name: '📈 Weekly Campaign Performance',
        description:
            'Automated campaign performance review with ROI analysis, customer engagement metrics, and AI-powered optimization suggestions.',
        tier: 'pro',
        category: 'analytics',
        triggerEvent: 'schedule.weekly',
        enabled: true,
        schedule: {
            type: 'weekly',
            dayOfWeek: 1, // Monday
            hour: 8,
        },
        steps: [
            {
                order: 1,
                agent: 'leo',
                action: 'Calculate campaign metrics',
                config: {
                    metrics: [
                        'impressions',
                        'clicks',
                        'conversions',
                        'revenue',
                        'roi',
                        'engagement_rate',
                    ],
                    period: 'last_7_days',
                },
            },
            {
                order: 2,
                agent: 'jack',
                action: 'Generate optimization recommendations',
                config: {
                    focusAreas: ['underperforming_campaigns', 'high_roi_patterns'],
                    includeAiBenchmarking: true,
                },
            },
            {
                order: 3,
                agent: 'craig',
                action: 'Send campaign report email',
                config: {
                    template: 'pro_campaign_report_email',
                    includeChart: true,
                    includeTrends: true,
                },
            },
        ],
        channels: {
            email: true,
            sms: false,
            dashboard: true,
        },
        aiGenerated: true,
        personalizationLevel: 'deep',
    },

    {
        id: 'pro-revenue-optimizer',
        name: '💰 Revenue Optimization Weekly',
        description:
            'Weekly revenue insights with bundle pricing recommendations, seasonal trends, and upsell opportunities.',
        tier: 'pro',
        category: 'finance',
        triggerEvent: 'schedule.weekly',
        enabled: true,
        schedule: {
            type: 'weekly',
            dayOfWeek: 2, // Tuesday
            hour: 10,
        },
        steps: [
            {
                order: 1,
                agent: 'leo',
                action: 'Analyze revenue trends',
                config: {
                    period: 'last_30_days',
                    includeSeasonality: true,
                    compareToPreviousMonth: true,
                },
            },
            {
                order: 2,
                agent: 'jack',
                action: 'Identify upsell opportunities',
                config: {
                    segmentByProductType: true,
                    includeBundleRecommendations: true,
                    priceOptimization: true,
                },
            },
            {
                order: 3,
                agent: 'craig',
                action: 'Send revenue optimization email',
                config: {
                    template: 'pro_revenue_email',
                    includeTopProducts: true,
                    includeUpsellSuggestions: true,
                },
            },
        ],
        channels: {
            email: true,
            sms: false,
            dashboard: true,
        },
        aiGenerated: true,
        personalizationLevel: 'deep',
    },
];

/**
 * ENTERPRISE TIER PLAYBOOKS
 */

export const ENTERPRISE_TIER_PLAYBOOKS: PlaybookTemplate[] = [
    {
        id: 'enterprise-realtime-intel',
        name: '⚡ Real-Time Competitive Intelligence',
        description:
            'Hourly competitor monitoring with unlimited tracking, real-time alerts for major changes, and executive summary.',
        tier: 'enterprise',
        category: 'intel',
        triggerEvent: 'schedule.hourly',
        enabled: true,
        schedule: {
            type: 'hourly',
        },
        steps: [
            {
                order: 1,
                agent: 'ezal',
                action: 'Scrape all tracked competitors (unlimited)',
                config: {
                    maxCompetitors: null, // Unlimited
                    fields: [
                        'menu',
                        'pricing',
                        'products',
                        'hours',
                        'deals',
                        'reviews',
                        'social',
                    ],
                    includeAiInsights: true,
                    detectAnomalies: true, // Alert on major changes
                },
            },
            {
                order: 2,
                agent: 'leo',
                action: 'Aggregate changes and generate alerts',
                config: {
                    alertThreshold: 'major_changes', // Only alert on significant changes
                    compareToHistorical: true,
                    rankByImpact: true,
                },
            },
        ],
        channels: {
            email: false,
            sms: false,
            dashboard: true,
            slack: true,
        },
        aiGenerated: false,
        personalizationLevel: 'contextual',
    },

    {
        id: 'enterprise-account-summary',
        name: '🏢 Daily Executive Summary',
        description:
            'Executive digest across all locations/brands with KPIs, alerts, and strategic insights. Sent to leadership team.',
        tier: 'enterprise',
        category: 'ops',
        triggerEvent: 'schedule.daily',
        enabled: true,
        schedule: {
            type: 'daily',
            hour: 6, // 6 AM - early morning digest
        },
        steps: [
            {
                order: 1,
                agent: 'leo',
                action: 'Aggregate account-wide metrics',
                config: {
                    includeAllLocations: true,
                    metrics: [
                        'total_revenue',
                        'orders_count',
                        'customer_metrics',
                        'inventory_health',
                        'compliance_status',
                    ],
                    compareToTargets: true,
                },
            },
            {
                order: 2,
                agent: 'jack',
                action: 'Identify critical alerts and opportunities',
                config: {
                    prioritizeByImpact: true,
                    includeStrategicInsights: true,
                },
            },
            {
                order: 3,
                agent: 'craig',
                action: 'Send executive summary email',
                config: {
                    template: 'enterprise_exec_summary_email',
                    recipients: 'leadership_only',
                    includeExecutiveSummary: true,
                    includeDetailedMetrics: true,
                },
            },
        ],
        channels: {
            email: true,
            sms: false,
            dashboard: true,
        },
        aiGenerated: true,
        personalizationLevel: 'deep',
    },

    {
        id: 'enterprise-integration-health',
        name: '🔗 Integration Health Monitor',
        description:
            'Daily monitoring of API usage, webhook delivery, integration status, and system performance. Alerts on degradation.',
        tier: 'enterprise',
        category: 'ops',
        triggerEvent: 'schedule.daily',
        enabled: true,
        schedule: {
            type: 'daily',
            hour: 7, // 7 AM
        },
        steps: [
            {
                order: 1,
                agent: 'linus',
                action: 'Monitor API and webhook health',
                config: {
                    checkEndpoints: true,
                    trackLatency: true,
                    trackErrorRates: true,
                    alertThreshold: '5%_error_rate',
                },
            },
            {
                order: 2,
                agent: 'linus',
                action: 'Generate system health report',
                config: {
                    includeUptime: true,
                    includePerformanceMetrics: true,
                    includeCapacityPlanning: true,
                },
            },
            {
                order: 3,
                agent: 'craig',
                action: 'Send health report email',
                config: {
                    template: 'enterprise_health_report_email',
                    recipients: 'ops_team',
                    includeDetailedMetrics: true,
                    includeRecommendations: true,
                },
            },
        ],
        channels: {
            email: true,
            sms: false,
            dashboard: true,
        },
        aiGenerated: false,
        personalizationLevel: 'basic',
    },

    {
        id: 'enterprise-custom-integrations',
        name: '🔌 Partner Ecosystem Manager',
        description:
            'Manage and monitor custom integrations, API activity, white-label deployments, and partner performance.',
        tier: 'enterprise',
        category: 'ops',
        triggerEvent: 'schedule.daily',
        enabled: true,
        schedule: {
            type: 'daily',
            hour: 14, // 2 PM
        },
        steps: [
            {
                order: 1,
                agent: 'linus',
                action: 'Monitor integration performance',
                config: {
                    trackApiCalls: true,
                    trackDataFlow: true,
                    detectAnomalies: true,
                },
            },
            {
                order: 2,
                agent: 'leo',
                action: 'Aggregate partner metrics',
                config: {
                    includeAllPartners: true,
                    metrics: ['api_calls', 'data_volume', 'error_rates', 'uptime'],
                    compareToBenchmarks: true,
                },
            },
            {
                order: 3,
                agent: 'craig',
                action: 'Send partner activity report',
                config: {
                    template: 'enterprise_partner_report_email',
                    recipients: 'platform_ops',
                    includePartnerMetrics: true,
                    includeSLAStatus: true,
                },
            },
        ],
        channels: {
            email: true,
            sms: false,
            dashboard: true,
        },
        aiGenerated: false,
        personalizationLevel: 'basic',
    },
];

/**
 * Get playbooks for subscription tier
 */
export function getPlaybooksForTier(tier: 'free' | 'pro' | 'enterprise'): PlaybookTemplate[] {
    switch (tier) {
        case 'pro':
            return PRO_TIER_PLAYBOOKS;
        case 'enterprise':
            return [...PRO_TIER_PLAYBOOKS, ...ENTERPRISE_TIER_PLAYBOOKS];
        case 'free':
        default:
            return []; // Free tier uses separate logic in free-user-setup.ts
    }
}

/**
 * Convert template to Firestore playbook_templates document
 */
export function templateToFirestoreDoc(template: PlaybookTemplate): Record<string, any> {
    return {
        id: template.id,
        name: template.name,
        description: template.description,
        tier: template.tier,
        category: template.category,
        triggerEvent: template.triggerEvent,
        enabled: template.enabled,
        schedule: template.schedule,
        steps: template.steps,
        channels: template.channels,
        aiGenerated: template.aiGenerated,
        personalizationLevel: template.personalizationLevel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}
