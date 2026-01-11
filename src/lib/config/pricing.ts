
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
        name: "The Scout",
        badge: "Free Forever",
        price: 0,
        priceDisplay: "$0",
        period: "forever",
        setup: "Best for: getting discovered + market intel",
        desc: "Public listing + Digital Worker Briefing anytime.",
        features: [
            "1 Competitive Intelligence Playbook / Month",
            "3 Daily Tasks",
            "Smokey 'Light' (Learns 20 products)",
            "Ezal Market Scout (Public Data)",
            "Deebo Compliance (Basic Scan)",
            "Public brand/dispensary listing page"
        ],
        pill: "Hire a Scout",
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
        id: "specialist",
        name: "The Specialist",
        badge: "Most Popular",
        price: 499,
        priceDisplay: "$499",
        priceLater: 799,
        period: "/ mo",
        highlight: "Hire your first Digital Executive.",
        setup: "Best for: Automating one department.",
        desc: "Replace a part-time assistant.",
        features: [
            "1 Full Digital Worker (Smokey, Ezal, or Deebo)",
            "Full POS Integration (Real-time Sync)",
            "Local Knowledgebase (Upload 10 Docs)",
            "Unlimited Discovery Reports",
            "Daily Competitor Tracking"
        ],
        pill: "Hire a Specialist",
        tier: "platform"
    },
    {
        id: "empire",
        name: "The Empire",
        badge: "Full Power",
        price: 1499,
        priceDisplay: "$1,499",
        priceLater: null,
        period: "/ mo",
        highlight: "The $10M Path.",
        setup: "Best for: MSOs & High-Volume Brands.",
        desc: "Deploy the full Digital Workforce.",
        features: [
            "The Full Fleet (7 Digital Workers)",
            "Agentic RAG (Multi-Step Reasoning)",
            "Unlimited Knowledgebase (Financials, HR, Legal)",
            "Priority Support (AI Strategy Team)",
            "Custom Workflows & Integrations"
        ],
        pill: "Deploy the Empire",
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
