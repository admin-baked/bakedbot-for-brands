/**
 * Tasklet-Inspired Feature Prompts
 * 
 * Demonstrates the new features adopted from Tasklet.ai:
 * - Intelligence Level Selection
 * - Execution Transparency ("Worked for Xs")
 * - Discovery-First Configuration
 * - Natural Language Triggers
 * - Response Feedback
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// INTELLIGENCE LEVEL PROMPTS
// =============================================================================

export const INTELLIGENCE_LEVEL_PROMPTS: PromptScenario[] = [
    // --- Selecting Intelligence Level ---
    {
        id: 'intel-001',
        role: 'super_admin',
        category: 'intelligence_level',
        prompt: 'Analyze our entire customer database for churn patterns',
        context: 'Complex analysis requiring high intelligence',
        expectedBehavior: 'Recommend Expert or Genius level for complex analysis',
        idealResponsePattern: `🧠 **Intelligence Level Recommendation**

This analysis requires deep pattern recognition across a large dataset.

**Recommended Level:** Expert 🧠
• Model: Gemini 2.5 Pro
• Quota Cost: 5 credits
• Why: Complex multi-variable analysis needs higher reasoning

**Alternative Levels:**
| Level | Cost | Trade-off |
|-------|------|-----------|
| Advanced | 2x | May miss subtle patterns |
| Genius | 10x | Maximum accuracy, highest cost |

**Current Quota:** 45 credits remaining

[Use Expert] [Use Genius] [Use Advanced (faster)]

*I recommend Expert for this task - it balances depth with efficiency.*`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Standard for Simple Tasks ---
    {
        id: 'intel-002',
        role: 'dispensary',
        category: 'intelligence_level',
        prompt: "What's my top selling product today?",
        context: 'Simple data lookup',
        expectedBehavior: 'Use Standard level automatically',
        idealResponsePattern: `⚡ **Quick Lookup (Standard Mode)**

Your top seller today:

🏆 **Cresco Rise 3.5g**
• Units sold: 24
• Revenue: $1,248
• +15% vs yesterday

**Top 3:**
1. Cresco Rise 3.5g - 24 units
2. Purple Punch 3.5g - 18 units
3. Select Cart 1g - 15 units

*Used Standard mode for this quick lookup (1 credit)*`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// EXECUTION TRANSPARENCY PROMPTS
// =============================================================================

export const EXECUTION_TRANSPARENCY_PROMPTS: PromptScenario[] = [
    // --- Show Execution Steps ---
    {
        id: 'exec-001',
        role: 'dispensary',
        category: 'execution_transparency',
        prompt: 'Compare my prices to all nearby competitors',
        context: 'Multi-step execution',
        expectedBehavior: 'Show step-by-step progress',
        idealResponsePattern: `⏳ **Working... (18s)**

| Step | Action | Status |
|------|--------|--------|
| 1 | Identify nearby competitors | ✅ Done (2s) |
| 2 | Fetch Sunnyside prices | ✅ Done (4s) |
| 3 | Fetch Dispensary33 prices | ✅ Done (3s) |
| 4 | Fetch Zen Leaf prices | ✅ Done (4s) |
| 5 | Compare to your menu | ✅ Done (3s) |
| 6 | Generate report | ✅ Done (2s) |

[Expand to see details ▼]

---

📊 **Price Comparison Complete!**

**Your Position:**
• Average price: $52.40/8th
• Market average: $50.80/8th
• You're **3% above market**

| Competitor | Avg 8th | vs You |
|------------|---------|--------|
| Sunnyside | $48.50 | -7.4% |
| Dispensary33 | $51.20 | -2.3% |
| Zen Leaf | $52.70 | +0.6% |

**Recommendation:** Match Sunnyside on top 3 flower SKUs.

*Completed in 18 seconds. 4 competitors scanned, 127 products compared.*`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Long-Running Task ---
    {
        id: 'exec-002',
        role: 'brand',
        category: 'execution_transparency',
        prompt: 'Research all new cannabis markets opening in 2026',
        context: 'Deep research task',
        expectedBehavior: 'Show progress for long-running task',
        idealResponsePattern: `🔍 **Deep Research in Progress... (45s)**

| Step | Action | Status |
|------|--------|--------|
| 1 | Search for 2026 legislation | ✅ Done (8s) |
| 2 | Identify new markets | ✅ Done (5s) |
| 3 | Research Florida details | ✅ Done (7s) |
| 4 | Research Pennsylvania details | ✅ Done (6s) |
| 5 | Research Ohio details | ✅ Done (5s) |
| 6 | Research Kentucky details | ⏳ Running... |
| 7 | Compile market analysis | ⏱️ Pending |
| 8 | Generate opportunity report | ⏱️ Pending |

**Estimated time remaining:** ~20 seconds

[Cancel Research] [View Partial Results]

*I'm actively researching 6 new markets. You can view partial results anytime.*`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
];

// =============================================================================
// DISCOVERY-FIRST PROMPTS
// =============================================================================

export const DISCOVERY_FIRST_PROMPTS: PromptScenario[] = [
    // --- Complex Task Needs Configuration ---
    {
        id: 'disc-001',
        role: 'dispensary',
        category: 'discovery_first',
        prompt: 'Set up competitor price monitoring',
        context: 'Complex automation task',
        expectedBehavior: 'Ask configuration questions before executing',
        idealResponsePattern: `🎯 **To set up this task, I need to understand:**

**Required:**
1. Which competitors should I monitor?
   _e.g., Sunnyside, Dispensary33, Zen Leaf_

2. What products/categories should I track?
   _e.g., All flower, just top sellers, specific brands_

3. What price change % should trigger an alert?
   _e.g., Any change, 5%+, 10%+_

**Optional (I can use defaults):**
4. How often should I check? _(default: daily)_
5. How should I alert you? _(default: email)_

**My assumptions:**
• I'll scrape publicly available pricing data
• Alerts will be sent immediately when threshold is exceeded
• Historical data will be stored for trend analysis

---

Please provide these details, or say "use defaults" to proceed with standard settings.

[Use Defaults] [Provide Details]`,
        shouldAskClarification: true,
        targetAgent: 'ezal'
    },
    // --- User Provides Config ---
    {
        id: 'disc-002',
        role: 'dispensary',
        category: 'discovery_first',
        prompt: 'Monitor Sunnyside and Zen Leaf for flower price changes over 10%, check daily, alert via Slack',
        context: 'User provided all configuration',
        expectedBehavior: 'Confirm understanding and execute',
        idealResponsePattern: `✅ **Configuration Confirmed**

| Setting | Value |
|---------|-------|
| Competitors | Sunnyside, Zen Leaf |
| Products | All flower |
| Alert Threshold | 10%+ change |
| Frequency | Daily |
| Alert Method | Slack |

**Setting up monitoring...**

⏳ Working... (8s)

| Step | Status |
|------|--------|
| 1 | Add Sunnyside to watch list | ✅ |
| 2 | Add Zen Leaf to watch list | ✅ |
| 3 | Configure price tracking | ✅ |
| 4 | Set up Slack alerts | ✅ |
| 5 | Schedule daily scan | ✅ |

---

🎉 **Competitor Monitoring Active!**

**Playbook Created:** "Daily Competitor Price Monitor"
**Trigger:** Every day at 9:00 AM
**Alerts:** Sent to #competitor-alerts in Slack

First scan starts tomorrow at 9 AM.

[Run Now] [Edit Settings] [View Playbook]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
];

// =============================================================================
// NATURAL LANGUAGE TRIGGER PROMPTS
// =============================================================================

export const NL_TRIGGER_PROMPTS: PromptScenario[] = [
    // --- Schedule Trigger ---
    {
        id: 'nl-trig-001',
        role: 'dispensary',
        category: 'nl_trigger',
        prompt: 'Run my sales report every morning at 8am',
        expectedBehavior: 'Parse NL and create schedule',
        idealResponsePattern: `⏰ **Scheduled Trigger Created**

**Parsed from:** "every morning at 8am"
**Schedule:** \`0 8 * * *\` (cron)

| Setting | Value |
|---------|-------|
| Task | Sales Report |
| Trigger | Daily at 8:00 AM |
| Timezone | America/Chicago |
| Delivery | Email |

**Preview:**
| Next Run | Status |
|----------|--------|
| Tomorrow 8:00 AM | 🟢 Scheduled |
| Jan 5 8:00 AM | ⏱️ Pending |
| Jan 6 8:00 AM | ⏱️ Pending |

[Confirm Schedule] [Change Time] [Add More Triggers]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Event Trigger ---
    {
        id: 'nl-trig-002',
        role: 'dispensary',
        category: 'nl_trigger',
        prompt: 'Alert me when any product stock drops below 10 units',
        expectedBehavior: 'Parse NL and create event trigger',
        idealResponsePattern: `🔔 **Event Trigger Created**

**Parsed from:** "when stock drops below 10"
**Event:** \`inventory.low\`
**Threshold:** < 10 units

| Setting | Value |
|---------|-------|
| Trigger Type | Event-based |
| Event | Low inventory |
| Condition | Stock < 10 units |
| Products | All products |
| Alert | Email + In-app |

**Alert Preview:**
When triggered, you'll receive:
> ⚠️ **Low Stock Alert**
> Select Cart 1g - 8 units remaining
> Daily velocity: 5/day
> Days until stockout: 1.6

[Activate Trigger] [Adjust Threshold] [Exclude Products]`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    // --- Complex NL Trigger ---
    {
        id: 'nl-trig-003',
        role: 'dispensary',
        category: 'nl_trigger',
        prompt: 'Check competitors every weekday at 3pm and send me a Slack message if prices change',
        expectedBehavior: 'Parse complex NL trigger',
        idealResponsePattern: `⏰ **Complex Trigger Created**

**Parsed:**
• Schedule: "every weekday at 3pm" → \`0 15 * * 1-5\`
• Action: "check competitors"
• Condition: "if prices change"
• Alert: "send Slack message"

| Setting | Value |
|---------|-------|
| Trigger | Weekdays at 3:00 PM |
| Action | Competitor price scan |
| Condition | Price changes detected |
| Alert | Slack notification |

**Workflow:**
1. ⏰ 3:00 PM weekdays → Run scan
2. 🔍 Compare to previous prices
3. 📊 If changes detected → Continue
4. 💬 Send Slack message with changes

**Connected Services:**
✅ Slack (#competitor-alerts)

[Activate] [Test Run Now] [Edit Workflow]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
];

// =============================================================================
// FEEDBACK LOOP PROMPTS
// =============================================================================

export const FEEDBACK_PROMPTS: PromptScenario[] = [
    // --- Standard Response with Feedback ---
    {
        id: 'feedback-001',
        role: 'dispensary',
        category: 'feedback',
        prompt: 'Show me this week revenue',
        expectedBehavior: 'Include feedback buttons on response',
        idealResponsePattern: `📊 **This Week's Revenue**

| Day | Revenue | Transactions | Avg Order |
|-----|---------|--------------|-----------|
| Mon | $4,250 | 42 | $101 |
| Tue | $5,120 | 48 | $107 |
| Wed | $4,890 | 45 | $109 |
| Thu | $5,340 | 51 | $105 |
| Fri | $6,780 | 63 | $108 |
| **Total** | **$26,380** | **249** | **$106** |

**Trend:** +8% vs last week 📈

---

**Was this response helpful?**

👍 Good  |  👎 Could be better  |  💬 Add comment

[Set up recurring trigger] [Export data]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Negative Feedback Follow-up ---
    {
        id: 'feedback-002',
        role: 'dispensary',
        category: 'feedback',
        prompt: '[USER FEEDBACK] Response was incomplete',
        context: 'User gave negative feedback',
        expectedBehavior: 'Acknowledge and improve',
        idealResponsePattern: `📝 **Thank you for your feedback!**

I'm sorry the previous response wasn't complete. Could you help me understand what was missing?

**What would have made it better?**

☐ More detail on specific days
☐ Comparison to goals/targets
☐ Breakdown by category
☐ Comparison to last month
☐ Something else: ___________

[Submit Feedback]

*Your feedback helps me improve! I'll use this to provide better responses in the future.*`,
        shouldAskClarification: true,
        targetAgent: 'general'
    },
];

// =============================================================================
// CONNECTIONS/INTEGRATIONS PROMPTS
// =============================================================================

export const CONNECTIONS_PROMPTS: PromptScenario[] = [
    // --- Check Connection Status ---
    {
        id: 'conn-001',
        role: 'dispensary',
        category: 'connections',
        prompt: 'Show me my connected services',
        expectedBehavior: 'Display connection status',
        idealResponsePattern: `🔗 **Your Connected Services**

**Google Workspace:**
| Service | Status | Last Synced |
|---------|--------|-------------|
| 📧 Gmail | ✅ Connected | 2 hours ago |
| 📁 Drive | ✅ Connected | 1 hour ago |
| 📅 Calendar | ⚠️ Expired | — |

**Point of Sale:**
| Service | Status | Last Synced |
|---------|--------|-------------|
| 🛒 Dutchie | ✅ Connected | 30 min ago |

**Communication:**
| Service | Status | Last Synced |
|---------|--------|-------------|
| 💬 Slack | ✅ Connected | Just now |
| 📱 Twilio SMS | ⚪ Not connected | — |

**CRM:**
| Service | Status | Last Synced |
|---------|--------|-------------|
| 🎯 SpringBig | ⚪ Not connected | — |

---

**Actions Required:**
⚠️ Google Calendar needs reauthorization

[Reconnect Calendar] [Add Integration] [Manage Connections]`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    // --- Request New Connection ---
    {
        id: 'conn-002',
        role: 'dispensary',
        category: 'connections',
        prompt: 'Connect my SpringBig account',
        context: 'User wants to add integration',
        expectedBehavior: 'Guide through connection process',
        idealResponsePattern: `🎯 **Connect SpringBig**

SpringBig is a CRM and loyalty platform for cannabis retailers.

**What you'll unlock:**
• Sync customer data
• Track loyalty points
• Import purchase history
• Segment customers

**Required:**
• SpringBig API Key
• Store ID

---

**To connect:**

1. Log in to your SpringBig dashboard
2. Go to Settings → API Access
3. Copy your API Key and Store ID
4. Paste them below:

**API Key:** [________________]
**Store ID:** [________________]

[Connect SpringBig] [Need help finding credentials?]

*This is a one-time setup. Your credentials are encrypted.*`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_TASKLET_PROMPTS: PromptScenario[] = [
    ...INTELLIGENCE_LEVEL_PROMPTS,
    ...EXECUTION_TRANSPARENCY_PROMPTS,
    ...DISCOVERY_FIRST_PROMPTS,
    ...NL_TRIGGER_PROMPTS,
    ...FEEDBACK_PROMPTS,
    ...CONNECTIONS_PROMPTS,
];

export const TASKLET_PROMPT_STATS = {
    total: ALL_TASKLET_PROMPTS.length,
    byCategory: {
        intelligenceLevels: INTELLIGENCE_LEVEL_PROMPTS.length,
        executionTransparency: EXECUTION_TRANSPARENCY_PROMPTS.length,
        discoveryFirst: DISCOVERY_FIRST_PROMPTS.length,
        nlTriggers: NL_TRIGGER_PROMPTS.length,
        feedback: FEEDBACK_PROMPTS.length,
        connections: CONNECTIONS_PROMPTS.length,
    }
};

console.log('Tasklet-Inspired Prompt Stats:', TASKLET_PROMPT_STATS);
