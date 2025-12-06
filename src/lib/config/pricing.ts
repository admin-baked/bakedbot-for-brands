
export const PRICING_PLANS = [
    {
        id: "free",
        name: "Free",
        price: 0,
        priceDisplay: "$0",
        period: "/ mo",
        setup: "1 location",
        desc: "For brands getting started with AI-powered commerce.",
        features: ["AI Budtender", "Headless Menu", "Basic Analytics"],
        pill: "Start Free",
        highlight: false
    },
    {
        id: "growth",
        name: "Growth",
        price: 350,
        priceDisplay: "$350",
        period: "/ mo",
        setup: "Up to 5 locations",
        desc: "For growing brands that need marketing automation and deeper insights.",
        features: ["All Free features", "Marketing Playbooks", "Competitor Watch"],
        pill: "Most Popular",
        highlight: true
    },
    {
        id: "scale",
        name: "Scale",
        price: 700,
        priceDisplay: "$700",
        period: "/ mo",
        setup: "Up to 10 locations",
        desc: "For established brands scaling their direct-to-customer channel.",
        features: ["All Growth features", "Advanced Analytics", "Price Optimization"],
        pill: "Best Value",
        highlight: false
    },
    {
        id: "enterprise",
        name: "Enterprise",
        price: null,
        priceDisplay: "Custom",
        period: "",
        setup: "Unlimited locations",
        desc: "For MSOs and large brands needing custom integrations and support.",
        features: ["All Scale features", "Custom Agent Packs", "Priority Support"],
        pill: "Contact Us",
        highlight: false
    },
];
