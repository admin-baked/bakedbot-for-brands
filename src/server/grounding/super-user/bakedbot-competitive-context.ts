/**
 * BakedBot Competitive Context & Super User Ground Truth
 *
 * Purpose: Equip Super Users with context about BakedBot's business,
 * competitors, and growth strategy.
 */

export const BAKEDBOT_COMPETITIVE_CONTEXT = [
    // Company Overview
    {
        question: "What is BakedBot's business model?",
        answer: "BakedBot is an AI-powered Commerce OS for the cannabis industry. We provide multi-agent platforms that keep customers in the brand's funnel, route orders to retail partners for fulfillment, and automate marketing, analytics, compliance, and competitive intelligence. Our primary customers are cannabis brands and dispensaries.",
        category: "company_overview",
        tags: ["business_model", "value_proposition"],
    },
    {
        question: "What is BakedBot's revenue target?",
        answer: "Our current goal is $100k MRR (Monthly Recurring Revenue) by January 2027, which translates to a $1.2M ARR (Annual Run Rate). As of early 2026, we are tracking toward this goal through customer acquisition and expansion.",
        category: "company_overview",
        tags: ["revenue", "growth_targets"],
    },
    {
        question: "Who is our pilot customer?",
        answer: "Thrive Syracuse (org_thrive_syracuse) is our flagship pilot customer. They are on the Empire plan and use our full suite: Alleaves POS integration, competitive intelligence (Ezal), native loyalty (not SpringBig), and Aeropay/CannPay payment processing.",
        category: "customers",
        tags: ["pilot", "thrive_syracuse"],
    },

    // Software Competitors
    {
        question: "Who are BakedBot's main software competitors?",
        answer: "Our software competitors include: AlpineIQ (AIQ) - loyalty and marketing automation; Headset - analytics and market intelligence; Jane Technologies - ecommerce and marketplace; Blaze - POS and retail management; Olla - compliance and operations; Budsense - menu management and analytics; Terpli - customer engagement; Dutchie - ecommerce platform; Leafly - marketplace and strain database; Weedmaps - marketplace and discovery platform.",
        category: "competitors",
        tags: ["software", "saas", "platforms"],
    },
    {
        question: "How does BakedBot differentiate from AlpineIQ?",
        answer: "AlpineIQ focuses heavily on loyalty programs and SMS marketing. BakedBot differentiates with: (1) Multi-agent AI orchestration vs single-purpose tools, (2) Agentic commerce that keeps customers in the brand's funnel instead of redirecting to third-party marketplaces, (3) Competitive intelligence automation (Ezal), (4) Compliance automation (Deebo), (5) Full-stack solution from marketing to fulfillment.",
        category: "competitive_positioning",
        tags: ["alpineiq", "differentiation"],
    },
    {
        question: "How does BakedBot compete with Dutchie and Jane?",
        answer: "Dutchie and Jane are primarily ecommerce platforms that charge transaction fees and take customers to their marketplaces. BakedBot keeps customers in the brand's ecosystem, routes orders to preferred retail partners, and provides AI-driven marketing automation. We're a Commerce OS, not just an ecommerce platform.",
        category: "competitive_positioning",
        tags: ["dutchie", "jane", "ecommerce"],
    },
    {
        question: "What is BakedBot's advantage over Headset analytics?",
        answer: "Headset provides market intelligence and analytics dashboards. BakedBot goes beyond passive analytics with: (1) Proactive AI agents that take action (Money Mike for pricing, Craig for campaigns), (2) Real-time competitive intelligence with automated responses, (3) Predictive analytics for inventory and demand, (4) Integrated execution (not just insights).",
        category: "competitive_positioning",
        tags: ["headset", "analytics"],
    },
    {
        question: "How does BakedBot stack up against Weedmaps and Leafly?",
        answer: "Weedmaps and Leafly are discovery/marketplace platforms that charge listing fees and take traffic away from brands. BakedBot helps brands own their customer relationships, build direct channels, and reduce dependency on third-party marketplaces. Our AI agents automate content creation (Craig), SEO optimization, and retention campaigns to drive direct traffic.",
        category: "competitive_positioning",
        tags: ["weedmaps", "leafly", "marketplaces"],
    },

    // Agency Competitors
    {
        question: "Who are BakedBot's agency competitors?",
        answer: "Our agency competitors include: Tact Firm - cannabis marketing agency; PufCreativ - creative and branding; Hybrid Marketing Co - full-service cannabis marketing; Cannabis Creative Group - content and campaigns; Rank Really High - SEO and digital marketing; CannaPllanners - strategic planning and consulting. We compete by offering AI automation that replaces manual agency work at a fraction of the cost.",
        category: "competitors",
        tags: ["agencies", "services"],
    },
    {
        question: "How does BakedBot replace traditional cannabis marketing agencies?",
        answer: "Traditional agencies charge $5k-20k/month for manual work. BakedBot provides AI agents (Craig for marketing, Ezal for competitive intel, Deebo for compliance) that automate the same work at $500-2000/month. Our agents work 24/7, scale infinitely, and learn from data. Agencies can't compete on speed, cost, or consistency.",
        category: "competitive_positioning",
        tags: ["agencies", "automation", "pricing"],
    },

    // Growth Strategy
    {
        question: "What is BakedBot's go-to-market strategy?",
        answer: "Our GTM strategy focuses on: (1) Pilot-led growth with Thrive Syracuse as a showcase customer, (2) Vertical SaaS approach targeting dispensaries and brands separately, (3) Lead magnets like Vibe Studio and Cannabis Marketing AI Academy, (4) Content marketing and SEO to compete with Weedmaps/Leafly for organic traffic, (5) Partnership strategy with POS providers (Alleaves, Blaze, etc.).",
        category: "growth_strategy",
        tags: ["gtm", "sales", "marketing"],
    },
    {
        question: "What are BakedBot's key growth metrics?",
        answer: "Our key metrics are: (1) MRR (Monthly Recurring Revenue) - currently tracking toward $100k by Jan 2027, (2) Customer Acquisition Cost (CAC) - target <$500 per customer, (3) Lifetime Value (LTV) - target >$10k per customer, (4) Net Revenue Retention (NRR) - target >120% through expansion, (5) Active Users and DAU (Daily Active Users).",
        category: "growth_strategy",
        tags: ["metrics", "kpis"],
    },
    {
        question: "What are BakedBot's pricing tiers?",
        answer: "Our pricing tiers are: (1) Starter - $499/month for small dispensaries, (2) Growth - $999/month for mid-market, (3) Empire - $1,999/month for enterprise customers like Thrive Syracuse with full feature access. We also have custom enterprise pricing for large multi-location operators.",
        category: "pricing",
        tags: ["plans", "revenue"],
    },

    // Product Strategy
    {
        question: "What are BakedBot's core product pillars?",
        answer: "Our 6 core pillars are: (1) Agentic Commerce (Smokey for sales, order routing), (2) Marketing Automation (Craig for campaigns, content), (3) Competitive Intelligence (Ezal for market monitoring), (4) Compliance & Legal (Deebo for regulatory adherence), (5) Operations & Inventory (Pops for analytics, stock management), (6) Financial Intelligence (Money Mike for pricing, margins).",
        category: "product_strategy",
        tags: ["agents", "features"],
    },
    {
        question: "What is BakedBot's AI agent architecture?",
        answer: "We use a multi-agent system powered by Claude (Anthropic) and Gemini (Google). Each agent has a specific domain: Smokey (budtender), Craig (marketer), Ezal (competitive intel), Deebo (compliance), Pops (ops), Money Mike (finance), Mrs. Parker (HR). Agents collaborate via the Executive Boardroom and share context through Letta memory. Super Users orchestrate agents to grow BakedBot itself.",
        category: "product_strategy",
        tags: ["agents", "ai", "architecture"],
    },
    {
        question: "What integrations does BakedBot support?",
        answer: "Current integrations: Alleaves POS (Thrive Syracuse), CannPay/Smokey Pay (cannabis payments), Aeropay (bank transfers), Mailjet/SendGrid (email), Blackleaf (SMS), Gmail/Google Workspace (email), Google Calendar (scheduling), Apify (web scraping for Ezal), Firebase (database, auth, hosting). Planned: Blaze POS, Dutchie API, Leafly API, Weedmaps API.",
        category: "integrations",
        tags: ["pos", "payments", "third_party"],
    },

    // Competitive Intelligence
    {
        question: "How should BakedBot monitor its own competitors?",
        answer: "Use Ezal (competitive intelligence agent) to: (1) Track AlpineIQ, Headset, Jane, Dutchie pricing and feature releases, (2) Monitor agency competitors' content and client wins, (3) Scrape product pages and marketing materials, (4) Set up alerts for competitive threats (new funding, product launches), (5) Analyze SEO rankings vs Weedmaps/Leafly, (6) Track social media presence and engagement.",
        category: "competitive_intelligence",
        tags: ["ezal", "monitoring"],
    },
    {
        question: "What competitive intelligence playbooks should Super Users run?",
        answer: "Create playbooks for: (1) Daily competitor website monitoring (pricing, features, messaging), (2) Weekly SEO ranking checks vs Weedmaps/Leafly/competitors, (3) Monthly funding round tracking (Crunchbase, PitchBook), (4) Quarterly product release analysis (new features, positioning), (5) Agency portfolio monitoring (new client wins, case studies).",
        category: "competitive_intelligence",
        tags: ["playbooks", "automation"],
    },

    // Customer Management
    {
        question: "How should Super Users manage BakedBot's customers?",
        answer: "Use the CEO Dashboard to: (1) Monitor customer health scores and churn risk, (2) Track usage analytics (DAU, feature adoption), (3) Identify expansion opportunities (upsell to higher tiers), (4) Review support tickets and satisfaction scores, (5) Run playbooks for customer success (onboarding, training, check-ins), (6) Analyze cohort retention and LTV.",
        category: "customer_management",
        tags: ["retention", "expansion"],
    },
    {
        question: "What are BakedBot's customer success KPIs?",
        answer: "Track: (1) Net Revenue Retention (NRR) - target >120%, (2) Gross Revenue Retention (GRR) - target >90%, (3) Customer Satisfaction (CSAT) - target >4.5/5, (4) Net Promoter Score (NPS) - target >50, (5) Time to Value (TTV) - target <30 days, (6) Feature Adoption Rate - target >70% for core features, (7) Support Response Time - target <2 hours.",
        category: "customer_management",
        tags: ["kpis", "success"],
    },

    // Super User Capabilities
    {
        question: "What tools do Super Users have access to?",
        answer: "Super Users have access to: (1) CEO Dashboard with full analytics, (2) All agent capabilities (can delegate to any agent), (3) Playbook creation and management, (4) System administration (user management, billing), (5) Competitive intelligence tools (Ezal), (6) Development tools (code evals, debugging), (7) Customer management (CRM, support tickets), (8) Financial tools (revenue tracking, pricing optimization).",
        category: "super_user",
        tags: ["capabilities", "tools"],
    },
    {
        question: "How should Super Users use the Executive Boardroom?",
        answer: "The Boardroom is for strategic alignment. Use it to: (1) Set quarterly OKRs and track progress toward $100k MRR, (2) Coordinate agent efforts (e.g., Craig campaigns + Ezal competitive intel), (3) Review customer health and prioritize retention/expansion, (4) Analyze competitive threats and plan responses, (5) Make product roadmap decisions, (6) Review financial performance and adjust pricing.",
        category: "super_user",
        tags: ["boardroom", "strategy"],
    },

    // Quick Actions for Super Users
    {
        question: "What are common Super User quick actions?",
        answer: "Quick actions include: 'Monitor AlpineIQ pricing changes', 'Track Dutchie feature releases', 'Analyze Thrive Syracuse usage patterns', 'Generate executive revenue report', 'Check customer churn risk', 'Review competitor SEO rankings', 'Run customer health playbook', 'Analyze expansion opportunities', 'Monitor Weedmaps traffic vs our direct channels'.",
        category: "quick_actions",
        tags: ["automation", "workflows"],
    },
];

export const BAKEDBOT_COMPETITORS = {
    software: [
        {
            name: "AlpineIQ (AIQ)",
            category: "Loyalty & Marketing Automation",
            url: "https://alpineiq.com",
            strengths: ["SMS marketing", "Loyalty programs", "Customer segmentation"],
            weaknesses: ["Single-purpose tool", "No AI agents", "No competitive intel"],
            pricing: "$500-2000/month",
        },
        {
            name: "Headset",
            category: "Analytics & Market Intelligence",
            url: "https://headset.io",
            strengths: ["Market data", "Industry benchmarks", "Sales analytics"],
            weaknesses: ["Passive analytics only", "No automation", "No action triggers"],
            pricing: "$1000-3000/month",
        },
        {
            name: "Jane Technologies",
            category: "Ecommerce & Marketplace",
            url: "https://iheartjane.com",
            strengths: ["Ecommerce platform", "Marketplace presence", "POS integrations"],
            weaknesses: ["Transaction fees", "Takes customers off-site", "No AI"],
            pricing: "3-5% transaction fee",
        },
        {
            name: "Dutchie",
            category: "Ecommerce Platform",
            url: "https://dutchie.com",
            strengths: ["Large marketplace", "POS integrations", "Brand recognition"],
            weaknesses: ["High fees", "Marketplace dependency", "No AI automation"],
            pricing: "3-5% transaction fee + $500/month",
        },
        {
            name: "Blaze",
            category: "POS & Retail Management",
            url: "https://blaze.me",
            strengths: ["Integrated POS", "Inventory management", "Compliance tools"],
            weaknesses: ["Legacy platform", "No AI", "Limited marketing automation"],
            pricing: "$500-1500/month",
        },
        {
            name: "Weedmaps",
            category: "Marketplace & Discovery",
            url: "https://weedmaps.com",
            strengths: ["Large user base", "Brand awareness", "SEO presence"],
            weaknesses: ["Listing fees", "Takes traffic away from brands", "No direct relationship"],
            pricing: "$500-2000/month listings",
        },
        {
            name: "Leafly",
            category: "Marketplace & Education",
            url: "https://leafly.com",
            strengths: ["Strain database", "Content/education", "Consumer trust"],
            weaknesses: ["Marketplace model", "No direct sales", "No automation"],
            pricing: "$500-1500/month listings",
        },
    ],
    agencies: [
        {
            name: "Tact Firm",
            category: "Cannabis Marketing Agency",
            url: "https://tactfirm.com",
            strengths: ["Full-service", "Creative campaigns", "Brand strategy"],
            weaknesses: ["High cost ($10k-30k/month)", "Manual work", "No AI/automation"],
            pricing: "$10,000-30,000/month",
        },
        {
            name: "PufCreativ",
            category: "Creative & Branding",
            url: "https://pufcreativ.com",
            strengths: ["Design", "Branding", "Content creation"],
            weaknesses: ["Manual creative process", "Limited tech", "No analytics"],
            pricing: "$5,000-15,000/month",
        },
        {
            name: "Cannabis Creative Group",
            category: "Content & Campaigns",
            url: "https://cannabiscreativegroup.com",
            strengths: ["Cannabis expertise", "Compliance knowledge", "Content production"],
            weaknesses: ["Agency model (slow, expensive)", "No AI", "Limited scale"],
            pricing: "$5,000-20,000/month",
        },
        {
            name: "Rank Really High",
            category: "SEO & Digital Marketing",
            url: "https://rankreallyhigh.com",
            strengths: ["Cannabis SEO", "Organic traffic", "Local search"],
            weaknesses: ["SEO-only focus", "Manual optimization", "No automation"],
            pricing: "$3,000-10,000/month",
        },
    ],
};

export const SUPER_USER_PRESET_PROMPTS = [
    // Competitive Intelligence
    "Monitor AlpineIQ pricing and feature changes",
    "Track Dutchie and Jane marketplace share",
    "Analyze Weedmaps vs BakedBot SEO rankings",
    "Check Headset latest product updates",
    "Review Tact Firm client portfolio",

    // Customer Management
    "Show me Thrive Syracuse usage this week",
    "Identify customers at risk of churn",
    "Find upsell opportunities to Empire plan",
    "Generate customer health dashboard",
    "Review support tickets needing attention",

    // Growth & Strategy
    "Show progress toward $100k MRR goal",
    "Analyze customer acquisition cost trends",
    "Review this month's signups and conversions",
    "Generate executive revenue report",
    "Calculate current ARR and growth rate",

    // Product & Development
    "Show most-used features this week",
    "Identify underutilized features",
    "Review agent performance metrics",
    "Check system errors and bugs",
    "Analyze feature adoption rates",

    // Competitive Playbooks
    "Run daily competitor monitoring playbook",
    "Check competitor funding announcements",
    "Monitor agency new client wins",
    "Track competitor social media activity",
    "Analyze competitor content strategy",
];
