/**
 * Domain-Specific and Integration Prompts
 * 
 * Covers:
 * - Dutchie/POS specific prompts
 * - LeafLink wholesale prompts
 * - CRM/Loyalty platform prompts
 * - Stripe/Billing prompts
 * - Marketing platform prompts
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// POS INTEGRATION PROMPTS (Dutchie, Flowhub)
// =============================================================================

export const POS_PROMPTS: PromptScenario[] = [
    {
        id: 'pos-001',
        role: 'dispensary',
        category: 'pos_dutchie',
        prompt: 'Sync my Dutchie menu',
        context: 'Dutchie connected',
        expectedBehavior: 'Trigger menu sync and report status',
        idealResponsePattern: `🔄 **Dutchie Menu Sync**

**Starting sync...**

| Step | Status |
|------|--------|
| Connect to Dutchie | ✅ Connected |
| Fetch categories | ✅ 8 categories |
| Fetch products | ✅ 342 products |
| Update local menu | ✅ Complete |

**Sync Summary:**
• Products synced: 342
• New products: 12
• Updated prices: 23
• Removed (out of stock): 5

**Changes Detected:**
| Product | Change | Old | New |
|---------|--------|-----|-----|
| Cresco Rise 3.5g | Price | $50 | $48 |
| Mindy's Gummies | Stock | In | Out |
| New SKU | Added | — | Active |

Last sync: Just now
Next auto-sync: 1 hour

[View Full Menu] [Force Re-sync]`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    {
        id: 'pos-002',
        role: 'dispensary',
        category: 'pos_dutchie',
        prompt: 'Show me open Dutchie orders',
        context: 'Dutchie connected',
        expectedBehavior: 'Display pending orders',
        idealResponsePattern: `📦 **Open Dutchie Orders**

**Pending Pickup:** 8 orders
**Pending Delivery:** 3 orders

---

**🚗 Ready for Pickup (oldest first):**
| Order # | Customer | Items | Total | Wait Time |
|---------|----------|-------|-------|-----------|
| #4521 | John D. | 3 | $127 | 45 min ⚠️ |
| #4522 | Sarah M. | 2 | $85 | 32 min |
| #4523 | Mike R. | 5 | $203 | 28 min |

**🏠 Delivery Queue:**
| Order # | Address | Items | ETA |
|---------|---------|-------|-----|
| #4518 | 123 Main St | 4 | 2:30 PM |
| #4519 | 456 Oak Ave | 2 | 3:00 PM |
| #4520 | 789 Elm Rd | 1 | 3:15 PM |

**⚠️ Alert:** Order #4521 waiting 45+ minutes

[Mark Order Complete] [View All Orders] [Send Wait Time SMS]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// LEAFLINK WHOLESALE PROMPTS
// =============================================================================

export const LEAFLINK_PROMPTS: PromptScenario[] = [
    {
        id: 'leaflink-001',
        role: 'brand',
        category: 'leaflink',
        prompt: 'Show me my LeafLink orders this week',
        context: 'LeafLink connected',
        expectedBehavior: 'Display wholesale orders',
        idealResponsePattern: `📦 **LeafLink Orders (This Week)**

**Summary:**
• Total orders: 12
• Revenue: $45,680
• Unique retailers: 8

---

**Recent Orders:**
| Date | Retailer | Products | Total | Status |
|------|----------|----------|-------|--------|
| Today | Sunnyside | 5 SKUs | $8,500 | 🟢 Confirmed |
| Today | Zen Leaf | 3 SKUs | $4,200 | 🟡 Pending |
| Yesterday | Dispensary33 | 8 SKUs | $12,400 | 📦 Shipped |
| Jan 1 | EarthMed | 4 SKUs | $6,800 | ✅ Delivered |

**Top Products Ordered:**
1. Purple Punch 3.5g - 120 units
2. Gummies 10pk - 85 units
3. Vape Cart 1g - 60 units

**Retailers to Follow Up:**
• Zen Leaf - Order pending 2 days

[View All Orders] [Create Invoice] [Follow Up with Zen Leaf]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    {
        id: 'leaflink-002',
        role: 'brand',
        category: 'leaflink',
        prompt: 'Create a LeafLink order for Sunnyside',
        context: 'LeafLink connected',
        expectedBehavior: 'Start order creation workflow',
        idealResponsePattern: `📝 **New LeafLink Order: Sunnyside**

**Retailer:** Sunnyside - Chicago
**Payment Terms:** Net 30
**Shipping:** Standard (2-3 days)

---

**Add Products:**

| Product | Unit Price | Min Order | Available |
|---------|------------|-----------|-----------|
| Purple Punch 3.5g | $32 | 24 units | 500 |
| Cresco Rise 3.5g | $30 | 24 units | 350 |
| Gummies 10pk | $15 | 48 units | 800 |
| Vape Cart 1g | $25 | 24 units | 200 |

**Their Last Order (for reference):**
• Purple Punch 3.5g - 48 units
• Gummies - 96 units

**Quick Reorder:** [Copy Last Order]

---

**Order Draft:**
| Product | Qty | Total |
|---------|-----|-------|
| (Add products above) | | |

[Add Product] [Apply Discount] [Submit Order]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// CRM/LOYALTY PLATFORM PROMPTS
// =============================================================================

export const CRM_PROMPTS: PromptScenario[] = [
    {
        id: 'crm-001',
        role: 'dispensary',
        category: 'springbig',
        prompt: 'Sync my SpringBig customers',
        context: 'SpringBig connected',
        expectedBehavior: 'Trigger CRM sync',
        idealResponsePattern: `🔄 **SpringBig Customer Sync**

**Syncing...**

| Step | Status |
|------|--------|
| Connect to SpringBig | ✅ Connected |
| Fetch customer list | ✅ 2,450 customers |
| Fetch loyalty data | ✅ Points synced |
| Update segments | ✅ Complete |

**Sync Summary:**
• Total customers: 2,450
• New since last sync: 23
• Updated records: 156
• Loyalty points synced: ✅

**Segment Updates:**
| Segment | Count | Change |
|---------|-------|--------|
| Active | 1,890 | +45 |
| At-Risk | 340 | -12 |
| Churned | 220 | +8 |

[View Customer List] [Run Segmentation Analysis]`,
        shouldAskClarification: false,
        targetAgent: 'mrs_parker'
    },
    {
        id: 'crm-002',
        role: 'dispensary',
        category: 'alpineiq',
        prompt: 'Show me my AlpineIQ campaigns',
        context: 'AlpineIQ connected',
        expectedBehavior: 'Display campaign performance',
        idealResponsePattern: `📊 **AlpineIQ Campaign Performance**

**Active Campaigns:**
| Campaign | Type | Recipients | Status |
|----------|------|------------|--------|
| Happy Hour | SMS | 1,200 | 🟢 Running |
| Win-Back | Email | 340 | 🟢 Running |
| New Arrivals | SMS | 2,100 | 🟡 Scheduled |

---

**Recent Performance:**
| Campaign | Sent | Opens | Clicks | Revenue |
|----------|------|-------|--------|---------|
| 420 Promo | 2,340 | 28% | 4.2% | $8,450 |
| Flash Sale | 1,850 | 24% | 3.8% | $4,200 |
| Weekend Deals | 2,100 | 22% | 3.1% | $6,780 |

**Top Performer:** 420 Promo ($3.61 per recipient)

**Optimization Suggestions:**
• Send times: Thu 4pm performs best
• Subject lines with emojis: +15% opens
• Personalization: +22% clicks

[Create Campaign] [View All Analytics]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
];

// =============================================================================
// BILLING/STRIPE PROMPTS
// =============================================================================

export const BILLING_PROMPTS: PromptScenario[] = [
    {
        id: 'billing-001',
        role: 'super_admin',
        category: 'stripe',
        prompt: 'Show me subscription revenue breakdown',
        context: 'Stripe connected',
        expectedBehavior: 'Display MRR by plan',
        idealResponsePattern: `💰 **Subscription Revenue (Stripe)**

**Current MRR:** $47,250

**By Plan:**
| Plan | Price | Subs | MRR | % |
|------|-------|------|-----|---|
| Claim Pro | $99 | 84 | $8,316 | 18% |
| Growth | $299 | 35 | $10,465 | 22% |
| Scale | $999 | 8 | $7,992 | 17% |
| Enterprise | Custom | 5 | $20,477 | 43% |

**Trends:**
• MoM Growth: +8.2%
• Net New MRR: +$3,580
• Churned MRR: -$890
• Expansion MRR: +$1,240

**Upcoming Renewals (7 days):**
| Customer | Plan | Amount | Date |
|----------|------|--------|------|
| GreenLeaf | Growth | $299 | Jan 5 |
| SunnyDaze | Scale | $999 | Jan 7 |
| BudCo | Claim Pro | $99 | Jan 8 |

[View All Subscriptions] [Manage Plans]`,
        shouldAskClarification: false,
        targetAgent: 'money_mike'
    },
    {
        id: 'billing-002',
        role: 'dispensary',
        category: 'billing',
        prompt: "What's my current plan?",
        expectedBehavior: 'Display plan details and usage',
        idealResponsePattern: `📋 **Your Subscription**

**Current Plan:** Growth ($299/mo)
**Billing Cycle:** Monthly
**Next Payment:** $299 on Jan 15, 2026

---

**Plan Includes:**
| Feature | Limit | Used | Remaining |
|---------|-------|------|-----------|
| AI Messages | 10,000 | 6,234 | 3,766 |
| Email Sends | 5,000 | 2,340 | 2,660 |
| SMS Credits | 500 | 289 | 211 |
| Competitor Scans | 20 | 15 | 5 |
| Team Members | 5 | 3 | 2 |

**Add-Ons:**
• Extra SMS: $0.02/msg
• Priority Support: Included

**Upgrade Available:**
Scale plan ($999/mo) includes:
• Unlimited AI messages
• 50,000 email sends
• 2,000 SMS credits
• Dedicated success manager

[View Invoice History] [Upgrade Plan] [Manage Payment]`,
        shouldAskClarification: false,
        targetAgent: 'money_mike'
    },
];

// =============================================================================
// GOOGLE WORKSPACE PROMPTS
// =============================================================================

export const WORKSPACE_PROMPTS: PromptScenario[] = [
    {
        id: 'workspace-001',
        role: 'super_admin',
        category: 'google_sheets',
        prompt: 'Create a spreadsheet with this month revenue data',
        context: 'Drive connected',
        expectedBehavior: 'Create and populate spreadsheet',
        idealResponsePattern: `📊 **Creating Revenue Spreadsheet...**

**File:** January 2026 Revenue Report
**Location:** My Drive / BakedBot Reports

✅ **Spreadsheet Created!**

**Tabs Added:**
1. Summary - High-level metrics
2. Daily Revenue - Day-by-day breakdown
3. By Category - Revenue by product type
4. By Customer - Top customers
5. Trends - Charts and visualizations

**Preview:**
| Metric | Value |
|--------|-------|
| Total Revenue | $187,500 |
| Transactions | 1,845 |
| Avg Order | $101.63 |
| Growth MoM | +8.2% |

**Charts Included:**
📈 Daily revenue trend
📊 Category pie chart
📉 YoY comparison

[Open Spreadsheet](https://docs.google.com/spreadsheets/d/xxx)

[Share With Team] [Schedule Monthly Report]`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },
    {
        id: 'workspace-002',
        role: 'dispensary',
        category: 'google_docs',
        prompt: 'Create an SOP document for new budtenders',
        context: 'Drive connected',
        expectedBehavior: 'Generate SOP document',
        idealResponsePattern: `📄 **Creating SOP Document...**

**File:** Budtender Training SOP
**Location:** My Drive / SOPs

✅ **Document Created!**

**Sections Generated:**

1. **Welcome & Overview**
   - Company culture
   - Role expectations

2. **Compliance & Legal**
   - ID verification process
   - Purchase limits
   - Restricted sales

3. **Customer Service**
   - Greeting script
   - Product recommendations
   - Handling complaints

4. **POS Operations**
   - Check-in process
   - Payment handling
   - Discount application

5. **Product Knowledge**
   - Categories overview
   - Effects & terpenes
   - Customer education

6. **Closing Procedures**
   - Cash handling
   - Inventory count
   - Security checklist

[Open Document](https://docs.google.com/document/d/xxx)

[Add Your Policies] [Share With Staff]`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_DOMAIN_PROMPTS: PromptScenario[] = [
    ...POS_PROMPTS,
    ...LEAFLINK_PROMPTS,
    ...CRM_PROMPTS,
    ...BILLING_PROMPTS,
    ...WORKSPACE_PROMPTS,
];

export const DOMAIN_PROMPT_STATS = {
    total: ALL_DOMAIN_PROMPTS.length,
    byCategory: {
        pos: POS_PROMPTS.length,
        leaflink: LEAFLINK_PROMPTS.length,
        crm: CRM_PROMPTS.length,
        billing: BILLING_PROMPTS.length,
        workspace: WORKSPACE_PROMPTS.length,
    }
};

console.log('Domain Integration Prompt Stats:', DOMAIN_PROMPT_STATS);
