
export interface PricingPlan {
    id: string;
    name: string;
    badge?: string;
    price: number | null;
    priceDisplay: string;
    priceLater?: number | null;
    period: string;
    setup?: string;
    desc: string;
    highlight?: string | boolean;
    features: string[];
    pill: string;
    tier: "directory" | "platform";
    scarcity?: string;
}

// ----------------------------------------------------------------------
// 4-TIER MODEL (Scout, Pro, Growth, Empire)
// Prices updated February 2026 — Growth $349/mo, Empire $999/mo
// ----------------------------------------------------------------------

export const DIRECTORY_PLANS: PricingPlan[] = [
    {
        id: "scout",
        name: "The Scout",
        badge: "Free Forever",
        price: 0,
        priceDisplay: "$0",
        period: "free forever",
        setup: "Best for: Market intel + monitoring",
        desc: "Monitor your market. Zero commitment.",
        features: [
            "1 competitor tracked",
            "1 ZIP code market preview",
            "25 AI budtender messages / month",
            "Public listing page",
            "Basic market intel reports",
            "Community Slack access",
        ],
        pill: "Start for Free",
        highlight: false,
        tier: "directory"
    },
    {
        id: "pro",
        name: "Pro",
        badge: "Best Value",
        price: 99,
        priceDisplay: "$99",
        period: "/ mo",
        setup: "Best for: Single location dispensaries",
        desc: "Turn your menu into your #1 sales channel.",
        features: [
            "Unlimited AI budtender messages",
            "Headless SEO menu with real-time sync",
            "500 customer SMS / month",
            "5,000 emails / month",
            "3 competitors tracked",
            "3 ZIP codes included",
            "10 creative assets / month",
            "3 custom campaigns",
            "11 automated playbooks",
            "Deebo compliance checks",
            "Standard support",
        ],
        pill: "Start Pro",
        highlight: true,
        tier: "directory"
    },
    {
        id: "growth",
        name: "Growth",
        price: 349,
        priceDisplay: "$349",
        period: "/ mo",
        setup: "Best for: Consistent traffic volume",
        desc: "Scale your reach. Automate retention.",
        features: [
            "Everything in Pro, plus:",
            "2,000 customer SMS / month",
            "15,000 emails / month",
            "10 competitors tracked",
            "10 ZIP codes included",
            "50 creative assets / month",
            "Unlimited campaign workflows",
            "17 automated playbooks",
            "Advanced analytics & dashboards",
            "Priority support",
        ],
        pill: "Start Growth",
        highlight: false,
        tier: "platform"
    }
];

export const PLATFORM_PLANS: PricingPlan[] = [
    {
        id: "empire",
        name: "Empire",
        badge: "Enterprise",
        price: 999,
        priceDisplay: "$999",
        period: "/ mo",
        highlight: "For MSOs & High-Volume",
        setup: "Best for: Multi-state operators",
        desc: "For MSOs & high-volume operations.",
        features: [
            "Everything in Growth, plus:",
            "5,000 customer SMS / month",
            "50,000 emails / month",
            "Unlimited competitors & ZIP codes",
            "Unlimited creative center",
            "23 automated playbooks (all agents)",
            "Real-time competitor price alerts via SMS",
            "Executive daily digest",
            "Multi-location management console",
            "Custom integrations (POS, ERP, loyalty)",
            "White-glove onboarding (14 days)",
            "SLA support with dedicated CSM",
            "Audit prep automation",
        ],
        pill: "Get Started",
        tier: "platform"
    }
];

// Combine all for backward compatibility and simple lists
export const PRICING_PLANS = [...DIRECTORY_PLANS, ...PLATFORM_PLANS];

// Legacy plan ID aliases - map old plan IDs to current plans
export const LEGACY_PLAN_ALIASES: Record<string, string> = {
    'claim_pro': 'pro',
    'founders_claim': 'pro',
    'free': 'scout',
    'growth_5': 'growth',
    'scale_10': 'growth',
    'scale': 'growth',
    'pro_25': 'growth',
    'enterprise': 'empire',
};

/**
 * Find a pricing plan by ID, supporting legacy aliases
 */
export function findPricingPlan(planId: string): PricingPlan | undefined {
    // First try direct match
    let plan = PRICING_PLANS.find(p => p.id === planId);
    if (plan) return plan;

    // Try legacy alias
    const aliasedId = LEGACY_PLAN_ALIASES[planId];
    if (aliasedId) {
        return PRICING_PLANS.find(p => p.id === aliasedId);
    }

    return undefined;
}

// ----------------------------------------------------------------------
// OVERAGES — Per-tier rates
// Updated February 2026
// ----------------------------------------------------------------------

export interface OverageRow {
    k: string;
    pro: string;
    growth: string;
    empire: string;
}

/**
 * Per-tier overage rates for the pricing page table.
 * Always notify customers at 80% usage — no throttling, no surprise bills.
 */
export const OVERAGES_TABLE: OverageRow[] = [
    { k: "SMS Messages",           pro: "$0.05/msg",    growth: "$0.04/msg",    empire: "$0.03/msg" },
    { k: "Emails",                 pro: "$0.002/email", growth: "$0.002/email", empire: "$0.001/email" },
    { k: "Creative Assets",        pro: "$2.00/asset",  growth: "$1.50/asset",  empire: "Included" },
    { k: "Additional ZIP Codes",   pro: "$10/mo each",  growth: "$8/mo each",   empire: "Included" },
    { k: "Additional Competitors", pro: "$5/mo each",   growth: "$4/mo each",   empire: "Included" },
];

// Legacy flat OVERAGES kept for backwards compatibility
export const OVERAGES = [
    { k: "SMS Messages",           v: "$0.05",  unit: "per msg (Pro) · $0.04 (Growth) · $0.03 (Empire)" },
    { k: "Email Messages",         v: "$0.002", unit: "per email (Pro/Growth) · $0.001 (Empire)" },
    { k: "Creative Assets",        v: "$2.00",  unit: "per asset on Pro · $1.50 on Growth · Included on Empire" },
    { k: "Additional ZIP Codes",   v: "$10.00", unit: "per ZIP/mo on Pro · $8 on Growth · Included on Empire" },
    { k: "Additional Competitors", v: "$5.00",  unit: "per competitor/mo on Pro · $4 on Growth · Included on Empire" },
];

// ----------------------------------------------------------------------
// ADD-ONS — Agent modules available on Pro & Growth (included in Empire)
// Updated February 2026
// ----------------------------------------------------------------------

export const ADDONS = [
    {
        name: "Craig — Marketing AI",
        price: 0,
        note: "Included in Pro+",
        desc: "Welcome + winback workflows, segmentation playbooks, engagement tracking, email & SMS campaign automation.",
    },
    {
        name: "Ezal — Intel Engine",
        price: 49,
        note: "Add-on for Pro & Growth · Included in Empire",
        desc: "Competitor menu tracking, price alerts, category comparisons, weekly market summaries, demand signals.",
    },
    {
        name: "Big Worm — Analytics",
        price: 49,
        note: "Add-on for Pro & Growth · Included in Empire",
        desc: "Revenue dashboards, retention insights, demand forecasting, exportable reports, cohort analysis.",
    },
    {
        name: "Ezal + Big Worm Bundle",
        price: 79,
        note: "Save $19 vs. buying separately",
        desc: "Full intel engine + analytics suite at a discount. Available on Pro & Growth.",
    },
    {
        name: "Deebo — Compliance",
        price: 0,
        note: "Included in Pro+",
        desc: "Jurisdiction rule packs, audit trail + export, cross-channel pre-flight checks, approval workflows.",
    },
    {
        name: "Custom Integrations",
        price: 99,
        note: "Available on all paid plans",
        desc: "POS sync (Cova, Dutchie, Treez), loyalty platform bridges, ERP connections, custom webhooks.",
    },
];

// Legacy ZIP/Metro packs (kept for backward compat, not shown in main pricing)
export const COVERAGE_PACKS = [
    {
        id: "pack_single",
        name: "Single ZIP",
        price: 10,
        priceDisplay: "$10",
        period: "/ mo",
        zips: 1
    },
    {
        id: "pack_metro",
        name: "Metro Pack",
        price: 8,
        priceDisplay: "$8",
        period: "/ mo (Growth)",
        zips: 1
    },
];
