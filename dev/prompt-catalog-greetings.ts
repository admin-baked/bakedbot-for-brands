/**
 * Role-Specific Greeting and Onboarding Prompts
 * 
 * Optimized first-interaction prompts for each user role.
 * These define how BakedBot should greet and guide new users.
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// GUEST GREETINGS (Homepage visitors)
// =============================================================================

export const GUEST_GREETINGS: PromptScenario[] = [
    {
        id: 'greet-guest-001',
        role: 'guest',
        category: 'greeting',
        prompt: 'Hi',
        expectedBehavior: 'Warm welcome with quick action options',
        idealResponsePattern: `👋 **Welcome to BakedBot AI!**

I'm your cannabis discovery assistant. I can help you:

🏪 **Find Dispensaries** — Locate stores near you
🌿 **Get Recommendations** — Match products to your needs
📚 **Learn** — Cannabis education & terpene guides
💰 **Find Deals** — Current promotions

**What would you like to explore today?**`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    {
        id: 'greet-guest-002',
        role: 'guest',
        category: 'greeting',
        prompt: 'Hello',
        expectedBehavior: 'Same warm welcome',
        idealResponsePattern: `👋 **Hello! Welcome to BakedBot AI.**

I'm here to help you discover cannabis products and find dispensaries.

**Quick Actions:**
• 🏪 "Find dispensaries in [City]"
• 🌿 "What's good for relaxation?"
• 📚 "Explain indica vs sativa"

How can I assist you today?`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    {
        id: 'greet-guest-003',
        role: 'guest',
        category: 'greeting',
        prompt: 'What can you do?',
        expectedBehavior: 'Explain capabilities with examples',
        idealResponsePattern: `🤖 **BakedBot AI Capabilities:**

**For Consumers:**
• 🏪 Find dispensaries near any location
• 🌿 Get personalized product recommendations
• 📚 Cannabis education (strains, effects, terpenes)
• 💰 Discover current deals and promotions

**For Businesses (with account):**
• 📊 Competitive intelligence
• 📣 Marketing campaign creation
• 📈 Analytics and insights
• 🤝 Customer retention tools

**Try asking:**
• "Find dispensaries in Chicago"
• "What strain helps with sleep?"
• "Show me edibles under $30"`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
];

// =============================================================================
// CUSTOMER GREETINGS (Logged-in consumers)
// =============================================================================

export const CUSTOMER_GREETINGS: PromptScenario[] = [
    {
        id: 'greet-cust-001',
        role: 'customer',
        category: 'greeting',
        prompt: 'Hi',
        context: 'Logged-in customer with purchase history',
        expectedBehavior: 'Personalized greeting with loyalty info',
        idealResponsePattern: `👋 **Welcome back, [Name]!**

🎯 **Your Stats:**
• Loyalty Points: 450 pts
• Member Since: March 2025
• Favorite Category: Flower

**Quick Actions:**
• 🔄 "Reorder my last purchase"
• 🌿 "What's new since my last visit?"
• 💰 "Show me deals on my favorites"

What would you like today?`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    {
        id: 'greet-cust-002',
        role: 'customer',
        category: 'personalization',
        prompt: 'What should I try next?',
        context: 'Customer with purchase history',
        expectedBehavior: 'Personalized recommendations based on history',
        idealResponsePattern: `🎯 **Personalized Picks for You:**

Based on your love of indica flower, you might enjoy:

1. 💜 **Granddaddy Purple** (Indica)
   Similar to your last purchase | 94% match
   $45/3.5g | In stock ✅

2. 🍇 **Purple Punch** (Indica)
   Popular with similar customers | 91% match
   $48/3.5g | In stock ✅

3. 🌙 **Ice Cream Cake** (Indica)
   Trending this week | 87% match
   $50/3.5g | In stock ✅

Would you like more details on any of these?`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// DISPENSARY GREETINGS (Dispensary operators)
// =============================================================================

export const DISPENSARY_GREETINGS: PromptScenario[] = [
    {
        id: 'greet-disp-001',
        role: 'dispensary',
        category: 'greeting',
        prompt: 'Hi',
        context: 'Dispensary manager logging in',
        expectedBehavior: 'Business-focused greeting with KPIs',
        idealResponsePattern: `👋 **Good afternoon, [Dispensary Name] team!**

📊 **Today's Snapshot:**
• Revenue (today): $4,250
• Orders: 47 (+12% vs yesterday)
• Avg Ticket: $90.43

🚨 **Alerts:**
• 3 products low on stock
• Win-back campaign ready to send

**Quick Actions:**
• 📈 "Show me today's sales"
• 🔍 "Compare prices to Sunnyside"
• 📣 "Send the win-back campaign"

How can I help grow your business today?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    {
        id: 'greet-disp-002',
        role: 'dispensary',
        category: 'morning_briefing',
        prompt: 'Good morning',
        context: 'Start of day',
        expectedBehavior: 'Morning briefing with actionable items',
        idealResponsePattern: `☀️ **Good Morning! Here's Your Daily Briefing:**

**📊 Yesterday's Performance:**
• Revenue: $8,450 (+5% vs avg)
• Top Seller: Cresco Rise 3.5g (23 units)
• Customer Rating: 4.7⭐

**🎯 Today's Priorities:**
1. ⚠️ Restock Mindy's Gummies (2 left)
2. 📧 15 win-back emails queued
3. 💰 Competitor sale ending (opportunity)

**🔮 Forecast:**
• Expected foot traffic: Moderate
• Suggested promo: Happy Hour 4-7pm

Ready to dive in?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// BRAND GREETINGS (Cannabis brands)
// =============================================================================

export const BRAND_GREETINGS: PromptScenario[] = [
    {
        id: 'greet-brand-001',
        role: 'brand',
        category: 'greeting',
        prompt: 'Hi',
        context: 'Brand manager logging in',
        expectedBehavior: 'Wholesale-focused greeting with market data',
        idealResponsePattern: `👋 **Welcome back, [Brand Name] team!**

📊 **This Week's Performance:**
• Wholesale Revenue: $125,750
• Retail Sell-Through: 78%
• Active Retail Partners: 45

🚨 **Alerts:**
• 2 retailers running low on inventory
• Competitor launched new SKU in Chicago

**Quick Actions:**
• 📈 "Show me my market share"
• 🏪 "Which retailers need restocking?"
• 📣 "Create a trade promotion"

How can I help today?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// SUPER USER GREETINGS (Platform admins)
// =============================================================================

export const SUPER_USER_GREETINGS: PromptScenario[] = [
    {
        id: 'greet-super-001',
        role: 'super_admin',
        category: 'greeting',
        prompt: 'Hi',
        context: 'Platform admin logging in',
        expectedBehavior: 'Executive dashboard overview',
        idealResponsePattern: `👋 **Welcome, Martez!**

📊 **Platform Health:**
• All Systems: ✅ Operational
• MRR: $47,250 (47% to goal)
• Active Tenants: 172

🚨 **Action Items:**
• 3 new signup requests pending
• 5 accounts at churn risk
• Compliance audit due in 7 days

**Quick Actions:**
• 📈 "Show me MRR breakdown"
• 🏢 "List accounts at churn risk"
• 🛡️ "Run compliance audit"

What would you like to focus on?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    {
        id: 'greet-super-002',
        role: 'super_admin',
        category: 'executive_summary',
        prompt: "What's the status?",
        context: 'Checking platform health',
        expectedBehavior: 'Quick executive status',
        idealResponsePattern: `📋 **Platform Status (Quick View):**

**💰 Revenue:**
• MRR: $47,250 | Target: $100k
• MTD Growth: +8.2%
• Churn: 2.1%

**🏢 Tenants:**
• Total: 172 active
• New (7d): 5
• At Risk: 3

**⚙️ Systems:**
• Core: ✅ All healthy
• APIs: ✅ Normal latency
• Jobs: ✅ 0 failures

**🔥 Priorities:**
1. Follow up with at-risk accounts
2. Review Q1 marketing spend
3. Approve new compliance rules

Need details on anything?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// SPECIALIZED TASK PROMPTS BY ROLE
// =============================================================================

export const SPECIALIZED_PROMPTS: PromptScenario[] = [
    // --- Super User Deep Research ---
    {
        id: 'spec-super-001',
        role: 'super_admin',
        category: 'deep_research',
        prompt: 'Research the cannabis market in Michigan',
        expectedBehavior: 'Perform comprehensive web research',
        idealResponsePattern: `📚 **Michigan Cannabis Market Research**

**Market Overview:**
• 2025 Sales: $3.2B (+15% YoY)
• Adult-Use Launch: Dec 2019
• Active Licenses: 850+ dispensaries

**Regulatory Highlights:**
• MRA oversees licensing
• 10% excise tax + 6% sales tax
• Vertical integration limited

**Key Players:**
1. Gage Cannabis (market leader)
2. Lume Cannabis
3. Exclusive Brands

**Opportunities:**
• Detroit market underserved
• Social equity licenses expanding
• Delivery demand growing

**Sources:**
• [MRA Official](https://michigan.gov/mra)
• [MJBizDaily](https://mjbizdaily.com)
• [Headset Analytics](https://headset.io)

Want me to go deeper on any aspect?`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },

    // --- Dispensary Inventory Management ---
    {
        id: 'spec-disp-001',
        role: 'dispensary',
        category: 'inventory',
        prompt: 'What products are running low?',
        context: 'Connected to POS',
        expectedBehavior: 'Show low-stock alerts',
        idealResponsePattern: `⚠️ **Low Stock Alerts:**

**Critical (< 5 units):**
| Product | Stock | Velocity | Days Left |
|---------|-------|----------|-----------|
| Mindy's Gummies 10pk | 2 | 4/day | 0.5 |
| Cresco Rise 3.5g | 4 | 6/day | 0.7 |
| Select Elite Cart | 3 | 5/day | 0.6 |

**Low (< 10 units):**
| Product | Stock | Velocity | Days Left |
|---------|-------|----------|-----------|
| Verano Reserve | 8 | 3/day | 2.7 |
| Rev Clinicals | 9 | 2/day | 4.5 |

**Recommended Action:**
Place orders today for critical items.

Want me to draft a purchase order?`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },

    // --- Brand Distribution Expansion ---
    {
        id: 'spec-brand-001',
        role: 'brand',
        category: 'distribution',
        prompt: 'Find new retail partners in Chicago',
        expectedBehavior: 'Identify expansion opportunities',
        idealResponsePattern: `🏪 **Chicago Retail Expansion Opportunities:**

**Current Coverage:**
• You're in 28 of 45 Chicago dispensaries (62%)

**Top Prospects:**
1. **Zen Leaf - River North**
   No competing brand | High traffic
   Contact: buyer@zenleaf.com

2. **Consume Cannabis - Wicker Park**
   Looking for premium flower | Good margins
   Contact: purchasing@consume.co

3. **EarthMed - Addison**
   New location opening Q2 | Pre-launch orders
   Contact: newstores@earthmed.com

**Approach Strategy:**
• Lead with your top 3 SKUs
• Offer intro pricing (15% off first order)
• Highlight sell-through data

Want me to draft outreach emails?`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },

    // --- Customer Reorder ---
    {
        id: 'spec-cust-001',
        role: 'customer',
        category: 'reorder',
        prompt: 'Reorder my last purchase',
        context: 'Customer with order history',
        expectedBehavior: 'Quick reorder flow',
        idealResponsePattern: `🔄 **Reorder: Your Last Purchase**

**Previous Order (Jan 15, 2026):**
| Item | Qty | Price |
|------|-----|-------|
| Purple Punch 3.5g | 1 | $45 |
| Mindy's Gummies 10pk | 2 | $50 |
| **Total** | | **$95** |

**Current Availability:**
• Purple Punch: ✅ In stock
• Mindy's Gummies: ✅ In stock

**Confirm Reorder?**
You'll earn 95 loyalty points with this purchase.

[Confirm Order] [Modify Cart]`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// COMBINED GREETING STATS
// =============================================================================

export const ALL_GREETINGS = [
    ...GUEST_GREETINGS,
    ...CUSTOMER_GREETINGS,
    ...DISPENSARY_GREETINGS,
    ...BRAND_GREETINGS,
    ...SUPER_USER_GREETINGS,
    ...SPECIALIZED_PROMPTS,
];

export const GREETING_STATS = {
    total: ALL_GREETINGS.length,
    byRole: {
        guest: GUEST_GREETINGS.length,
        customer: CUSTOMER_GREETINGS.length,
        dispensary: DISPENSARY_GREETINGS.length,
        brand: BRAND_GREETINGS.length,
        super_admin: SUPER_USER_GREETINGS.length + SPECIALIZED_PROMPTS.filter(p => p.role === 'super_admin').length,
    },
};

console.log('Greeting/Onboarding Stats:', GREETING_STATS);
