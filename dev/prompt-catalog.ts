/**
 * Prompt Catalog for Agent Response Optimization
 * 
 * This catalog defines expected prompts across all user roles and the ideal
 * response patterns for each. Used for testing and prompt engineering.
 */

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

export type UserRole = 'guest' | 'customer' | 'dispensary' | 'brand' | 'super_admin';

export interface PromptScenario {
    id: string;
    role: UserRole;
    category: string;
    prompt: string;
    context?: string;
    expectedBehavior: string;
    idealResponsePattern: string;
    shouldAskClarification: boolean;
    targetAgent?: string;
}

// =============================================================================
// CUSTOMER / GUEST PROMPTS (Homepage visitors, product discovery)
// =============================================================================

export const CUSTOMER_PROMPTS: PromptScenario[] = [
    // --- Location Discovery ---
    {
        id: 'cust-001',
        role: 'guest',
        category: 'location_discovery',
        prompt: 'Find dispensaries near me',
        expectedBehavior: 'Ask for ZIP/City if location not available',
        idealResponsePattern: 'Could you please provide your ZIP code or city so I can find options near you?',
        shouldAskClarification: true,
        targetAgent: 'general'
    },
    {
        id: 'cust-002',
        role: 'guest',
        category: 'location_discovery',
        prompt: 'Dispensaries in Chicago',
        context: 'User provided city',
        expectedBehavior: 'Proceed to search Chicago dispensaries',
        idealResponsePattern: '🏪 Found [X] dispensaries in Chicago:\n\n1. **[Name]** - [Address]\n   Rating: ⭐ [X]/5 | [Distance]\n\n[Continue with top 5 results]',
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    {
        id: 'cust-003',
        role: 'guest',
        category: 'location_discovery',
        prompt: 'Show me dispensaries in 60601',
        context: 'User provided ZIP code',
        expectedBehavior: 'Use ZIP to search local dispensaries',
        idealResponsePattern: '🏪 Dispensaries near 60601 (Downtown Chicago):\n\n[List results with distance from ZIP centroid]',
        shouldAskClarification: false,
        targetAgent: 'general'
    },

    // --- Product Discovery ---
    {
        id: 'cust-010',
        role: 'customer',
        category: 'product_discovery',
        prompt: "What's good for anxiety?",
        expectedBehavior: 'Provide strain recommendations with terpene focus',
        idealResponsePattern: '🌿 **Strains users report help with anxiety:**\n\n1. 🍃 **Granddaddy Purple** (Indica)\n   High myrcene, linalool | Relaxing, calming\n   Match confidence: 92% | In stock: Yes\n\n2. 💨 **ACDC** (Hybrid - CBD dominant)\n   High CBD:THC ratio | Clear-headed calm\n   Match confidence: 88% | In stock: Yes\n\n*Note: I cannot make medical claims. These are based on user reports and terpene profiles.*',
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    {
        id: 'cust-011',
        role: 'customer',
        category: 'product_discovery',
        prompt: 'I want something energizing for daytime',
        expectedBehavior: 'Recommend sativa-dominant strains',
        idealResponsePattern: '☀️ **Energizing Daytime Options:**\n\n1. ⚡ **Green Crack** (Sativa)\n   Terpinolene-dominant | Focus, energy\n   Match confidence: 95% | In stock: Yes\n\n2. 🍋 **Super Lemon Haze** (Sativa)\n   Limonene-rich | Uplifting, creative\n   Match confidence: 91% | In stock: Yes',
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    {
        id: 'cust-012',
        role: 'customer',
        category: 'product_discovery',
        prompt: 'Show me edibles under $30',
        expectedBehavior: 'Filter products by category and price',
        idealResponsePattern: '🍬 **Edibles Under $30:**\n\n1. **[Brand] Gummies** - $25\n   10mg THC x 10ct | Fruit flavors\n   \n2. **[Brand] Chocolate Bar** - $28\n   5mg THC x 20 squares | Dark chocolate\n\n[Show 5-10 results with clear pricing]',
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },

    // --- Education ---
    {
        id: 'cust-020',
        role: 'guest',
        category: 'education',
        prompt: "What's the difference between indica and sativa?",
        expectedBehavior: 'Provide educational response',
        idealResponsePattern: '📚 **Indica vs Sativa:**\n\n**Indica** 🌙\n- Typically relaxing, sedating\n- Body-focused effects\n- Common terpenes: Myrcene, Linalool\n- Best for: Evening, relaxation, sleep\n\n**Sativa** ☀️\n- Typically energizing, uplifting\n- Head-focused effects\n- Common terpenes: Limonene, Pinene\n- Best for: Daytime, creativity, focus\n\n**Hybrid** 🌿\n- Balanced effects from both\n- Effects depend on dominant strain\n\n*Modern research suggests terpene profiles matter more than indica/sativa classification.*',
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    {
        id: 'cust-021',
        role: 'customer',
        category: 'education',
        prompt: 'What are terpenes?',
        expectedBehavior: 'Educational response about terpenes',
        idealResponsePattern: '🧪 **Terpenes Explained:**\n\nTerpenes are aromatic compounds found in cannabis that influence both smell and effects.\n\n**Common Terpenes:**\n- 🍋 **Limonene**: Citrus, uplifting\n- 🌲 **Pinene**: Pine, focus\n- 🥭 **Myrcene**: Earthy, relaxing\n- 💜 **Linalool**: Floral, calming\n- 🌶️ **Caryophyllene**: Spicy, anti-inflammatory\n\n*Each strain has a unique terpene fingerprint that shapes your experience.*',
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },

    // --- Deals & Pricing ---
    {
        id: 'cust-030',
        role: 'customer',
        category: 'deals',
        prompt: 'Any deals today?',
        context: 'User is browsing a specific dispensary',
        expectedBehavior: 'Show current promotions',
        idealResponsePattern: '🔥 **Today\'s Deals:**\n\n1. **Happy Hour** (4-7pm)\n   20% off all flower\n\n2. **First-Time Patient**\n   25% off entire order\n\n3. **Refer a Friend**\n   $10 credit for you and them',
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// DISPENSARY PROMPTS (Dispensary operators, managers)
// =============================================================================

export const DISPENSARY_PROMPTS: PromptScenario[] = [
    // --- Competitive Intelligence ---
    {
        id: 'disp-001',
        role: 'dispensary',
        category: 'competitive_intel',
        prompt: 'Who are my competitors in Chicago?',
        context: 'Dispensary in Chicago',
        expectedBehavior: 'List competitors with basic intel',
        idealResponsePattern: '🔍 **Competitors in Chicago:**\n\n1. **Sunnyside** - 5 locations\n   Avg price: $45/8th | Rating: 4.2⭐\n\n2. **Dispensary33** - 2 locations\n   Avg price: $50/8th | Rating: 4.5⭐\n\n3. **MedMen** - 3 locations\n   Avg price: $55/8th | Rating: 3.8⭐\n\nWould you like a detailed comparison on any of these?',
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    {
        id: 'disp-002',
        role: 'dispensary',
        category: 'competitive_intel',
        prompt: 'Compare my prices to Sunnyside',
        context: 'Dispensary with known menu',
        expectedBehavior: 'Generate Ezal price comparison report',
        idealResponsePattern: '🔥 **Cannabis Marketplace Snapshot - Sunnyside**\n\n📊 **COMPETITIVE INTEL**\n-------------------------\n💰 **PRICE GAP:**\n- Your avg flower: $48/8th vs Sunnyside: $45/8th (+6.7%)\n- Your avg concentrate: $55/g vs Sunnyside: $52/g (+5.8%)\n\n📈 **TOP MOVERS:**\n- Sunnyside running 25% off all vapes this week\n- Their \"Cresco\" products priced 15% below MSRP\n\n🚨 **MARKET OPPORTUNITIES:**\n- No local competitors offer subscription programs\n- You could undercut on bulk flower (oz deals)\n\n*Data freshness: Last 24 hours*',
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },

    // --- Menu Management ---
    {
        id: 'disp-010',
        role: 'dispensary',
        category: 'menu_management',
        prompt: 'What products should I add to my menu?',
        context: 'Dispensary with existing menu',
        expectedBehavior: 'Analyze gaps and suggest additions',
        idealResponsePattern: '📋 **Menu Gap Analysis:**\n\n**Missing High-Demand Categories:**\n1. 🍬 **Low-dose edibles** (5mg or less)\n   Market demand: High | Competitors carry: 85%\n\n2. 💨 **Live rosin** products\n   Market demand: Growing | Competitors carry: 60%\n\n3. 🎯 **1:1 CBD:THC** options\n   Market demand: Moderate | Competitors carry: 70%\n\n**Brands to Consider:**\n- Cresco (high velocity in your area)\n- Ozone (price-competitive)\n\nWant me to reach out to distributors for these?',
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },

    // --- Analytics ---
    {
        id: 'disp-020',
        role: 'dispensary',
        category: 'analytics',
        prompt: 'Show me my best-selling products',
        context: 'Dispensary with POS integration',
        expectedBehavior: 'Display sales analytics',
        idealResponsePattern: '📊 **Top Sellers (Last 30 Days):**\n\n1. **Cresco Rise Flower** - 245 units\n   Revenue: $12,250 | Margin: 32%\n\n2. **Select Elite Cart** - 198 units\n   Revenue: $9,900 | Margin: 28%\n\n3. **Mindy\'s Gummies** - 156 units\n   Revenue: $4,680 | Margin: 35%\n\n**Insights:**\n- Flower outsells concentrates 2:1\n- Edibles have highest margin\n- Consider promoting gummies more',
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    {
        id: 'disp-021',
        role: 'dispensary',
        category: 'analytics',
        prompt: "What's my revenue this week?",
        expectedBehavior: 'Show revenue summary',
        idealResponsePattern: '💰 **Weekly Revenue Summary:**\n\nTotal: **$47,250** (+8% vs last week)\n\n**By Category:**\n- Flower: $22,500 (48%)\n- Vapes: $14,175 (30%)\n- Edibles: $7,100 (15%)\n- Other: $3,475 (7%)\n\n**Daily Breakdown:**\n- Mon: $5,200\n- Tue: $4,800\n- Wed: $6,100 (promo day)\n...',
        shouldAskClarification: false,
        targetAgent: 'pops'
    },

    // --- Customer Management ---
    {
        id: 'disp-030',
        role: 'dispensary',
        category: 'customers',
        prompt: 'Show me customers who haven\'t visited in 60 days',
        expectedBehavior: 'Generate win-back list',
        idealResponsePattern: '👥 **Win-Back Candidates (60+ days inactive):**\n\n**Total:** 127 customers\n\n**High-Value (>$500 LTV):**\n1. John D. - Last visit: 75 days ago | LTV: $1,250\n2. Sarah M. - Last visit: 68 days ago | LTV: $980\n...\n\n**Recommended Actions:**\n- Send SMS with 20% off offer\n- Personalize message with their favorite products\n\nWould you like me to draft the win-back campaign?',
        shouldAskClarification: false,
        targetAgent: 'mrs_parker'
    },
];

// =============================================================================
// BRAND PROMPTS (Cannabis brands, manufacturers)
// =============================================================================

export const BRAND_PROMPTS: PromptScenario[] = [
    // --- Distribution ---
    {
        id: 'brand-001',
        role: 'brand',
        category: 'distribution',
        prompt: 'Which dispensaries carry my products?',
        context: 'Brand with known product catalog',
        expectedBehavior: 'Show distribution footprint',
        idealResponsePattern: '🏪 **Your Distribution Footprint:**\n\n**Illinois:** 45 dispensaries\n- Chicago: 28 locations\n- Suburbs: 12 locations\n- Downstate: 5 locations\n\n**Top Retailers by Volume:**\n1. Sunnyside (5 locations) - $125k/mo\n2. Dispensary33 (2 locations) - $78k/mo\n3. Zen Leaf (4 locations) - $62k/mo\n\n**Coverage Gaps:**\n- No presence in Rockford market\n- Only 1 retailer in Peoria\n\nWant me to find new retail partners in these areas?',
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },

    // --- Marketing ---
    {
        id: 'brand-010',
        role: 'brand',
        category: 'marketing',
        prompt: 'Create a promotional email for 420',
        expectedBehavior: 'Generate compliant email copy',
        idealResponsePattern: '📧 **420 Email Campaign - 3 Variations:**\n\n**Option A: Professional**\n> Subject: Celebrate 4/20 with [Brand]\n> \n> This April 20th, discover why [Brand] is the choice of connoisseurs across Illinois...\n\n**Option B: Hype**\n> Subject: 🔥 420 IS HERE 🔥\n> \n> The biggest day of the year deserves the biggest deals...\n\n**Option C: Educational**\n> Subject: The History of 420 + Exclusive Deals\n> \n> Before you celebrate, learn the story behind the date...\n\n*All copy is compliant (no appeals to minors, no health claims).*',
        shouldAskClarification: false,
        targetAgent: 'craig'
    },

    // --- Analytics ---
    {
        id: 'brand-020',
        role: 'brand',
        category: 'analytics',
        prompt: 'Show me my revenue this month',
        context: 'Brand with LeafLink integration',
        expectedBehavior: 'Display wholesale revenue',
        idealResponsePattern: '💰 **Monthly Revenue (Wholesale):**\n\n**Total:** $487,500 (+12% MoM)\n\n**By Product Line:**\n- Flower: $245,000 (50%)\n- Vapes: $146,250 (30%)\n- Edibles: $97,500 (20%)\n\n**By Retailer:**\n1. Sunnyside: $125,000\n2. Cresco Labs: $98,000\n3. Dispensary33: $78,000\n\n**Velocity Alert:**\n- "Purple Punch" selling 3x faster than last month\n- "Sour Diesel" slowing (-15%)',
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    {
        id: 'brand-021',
        role: 'brand',
        category: 'analytics',
        prompt: "What's my market share in Illinois?",
        expectedBehavior: 'Provide market share analysis',
        idealResponsePattern: '📊 **Illinois Market Share Analysis:**\n\n**Your Share:** 8.2% of total cannabis sales\n\n**Category Breakdown:**\n- Flower: 12% share (3rd place)\n- Vapes: 6% share (5th place)\n- Edibles: 4% share (8th place)\n\n**Trend:**\n- Up 1.2% from 3 months ago\n- Strongest in Chicago (11% share)\n- Weakest downstate (4% share)\n\n**Competitors:**\n1. Cresco - 22% share\n2. GTI - 18% share\n3. Verano - 15% share\n\nWant strategies to grow share in underperforming regions?',
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
];

// =============================================================================
// SUPER USER PROMPTS (Platform admins, executives)
// =============================================================================

export const SUPER_USER_PROMPTS: PromptScenario[] = [
    // --- Platform Management ---
    {
        id: 'super-001',
        role: 'super_admin',
        category: 'platform_management',
        prompt: 'Show me all active tenants',
        expectedBehavior: 'List all brands and dispensaries',
        idealResponsePattern: '🏢 **Active Tenants:**\n\n**Brands:** 45 active\n- Enterprise (Scale): 3\n- Growth: 12\n- Claim Pro: 30\n\n**Dispensaries:** 127 active\n- Enterprise: 8\n- Growth: 35\n- Claim Pro: 84\n\n**Recent Signups (7 days):**\n1. Green Thumb Dispensary (Claim Pro)\n2. Canna Culture (Growth)\n...\n\n**Churn Risk:**\n- 5 accounts with no activity in 30 days',
        shouldAskClarification: false,
        targetAgent: 'pops'
    },

    // --- Revenue ---
    {
        id: 'super-010',
        role: 'super_admin',
        category: 'revenue',
        prompt: "What's our MRR right now?",
        expectedBehavior: 'Show platform revenue metrics',
        idealResponsePattern: '💰 **MRR Dashboard:**\n\n**Current MRR:** $47,250\n**Target:** $100,000 by Jan 2027\n**Progress:** 47.25%\n\n**Breakdown:**\n- Claim Pro ($99): $8,316 (84 subs)\n- Growth ($299): $10,465 (35 subs)\n- Scale ($999): $7,992 (8 subs)\n- Enterprise: $20,477 (custom)\n\n**MoM Growth:** +8.2%\n**Churn Rate:** 2.1%\n\n**To hit target:**\n- Need 53 more Claim Pro + 20 Growth subs\n- Or 10 Enterprise deals',
        shouldAskClarification: false,
        targetAgent: 'money_mike'
    },

    // --- System Health ---
    {
        id: 'super-020',
        role: 'super_admin',
        category: 'system_health',
        prompt: 'Run a health check',
        expectedBehavior: 'Check all system integrations',
        idealResponsePattern: '🩺 **System Health Check:**\n\n✅ **Core Services**\n- Firebase: Healthy\n- Genkit: Healthy\n- Vector Search: Healthy\n\n✅ **Integrations**\n- CannMenus API: Responding (42ms)\n- Leafly Discovery: Active\n- Dutchie POS: Connected (3 stores)\n\n⚠️ **Warnings**\n- LeafLink: Rate limited (reset in 2h)\n- Email quota: 78% used\n\n❌ **Issues**\n- None detected\n\nLast check: Just now',
        shouldAskClarification: false,
        targetAgent: 'linus'
    },

    // --- Compliance ---
    {
        id: 'super-030',
        role: 'super_admin',
        category: 'compliance',
        prompt: 'Audit all content for compliance',
        expectedBehavior: 'Run compliance checks across platform',
        idealResponsePattern: '🛡️ **Compliance Audit Results:**\n\n**Content Scanned:** 12,456 items\n\n✅ **Passing:** 12,398 (99.5%)\n\n⚠️ **Warnings:** 48\n- 32: Missing age verification language\n- 16: Promotional claims need review\n\n❌ **Violations:** 10\n- 6: Potential health claims\n- 4: Appeals to minors (imagery)\n\n**Action Required:**\n- Review flagged items in Compliance Queue\n- 10 violations need immediate attention\n\nWant me to open the Compliance Queue?',
        shouldAskClarification: false,
        targetAgent: 'deebo'
    },

    // --- Deep Research ---
    {
        id: 'super-040',
        role: 'super_admin',
        category: 'research',
        prompt: 'Research the latest cannabis regulations in New York',
        expectedBehavior: 'Perform deep web research',
        idealResponsePattern: '📚 **Deep Research: NY Cannabis Regulations (2026)**\n\n**Recent Changes:**\n1. **Adult-Use Expansion** (Jan 2026)\n   - 50 new retail licenses issued\n   - Delivery now permitted statewide\n\n2. **Packaging Updates** (Dec 2025)\n   - Child-resistant requirements tightened\n   - THC warning labels mandatory\n\n3. **Advertising Rules** (Nov 2025)\n   - Billboard restrictions expanded\n   - Social media guidelines clarified\n\n**Sources:**\n- [NY OCM Official](https://cannabis.ny.gov)\n- [MJBizDaily Report](https://mjbizdaily.com/...)\n\n*Full report available for download.*',
        shouldAskClarification: false,
        targetAgent: 'general'
    },

    // --- Agent Orchestration ---
    {
        id: 'super-050',
        role: 'super_admin',
        category: 'orchestration',
        prompt: 'Have Ezal scan all competitors and Craig draft a summary email',
        expectedBehavior: 'Chain multiple agents together',
        idealResponsePattern: '🤖 **Multi-Agent Task Initiated:**\n\n**Step 1: Ezal (Competitive Scan)**\n⏳ Scanning 15 competitors...\n✅ Complete - Found 23 price gaps, 8 opportunities\n\n**Step 2: Craig (Email Draft)**\n⏳ Generating executive summary...\n✅ Complete - 3 variations ready\n\n**Results:**\n- Competitive report saved to Drive\n- Email drafts in your Gmail drafts\n\nWould you like to review before sending?',
        shouldAskClarification: false,
        targetAgent: 'leo'
    },
];

// =============================================================================
// COMBINED CATALOG
// =============================================================================

export const ALL_PROMPTS: PromptScenario[] = [
    ...CUSTOMER_PROMPTS,
    ...DISPENSARY_PROMPTS,
    ...BRAND_PROMPTS,
    ...SUPER_USER_PROMPTS,
];

// Statistics
export const PROMPT_STATS = {
    total: ALL_PROMPTS.length,
    byRole: {
        guest: CUSTOMER_PROMPTS.filter(p => p.role === 'guest').length,
        customer: CUSTOMER_PROMPTS.filter(p => p.role === 'customer').length,
        dispensary: DISPENSARY_PROMPTS.length,
        brand: BRAND_PROMPTS.length,
        super_admin: SUPER_USER_PROMPTS.length,
    },
    clarificationRequired: ALL_PROMPTS.filter(p => p.shouldAskClarification).length,
    directResponse: ALL_PROMPTS.filter(p => !p.shouldAskClarification).length,
};

console.log('Prompt Catalog Stats:', PROMPT_STATS);
