
export const PRICING_PLANS = [
    {
        id: "free",
        name: "Unclaimed",
        price: 0,
        priceDisplay: "$0",
        period: "/ mo",
        setup: "SEO Discovery",
        desc: "Your page exists publicly for discovery. Claim it to take control.",
        features: ["Public listing", "Basic SEO", "System-sourced data"],
        pill: "Claim This Page",
        highlight: false,
        tier: "unclaimed"
    },
    {
        id: "claim-pro",
        name: "Claim Pro",
        price: 99,
        priceDisplay: "$99",
        period: "/ mo",
        setup: "1 brand or dispensary",
        desc: "Take control of your page with verified status and analytics.",
        features: [
            "Verified Badge ✓",
            "Edit business info",
            "CTA control (Order/Deals/Website)",
            "Basic analytics (views, clicks, ZIPs)",
            "Lead capture + CRM export",
            "Compliance guardrails"
        ],
        pill: "Claim Now",
        highlight: true,
        tier: "claim"
    },
    {
        id: "founders-claim",
        name: "Founders Claim",
        price: 79,
        priceDisplay: "$79",
        period: "/ mo (locked)",
        setup: "Limited to first 250",
        desc: "Lock in the lowest rate forever. Same features as Claim Pro.",
        features: [
            "All Claim Pro features",
            "Locked-in pricing for life",
            "Early adopter badge"
        ],
        pill: "🔥 Limited Offer",
        highlight: false,
        tier: "claim",
        scarcity: true,
        scarcityLimit: 250
    },
    {
        id: "growth",
        name: "Growth",
        price: 350,
        priceDisplay: "$350",
        period: "/ mo",
        setup: "Up to 5 locations",
        desc: "For growing brands that need marketing automation and deeper insights.",
        features: [
            "All Claim Pro features",
            "AI Budtender",
            "Marketing Playbooks",
            "Competitor Watch",
            "25 ZIP coverage included"
        ],
        pill: "Most Popular",
        highlight: false,
        tier: "subscription"
    },
    {
        id: "scale",
        name: "Scale",
        price: 700,
        priceDisplay: "$700",
        period: "/ mo",
        setup: "Up to 10 locations",
        desc: "For established brands scaling their direct-to-customer channel.",
        features: [
            "All Growth features",
            "Advanced Analytics",
            "Price Optimization",
            "100 ZIP coverage included"
        ],
        pill: "Best Value",
        highlight: false,
        tier: "subscription"
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: null,
        priceDisplay: "Custom",
        period: "",
        setup: "Unlimited locations",
        desc: "For MSOs and large brands needing custom integrations and support.",
        features: [
            "All Scale features",
            "Custom Agent Packs",
            "Priority Support",
            "Unlimited ZIP coverage"
        ],
        pill: "Contact Us",
        highlight: false,
        tier: "subscription"
    },
];

// Coverage Pack Add-ons
export const COVERAGE_PACKS = [
    {
        id: "coverage-100",
        name: "+100 ZIPs",
        price: 49,
        priceDisplay: "+$49",
        period: "/ mo",
        zips: 100
    },
    {
        id: "coverage-500",
        name: "+500 ZIPs",
        price: 149,
        priceDisplay: "+$149",
        period: "/ mo",
        zips: 500
    }
];
