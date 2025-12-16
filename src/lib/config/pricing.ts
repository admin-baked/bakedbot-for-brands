export const PRICING_PLANS = [
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
        tier: "unclaimed"
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
            "Edit page info + logo + links",
            "Set CTA (Order / Pickup / Find-in-store / Deals / Website)",
            "Basic analytics (views, clicks, top ZIPs)",
            "Lead capture (email/SMS form)",
            "Data correction + audit trail"
        ],
        pill: "Claim Pro",
        highlight: true,
        tier: "claim"
    },
    {
        id: "founders_claim",
        name: "Claim Pro (Founders)",
        price: 79,
        priceDisplay: "$79",
        priceAnnual: 799,
        period: "/ mo (locked)",
        setup: "Limited availability",
        desc: "Same as Claim Pro, but locked-in pricing for life.",
        features: [
            "All Claim Pro features",
            "Locked-in pricing ($79/mo)",
            "Early adopter badge"
        ],
        pill: "Get Founders Pricing",
        highlight: false,
        tier: "claim",
        scarcity: true,
        scarcityLimit: 75
    },
    {
        id: "growth",
        name: "Growth",
        price: 350,
        priceDisplay: "$350",
        period: "/ mo",
        setup: "Best for: growing brands (≈5 locations / multi-zone coverage)",
        desc: "Best for: growing brands (≈5 locations / multi-zone coverage)",
        features: [
            "Multi-market page coverage (more ZIPs/zones)",
            "Craig automations starter (claim-to-lead nurture)",
            "Pops reporting starter (traffic → clicks → claims)"
        ],
        pill: "Start Growth",
        highlight: false,
        tier: "subscription"
    },
    {
        id: "scale",
        name: "Scale",
        price: 700,
        priceDisplay: "$700",
        period: "/ mo",
        setup: "Best for: established brands (≈10 locations / aggressive expansion)",
        desc: "Best for: established brands (≈10 locations / aggressive expansion)",
        features: [
            "Expanded coverage + higher limits",
            "Priority support + faster refresh cadence",
            "Advanced reporting + optimization loop (what to build next / where to expand)"
        ],
        pill: "Start Scale",
        highlight: false,
        tier: "subscription"
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: null,
        priceDisplay: "Custom",
        period: "",
        setup: "Best for: MSOs / national brands / custom integrations",
        desc: "Best for: MSOs / national brands / custom integrations",
        features: [
            "Custom coverage + SLAs",
            "Integrations + bespoke workflows",
            "Dedicated support"
        ],
        pill: "Talk to Sales",
        highlight: false,
        tier: "subscription"
    }
];

// Coverage Pack Add-ons
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
