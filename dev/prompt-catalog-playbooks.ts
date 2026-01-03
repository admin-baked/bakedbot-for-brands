/**
 * Playbook, Automation, and Recurring Workflow Prompts
 * 
 * Covers:
 * - Playbook creation and execution
 * - Scheduled/recurring task automation
 * - Workflow templates
 * - Batch operations
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// PLAYBOOK CREATION PROMPTS
// =============================================================================

export const PLAYBOOK_PROMPTS: PromptScenario[] = [
    // --- Create Playbook ---
    {
        id: 'playbook-001',
        role: 'dispensary',
        category: 'playbook_create',
        prompt: 'Create a weekly competitor monitoring playbook',
        expectedBehavior: 'Generate structured playbook',
        idealResponsePattern: `📋 **Creating Playbook: Weekly Competitor Monitor**

**Playbook Name:** Weekly Competitor Monitor
**Trigger:** Every Monday at 9:00 AM
**Owner:** You

---

**Steps:**

| # | Action | Agent | Auto/Manual |
|---|--------|-------|-------------|
| 1 | Scan competitor prices | Ezal | Auto ✅ |
| 2 | Check competitor promotions | Ezal | Auto ✅ |
| 3 | Compare to your pricing | Pops | Auto ✅ |
| 4 | Identify gaps/opportunities | Pops | Auto ✅ |
| 5 | Draft response strategy | Craig | Auto ✅ |
| 6 | Review & approve actions | You | Manual 👤 |
| 7 | Send summary email | Puff | Auto ✅ |

**Competitors to Monitor:**
- [ ] Sunnyside (add)
- [ ] Dispensary33 (add)
- [ ] Zen Leaf (add)

**Notifications:**
- Email summary after completion
- Slack alert if price gap > 15%

---

[Save Playbook] [Add Competitors] [Test Run Now]`,
        shouldAskClarification: false,
        targetAgent: 'leo'
    },
    // --- Execute Playbook ---
    {
        id: 'playbook-002',
        role: 'dispensary',
        category: 'playbook_execute',
        prompt: 'Run my 420 prep playbook',
        context: 'User has saved 420 prep playbook',
        expectedBehavior: 'Execute playbook steps',
        idealResponsePattern: `🎯 **Executing Playbook: 420 Prep**

**Status:** Running
**Started:** Just now

---

**Progress:**

| Step | Task | Status | Result |
|------|------|--------|--------|
| 1 | Check inventory levels | ✅ Done | 3 low items |
| 2 | Analyze last year's 420 sales | ✅ Done | +45% vs avg |
| 3 | Generate reorder list | ✅ Done | 12 SKUs |
| 4 | Draft promotional content | ⏳ Running | — |
| 5 | Create email sequence | ⏱️ Pending | — |
| 6 | Schedule social posts | ⏱️ Pending | — |
| 7 | Review all & approve | ⏱️ Pending | — |

**Step 4 Progress:**
> Craig is drafting 420 promotional content...
> Created: Email subject lines (3 options)
> Creating: Social media posts...

**ETA:** 2 minutes remaining

[Pause Playbook] [View Step Details]`,
        shouldAskClarification: false,
        targetAgent: 'leo'
    },
    // --- Playbook Templates ---
    {
        id: 'playbook-003',
        role: 'dispensary',
        category: 'playbook_templates',
        prompt: 'Show me available playbook templates',
        expectedBehavior: 'List playbook templates',
        idealResponsePattern: `📚 **Playbook Templates**

**Popular for Dispensaries:**

| Template | Description | Steps | Est. Time |
|----------|-------------|-------|-----------|
| 🔍 **Competitor Monitor** | Weekly price/promo scanning | 7 | 5 min |
| 📈 **Daily Health Check** | Revenue, inventory, alerts | 5 | 2 min |
| 🎯 **Win-Back Campaign** | Identify & re-engage churned | 6 | 10 min |
| 🛍️ **New Product Launch** | Menu update, marketing, alerts | 8 | 15 min |
| 📊 **Weekly Report** | Compile & send performance | 5 | 3 min |
| 🎉 **Holiday Prep** | Inventory, marketing, staffing | 10 | 20 min |

**Most Used by Similar Stores:**
1. Daily Health Check (89% adoption)
2. Competitor Monitor (76% adoption)
3. Weekly Report (72% adoption)

**Create Custom:**
You can also build your own playbook from scratch.

[Use Template] [Create Custom] [View All]`,
        shouldAskClarification: false,
        targetAgent: 'leo'
    },
];

// =============================================================================
// SCHEDULED AUTOMATION PROMPTS
// =============================================================================

export const AUTOMATION_PROMPTS: PromptScenario[] = [
    // --- Schedule Task ---
    {
        id: 'auto-001',
        role: 'dispensary',
        category: 'schedule',
        prompt: 'Send me a sales report every morning at 8am',
        expectedBehavior: 'Create scheduled automation',
        idealResponsePattern: `⏰ **Scheduled Automation Created**

**Task:** Daily Sales Report
**Trigger:** Every day at 8:00 AM
**Delivery:** Email to you@store.com

---

**What You'll Receive:**

📊 **Daily Sales Summary**
• Yesterday's revenue vs target
• Top 5 products
• Inventory alerts
• Comparison to prior day

📈 **Trend Indicators**
• Week-over-week change
• Month-to-date progress
• Goal tracking

**First Report:** Tomorrow at 8:00 AM

**Manage Schedule:**
- [x] Monday-Sunday (daily)
- [ ] Weekdays only
- [ ] Weekly (Monday)

[Confirm] [Edit Schedule] [Add More Metrics]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Recurring Campaign ---
    {
        id: 'auto-002',
        role: 'dispensary',
        category: 'recurring_campaign',
        prompt: 'Set up a weekly happy hour reminder SMS',
        expectedBehavior: 'Create recurring SMS campaign',
        idealResponsePattern: `📱 **Recurring SMS Automation**

**Campaign:** Happy Hour Reminder
**Type:** Recurring SMS
**Audience:** All opted-in customers (1,850)

---

**Schedule:**
• Day: Every Thursday
• Time: 3:00 PM (1 hour before Happy Hour)

**Message:**
> "🍃 Happy Hour starts in 1 hour! 20% off all flower 4-7pm today. See you soon! Reply STOP to opt out."

**Preview:**
| Week | Send Date | Recipients |
|------|-----------|------------|
| 1 | Thu, Jan 9 | ~1,850 |
| 2 | Thu, Jan 16 | ~1,850 |
| 3 | Thu, Jan 23 | ~1,850 |

**Estimated Cost:** $18.50/week

[Activate Automation] [Edit Message] [Change Schedule]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
    // --- Trigger-Based Automation ---
    {
        id: 'auto-003',
        role: 'dispensary',
        category: 'trigger_automation',
        prompt: 'Alert me when any product stock drops below 10 units',
        expectedBehavior: 'Create inventory trigger',
        idealResponsePattern: `🔔 **Inventory Alert Automation**

**Trigger:** Product stock < 10 units
**Action:** Send alert
**Channels:** Email + In-app notification

---

**Alert Details:**

When triggered, you'll receive:
• Product name and current stock
• Daily sell-through rate
• Days until stockout
• Quick reorder link

**Exclusions:**
- [ ] Exclude discontinued items
- [ ] Exclude seasonal items
- [ ] Minimum $10 value only

**Alert Frequency:**
- [x] Once per product per day
- [ ] Every time stock changes
- [ ] Batch alerts (end of day)

**Current Products Near Threshold:**
| Product | Stock | Velocity | Days Left |
|---------|-------|----------|-----------|
| Select Cart 1g | 8 | 5/day | 1.6 |
| Cresco Rise | 12 | 6/day | 2.0 |

[Activate Alert] [Adjust Threshold] [Test Alert]`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// BATCH OPERATION PROMPTS
// =============================================================================

export const BATCH_PROMPTS: PromptScenario[] = [
    // --- Batch Price Update ---
    {
        id: 'batch-001',
        role: 'dispensary',
        category: 'batch_operation',
        prompt: 'Drop all flower prices by 10%',
        expectedBehavior: 'Confirm and execute batch update',
        idealResponsePattern: `🔧 **Batch Price Update**

**Operation:** Reduce flower prices by 10%
**Products Affected:** 45 SKUs

---

**Preview:**

| Product | Current | New | Change |
|---------|---------|-----|--------|
| Purple Punch 3.5g | $50 | $45 | -$5 |
| Cresco Rise 3.5g | $52 | $46.80 | -$5.20 |
| GTI Rhythm 3.5g | $55 | $49.50 | -$5.50 |
| ... | ... | ... | ... |
| *45 total products* | | | |

**Impact Analysis:**
• Average price drop: -$4.85
• Estimated margin impact: -3.2%
• Competitive position: Now 2% below market avg

**⚠️ Warning:**
This will update prices across all connected channels (POS, online menu).

[Apply All Changes] [Review Full List] [Cancel]`,
        shouldAskClarification: false,
        targetAgent: 'money_mike'
    },
    // --- Batch Email ---
    {
        id: 'batch-002',
        role: 'brand',
        category: 'batch_operation',
        prompt: 'Send a restock reminder to all retailers with low inventory',
        expectedBehavior: 'Identify recipients and send batch email',
        idealResponsePattern: `📧 **Batch Email: Restock Reminder**

**Identified Retailers:** 8 with low inventory

---

**Recipients:**

| Retailer | Your Stock | Velocity | Days Left |
|----------|------------|----------|-----------|
| Green Gate | 12 units | 4/day | 3 |
| Nature's Care | 15 units | 5/day | 3 |
| Zen Leaf | 18 units | 6/day | 3 |
| EarthMed | 20 units | 7/day | 2.9 |
| Dispensary33 | 22 units | 8/day | 2.8 |
| ... | ... | ... | ... |

**Email Template:**
> Subject: Time to Restock [Your Brand]?
>
> Hi [Contact Name],
>
> Our records show you're running low on [Brand] products. Reorder now to avoid selling out!
>
> Quick reorder: [LeafLink Link]
>
> Thanks,
> [Your Brand] Team

[Send to All 8] [Customize Message] [Preview Individual]`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
];

// =============================================================================
// WORKFLOW TEMPLATE PROMPTS
// =============================================================================

export const WORKFLOW_PROMPTS: PromptScenario[] = [
    // --- New Hire Onboarding ---
    {
        id: 'workflow-001',
        role: 'dispensary',
        category: 'workflow',
        prompt: 'Create a new hire onboarding workflow',
        expectedBehavior: 'Generate onboarding checklist',
        idealResponsePattern: `📋 **Workflow: New Hire Onboarding**

**Duration:** 5 days
**Owner:** Store Manager

---

**Day 1: Orientation**
- [ ] Complete paperwork (HR)
- [ ] Company overview presentation
- [ ] Tour of facility
- [ ] Meet the team
- [ ] Set up POS login

**Day 2: Compliance Training**
- [ ] State regulations overview
- [ ] ID verification training
- [ ] Purchase limits training
- [ ] Age verification scenarios
- [ ] Pass compliance quiz (80%+)

**Day 3: Product Knowledge**
- [ ] Category overview
- [ ] Effects and terpenes
- [ ] Top 20 products deep dive
- [ ] Practice recommendations
- [ ] Shadow experienced budtender

**Day 4: Systems & Processes**
- [ ] POS system training
- [ ] Inventory receiving
- [ ] Cash handling procedures
- [ ] Customer check-in flow
- [ ] Practice transactions

**Day 5: Supervised Selling**
- [ ] First customer interactions (supervised)
- [ ] Feedback sessions
- [ ] Q&A with manager
- [ ] Sign off on training checklist
- [ ] Set 30-day goals

[Start Workflow] [Assign to Employee] [Customize]`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_AUTOMATION_PROMPTS: PromptScenario[] = [
    ...PLAYBOOK_PROMPTS,
    ...AUTOMATION_PROMPTS,
    ...BATCH_PROMPTS,
    ...WORKFLOW_PROMPTS,
];

export const AUTOMATION_PROMPT_STATS = {
    total: ALL_AUTOMATION_PROMPTS.length,
    byCategory: {
        playbooks: PLAYBOOK_PROMPTS.length,
        automations: AUTOMATION_PROMPTS.length,
        batch: BATCH_PROMPTS.length,
        workflows: WORKFLOW_PROMPTS.length,
    }
};

console.log('Automation & Playbook Prompt Stats:', AUTOMATION_PROMPT_STATS);
