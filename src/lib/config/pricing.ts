
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
    tier: "directory" | "platform";
    scarcity?: string;
    // AI Credit allocation
    includedCredits?: number;        // Monthly credits included
    creditRollover?: boolean;        // Whether unused credits roll over
    creditTopUpRate?: number;        // Cost per 100 additional credits
}

// ----------------------------------------------------------------------
// FREE AUDIT — not a product tier, just an entry motion object
// ----------------------------------------------------------------------

export const FREE_AUDIT = {
    title: "Free Audit",
    price: "$0",
    includes: [
        "1 market scan",
        "1 competitor snapshot",
        "1 menu/SEO audit",
        "1 sample recommendation set",
    ],
    cta: "Run Free Audit",
    href: "/free-audit",
};

// ----------------------------------------------------------------------
// PUBLIC PLANS — Signal / Convert / Retain / Optimize / Enterprise
// Replaces Scout / Pro / Growth / Empire (2026-03 rewrite)
// ----------------------------------------------------------------------

export const PUBLIC_PLANS: PricingPlan[] = [
    {
        id: "signal",
        name: "Signal",
        tagline: "Know your market.",
        price: 149,
        priceDisplay: "$149",
        activationFee: null,
        period: "/ mo",
        setup: "Best for: Operators not ready to switch infrastructure yet",
        desc: "Know your market before you change anything. Track competitors, monitor local shifts, and get weekly intelligence without replacing your current stack.",
        features: [
            "Competitor tracking",
            "Weekly intel digest",
            "Market & ZIP insights",
            "Limited analytics summary",
            "Limited AI workspace access",
        ],
        pill: "Start Signal",
        pillHref: "/onboarding?plan=signal",
        highlight: false,
        tier: "directory",
        includedCredits: 500,
        creditRollover: false,
        creditTopUpRate: 5,
    },
    {
        id: "convert",
        name: "Convert",
        tagline: "Turn traffic into sales.",
        price: 499,
        priceDisplay: "$499",
        activationFee: 1000,
        period: "/ mo",
        setup: "Best for: Dispensaries or brands that want commerce performance",
        desc: "Turn product pages and shopper questions into sales. Launch a faster, search-friendly commerce experience with Smokey, recommendations, and real-time sync.",
        features: [
            "SEO menu",
            "Smokey AI budtender",
            "Product discovery surfaces",
            "Real-time inventory sync",
            "Bundles & upsells",
            "Basic analytics",
            "Compliance pre-checks",
        ],
        pill: "Start Convert",
        pillHref: "/onboarding?plan=convert",
        highlight: false,
        tier: "directory",
        includedCredits: 1500,
        creditRollover: false,
        creditTopUpRate: 4,
    },
    {
        id: "retain",
        name: "Retain",
        badge: "Most Popular",
        tagline: "Turn buyers into repeat buyers.",
        price: 799,
        priceDisplay: "$799",
        activationFee: 1500,
        period: "/ mo",
        setup: "Best for: Operators who want lifecycle revenue, not just storefront improvements",
        desc: "Turn one-time buyers into repeat customers. Activate campaigns, loyalty workflows, segments, and retention playbooks from one workspace.",
        features: [
            "Everything in Convert, plus:",
            "Playbooks",
            "Campaigns",
            "Loyalty",
            "Segmentation",
            "QR sign-up",
            "CRM workflows",
            "Deebo campaign review",
            "Future Wallet & push support",
        ],
        pill: "Start Retain",
        pillHref: "/onboarding?plan=retain",
        highlight: true,
        tier: "platform",
        includedCredits: 3000,
        creditRollover: true,
        creditTopUpRate: 3,
    },
    {
        id: "optimize",
        name: "Optimize",
        tagline: "Run a smarter operation.",
        price: 1500,
        priceDisplay: "$1,500",
        activationFee: 2500,
        period: "/ mo",
        setup: "Best for: Advanced operators and multi-location teams",
        desc: "See what's happening, what's changing, and what to do next. Get profitability insights, competitive alerts, executive reporting, and smarter pricing guidance.",
        features: [
            "Everything in Retain, plus:",
            "Advanced analytics",
            "Goals and reporting",
            "Profitability",
            "Competitor price alerts",
            "Deep research",
            "Executive digests",
            "Pricing recommendations",
            "Advanced optimization workflows",
        ],
        pill: "Talk to Sales",
        pillHref: "/contact",
        highlight: false,
        tier: "platform",
        includedCredits: 7500,
        creditRollover: true,
        creditTopUpRate: 2,
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: null,
        priceDisplay: "Custom",
        activationFee: null,
        period: "custom",
        setup: "For: MSOs, complex integrations, white-label & partner deals",
        desc: "For MSOs, complex integrations, white-label and partner deals, and advanced governance with custom workflows.",
        features: [
            "Everything in Optimize, plus:",
            "Multi-state operator support",
            "Complex integrations",
            "White-label & partner deals",
            "Advanced governance",
            "Custom workflows",
        ],
        pill: "Talk to Sales",
        pillHref: "/contact",
        highlight: false,
        tier: "platform",
        includedCredits: undefined, // Custom — negotiated
        creditRollover: true,
        creditTopUpRate: 1,
    },
];

// Combine all for backward compatibility and simple lists
export const PRICING_PLANS = PUBLIC_PLANS;

// Legacy plan ID aliases - map old plan IDs to current plans
export const LEGACY_PLAN_ALIASES: Record<string, string> = {
    'claim_pro': 'convert',
    'founders_claim': 'convert',
    'free': 'signal',
    'scout': 'signal',
    'pro': 'convert',
    'growth': 'retain',
    'growth_5': 'retain',
    'scale_10': 'retain',
    'scale': 'retain',
    'pro_25': 'retain',
    'empire': 'optimize',
    'enterprise': 'enterprise',
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
    signal: string;
    convert: string;
    retain: string;
    optimize: string;
}

/**
 * Per-tier overage rates for the pricing page table.
 * Always notify customers at 80% usage — no throttling, no surprise bills.
 */
export const OVERAGES_TABLE: OverageRow[] = [
    { k: "SMS Messages",           signal: "$0.05/msg",    convert: "$0.04/msg",    retain: "$0.04/msg",    optimize: "$0.03/msg" },
    { k: "Emails",                 signal: "$0.002/email", convert: "$0.002/email", retain: "$0.002/email", optimize: "$0.001/email" },
    { k: "Creative Assets",        signal: "$2.00/asset",  convert: "$1.50/asset",  retain: "$1.50/asset",  optimize: "Included" },
    { k: "Additional ZIP Codes",   signal: "$10/mo each",  convert: "$8/mo each",   retain: "$8/mo each",   optimize: "Included" },
    { k: "Additional Competitors", signal: "$5/mo each",   convert: "$4/mo each",   retain: "$4/mo each",   optimize: "Included" },
];

// Legacy flat OVERAGES kept for backwards compatibility
export const OVERAGES = [
    { k: "SMS Messages",           v: "$0.05",  unit: "per msg (Signal) · $0.04 (Convert/Retain) · $0.03 (Optimize)" },
    { k: "Email Messages",         v: "$0.002", unit: "per email (Signal/Convert/Retain) · $0.001 (Optimize)" },
    { k: "Creative Assets",        v: "$2.00",  unit: "per asset on Signal · $1.50 on Convert/Retain · Included on Optimize" },
    { k: "Additional ZIP Codes",   v: "$10.00", unit: "per ZIP/mo on Signal · $8 on Convert/Retain · Included on Optimize" },
    { k: "Additional Competitors", v: "$5.00",  unit: "per competitor/mo on Signal · $4 on Convert/Retain · Included on Optimize" },
];

// ----------------------------------------------------------------------
// ADD-ONS — Agent modules (included at various plan tiers)
// Updated 2026-03
// ----------------------------------------------------------------------

export const ADDONS = [
    {
        name: "Craig — Marketing AI",
        price: 0,
        note: "Included in Convert+",
        desc: "Welcome + winback workflows, segmentation playbooks, engagement tracking, email & SMS campaign automation.",
    },
    {
        name: "Analytics Engine",
        price: 49,
        note: "Add-on for Signal & Convert · Included in Retain+",
        desc: "Revenue dashboards, retention insights, demand forecasting, exportable reports, cohort analysis.",
    },
    {
        name: "Ezal — Intel Engine",
        price: 49,
        note: "Add-on for Convert & Retain · Included in Optimize+",
        desc: "Competitor menu tracking, price alerts, category comparisons, weekly market summaries, demand signals.",
    },
    {
        name: "Deebo — Compliance",
        price: 0,
        note: "Included on all plans",
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
        period: "/ mo (Retain)",
        zips: 1
    },
];
