/**
 * Voice/Audio, Multimodal, and Specialized Query Prompts
 * 
 * Covers:
 * - Voice interaction patterns
 * - Audio file processing
 * - Image/document analysis
 * - Natural language edge cases
 * - Colloquial and slang handling
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// VOICE INTERACTION PROMPTS
// =============================================================================

export const VOICE_PROMPTS: PromptScenario[] = [
    // --- Voice Command Recognition ---
    {
        id: 'voice-001',
        role: 'dispensary',
        category: 'voice_command',
        prompt: '[AUDIO] "Hey, what are my sales looking like today?"',
        context: 'Spoken input via microphone',
        expectedBehavior: 'Process natural speech and respond conversationally',
        idealResponsePattern: `🎙️ **[Voice Recognized]**

Sales today are looking solid!

📊 **Today's Numbers:**
• Revenue: $4,850 so far
• Transactions: 47
• Average order: $103

That's up 12% compared to this time yesterday. Your top seller today is Cresco Rise 3.5g with 15 units.

Want me to break it down by category?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    {
        id: 'voice-002',
        role: 'customer',
        category: 'voice_command',
        prompt: '[AUDIO] "Yo what you got for like, helping me chill out after work?"',
        context: 'Casual spoken query',
        expectedBehavior: 'Understand intent despite informal language',
        idealResponsePattern: `🎙️ **[Voice Recognized]**

For unwinding after work, here are my top picks:

🌙 **Best for Chilling:**

1. 💜 **Purple Punch** (Indica)
   Super relaxing, grape taste
   Great for: Couch time, unwinding
   
2. 🍇 **Granddaddy Purple** (Indica)
   Deep relaxation, sleepy vibes
   Great for: End of night
   
3. 🧊 **Ice Cream Cake** (Indica)
   Creamy, mellow, chill
   Great for: Movie night

All of these are in stock. Want details on any of them?`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    // --- Voice Meeting Notes ---
    {
        id: 'voice-003',
        role: 'super_admin',
        category: 'voice_transcription',
        prompt: '[AUDIO FILE] 15-minute team meeting recording',
        context: 'Audio file uploaded for processing',
        expectedBehavior: 'Transcribe and summarize meeting',
        idealResponsePattern: `🎙️ **Meeting Transcription Complete**

**Duration:** 15:23
**Participants:** Martez, Jack, Sarah
**Date:** January 3, 2026

---

**📋 Summary:**

The team discussed Q1 priorities:
1. Focus on Claim Pro conversions
2. Launch dispensary console updates
3. Improve agent response quality

**🎯 Action Items:**

| Owner | Task | Due |
|-------|------|-----|
| Jack | Finalize Dutchie integration | Jan 10 |
| Sarah | Draft marketing email sequence | Jan 7 |
| Martez | Review competitor pricing report | Jan 5 |

**💡 Key Decisions:**
• Approved 420 campaign budget ($5K)
• Delayed feature X to Q2
• Hired 2 contractors for support

[View Full Transcript] [Save to Drive] [Create Follow-up Tasks]`,
        shouldAskClarification: false,
        targetAgent: 'puff'
    },
];

// =============================================================================
// MULTIMODAL / IMAGE PROMPTS
// =============================================================================

export const IMAGE_PROMPTS: PromptScenario[] = [
    // --- Product Image Analysis ---
    {
        id: 'image-001',
        role: 'dispensary',
        category: 'image_analysis',
        prompt: '[IMAGE] Photo of competitor storefront',
        context: 'User uploaded image of competitor',
        expectedBehavior: 'Analyze image for competitive intel',
        idealResponsePattern: `🔍 **Image Analysis: Competitor Storefront**

**Location Identified:** 
Appears to be Sunnyside - Lincoln Park

**Observations:**

**Signage:**
• "25% Off All Flower" banner visible
• Holiday hours posted (closes 9pm)
• "Now Hiring" sign in window

**Window Display:**
• Featuring Cresco products prominently
• New Mindy's edibles display
• Loyalty program promotion

**Foot Traffic:**
• ~3 customers visible
• Line appears short

**Intel Summary:**
• They're running aggressive flower discounts
• Hiring suggests volume growth
• Cresco has prime placement

[Add to Competitor File] [Set Price Alert] [View Their Menu]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Receipt/Invoice Analysis ---
    {
        id: 'image-002',
        role: 'brand',
        category: 'image_analysis',
        prompt: '[IMAGE] Photo of a competitor product with pricing',
        context: 'User uploaded product shelf photo',
        expectedBehavior: 'Extract pricing and product info',
        idealResponsePattern: `📸 **Product Image Analysis**

**Products Identified:**

| Product | Brand | Price | Size |
|---------|-------|-------|------|
| Purple Haze | Verano | $52 | 3.5g |
| Blue Dream | Cresco | $48 | 3.5g |
| Girl Scout Cookies | GTI | $55 | 3.5g |

**Shelf Placement:**
• Verano at eye level (premium position)
• Cresco below (value position)
• GTI on top shelf

**Price Comparison to Your Products:**
• You're priced $3-5 higher on comparable SKUs
• Cresco undercutting you by 10%

**Recommendation:**
Consider matching Cresco's price on Blue Dream to stay competitive.

[Update Price Tracking] [Add to Intel Report]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Document Analysis ---
    {
        id: 'image-003',
        role: 'dispensary',
        category: 'document_analysis',
        prompt: '[IMAGE] Photo of handwritten inventory count',
        context: 'User uploaded paper inventory sheet',
        expectedBehavior: 'Extract data from handwritten document',
        idealResponsePattern: `📄 **Document Analysis: Inventory Count**

**Extracted Data:**

| Product | Count | Notes |
|---------|-------|-------|
| Purple Punch 3.5g | 24 | ✓ |
| Cresco Rise 3.5g | 12 | "reorder" |
| Mindy's Gummies | 45 | |
| Select Cart 1g | 8 | "low" |
| Verano Reserve | 30 | |

**Handwriting Confidence:** 94%

**Alerts Detected:**
⚠️ "Reorder" note on Cresco Rise
⚠️ "Low" note on Select Cart

**Actions:**
- [ ] Add to POS inventory
- [ ] Generate reorder list
- [ ] Compare to current system

[Import to Inventory] [Generate Purchase Order]`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// COLLOQUIAL / SLANG HANDLING
// =============================================================================

export const COLLOQUIAL_PROMPTS: PromptScenario[] = [
    {
        id: 'slang-001',
        role: 'guest',
        category: 'slang',
        prompt: 'What kinda gas you got?',
        expectedBehavior: 'Understand "gas" = high quality flower',
        idealResponsePattern: `🔥 **Top-Shelf Flower (The Gas):**

Here's what's hitting right now:

1. 🌟 **Runtz** (Hybrid)
   Candy terps, crazy bag appeal
   THC: 28% | ⛽ Gas Rating: 10/10
   
2. ⚡ **Gary Payton** (Hybrid)
   Exotic cookies x snowman
   THC: 26% | ⛽ Gas Rating: 9/10
   
3. 🍇 **Grape Pie** (Indica)
   Purple nugs, fruity loud
   THC: 24% | ⛽ Gas Rating: 9/10

These are all premium, top-shelf options. Want me to find where they're in stock near you?`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    {
        id: 'slang-002',
        role: 'guest',
        category: 'slang',
        prompt: 'yo i need sum za fr',
        expectedBehavior: 'Understand "za" = exotic/quality weed',
        idealResponsePattern: `💨 **Exotic Za Available:**

I got you! Here's what's exotic right now:

🔥 **Top Za Picks:**

1. **Zaza Runtz** - $55/8th
   The name says it all
   
2. **Gelato 41** - $52/8th
   Classic exotic, smooth high
   
3. **White Truffle** - $60/8th
   Rare cut, heavy hitter

All premium quality, no mid.

Where you located? I'll find these near you.`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    {
        id: 'slang-003',
        role: 'customer',
        category: 'slang',
        prompt: 'need something for the munchies lol',
        expectedBehavior: 'Understand munchies reference, recommend appropriately',
        idealResponsePattern: `😄 **Beating the Munchies:**

Ha! You've got two options:

**Option A: Embrace It** 🍕
These strains are known for appetite stimulation:
• Girl Scout Cookies
• Purple Kush
• OG Kush

**Option B: Avoid It** 🏃
These are less likely to trigger the munchies:
• Durban Poison (energizing)
• THCV strains (appetite suppressant)
• Harlequin (high CBD)

What's your goal - enjoying the snacks or staying disciplined? 😂`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// COMPLEX NATURAL LANGUAGE
// =============================================================================

export const COMPLEX_NL_PROMPTS: PromptScenario[] = [
    // --- Multi-part question ---
    {
        id: 'nl-001',
        role: 'dispensary',
        category: 'multi_part',
        prompt: 'Can you check my sales from last week, compare them to the week before, and then tell me what I should do differently?',
        expectedBehavior: 'Parse multi-part request and address all parts',
        idealResponsePattern: `📊 **Multi-Part Analysis:**

**Part 1: Last Week's Sales**
| Metric | Value |
|--------|-------|
| Revenue | $48,500 |
| Transactions | 452 |
| Avg Order | $107.30 |

**Part 2: Comparison to Previous Week**
| Metric | Last Week | Prior Week | Change |
|--------|-----------|------------|--------|
| Revenue | $48,500 | $52,100 | -6.9% 📉 |
| Transactions | 452 | 485 | -6.8% 📉 |
| Avg Order | $107.30 | $107.42 | -0.1% |

**Part 3: What You Should Do Differently**

**Root Cause Analysis:**
• Holiday week likely reduced foot traffic
• Competitor ran flash sale (Sunnyside 25% off)
• No promotional campaigns ran

**Recommendations:**
1. **This Week:** Run "New Year, New You" promo
2. **Staffing:** Match hours to traffic patterns
3. **Marketing:** Send win-back SMS to inactive customers
4. **Pricing:** Match competitor on top 3 flower SKUs

Would you like me to execute any of these?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Hypothetical question ---
    {
        id: 'nl-002',
        role: 'brand',
        category: 'hypothetical',
        prompt: 'If I dropped my prices 10% across the board, what would happen?',
        expectedBehavior: 'Model hypothetical scenario',
        idealResponsePattern: `🔮 **Scenario Analysis: 10% Price Drop**

**Current State:**
• Avg wholesale price: $35/unit
• Monthly volume: 12,000 units
• Monthly revenue: $420,000
• Margin: 32%

**Modeled Outcome (10% price cut):**

| Metric | Current | After Cut | Change |
|--------|---------|-----------|--------|
| Price/unit | $35 | $31.50 | -10% |
| Volume | 12,000 | 14,400 | +20%* |
| Revenue | $420K | $454K | +8% |
| Margin | 32% | 24% | -8pts |
| Profit | $134K | $109K | -19% |

*Volume estimate based on price elasticity

**Key Insight:**
Revenue goes up, but **profit goes down 19%**.

**Better Alternatives:**
1. **Selective cuts** - Only cut slow-movers
2. **Volume deals** - Tiered pricing for big orders
3. **Bundle pricing** - Maintain margin with packages

Want me to model any of these alternatives?`,
        shouldAskClarification: false,
        targetAgent: 'money_mike'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_MULTIMODAL_PROMPTS: PromptScenario[] = [
    ...VOICE_PROMPTS,
    ...IMAGE_PROMPTS,
    ...COLLOQUIAL_PROMPTS,
    ...COMPLEX_NL_PROMPTS,
];

export const MULTIMODAL_PROMPT_STATS = {
    total: ALL_MULTIMODAL_PROMPTS.length,
    byCategory: {
        voice: VOICE_PROMPTS.length,
        image: IMAGE_PROMPTS.length,
        colloquial: COLLOQUIAL_PROMPTS.length,
        complexNL: COMPLEX_NL_PROMPTS.length,
    }
};

console.log('Multimodal & NL Prompt Stats:', MULTIMODAL_PROMPT_STATS);
