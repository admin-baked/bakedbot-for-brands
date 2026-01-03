/**
 * Onboarding, Proactive Suggestions, and Seasonal Prompts
 * 
 * Covers:
 * - First-time user onboarding flows
 * - Proactive AI suggestions (agent-initiated)
 * - Seasonal and promotional campaign prompts
 * - Contextual recommendations
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// ONBOARDING FLOWS
// =============================================================================

export const ONBOARDING_PROMPTS: PromptScenario[] = [
    // --- New Dispensary Setup ---
    {
        id: 'onboard-001',
        role: 'dispensary',
        category: 'onboarding',
        prompt: "I just signed up, what should I do first?",
        expectedBehavior: 'Guide through setup checklist',
        idealResponsePattern: `🎉 **Welcome to BakedBot AI!**

Let's get you set up for success. Here's your personalized onboarding checklist:

**Step 1: Connect Your Systems** (10 min)
- [ ] Connect your POS (Dutchie, Flowhub, etc.)
- [ ] Import your menu
- [ ] Connect your CRM (optional)

**Step 2: Know Your Market** (5 min)
- [ ] Add 3-5 competitors to watch
- [ ] Set your pricing strategy

**Step 3: Engage Customers** (10 min)
- [ ] Set up email templates
- [ ] Configure SMS (if applicable)
- [ ] Create your first campaign

**Step 4: Goals & KPIs** (5 min)
- [ ] Set monthly revenue target
- [ ] Define key metrics to track

---

**Quick Win:** Connect your POS first – it unlocks 80% of my capabilities.

[Connect POS Now] [See Full Guide] [Schedule Setup Call]

*I'll be here every step of the way!*`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    // --- New Brand Setup ---
    {
        id: 'onboard-002',
        role: 'brand',
        category: 'onboarding',
        prompt: "How do I get started?",
        expectedBehavior: 'Brand-specific onboarding',
        idealResponsePattern: `🎉 **Welcome, Brand Partner!**

Here's your quick-start guide:

**Step 1: Your Catalog** (15 min)
- [ ] Upload your product catalog
- [ ] Add wholesale pricing
- [ ] Set MSRP and MAP

**Step 2: Distribution** (10 min)
- [ ] Import retailer list
- [ ] Connect LeafLink (optional)
- [ ] Map current distribution

**Step 3: Competitive Intel** (5 min)
- [ ] Add competing brands
- [ ] Set price alerts

**Step 4: Marketing Assets** (10 min)
- [ ] Upload brand assets
- [ ] Create email templates
- [ ] Set up retailer communications

---

**Your Dashboard Unlocks:**
✅ Distribution heatmaps
✅ Retail sell-through tracking
✅ Competitive pricing alerts
✅ Market share trends

[Upload Catalog] [Connect LeafLink] [Add Competitors]

*Most brands are fully set up in under an hour!*`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    // --- Feature Discovery ---
    {
        id: 'onboard-003',
        role: 'dispensary',
        category: 'feature_discovery',
        prompt: "What else can you do?",
        context: 'User has been using basic features only',
        expectedBehavior: 'Introduce advanced features',
        idealResponsePattern: `🚀 **Features You Haven't Tried Yet:**

Based on your usage, here are capabilities you might love:

**📊 Analytics (Pops)**
You're tracking sales, but have you tried:
- Customer lifetime value analysis
- Basket size optimization
- Revenue forecasting

**🔍 Competitive Intel (Ezal)**
- Real-time price monitoring
- Competitor promotion alerts
- Market gap analysis

**📣 Campaigns (Craig)**
- Video ad generation
- SMS blasts
- Win-back automations

**🤝 Customer Management (Mrs. Parker)**
- Churn prediction
- Segment analysis
- VIP identification

**🛡️ Compliance (Deebo)**
- Content auditing
- Packaging review
- Regulatory alerts

---

**Try saying:**
• "Compare my prices to Sunnyside"
• "Show me customers at risk of churning"
• "Create a video ad for our new product"

Which area interests you?`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
];

// =============================================================================
// PROACTIVE SUGGESTIONS (Agent-Initiated)
// =============================================================================

export const PROACTIVE_PROMPTS: PromptScenario[] = [
    // --- Proactive Alert: Low Stock ---
    {
        id: 'proactive-001',
        role: 'dispensary',
        category: 'proactive_alert',
        prompt: '[SYSTEM] Low stock detected',
        context: 'Agent detects critical inventory',
        expectedBehavior: 'Proactively alert user',
        idealResponsePattern: `⚠️ **Inventory Alert: Critical Stock Levels**

I noticed some products need attention:

**Out Tomorrow (< 1 day supply):**
| Product | Stock | Daily Velocity |
|---------|-------|----------------|
| Cresco Rise 3.5g | 4 | 6/day |
| Mindy's Gummies | 2 | 4/day |

**Running Low (< 3 days):**
| Product | Stock | Daily Velocity |
|---------|-------|----------------|
| Select Elite Cart | 12 | 5/day |
| Verano Reserve | 8 | 3/day |

**Recommended Action:**
Place a purchase order today to avoid stockouts.

[Draft Purchase Order] [View All Low Stock] [Snooze 24h]

*I'll keep monitoring and alert you again if needed.*`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    // --- Proactive Alert: Competitor Activity ---
    {
        id: 'proactive-002',
        role: 'dispensary',
        category: 'proactive_alert',
        prompt: '[SYSTEM] Competitor price change detected',
        context: 'Agent detected competitor slashing prices',
        expectedBehavior: 'Alert with response options',
        idealResponsePattern: `🔔 **Competitor Alert: Sunnyside Price Drop**

Just detected:
• **Sunnyside** dropped flower prices by 15% this morning
• Affecting their top 10 SKUs
• Sale runs through Sunday

**Potential Impact:**
- Estimated -10% on your weekend flower sales
- ~$800-1,200 revenue at risk

**Quick Response Options:**

1. **Match Prices** (Most aggressive)
   Impact: -8% margin, maintain volume

2. **Targeted Counter** (Balanced)
   Match only your overlapping products
   Impact: -4% margin

3. **Value Bundle** (Margin-friendly)
   "Buy flower, get 20% off accessory"
   Impact: -2% margin, drives basket

4. **Ignore** 
   Risk losing some weekend traffic

[Match Prices] [Targeted Counter] [Create Bundle] [Dismiss]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Proactive: Opportunity Detected ---
    {
        id: 'proactive-003',
        role: 'brand',
        category: 'proactive_opportunity',
        prompt: '[SYSTEM] New distribution opportunity',
        context: 'Agent found untapped retail partner',
        expectedBehavior: 'Present opportunity',
        idealResponsePattern: `💡 **Opportunity Detected: New Retail Partner**

I found a high-potential retailer not carrying your products:

**🏪 Zen Leaf - Schaumburg**
• Monthly revenue: ~$450K (estimated)
• Currently carrying: Cresco, GTI, Verano
• **Not carrying:** Your brand

**Why this matters:**
- High-traffic suburban location
- Demographic matches your customer base
- No direct competitor conflict

**Fit Score:** 89% match

**Suggested Approach:**
1. Intro package: Top 5 SKUs
2. Offer first-order discount (15%)
3. Provide co-marketing support

**Contact:**
• Buyer: Jennifer Martinez
• Email: jmartinez@zenleaf.com

[Draft Intro Email] [Add to Pipeline] [Find More Like This]

*This opportunity was discovered during my daily market scan.*`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Proactive: Revenue Milestone ---
    {
        id: 'proactive-004',
        role: 'dispensary',
        category: 'proactive_celebration',
        prompt: '[SYSTEM] Revenue milestone reached',
        context: 'User hit a significant target',
        expectedBehavior: 'Celebrate and set next goal',
        idealResponsePattern: `🎉 **Milestone Achieved!**

**You just crossed $50,000 in weekly revenue!**

📊 This Week: $51,240
📈 vs Last Week: +12%
🏆 Your best week ever!

**What drove this:**
• 420 prep shopping started early
• Your email campaign drove 23% of sales
• Flower category up 18%

**Team Shoutout:**
Consider recognizing your staff this week!

**Next Milestone:**
$60,000/week → 17% growth needed

**Strategies to hit $60K:**
• Extend successful email campaign
• Launch customer referral program
• Add Thursday happy hour

[Set New Goal] [Share With Team] [View Detailed Stats]

*Celebrating wins matters. Great work!* 🎊`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// SEASONAL & PROMOTIONAL PROMPTS
// =============================================================================

export const SEASONAL_PROMPTS: PromptScenario[] = [
    // --- 420 Campaign ---
    {
        id: 'season-001',
        role: 'dispensary',
        category: 'seasonal',
        prompt: 'Help me prepare for 420',
        expectedBehavior: 'Comprehensive 420 prep guide',
        idealResponsePattern: `🌿 **420 Preparation Guide**

**Timeline: 30 Days Out**

**Week 1 (Now): Inventory**
- [ ] Review last year's 420 sales
- [ ] Order extra stock (flower +50%, edibles +40%)
- [ ] Secure exclusive products
- [ ] Confirm vendor allocations

**Week 2: Marketing**
- [ ] Design promotional materials
- [ ] Schedule email sequence
- [ ] Plan social media content
- [ ] Prepare in-store signage

**Week 3: Operations**
- [ ] Schedule extra staff
- [ ] Train on promotions
- [ ] Test POS discount codes
- [ ] Prepare bundled deals

**Week 4: Launch**
- [ ] Begin email teasers (Apr 15)
- [ ] Social media countdown
- [ ] Influencer outreach
- [ ] Final inventory check

**Recommended Promotions:**
• 42% off select items (limited)
• 4.20 deals ($4.20 pre-rolls)
• Bundle discounts
• Loyalty point multipliers

**I can help with:**
• Drafting all email/SMS content
• Creating visual assets
• Setting up promo codes
• Forecasting demand

[Start Week 1 Tasks] [Generate 420 Content] [View Full Playbook]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Holiday Prep ---
    {
        id: 'season-002',
        role: 'brand',
        category: 'seasonal',
        prompt: 'What should we do for the holidays?',
        expectedBehavior: 'Holiday marketing and sales strategy',
        idealResponsePattern: `🎄 **Holiday Strategy Guide**

**Key Cannabis Holiday Dates:**

| Holiday | Date | Opportunity |
|---------|------|-------------|
| Green Wednesday | Nov 27 | Pre-Thanksgiving |
| Black Friday | Nov 29 | Deals & gifts |
| Cyber Monday | Dec 2 | Online focus |
| Christmas | Dec 25 | Gift sets |
| New Year's Eve | Dec 31 | Party products |

---

**Product Strategies:**

**Gift Sets** 🎁
• Curated strain collections
• Accessory bundles
• Premium packaging
• Price point: $50-150

**Party Packs** 🎉
• Pre-roll multi-packs
• Edible variety packs
• Shareable formats

---

**Retail Execution:**
1. Create holiday sell sheets for retailers
2. Offer holiday-themed packaging
3. Provide co-marketing funds
4. Set volume incentives

**Content Calendar:**
• Nov 15: Announce holiday products
• Nov 22: Gift guide email
• Dec 1: Stock reminders
• Dec 15: Last-minute gift push

[Build Gift Set Proposal] [Draft Retailer Email] [Create Content Calendar]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
    // --- Summer Strategy ---
    {
        id: 'season-003',
        role: 'dispensary',
        category: 'seasonal',
        prompt: "What should I focus on this summer?",
        expectedBehavior: 'Summer sales strategy',
        idealResponsePattern: `☀️ **Summer Strategy Guide**

**Seasonal Trends:**

**What Sells More:**
• 🥤 Beverages (+45% May-Aug)
• 🍬 Low-dose edibles (+30%)
• 💨 Sativa strains (+25%)
• 🌿 Outdoor/discreet products (+20%)

**What Slows Down:**
• ⬇️ Heavy indicas (-15%)
• ⬇️ High-dose products (-10%)

---

**Summer Campaigns:**

**Memorial Day** (Late May)
BBQ bundles, outdoor-friendly products

**July 4th**
Patriotic packaging, party packs

**Labor Day** (Early Sept)
End-of-summer blowout

---

**Operational Tips:**
• Stock more beverages now
• Feature sativas prominently
• Create "beach day" bundles
• Extend hours for longer days

**Content Ideas:**
• "Best strains for outdoor activities"
• "Festival survival guide"
• "Summer cocktail recipes with THC"

[Adjust Inventory Orders] [Create Summer Campaign] [Update Featured Products]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_CONTEXTUAL_PROMPTS: PromptScenario[] = [
    ...ONBOARDING_PROMPTS,
    ...PROACTIVE_PROMPTS,
    ...SEASONAL_PROMPTS,
];

export const CONTEXTUAL_PROMPT_STATS = {
    total: ALL_CONTEXTUAL_PROMPTS.length,
    byCategory: {
        onboarding: ONBOARDING_PROMPTS.length,
        proactive: PROACTIVE_PROMPTS.length,
        seasonal: SEASONAL_PROMPTS.length,
    }
};

console.log('Contextual Prompt Stats:', CONTEXTUAL_PROMPT_STATS);
