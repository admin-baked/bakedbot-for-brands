/**
 * Tool-Specific and Agent Handoff Prompts
 * 
 * Defines prompts that:
 * - Trigger specific tools (search, media generation, analytics)
 * - Require agent handoffs (multi-agent orchestration)
 * - Use deep research capabilities
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// TOOL-SPECIFIC PROMPTS
// =============================================================================

export const TOOL_PROMPTS: PromptScenario[] = [
    // --- Web Search Tool ---
    {
        id: 'tool-search-001',
        role: 'super_admin',
        category: 'web_search',
        prompt: 'What are the latest cannabis regulations in Ohio?',
        expectedBehavior: 'Use web search tool for current info',
        idealResponsePattern: `🔍 **Searching for latest Ohio cannabis regulations...**

📰 **Ohio Cannabis Regulations (Updated 2026)**

**Recent Developments:**
• Adult-use sales began Aug 2024
• Current tax rate: 10%
• Home grow: Up to 6 plants for adults 21+

**Licensing Updates (2026):**
• 180 dispensary licenses issued
• Social equity applications prioritized
• New cultivation tier added

**Key Rules:**
• 2.5 oz possession limit
• No public consumption
• Edibles capped at 110mg THC per package

**Sources:**
• [Ohio Dept of Commerce](https://cannabis.ohio.gov)
• [MJBizDaily - Ohio Updates](https://mjbizdaily.com/ohio)
• [Leafly Ohio Guide](https://leafly.com/ohio)

*Search performed just now. Results reflect publicly available information.*`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    {
        id: 'tool-search-002',
        role: 'brand',
        category: 'web_search',
        prompt: 'What are Cresco pricing on their latest products?',
        expectedBehavior: 'Search for competitor pricing info',
        idealResponsePattern: `🔍 **Searching Cresco Labs pricing...**

📊 **Cresco Labs - Current Retail Pricing (Illinois)**

| Product | Size | MSRP | Street Avg |
|---------|------|------|------------|
| **High Supply Flower** | 3.5g | $30 | $28-32 |
| **Cresco Flower** | 3.5g | $55 | $48-55 |
| **Liquid Live Resin Cart** | 0.5g | $50 | $45-50 |
| **Mindy's Edibles** | 100mg | $25 | $22-25 |

**Recent Price Movements:**
• High Supply line reduced 5% (Jan 2026)
• LLR carts holding steady
• Mindy's seeing promotional pricing

**Sources:**
• Iheartjane.com listings
• Dispensary menu aggregation
• Press releases

Would you like a deeper competitive analysis?`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },

    // --- Media Generation Tools ---
    {
        id: 'tool-media-001',
        role: 'brand',
        category: 'image_generation',
        prompt: 'Create an image for our 420 social media campaign',
        expectedBehavior: 'Generate compliant marketing image',
        idealResponsePattern: `🎨 **Generating 420 Campaign Image...**

**Style Options:**

1. **Lifestyle Shot**
   Premium cannabis flower with golden lighting, luxury setting
   *No faces, compliant imagery*

2. **Product Focus**
   Your products arranged artistically with 420 theming
   *Clean background, professional lighting*

3. **Abstract/Artistic**
   Cannabis-inspired patterns, purple/green gradients
   *No leaves directly shown, brand-safe*

**Generating Option 1...**

✅ **Image Generated!**

![420 Campaign - Lifestyle](file:///generated/420-campaign-lifestyle.png)

**Compliance Check:**
✅ No faces or identifiable people
✅ No appeals to minors
✅ No health claims
✅ Platform-safe for Instagram/Facebook

[Download Hi-Res] [Generate More] [Edit Prompt]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
    {
        id: 'tool-media-002',
        role: 'dispensary',
        category: 'video_generation',
        prompt: 'Create a video ad for our happy hour special',
        expectedBehavior: 'Generate compliant video content',
        idealResponsePattern: `🎬 **Generating Video Ad...**

**Happy Hour Special Video**

**Script:**
> Scene 1 (0-3s): Your logo fade-in
> Scene 2 (3-8s): Golden hour store interior shots  
> Scene 3 (8-12s): Product showcase with pricing
> Scene 4 (12-15s): "Happy Hour 4-7pm | 20% Off"

**Style:** Smooth, professional, warm lighting
**Duration:** 15 seconds
**Format:** 1080x1920 (Stories/Reels)

⏳ Generating... (Est. 45 seconds)

✅ **Video Generated!**

🎥 [Preview Video]

**Compliance Check:**
✅ Age-gate recommended for paid ads
✅ No consumption shown
✅ Clear pricing displayed
✅ State-compliant messaging

[Download] [Adjust Duration] [Add Music]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },

    // --- Analytics Tools ---
    {
        id: 'tool-analytics-001',
        role: 'dispensary',
        category: 'analytics',
        prompt: 'Generate a sales report for last week',
        expectedBehavior: 'Pull and format POS data',
        idealResponsePattern: `📊 **Weekly Sales Report (Dec 25 - Dec 31, 2025)**

**Summary:**
| Metric | This Week | Last Week | Change |
|--------|-----------|-----------|--------|
| **Revenue** | $52,340 | $48,120 | +8.8% ↑ |
| **Transactions** | 487 | 452 | +7.7% ↑ |
| **Avg Ticket** | $107.47 | $106.46 | +0.9% ↑ |
| **Units Sold** | 1,245 | 1,156 | +7.7% ↑ |

**By Category:**
| Category | Revenue | % of Total | Δ WoW |
|----------|---------|------------|-------|
| Flower | $24,850 | 47% | +12% ↑ |
| Vapes | $14,120 | 27% | +5% ↑ |
| Edibles | $7,850 | 15% | +3% ↑ |
| Concentrates | $4,200 | 8% | -2% ↓ |
| Other | $1,320 | 3% | +8% ↑ |

**Top Performers:**
1. Cresco Rise 3.5g - $4,125 (87 units)
2. Select Elite Cart - $3,850 (77 units)
3. Mindy's Gummies - $2,340 (94 units)

**Insights:**
• Holiday week drove 8.8% revenue increase
• Flower outperforming other categories
• Concentrate sales declining - consider promotion

[Download PDF] [Email Report] [Compare to Previous Period]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    {
        id: 'tool-analytics-002',
        role: 'brand',
        category: 'analytics',
        prompt: 'Show me my sell-through rates by retailer',
        expectedBehavior: 'Display wholesale analytics',
        idealResponsePattern: `📊 **Sell-Through Rate by Retailer (Last 30 Days)**

**Overall:** 78% sell-through (Industry avg: 72%)

**Top Performers:**
| Retailer | Inventory | Sold | Rate | Days to Clear |
|----------|-----------|------|------|---------------|
| Sunnyside (Chicago) | 500 | 465 | 93% | 8 |
| Dispensary33 | 320 | 288 | 90% | 10 |
| Zen Leaf (Naperville) | 280 | 238 | 85% | 12 |
| Consume | 250 | 200 | 80% | 15 |
| EarthMed | 400 | 280 | 70% | 20 |

**Underperformers (< 60%):**
| Retailer | Inventory | Sold | Rate | Issue |
|----------|-----------|------|------|-------|
| Green Gate | 200 | 100 | 50% | Low traffic |
| Nature's Care | 180 | 90 | 50% | Poor placement |

**Recommendations:**
• Reduce inventory to Green Gate (-30%)
• Request better shelf placement at Nature's Care
• Increase allocation to Sunnyside (+20%)

[Export Data] [Contact Underperformers] [Adjust Allocations]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// AGENT HANDOFF PROMPTS
// =============================================================================

export const HANDOFF_PROMPTS: PromptScenario[] = [
    // --- Smokey to Craig Handoff ---
    {
        id: 'handoff-001',
        role: 'dispensary',
        category: 'agent_handoff',
        prompt: 'Recommend products and then create an email promoting them',
        expectedBehavior: 'Smokey recommends, then hands to Craig for email',
        idealResponsePattern: `🌿 **[Smokey] Product Recommendations:**

Based on current trends and your inventory:

1. 💜 **Purple Punch** - High demand, good margin
2. ⚡ **Green Crack** - Popular daytime strain
3. 🍬 **Mindy's Gummies** - Best-selling edible

---

📧 **[Craig] Email Campaign Draft:**

*Handing off to Craig for email creation...*

**Subject:** 🌿 Fresh Drops: 3 Must-Try Products This Week

**Body:**
> Hi [Name],
>
> We've got some incredible products in stock that our customers can't stop talking about:
>
> **💜 Purple Punch** - The ultimate relaxation strain
> **⚡ Green Crack** - Your new favorite wake-and-bake
> **🍬 Mindy's Gummies** - Perfect micro-dosing made easy
>
> Stop by this week and mention this email for 10% off!
>
> See you soon,
> [Store Name]

**Compliance Check:** ✅ Passed

[Send Email] [Edit] [Save as Template]`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    // --- Ezal to Pops Handoff ---
    {
        id: 'handoff-002',
        role: 'dispensary',
        category: 'agent_handoff',
        prompt: 'Analyze competitors then tell me how it affects my revenue',
        expectedBehavior: 'Ezal scans, Pops analyzes impact',
        idealResponsePattern: `🔍 **[Ezal] Competitive Scan:**

**Competitor Activity:**
• Sunnyside: 25% off flower this week
• Dispensary33: New loyalty program launched
• Zen Leaf: Extended hours (8am-10pm)

---

📊 **[Pops] Revenue Impact Analysis:**

*Handing off to Pops for impact assessment...*

**Estimated Impact on Your Revenue:**

| Competitor Action | Your Impact | Timeframe |
|-------------------|-------------|-----------|
| Sunnyside 25% off | -8% flower revenue | This week |
| D33 loyalty program | -3% repeat visits | 30 days |
| Zen Leaf hours | -2% evening sales | Ongoing |

**Net Projected Impact:** -5% weekly revenue (~$2,500)

**Recommended Counter-Actions:**
1. Match Sunnyside pricing on top 3 SKUs
2. Accelerate your loyalty program launch
3. Consider extended Friday hours

**If you take all actions:** Estimated recovery +3-4%

[Implement Pricing Changes] [Draft Counter-Promotion]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Leo Orchestration ---
    {
        id: 'handoff-003',
        role: 'super_admin',
        category: 'orchestration',
        prompt: 'Have all agents give me a status report',
        expectedBehavior: 'Leo orchestrates multi-agent status',
        idealResponsePattern: `🎯 **[Leo] Orchestrating Status Reports...**

Polling all agents...

---

**📊 Pops (Analytics):** ✅ Online
• Processing 12 reports today
• No anomalies detected
• MRR tracking on target

**📣 Craig (Marketing):** ✅ Online
• 8 campaigns active
• 2 pending approval
• Email quota: 45% used

**🔍 Ezal (Intelligence):** ✅ Online
• 15 competitors monitored
• 3 price changes detected today
• Next discovery run: 2 hours

**🌿 Smokey (Products):** ✅ Online
• Recommendations served: 234 today
• Menu sync: Current
• No inventory alerts

**🤝 Mrs. Parker (Customers):** ✅ Online
• 450 customers engaged today
• 12 at risk of churn
• 3 VIP actions pending

**🛡️ Deebo (Compliance):** ✅ Online
• All content passing
• 0 violations today
• Audit scheduled: 7 days

**⚙️ Linus (Technical):** ✅ Online
• All systems healthy
• API latency: 42ms avg
• No issues

---

**Summary:** All 7 agents operational. No critical issues.`,
        shouldAskClarification: false,
        targetAgent: 'leo'
    },
];

// =============================================================================
// DEEP RESEARCH PROMPTS
// =============================================================================

export const DEEP_RESEARCH_PROMPTS: PromptScenario[] = [
    {
        id: 'research-001',
        role: 'super_admin',
        category: 'deep_research',
        prompt: 'Research the cannabis licensing process in New Jersey',
        expectedBehavior: 'Comprehensive web research with sources',
        idealResponsePattern: `📚 **Deep Research: New Jersey Cannabis Licensing**

*Compiling research from multiple sources...*

---

## License Types

| Type | Description | Annual Fee |
|------|-------------|------------|
| Class 1 | Cultivator | $20,000 |
| Class 2 | Manufacturer | $20,000 |
| Class 3 | Wholesaler | $10,000 |
| Class 4 | Distributor | $10,000 |
| Class 5 | Retailer | $10,000 |
| Class 6 | Delivery | $5,000 |

## Application Process

1. **Conditional License** (Initial approval)
   - Background checks
   - Business plan review
   - Community impact statement

2. **Conversion to Annual** (After site approval)
   - Facility inspection
   - Security plan approval
   - Final compliance review

## Social Equity Priority

Workers, minorities, and women-owned businesses get:
• Priority review status
• 50% fee waivers
• Access to technical assistance

## Current Market Stats

• 175+ licensed retailers (as of 2026)
• $2.1B in adult-use sales (2025)
• 850+ pending applications

## Key Contacts

• **CRC (Cannabis Regulatory Commission)**
  - [nj.gov/cannabis](https://nj.gov/cannabis)
  - Email: cannabis@crc.nj.gov

## Sources
- [NJ CRC Official](https://nj.gov/cannabis)
- [MJBizDaily NJ Coverage](https://mjbizdaily.com)
- [Headset NJ Market Report](https://headset.io)

---

*Research completed at 2:15 AM. 12 sources consulted.*

[Download Full Report] [Save to Drive]`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    {
        id: 'research-002',
        role: 'brand',
        category: 'deep_research',
        prompt: 'Research consumer trends in the edibles market',
        expectedBehavior: 'Market research with data points',
        idealResponsePattern: `📊 **Deep Research: Cannabis Edibles Market Trends (2026)**

*Analyzing market data and consumer surveys...*

---

## Market Size & Growth

| Year | US Edibles Market | Growth |
|------|------------------|--------|
| 2024 | $4.8B | — |
| 2025 | $5.6B | +17% |
| 2026E | $6.5B | +16% |

## Consumer Preferences

**Preferred Form Factors:**
1. Gummies - 68% market share
2. Chocolates - 12%
3. Beverages - 8% (fastest growing)
4. Baked goods - 5%
5. Mints/tablets - 4%
6. Other - 3%

**Dosing Trends:**
• Micro-dose (2.5-5mg) - Fastest growing segment (+35% YoY)
• Standard (10mg) - Still dominant (55% of sales)
• High-dose (50mg+) - Declining (-8% YoY)

## Key Consumer Demographics

| Segment | % of Buyers | Avg Monthly Spend |
|---------|-------------|-------------------|
| Gen Z (21-28) | 28% | $85 |
| Millennials | 42% | $120 |
| Gen X | 22% | $95 |
| Boomers | 8% | $65 |

## Emerging Trends

1. **Functional Edibles** - Sleep, focus, energy formulations
2. **Fast-Acting Tech** - Nano-emulsion for 15-min onset
3. **Beverage Boom** - THC seltzers, mocktails
4. **Wellness Positioning** - CBD:THC ratios for daily use

## Actionable Insights for Your Brand

✅ Consider low-dose (5mg) SKUs
✅ Explore beverage licensing/partnership
✅ Functional formulations (sleep, focus)
✅ Better-for-you ingredients (vegan, sugar-free)

---

**Sources:**
- Headset Analytics Q4 2025
- BDSA Consumer Insights
- Company earnings reports

[Download Report] [Email to Team]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_TOOL_HANDOFF_PROMPTS: PromptScenario[] = [
    ...TOOL_PROMPTS,
    ...HANDOFF_PROMPTS,
    ...DEEP_RESEARCH_PROMPTS,
];

export const TOOL_HANDOFF_STATS = {
    total: ALL_TOOL_HANDOFF_PROMPTS.length,
    byCategory: {
        toolPrompts: TOOL_PROMPTS.length,
        handoffs: HANDOFF_PROMPTS.length,
        deepResearch: DEEP_RESEARCH_PROMPTS.length,
    }
};

console.log('Tool & Handoff Prompt Stats:', TOOL_HANDOFF_STATS);
