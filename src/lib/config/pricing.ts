export type PricingTrack = 'access' | 'operator';
export type PricingSalesMotion = 'self_serve' | 'consultative';
export type PublicCommercialPlanId =
    | 'free'
    | 'access_intel'
    | 'access_retention'
    | 'operator_core'
    | 'operator_growth'
    | 'enterprise';

export interface PricingPlan {
    id: string;
    name: string;
    badge?: string;
    price: number | null;
    priceDisplay: string;
    priceLater?: number | null;
    period: string;
    setup?: string;
    activationFee?: number | null;
    desc: string;
    tagline?: string;
    highlight?: string | boolean;
    features: string[];
    pill: string;
    pillHref?: string;
    tier: 'directory' | 'platform';
    scarcity?: string;
    track: PricingTrack;
    salesMotion: PricingSalesMotion;
    ctaLabel: string;
    ctaHref: string;
    isLegacy?: boolean;
    kpiHighlights?: string[];
    // AI Credit allocation
    includedCredits?: number;
    creditRollover?: boolean;
    creditTopUpRate?: number;
}

export const AI_RETENTION_AUDIT = {
    title: 'AI Retention Audit',
    price: '$0',
    includes: [
        '1 capture and welcome flow scan',
        '1 retention readiness score',
        '1 compliance and trust review',
        '1 proof-path recommendation',
    ],
    cta: 'Run Retention Audit',
    href: '/ai-retention-audit',
};

// Backward compatibility for older imports.
export const FREE_AUDIT = AI_RETENTION_AUDIT;

export const PUBLIC_PLANS: PricingPlan[] = [
    {
        id: 'free',
        name: 'Free Check-In',
        tagline: 'Start free. Capture customer data. Prove the wedge.',
        price: 0,
        priceDisplay: '$0',
        activationFee: null,
        period: '/ mo',
        setup: 'Best for: Social Equity dispensaries, smaller operators, and early-stage teams starting with customer capture.',
        desc: 'Launch QR or tablet capture, collect first-party customer data, and activate a lightweight welcome motion without adding operational overhead.',
        features: [
            'Tablet or QR customer capture',
            'Welcome email starter flow',
            'Basic loyalty capture',
            'Basic dashboard or weekly summary',
        ],
        pill: 'Start Free',
        pillHref: '/onboarding?plan=free',
        highlight: false,
        tier: 'directory',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Start Free',
        ctaHref: '/onboarding?plan=free',
        kpiHighlights: ['New customers captured', 'Activation into first workflow'],
        includedCredits: 0,
        creditRollover: false,
    },
    {
        id: 'access_intel',
        name: 'Access Intel',
        tagline: 'Visibility before execution.',
        price: 149,
        priceDisplay: '$149',
        activationFee: null,
        period: '/ mo',
        setup: 'Best for: Social Equity dispensaries and smaller operators who need market visibility before they buy managed execution.',
        desc: 'Monitor competitor movement, local market shifts, and weekly intelligence so you can learn the market before you invest in a managed revenue motion.',
        features: [
            'Competitor tracking',
            'Local market shifts',
            'Weekly intelligence digest',
            'Limited analytics summary',
            'Limited AI workspace access',
        ],
        pill: 'Start Access Intel',
        pillHref: '/onboarding?plan=access_intel',
        highlight: false,
        tier: 'directory',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Start Access Intel',
        ctaHref: '/onboarding?plan=access_intel',
        kpiHighlights: ['Tracked competitors', 'Signals surfaced per week'],
        includedCredits: 500,
        creditRollover: false,
        creditTopUpRate: 5,
    },
    {
        id: 'access_retention',
        name: 'Access Retention',
        tagline: 'Narrow proof of value before managed execution.',
        price: 499,
        priceDisplay: '$499',
        activationFee: 500,
        period: '/ mo',
        setup: 'Best for: Social Equity dispensaries and smaller operators ready for welcome and lifecycle basics.',
        desc: 'Deploy a narrow welcome and retention stack with QR capture, simple segmentation, and monthly performance visibility without overpromising advanced optimization.',
        features: [
            'Welcome Email Playbook',
            'QR sign-up capture',
            'Basic segmentation',
            'Simple campaign templates',
            'Loyalty starter workflows',
            'Compliance pre-checks',
            'Monthly performance summary',
        ],
        pill: 'Start Access Retention',
        pillHref: '/onboarding?plan=access_retention',
        highlight: 'Bridge Tier',
        tier: 'platform',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Start Access Retention',
        ctaHref: '/onboarding?plan=access_retention',
        kpiHighlights: ['Welcome flow activation', 'List growth', 'Monthly proof signals'],
        includedCredits: 1500,
        creditRollover: false,
        creditTopUpRate: 4,
    },
    {
        id: 'operator_core',
        name: 'Operator Core',
        badge: 'Managed Wedge',
        tagline: 'Own the welcome and retention loop.',
        price: 2500,
        priceDisplay: '$2,500',
        activationFee: 1500,
        period: '/ mo',
        setup: 'Built for: Better-capitalized dispensaries, high-traffic single stores, and 2-10 store groups.',
        desc: 'BakedBot helps operators capture more customers, convert more first visits into second visits, and retain more repeat business through managed welcome and lifecycle execution.',
        features: [
            'Welcome Check-In Flow setup and optimization',
            'Welcome Email Playbook deployment',
            '2-4 retention playbooks',
            'QR capture and CRM list growth setup',
            'Campaign calendar support',
            'Deebo compliance review on outbound workflows',
            'Weekly operator reporting',
            'Monthly optimization review',
        ],
        pill: 'Book a Strategy Call',
        pillHref: '/book/martez',
        highlight: true,
        tier: 'platform',
        track: 'operator',
        salesMotion: 'consultative',
        ctaLabel: 'Book a Strategy Call',
        ctaHref: '/book/martez',
        kpiHighlights: [
            'Customer capture rate',
            'First-to-second visit conversion',
            'Repeat purchase rate',
            'Time to first value',
        ],
        includedCredits: 3000,
        creditRollover: true,
        creditTopUpRate: 3,
    },
    {
        id: 'operator_growth',
        name: 'Operator Growth',
        badge: 'Most Popular',
        tagline: 'A higher-value operating layer for serious operators.',
        price: 3500,
        priceDisplay: '$3,500',
        activationFee: 3000,
        period: '/ mo',
        setup: 'Built for: Multi-location operators and stronger single-state chains.',
        desc: 'Go beyond launch into deeper retention, executive reporting, market visibility, pricing insight, and optimization support for leadership teams.',
        features: [
            'Everything in Operator Core',
            'Advanced segmentation',
            'Additional lifecycle journeys',
            'Executive reporting and KPI reviews',
            'Competitor watch and market alerts',
            'Pricing and profitability insights',
            'Expansion and reactivation campaigns',
            '90-day optimization roadmap',
        ],
        pill: 'Book a Strategy Call',
        pillHref: '/book/martez',
        highlight: true,
        tier: 'platform',
        track: 'operator',
        salesMotion: 'consultative',
        ctaLabel: 'Book a Strategy Call',
        ctaHref: '/book/martez',
        kpiHighlights: [
            'Attributable welcome flow revenue',
            'Repeat purchase lift',
            'Executive KPI review cadence',
            'Expansion readiness',
        ],
        includedCredits: 7500,
        creditRollover: true,
        creditTopUpRate: 2,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: null,
        priceDisplay: 'Custom',
        activationFee: null,
        period: 'custom',
        setup: 'For: MSOs, partner networks, white-label relationships, and custom governance-heavy accounts.',
        desc: 'Custom workflows, deeper governance, multi-market support, custom reporting, implementation planning, and partner or network rollouts.',
        features: [
            'Multi-market support',
            'Custom workflows',
            'Deeper governance and approvals',
            'Custom reporting',
            'Implementation planning',
            'Partner or network rollouts',
        ],
        pill: 'Book a Strategy Call',
        pillHref: '/book/martez',
        highlight: false,
        tier: 'platform',
        track: 'operator',
        salesMotion: 'consultative',
        ctaLabel: 'Book a Strategy Call',
        ctaHref: '/book/martez',
        kpiHighlights: ['Custom governance', 'Network rollout support'],
        creditRollover: true,
        creditTopUpRate: 1,
    },
];

export const GRANDFATHERED_PLANS: PricingPlan[] = [
    {
        id: 'signal',
        name: 'Signal',
        tagline: 'Grandfathered legacy plan.',
        price: 149,
        priceDisplay: '$149',
        activationFee: null,
        period: '/ mo',
        setup: 'Legacy customer plan',
        desc: 'Grandfathered visibility plan retained for existing accounts.',
        features: [
            'Competitor tracking',
            'Weekly intel digest',
            'Market and ZIP insights',
            'Limited analytics summary',
            'Limited AI workspace access',
        ],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        highlight: false,
        tier: 'directory',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
        includedCredits: 500,
        creditRollover: false,
        creditTopUpRate: 5,
    },
    {
        id: 'convert',
        name: 'Convert',
        tagline: 'Grandfathered legacy plan.',
        price: 499,
        priceDisplay: '$499',
        activationFee: 1000,
        period: '/ mo',
        setup: 'Legacy customer plan',
        desc: 'Grandfathered commerce performance plan retained for existing accounts.',
        features: [
            'SEO menu',
            'Smokey AI budtender',
            'Product discovery surfaces',
            'Real-time inventory sync',
            'Bundles and upsells',
            'Basic analytics',
            'Compliance pre-checks',
        ],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        highlight: false,
        tier: 'directory',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
        includedCredits: 1500,
        creditRollover: false,
        creditTopUpRate: 4,
    },
    {
        id: 'retain',
        name: 'Retain',
        tagline: 'Grandfathered legacy plan.',
        price: 799,
        priceDisplay: '$799',
        activationFee: 1500,
        period: '/ mo',
        setup: 'Legacy customer plan',
        desc: 'Grandfathered lifecycle revenue plan retained for existing accounts.',
        features: [
            'Everything in Convert',
            'Playbooks',
            'Campaigns',
            'Loyalty',
            'Segmentation',
            'QR sign-up',
            'CRM workflows',
            'Deebo campaign review',
        ],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        highlight: false,
        tier: 'platform',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
        includedCredits: 3000,
        creditRollover: true,
        creditTopUpRate: 3,
    },
    {
        id: 'optimize',
        name: 'Optimize',
        tagline: 'Grandfathered legacy plan.',
        price: 1500,
        priceDisplay: '$1,500',
        activationFee: 2500,
        period: '/ mo',
        setup: 'Legacy customer plan',
        desc: 'Grandfathered advanced operator plan retained for existing accounts.',
        features: [
            'Everything in Retain',
            'Advanced analytics',
            'Goals and reporting',
            'Profitability',
            'Competitor price alerts',
            'Deep research',
            'Executive digests',
            'Pricing recommendations',
        ],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        highlight: false,
        tier: 'platform',
        track: 'operator',
        salesMotion: 'consultative',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
        includedCredits: 7500,
        creditRollover: true,
        creditTopUpRate: 2,
    },
];

export const HISTORIC_COMPAT_PLANS: PricingPlan[] = [
    {
        id: 'scout',
        name: 'The Scout',
        price: 0,
        priceDisplay: '$0',
        period: '/ mo',
        desc: 'Historic compatibility plan for older account records.',
        features: ['Historic compatibility plan'],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        tier: 'directory',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 99,
        priceDisplay: '$99',
        period: '/ mo',
        desc: 'Historic compatibility plan for older account records.',
        features: ['Historic compatibility plan'],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        tier: 'directory',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
    },
    {
        id: 'growth',
        name: 'Growth',
        price: 249,
        priceDisplay: '$249',
        period: '/ mo',
        desc: 'Historic compatibility plan for older account records.',
        features: ['Historic compatibility plan'],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        tier: 'platform',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
    },
    {
        id: 'empire',
        name: 'Empire',
        price: null,
        priceDisplay: 'Custom',
        period: 'custom',
        desc: 'Historic compatibility plan for older account records.',
        features: ['Historic compatibility plan'],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        tier: 'platform',
        track: 'operator',
        salesMotion: 'consultative',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
    },
    {
        id: 'custom_25',
        name: 'Custom 25',
        price: 25,
        priceDisplay: '$25',
        period: '/ mo',
        desc: 'Historic compatibility plan for older account records.',
        features: ['Historic compatibility plan'],
        pill: 'Legacy Plan',
        pillHref: '/dashboard',
        tier: 'directory',
        track: 'access',
        salesMotion: 'self_serve',
        ctaLabel: 'Legacy Plan',
        ctaHref: '/dashboard',
        isLegacy: true,
    },
];

export const PRICING_PLANS = [
    ...PUBLIC_PLANS,
    ...GRANDFATHERED_PLANS,
    ...HISTORIC_COMPAT_PLANS,
];

export const ACCESS_PLANS = PUBLIC_PLANS.filter((plan) => plan.track === 'access');
export const OPERATOR_PLANS = PUBLIC_PLANS.filter((plan) => plan.track === 'operator');

export const LEGACY_PLAN_ALIASES: Record<string, string> = {
    claim_pro: 'pro',
    founders_claim: 'pro',
    growth_5: 'growth',
    scale_10: 'growth',
    pro_25: 'growth',
};

function findPlanInCollection(collection: PricingPlan[], planId: string): PricingPlan | undefined {
    return collection.find((plan) => plan.id === planId);
}

export function findPricingPlan(planId: string): PricingPlan | undefined {
    const normalizedPlanId = planId.trim().toLowerCase();
    if (!normalizedPlanId) return undefined;

    const publicPlan = findPlanInCollection(PUBLIC_PLANS, normalizedPlanId);
    if (publicPlan) {
        if (typeof window === 'undefined') {
            console.info('[PricingPlanResolution]', { requestedPlanId: normalizedPlanId, resolution: 'public', planId: publicPlan.id });
        }
        return publicPlan;
    }

    const grandfatheredPlan = findPlanInCollection(GRANDFATHERED_PLANS, normalizedPlanId);
    if (grandfatheredPlan) {
        if (typeof window === 'undefined') {
            console.info('[PricingPlanResolution]', { requestedPlanId: normalizedPlanId, resolution: 'grandfathered', planId: grandfatheredPlan.id });
        }
        return grandfatheredPlan;
    }

    const historicPlan = findPlanInCollection(HISTORIC_COMPAT_PLANS, normalizedPlanId);
    if (historicPlan) {
        if (typeof window === 'undefined') {
            console.info('[PricingPlanResolution]', { requestedPlanId: normalizedPlanId, resolution: 'historic', planId: historicPlan.id });
        }
        return historicPlan;
    }

    const aliasedId = LEGACY_PLAN_ALIASES[normalizedPlanId];
    if (aliasedId) {
        if (typeof window === 'undefined') {
            console.info('[PricingPlanResolution]', { requestedPlanId: normalizedPlanId, resolution: 'alias', aliasedId });
        }
        return findPricingPlan(aliasedId);
    }

    return undefined;
}

export function isPublicCommercialPlanId(planId: string): planId is PublicCommercialPlanId {
    return PUBLIC_PLANS.some((plan) => plan.id === planId);
}

export interface OverageRow {
    k: string;
    accessIntel: string;
    accessRetention: string;
    operatorCore: string;
    operatorGrowth: string;
}

export const OVERAGES_TABLE: OverageRow[] = [
    { k: 'SMS Messages', accessIntel: 'N/A', accessRetention: '$0.04/msg', operatorCore: '$0.03/msg', operatorGrowth: 'Included' },
    { k: 'Emails', accessIntel: '$0.002/email', accessRetention: '$0.002/email', operatorCore: '$0.001/email', operatorGrowth: 'Included' },
    { k: 'Additional Competitor Watchlists', accessIntel: '$10/mo each', accessRetention: '$8/mo each', operatorCore: 'Included', operatorGrowth: 'Included' },
    { k: 'Additional Lifecycle Playbooks', accessIntel: 'N/A', accessRetention: '$99/mo each', operatorCore: '$149/mo each', operatorGrowth: 'Included' },
];

export const OVERAGES = [
    { k: 'SMS Messages', v: '$0.04', unit: 'per msg on Access Retention · $0.03 on Operator Core · Included on Operator Growth' },
    { k: 'Email Messages', v: '$0.002', unit: 'per email on Access tiers · $0.001 on Operator Core · Included on Operator Growth' },
    { k: 'Competitor Watchlists', v: '$10.00', unit: 'per watchlist/mo on Access Intel · Included in Operator tiers' },
    { k: 'Lifecycle Playbooks', v: '$99.00', unit: 'per extra playbook/mo on Access Retention · Included or managed in Operator tiers' },
];

export const ADDONS = [
    {
        name: 'Smokey Commerce Surfaces',
        price: 149,
        note: 'Secondary module',
        desc: 'AI budtender, product discovery, merchandising, and bundle support when commerce depth matters after the wedge is proven.',
    },
    {
        name: 'SEO Menu Pages',
        price: 199,
        note: 'Secondary module',
        desc: 'Search-friendly menu and discovery surfaces for operators that need organic traffic support alongside retention execution.',
    },
    {
        name: 'Ezal Market Intel',
        price: 49,
        note: 'Included in Access Intel · add-on elsewhere',
        desc: 'Competitor tracking, market watchlists, and weekly intelligence for teams that need visibility without a full managed engagement.',
    },
    {
        name: 'Money Mike Profitability',
        price: 149,
        note: 'Included in Operator Growth+',
        desc: 'Pricing and profitability insights for operators who want deeper margin support after the revenue loop is in place.',
    },
    {
        name: 'Deebo Compliance Layer',
        price: 0,
        note: 'Included on all offers',
        desc: 'Compliance-aware review, guardrails, and audit support across capture, welcome, retention, and outbound workflows.',
    },
];

export const COVERAGE_PACKS = [
    {
        id: 'pack_single',
        name: 'Single ZIP',
        price: 10,
        priceDisplay: '$10',
        period: '/ mo',
        zips: 1,
    },
    {
        id: 'pack_metro',
        name: 'Metro Pack',
        price: 8,
        priceDisplay: '$8',
        period: '/ mo',
        zips: 1,
    },
];
