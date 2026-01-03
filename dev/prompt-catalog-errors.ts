/**
 * Error Handling and Edge Case Prompts
 * 
 * Covers:
 * - API/Integration failures
 * - Rate limiting
 * - Permission denied scenarios
 * - Invalid input handling
 * - Graceful degradation
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// API FAILURE PROMPTS
// =============================================================================

export const API_FAILURE_PROMPTS: PromptScenario[] = [
    // --- Third-Party API Down ---
    {
        id: 'err-api-001',
        role: 'dispensary',
        category: 'error_handling',
        prompt: 'Sync my Dutchie menu',
        context: 'Dutchie API is down',
        expectedBehavior: 'Handle gracefully with alternatives',
        idealResponsePattern: `⚠️ **Dutchie Connection Issue**

I wasn't able to connect to Dutchie's servers.

**Error:** Connection timeout (attempted 3 times)
**Status:** Dutchie API appears to be experiencing issues

---

**What I can do instead:**

1. **Use cached data** - Your last sync was 2 hours ago
   [Use Cached Menu]

2. **Try again later** - I'll automatically retry in 15 minutes
   [Set Reminder]

3. **Manual upload** - Upload a CSV of your current menu
   [Upload CSV]

---

**Dutchie Status:** 🔴 Degraded performance
*Last known issue: 45 minutes ago*

I'll notify you when Dutchie is back online.`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    // --- Partial Data Retrieved ---
    {
        id: 'err-api-002',
        role: 'brand',
        category: 'error_handling',
        prompt: 'Show me sales at all my retail partners',
        context: 'Some retailers API returned errors',
        expectedBehavior: 'Show available data, note missing',
        idealResponsePattern: `📊 **Retail Partner Sales (Partial)**

⚠️ **Note:** Some data is incomplete due to connection issues.

**Available Data (5 of 7 partners):**
| Partner | Sales | Status |
|---------|-------|--------|
| Sunnyside | $45,200 | ✅ |
| Zen Leaf | $32,100 | ✅ |
| Dispensary33 | $28,400 | ✅ |
| EarthMed | $22,800 | ✅ |
| Nature's Care | $18,500 | ✅ |

**Unavailable (2 partners):**
| Partner | Issue | Retry |
|---------|-------|-------|
| GreenGate | API timeout | In 15 min |
| Rise | Auth expired | Needs reauth |

---

**Subtotal (available):** $147,000
**Estimated total:** ~$165,000

[Retry Failed Partners] [Authorize Rise] [Export Available Data]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// RATE LIMITING PROMPTS
// =============================================================================

export const RATE_LIMIT_PROMPTS: PromptScenario[] = [
    // --- Quota Exceeded ---
    {
        id: 'err-rate-001',
        role: 'dispensary',
        category: 'error_handling',
        prompt: 'Analyze all my customer data',
        context: 'User has exceeded their AI quota',
        expectedBehavior: 'Explain limit clearly with options',
        idealResponsePattern: `⏸️ **Usage Limit Reached**

You've used all your AI credits for this billing period.

**Your Usage:**
| Metric | Used | Limit |
|--------|------|-------|
| AI Messages | 10,000 | 10,000 |
| Expert Mode | 45 | 50 |

**Options:**

1. **Wait for reset** - Your credits reset in 3 days
   
2. **Upgrade plan** - Growth plan includes 25,000 credits
   [View Plans]

3. **Use Standard mode** - Lower quality but still works
   [Retry in Standard Mode]

4. **Purchase add-on** - $10 for 1,000 extra credits
   [Buy Credits]

---

*Tip: Your current usage suggests the Growth plan ($299/mo) would be a better fit and save you $40/mo vs add-ons.*`,
        shouldAskClarification: false,
        targetAgent: 'money_mike'
    },
    // --- Rate Limited by External Service ---
    {
        id: 'err-rate-002',
        role: 'brand',
        category: 'error_handling',
        prompt: 'Scan all competitor websites',
        context: 'Too many requests in short time',
        expectedBehavior: 'Explain rate limiting and queue',
        idealResponsePattern: `🚦 **Request Queued**

I need to slow down to avoid being blocked by competitor websites.

**Status:**
• Completed: 5 of 20 competitors
• Queued: 15 remaining
• Rate limit: 1 scan per 30 seconds

---

**Progress:**
✅ Sunnyside - Complete
✅ Zen Leaf - Complete
✅ Dispensary33 - Complete
✅ EarthMed - Complete
✅ Nature's Care - Complete
⏳ GreenGate - In 30s
⏱️ Rise - In 60s
⏱️ ... (13 more)

**Estimated completion:** 8 minutes

---

[Run in Background] [Get Partial Results Now] [Cancel]

*I'll notify you when all scans are complete. You can continue using BakedBot.*`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
];

// =============================================================================
// PERMISSION DENIED PROMPTS
// =============================================================================

export const PERMISSION_DENIED_PROMPTS: PromptScenario[] = [
    // --- Feature Above Plan ---
    {
        id: 'err-perm-001',
        role: 'dispensary',
        category: 'error_handling',
        prompt: 'Set up automated competitor monitoring',
        context: 'User on Claim Pro plan (feature requires Growth)',
        expectedBehavior: 'Explain upgrade path clearly',
        idealResponsePattern: `🔒 **Feature Requires Upgrade**

Automated competitor monitoring is available on Growth plan and above.

**Your Plan:** Claim Pro ($99/mo)
**Required:** Growth ($299/mo)

---

**What you get with Growth:**
• ✅ Automated competitor monitoring
• ✅ Daily price alerts
• ✅ 25,000 AI credits (vs 10,000)
• ✅ Unlimited playbooks
• ✅ Priority support

**What you can do now (on Claim Pro):**
• Manual competitor checks (ask me anytime)
• One-time competitor snapshots
• Basic price comparisons

---

[Upgrade to Growth] [Try Manual Check] [Learn More]

*Upgrading takes effect immediately. Prorate from your current billing cycle.*`,
        shouldAskClarification: false,
        targetAgent: 'money_mike'
    },
    // --- Role Restriction ---
    {
        id: 'err-perm-002',
        role: 'customer',
        category: 'error_handling',
        prompt: 'Show me competitor analytics',
        context: 'Feature only for dispensary/brand roles',
        expectedBehavior: 'Explain restriction with alternatives',
        idealResponsePattern: `🔒 **Feature Not Available**

Competitor analytics is designed for dispensary and brand operators.

As a customer, I can help you with:
• 🔍 Find products near you
• 💡 Product recommendations
• 📍 Dispensary locations and hours
• 💰 Current deals and promotions
• 🎁 Your loyalty points and rewards

---

**Did you mean to ask about:**
• "Which dispensaries have the best prices?"
• "Where can I find [product]?"
• "What deals are available today?"

[Find Deals] [Product Search] [My Loyalty Points]`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
];

// =============================================================================
// INVALID INPUT PROMPTS
// =============================================================================

export const INVALID_INPUT_PROMPTS: PromptScenario[] = [
    // --- Gibberish/Unclear Input ---
    {
        id: 'err-input-001',
        role: 'guest',
        category: 'error_handling',
        prompt: 'asdf jkl;',
        expectedBehavior: 'Handle gracefully without condescension',
        idealResponsePattern: `🤔 **I didn't quite catch that**

No worries! Here's what I can help with:

**Popular requests:**
• "Find dispensaries near me"
• "Recommend something for relaxation"
• "What are the best edibles?"
• "Show me today's deals"

---

**Try asking:**
> "I'm looking for something to help with sleep"
> "What dispensaries are open now?"
> "Show me sativa strains"

[Find Dispensaries] [Browse Products] [Today's Deals]`,
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    // --- Wrong Format ---
    {
        id: 'err-input-002',
        role: 'dispensary',
        category: 'error_handling',
        prompt: 'Update price for product 12345 to fifty dollars',
        context: 'Price should be numeric',
        expectedBehavior: 'Clarify expected format',
        idealResponsePattern: `💡 **Let me clarify the price**

I found product #12345: **Cresco Rise 3.5g**

**Current price:** $52.00

Did you mean to update to:
• **$50.00** (you said "fifty dollars")

---

**Confirm update:**

| Field | Current | New |
|-------|---------|-----|
| Price | $52.00 | $50.00 |
| Change | — | -$2.00 (-3.8%) |

[Confirm $50.00] [Enter Different Price] [Cancel]

*Price changes will sync to all connected channels (Dutchie, website).*`,
        shouldAskClarification: true,
        targetAgent: 'money_mike'
    },
];

// =============================================================================
// GRACEFUL DEGRADATION PROMPTS
// =============================================================================

export const GRACEFUL_DEGRADATION_PROMPTS: PromptScenario[] = [
    // --- No Results Found ---
    {
        id: 'err-degrade-001',
        role: 'customer',
        category: 'error_handling',
        prompt: 'Find THCV products near me',
        context: 'No THCV products in area',
        expectedBehavior: 'Offer alternatives',
        idealResponsePattern: `😔 **No exact matches found**

I couldn't find THCV products within 25 miles of your location.

**THCV is rare** - only about 2% of dispensaries carry it.

---

**Alternatives you might like:**

1. **Durban Poison** (naturally higher THCV)
   Available at: Sunnyside (5 mi)
   
2. **Doug's Varin** (bred for THCV)
   Available at: Online only

3. **CBD:THC blends** (similar effects)
   Available at: 3 nearby locations

---

**Other options:**
• [Expand search to 50 miles]
• [Show similar products]
• [Notify me when THCV is available]

*THCV is known for appetite suppression and energizing effects.*`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    // --- Feature in Beta ---
    {
        id: 'err-degrade-002',
        role: 'brand',
        category: 'error_handling',
        prompt: 'Generate a video ad for my new product',
        context: 'Video generation is in beta',
        expectedBehavior: 'Set expectations, offer alternatives',
        idealResponsePattern: `🧪 **Beta Feature: Video Generation**

Video ads are currently in beta with limited availability.

**Current Status:**
• Beta users: 50 brands
• Wait time: ~3-5 business days
• Quality: Improving weekly

---

**While you wait, I can create:**

1. **Static image ads** ✅ Available now
   Professional product imagery
   
2. **Carousel ads** ✅ Available now
   Multi-image storytelling
   
3. **Animated GIFs** ✅ Available now
   Eye-catching motion graphics

---

[Join Video Beta Waitlist] [Create Static Ad] [Create Carousel]

*Beta users get 5 free video generations per month. Regular pricing launches Q2.*`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_ERROR_PROMPTS: PromptScenario[] = [
    ...API_FAILURE_PROMPTS,
    ...RATE_LIMIT_PROMPTS,
    ...PERMISSION_DENIED_PROMPTS,
    ...INVALID_INPUT_PROMPTS,
    ...GRACEFUL_DEGRADATION_PROMPTS,
];

export const ERROR_PROMPT_STATS = {
    total: ALL_ERROR_PROMPTS.length,
    byCategory: {
        apiFailure: API_FAILURE_PROMPTS.length,
        rateLimit: RATE_LIMIT_PROMPTS.length,
        permissionDenied: PERMISSION_DENIED_PROMPTS.length,
        invalidInput: INVALID_INPUT_PROMPTS.length,
        gracefulDegradation: GRACEFUL_DEGRADATION_PROMPTS.length,
    }
};

console.log('Error Handling Prompt Stats:', ERROR_PROMPT_STATS);
