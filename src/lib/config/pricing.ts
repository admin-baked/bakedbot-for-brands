
export interface PricingPlan {
    id: string;
    name: string;
    badge?: string; // e.g. "Most Popular" or "Launch"
    price: number | null;
    priceDisplay: string;
    priceLater?: number | null; // For launch pricing strikethrough
    period: string;
    setup?: string;
    desc: string;
    highlight?: string | boolean; // Marketing highlight text or boolean for styling
    features: string[];
    pill: string;
    tier: "directory" | "platform";
    scarcity?: string; // Optional scarcity message (e.g., "Only 50 spots left")
}

export const DIRECTORY_PLANS: PricingPlan[] = [
    {
        id: "free",
        name: "Free Listing",
        price: 0,
        priceDisplay: "$0",
        period: "/ mo",
        setup: "Best for: getting discovered",
        desc: "Best for: getting discovered",
        features: [
            "Public brand/dispensary listing pages (SEO indexed)",
            "Basic info display (hours, location, links if available)",
            "“Request update” + “Report issue” flows"
        ],
        pill: "Create Free Listing",
        highlight: false,
        tier: "directory"
    },
    {
        id: "claim_pro",
        name: "Claim Pro",
        price: 99,
        priceDisplay: "$99",
        period: "/ mo",
        setup: "Best for: operators who want control + measurable demand",
        desc: "Best for: operators who want control + measurable demand",
        features: [
            "Verified badge",
            "Claim a Page",
            "Edit page info + logo + links",
            "Set CTA (Order / Pickup / Find-in-store / Deals / Website)",
            "Basic analytics (views, clicks, top ZIPs)",
            "Lead capture (email/SMS form)",
            "Data correction + audit trail",
            "Agent Workspace (Lite): run basic tasks (summaries, page updates, quick insights)",
            "Intel Preview: weekly placements + pricing bands (in-app)"
        ],
        pill: "Claim Pro",
        highlight: true,
        tier: "directory"
    },
    {
        id: "founders_claim",
        name: "Claim Pro (Founders)",
        badge: "Limited",
        price: 79,
        priceDisplay: "$79",
        priceLater: 99,
        period: "/ mo (locked)",
        setup: "Limited availability",
        desc: "Same as Claim Pro, but locked-in pricing for life.",
        features: [
            "All Claim Pro features",
            "Locked-in pricing ($79/mo)",
            "Early adopter badge",
            "Includes Agent Workspace (Lite) + Intel Preview"
        ],
        pill: "Get Founders Pricing",
        highlight: false,
        tier: "directory"
    }
];

export const PLATFORM_PLANS: PricingPlan[] = [
    {
        id: "starter",
        name: "Starter",
        badge: "Launch",
        price: 99,
        priceDisplay: "$99",
        priceLater: 149,
        period: "/ mo",
        highlight: "Best for getting live fast",
        setup: "Best for: single location/brand site",
        desc: "Best for: getting live fast",
        features: [
            "1 location (or 1 brand site)",
            "2,000 menu/product pageviews / mo",
            "300 Smokey chat sessions / mo",
            "5,000 Deebo checks / mo",
            "1,000 contacts stored",
            "2 menu sync runs / day",
            "Email support",
            "Agent Workspace: core tasks + basic automations",
            "Intel Starter: weekly snapshot + up to 10 Market Sensors"
        ],
        pill: "Choose Plan",
        tier: "platform"
    },
    {
        id: "growth",
        name: "Growth",
        badge: "Most Popular",
        price: 249,
        priceDisplay: "$249",
        priceLater: 349,
        period: "/ mo",
        highlight: "For consistent traffic + conversion",
        setup: "Best for: multiple locations",
        desc: "For consistent traffic + conversion",
        features: [
            "Up to 3 locations (or 3 brand sites)",
            "10,000 menu/product pageviews / mo",
            "1,500 Smokey chat sessions / mo",
            "25,000 Deebo checks / mo",
            "5,000 contacts stored",
            "6 menu sync runs / day",
            "Priority support",
            "Agent Workspace: team workflows + automation starter",
            "Intel Growth: daily snapshot + alerts + up to 50 Market Sensors"
        ],
        pill: "Start Growth",
        tier: "platform"
    },
    {
        id: "scale",
        name: "Scale",
        badge: "Teams",
        price: 699,
        priceDisplay: "$699",
        priceLater: 899,
        period: "/ mo",
        highlight: "For multi-location operators",
        setup: "Best for: scaling teams",
        desc: "For multi-location operators",
        features: [
            "Up to 10 locations (or 10 brand sites)",
            "50,000 menu/product pageviews / mo",
            "7,500 Smokey chat sessions / mo",
            "100,000 Deebo checks / mo",
            "25,000 contacts stored",
            "Hourly menu sync",
            "SLA + onboarding",
            "Agent Workspace: advanced workflows + priority processing",
            "Intel Scale: daily snapshot + competitor set + up to 200 Market Sensors"
        ],
        pill: "Start Scale",
        tier: "platform"
    },
    {
        id: "enterprise",
        name: "Enterprise",
        badge: "Custom",
        price: null,
        priceDisplay: "Custom",
        period: "",
        highlight: "Custom integrations + unlimited scale",
        setup: "Best for: MSOs / national brands",
        desc: "Custom integrations + unlimited scale",
        features: [
            "Unlimited locations/sites",
            "Custom usage + dedicated infrastructure",
            "Advanced compliance packs",
            "Custom workflows + integrations",
            "Dedicated success + support",
            "Unlimited Intel Runs + custom Market Sensor coverage",
            "Dedicated workflows + integrations"
        ],
        pill: "Talk to Sales",
        tier: "platform"
    }
];

export const ADDONS = [
    { name: "Craig (Marketing Automation)", price: 149, note: "Email workflows + segmentation", desc: "Automated email + SMS workflows with compliance pre-checks. Great for claim-to-lead nurture and lifecycle journeys." },
    { name: "Pops (Analytics + Forecasting)", price: 179, note: "Dashboards + insights", desc: "Dashboards, cohorts, and decision-ready reporting across traffic → clicks → claims → outcomes." },
    { name: "Ezal (Competitive Intelligence)", price: 249, note: "Menu + pricing tracking", desc: "Market Sensors track menus and pricing changes, then summarize what matters (price moves, promos, availability shifts)." },
    { name: "Deebo Pro (Compliance OS)", price: 199, note: "Policy packs + audits", desc: "Jurisdiction-aware rule packs, audit trails, and pre-flight checks across web + email + SMS." },
];

export const OVERAGES = [
    { k: "Smokey chat sessions", v: "$25 per 1,000" },
    { k: "Menu/product pageviews", v: "$10 per 10,000" },
    { k: "Deebo compliance checks", v: "$10 per 25,000" },
    { k: "Contacts stored", v: "$15 per 5,000" },
    { k: "Intel Runs", v: "Daily snapshot, weekly summary, alert batch, or scheduled report", unit: "per run" },
    { k: "Market Sensors", v: "A monitored menu/URL/retailer tracked for changes during the month", unit: "per sensor" }
];

export const COVERAGE_PACKS = [
    {
        id: "pack_100",
        name: "+100 ZIPs",
        price: 49,
        priceDisplay: "+$49",
        period: "/ mo",
        zips: 100
    },
    {
        id: "pack_500",
        name: "+500 ZIPs",
        price: 149,
        priceDisplay: "+$149",
        period: "/ mo",
        zips: 500
    }
];

// Combine all for backward compatibility
export const PRICING_PLANS = [...DIRECTORY_PLANS, ...PLATFORM_PLANS];
