
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
// NEW 4-TIER MODEL (Scout, Pro, Growth, Empire)
// ----------------------------------------------------------------------

export const DIRECTORY_PLANS: PricingPlan[] = [
    {
        id: "scout",
        name: "The Scout",
        badge: "Free Forever",
        price: 0,
        priceDisplay: "$0",
        period: "forever",
        setup: "Best for: Market intel + monitoring",
        desc: "Monitor your market and keep an eye on competitors.",
        features: [
            "1 Competitor Tracked",
            "1 ZIP Code Preview",
            "50 AI Budtender Messages / mo",
            "Public Listing Page",
            "Basic Market Intel"
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
            "Unlimited AI Budtender Messages",
            "3 ZIP Codes Included",
            "3 Competitors Tracked",
            "10 Creative Assets / mo",
            "3 Campaign Workflows",
            "Headless SEO Menu",
            "Deebo Compliance Checks"
        ],
        pill: "Start Pro",
        highlight: true,
        tier: "directory"
    },
     {
        id: "growth",
        name: "Growth",
        price: 249,
        priceDisplay: "$249",
        period: "/ mo",
        setup: "Best for: Consistent traffic volume",
        desc: "Scale your reach and automate retention.",
        features: [
            "Unlimited AI Budtender",
            "10 ZIP Codes Included",
            "10 Competitors Tracked",
            "50 Creative Assets / mo",
            "Unlimited Campaigns",
            "Priority Support",
            "Advanced Analytics"
        ],
        pill: "Start Growth",
        highlight: false,
        tier: "platform"
    }
];

export const PLATFORM_PLANS: PricingPlan[] = [
   // Empire behaves like a platform plan in the UI but effectively is the top tier
    {
        id: "empire",
        name: "Empire",
        badge: "Custom",
        price: null,
        priceDisplay: "Custom",
        period: "",
        highlight: "For MSOs & High-Volume",
        setup: "Best for: Multi-state operators",
        desc: "Full autonomy at scale.",
        features: [
            "Unlimited ZIP Codes (Metro Packs)",
            "Unlimited Competitors",
            "Unlimited Creative Center",
            "Dedicated Infrastructure",
            "Custom Integrations",
            "White-Glove Onboarding",
            "SLA Support"
        ],
        pill: "Contact Sales",
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
// USAGE & OVERAGES
// ----------------------------------------------------------------------

export const OVERAGES = [
    { k: "SMS Messages", v: "$0.015", unit: "per msg" },
    { k: "Email Messages", v: "$0.003", unit: "per msg" },
    { k: "ZIP Code Expansion", v: "$15.00", unit: "per ZIP/mo" },
    { k: "Creative Assets", v: "$5.00", unit: "per asset (after limit)" },
    { k: "Competitors", v: "$10.00", unit: "per competitor/mo" }
];

// ----------------------------------------------------------------------
// LEGACY ADDONS (Kept for reference, but UI will likely deemphasize)
// ----------------------------------------------------------------------

export const ADDONS = [
    { name: "Creative Center", price: 0, note: "Included in plans", desc: "Autonomous content generation. Pro gets 10/mo, Growth gets 50/mo. Overage applies after." },
    { name: "Metro Package", price: 199, note: "City-wide dominance", desc: "Claim an entire city or metro area (e.g. 75 ZIPs) at a bulk rate." },
];

export const COVERAGE_PACKS = [
    {
        id: "pack_single",
        name: "Single ZIP",
        price: 15,
        priceDisplay: "$15",
        period: "/ mo",
        zips: 1
    },
    {
        id: "pack_metro",
        name: "Metro Pack",
        price: 199,
        priceDisplay: "$199",
        period: "/ mo",
        zips: 75
    },
    {
        id: "pack_state",
        name: "State Pack",
        price: 999,
        priceDisplay: "$999",
        period: "/ mo",
        zips: 500
    }
];
