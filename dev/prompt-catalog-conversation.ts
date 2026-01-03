/**
 * Conversational Flow and Persona Prompts
 * 
 * Covers:
 * - Multi-turn conversation patterns
 * - Agent personality variations
 * - Tone adjustments
 * - Follow-up patterns
 * - Clarification dialogues
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// MULTI-TURN CONVERSATION PROMPTS
// =============================================================================

export const MULTI_TURN_PROMPTS: PromptScenario[] = [
    // --- Context Carry-Over ---
    {
        id: 'conv-001',
        role: 'customer',
        category: 'conversation',
        prompt: 'What about edibles?',
        context: 'Previous turn discussed relaxation products',
        expectedBehavior: 'Remember context and apply to new request',
        idealResponsePattern: `🍬 **Relaxing Edibles**

Based on our earlier discussion about relaxation, here are the best edibles:

**Top Picks for Unwinding:**

1. 🍫 **Mindy's Sleepy ZZZ Gummies** (Indica)
   • 5mg THC + 3mg CBN per piece
   • Best for: Deep sleep, major relaxation
   • Takes effect: 45-60 min
   
2. 🍬 **Wyld Elderberry** (Indica)
   • 10mg THC per gummy
   • Best for: Evening chill
   • Takes effect: 30-45 min
   
3. 🧁 **Good News Midnight Berry** (Indica)
   • 10mg THC per piece
   • Best for: Stress relief, mild sedation
   • Takes effect: 45 min

*Since you're new to edibles, start with 5mg and wait 2 hours before taking more.*

Would you like me to find these near you?`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
    // --- Building on Previous Info ---
    {
        id: 'conv-002',
        role: 'dispensary',
        category: 'conversation',
        prompt: 'And break that down by category',
        context: 'Previous turn showed weekly revenue total',
        expectedBehavior: 'Apply breakdown to previously shown data',
        idealResponsePattern: `📊 **Revenue by Category (This Week: $26,380)**

| Category | Revenue | % of Total | Trend |
|----------|---------|------------|-------|
| 🌿 Flower | $12,450 | 47% | +5% |
| 💨 Vapes | $6,820 | 26% | +12% |
| 🍬 Edibles | $4,150 | 16% | +3% |
| 💧 Concentrates | $2,120 | 8% | -2% |
| 🧴 Topicals | $840 | 3% | +8% |

**Key Insights:**
• Vapes growing fastest (+12%)
• Concentrates showing slight decline
• Flower remains your anchor category

**Top Product per Category:**
| Category | Top Product | Units |
|----------|-------------|-------|
| Flower | Cresco Rise 3.5g | 85 |
| Vapes | Select Elite Cart | 52 |
| Edibles | Mindy's Gummies | 78 |

Would you like to see daily breakdown or compare to last week?`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Pronoun Resolution ---
    {
        id: 'conv-003',
        role: 'brand',
        category: 'conversation',
        prompt: 'What about them?',
        context: 'Previous turn mentioned Sunnyside as a target retailer',
        expectedBehavior: 'Resolve "them" to Sunnyside',
        idealResponsePattern: `📊 **Sunnyside Details**

I'll expand on Sunnyside since we were just discussing them:

**Your Distribution at Sunnyside:**
| Metric | Value |
|--------|-------|
| Locations carrying you | 5 of 8 |
| Avg monthly revenue | $125K |
| Sell-through rate | 85% |
| Reorder frequency | Every 2 weeks |

**Your Top Products at Sunnyside:**
1. Purple Punch 3.5g - 120 units/mo
2. Gummies 10-pack - 85 units/mo
3. Vape Cart 1g - 60 units/mo

**Opportunities:**
• 3 locations don't carry you yet
• Edibles underperform vs flower

**Contact:**
• Buyer: Sarah Johnson
• Last order: 5 days ago
• Next meeting: Jan 15

[View Full Retailer Profile] [Draft Outreach Email]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
];

// =============================================================================
// AGENT PERSONA PROMPTS
// =============================================================================

export const PERSONA_PROMPTS: PromptScenario[] = [
    // --- Craig (Marketer) Persona ---
    {
        id: 'persona-001',
        role: 'dispensary',
        category: 'persona',
        prompt: 'Write copy for a 420 sale',
        context: 'Craig handles marketing',
        expectedBehavior: 'Craig responds with marketing expertise and creativity',
        idealResponsePattern: `🎨 **Craig here!** Let me cook up some fire 420 copy.

---

**Option 1: HYPE Mode** 🔥
> 🌿 FOUR-TWENTY = FOUR-DAY SALE 🌿
> 
> April 17-20 | Up to 42% OFF
> 
> The biggest sale of the year is HERE.
> Pre-order starts NOW. Don't get left out.
> 
> 🔗 Shop Now

---

**Option 2: Professional Mode** 💼
> Our 420 Celebration Sale
> 
> Join us April 17-20 for exclusive savings:
> • 20% off all flower
> • Buy 2, get 1 free edibles
> • $10 pre-rolls (reg. $15)
> 
> Pre-order available. Visit us today.

---

**Option 3: Educational Mode** 📚
> CELEBRATE 420 RESPONSIBLY 🌿
> 
> This 420, we're offering:
> ✓ 20% off top-shelf flower
> ✓ Free consultation with every purchase
> ✓ Extended hours (9am-10pm)
> 
> New to cannabis? Ask about our beginner bundles.

---

**Compliance Notes:**
✅ No health claims
✅ Age-gate reminder added
⚠️ Check local ad restrictions for social

Which vibe fits your brand?`,
        shouldAskClarification: false,
        targetAgent: 'craig'
    },
    // --- Ezal (Lookout) Persona ---
    {
        id: 'persona-002',
        role: 'dispensary',
        category: 'persona',
        prompt: "What's Sunnyside up to?",
        context: 'Ezal handles competitive intel',
        expectedBehavior: 'Ezal responds with intel/surveillance style',
        idealResponsePattern: `👀 **Ezal on the lookout...**

Just ran a sweep on Sunnyside. Here's the intel:

---

**🎯 Active Promotions:**
• "25% Off All Flower" - Started yesterday
• "Double Points Weekend" - Running now
• New loyalty tier launched (VIP+)

**💰 Price Movements (Last 7 Days):**
| Product | Before | Now | Change |
|---------|--------|-----|--------|
| Cresco 3.5g | $52 | $48 | -8% |
| Select Cart | $45 | $42 | -7% |
| Rhythm Flower | $55 | $50 | -9% |

**📦 New Products Spotted:**
• Floracal Live Resin (new brand)
• BelCosta Disposables (new SKU)

**📍 Store Activity:**
• Extended hours on weekends
• New budtender hiring (3 posts)
• Google rating: 4.6 (+0.1)

---

**⚠️ Threat Level:** MEDIUM
They're being aggressive on pricing. May be clearing old inventory.

**My Recommendation:**
Match pricing on Cresco/Select to avoid customer migration.

[Deploy Counter-Promotion] [Deep Dive on Pricing]`,
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    // --- Mrs. Parker (Hostess) Persona ---
    {
        id: 'persona-003',
        role: 'dispensary',
        category: 'persona',
        prompt: 'How do I keep my VIP customers happy?',
        context: 'Mrs. Parker handles loyalty',
        expectedBehavior: 'Mrs. Parker responds warmly about customer care',
        idealResponsePattern: `💝 **Mrs. Parker here, honey!**

Let me tell you about keeping those VIPs feeling special...

---

**Your VIP Customers:**
• Count: 156 (top 10% by spend)
• Avg LTV: $2,450
• Avg visit frequency: 2.3x/week

**What VIPs Love:**

1. **Early Access** 🌟
   Let them know about new products first
   "VIP Preview: New drops before anyone else"

2. **Personalized Recognition** 👋
   Train staff to greet by name
   Remember their preferences

3. **Exclusive Perks** 🎁
   VIP-only flash sales
   Birthday double points
   Free merch on milestones

4. **Communication** 💬
   Monthly "VIP Newsletter" 
   Personal texts for restock on favorites

---

**Quick Wins I Can Set Up:**

| Action | Impact | Effort |
|--------|--------|--------|
| VIP birthday program | High | Low |
| Early access texts | High | Low |
| Quarterly thank-you gift | Medium | Medium |
| VIP-only hours | Medium | High |

Want me to set up the birthday program first?

[Set Up Birthday Program] [View VIP List] [Draft VIP Newsletter]`,
        shouldAskClarification: false,
        targetAgent: 'mrs_parker'
    },
];

// =============================================================================
// TONE ADJUSTMENT PROMPTS
// =============================================================================

export const TONE_PROMPTS: PromptScenario[] = [
    // --- Formal Request ---
    {
        id: 'tone-001',
        role: 'brand',
        category: 'tone',
        prompt: 'I need a professional summary for our board meeting',
        context: 'User needs formal business tone',
        expectedBehavior: 'Use professional, formal language',
        idealResponsePattern: `📊 **Executive Summary: Q4 2025 Performance**

**Prepared for:** Board of Directors
**Date:** January 3, 2026

---

**Financial Highlights:**
| Metric | Q4 2025 | Q3 2025 | YoY |
|--------|---------|---------|-----|
| Revenue | $2.4M | $2.1M | +32% |
| Gross Margin | 42% | 40% | +2pp |
| EBITDA | $480K | $380K | +26% |

**Distribution Metrics:**
• Active retail partners: 87 (+12 from Q3)
• Average revenue per retailer: $27,586
• Sell-through rate: 78% (industry avg: 65%)

**Strategic Accomplishments:**
1. Expanded into 3 new markets (FL, PA, OH)
2. Launched 4 new SKUs with 92% retailer adoption
3. Reduced COGS by 8% through supply chain optimization

**Outlook:**
Management projects Q1 2026 revenue of $2.7-2.9M based on current pipeline and seasonal demand patterns.

---

*This summary was generated by BakedBot AI. Data sourced from internal systems as of January 3, 2026.*

[Export as PDF] [Add Charts] [Schedule Follow-up]`,
        shouldAskClarification: false,
        targetAgent: 'pops'
    },
    // --- Casual/Friendly Request ---
    {
        id: 'tone-002',
        role: 'customer',
        category: 'tone',
        prompt: 'yo what flower is good for vibing with friends',
        context: 'User using casual language',
        expectedBehavior: 'Match casual, friendly tone',
        idealResponsePattern: `Ayo! 🙌 Here's my top picks for the squad sesh:

**Perfect for the Crew:**

1. 🍊 **Tangie** (Sativa)
   Good vibes, laughs, talkative
   Great for: Game night, kickbacks
   
2. 🍪 **Animal Cookies** (Hybrid)
   Chill but not sleepy
   Great for: Movies, music, munchies
   
3. 🍇 **Grape Ape** (Indica)
   Super relaxed, couch mode
   Great for: Late night wind down

**Pro tip:** Tangie if y'all wanna be active, Animal Cookies if you're chilling inside, Grape Ape for when it's about to be bedtime lol

Want me to find these near you? Just drop your zip 📍`,
        shouldAskClarification: false,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// CLARIFICATION DIALOGUE PROMPTS
// =============================================================================

export const CLARIFICATION_PROMPTS: PromptScenario[] = [
    // --- Ambiguous Time Reference ---
    {
        id: 'clarify-001',
        role: 'dispensary',
        category: 'clarification',
        prompt: 'Show me sales from last period',
        context: '"Last period" is ambiguous',
        expectedBehavior: 'Ask for clarification',
        idealResponsePattern: `📅 **Quick clarification needed**

"Last period" could mean a few things. Which would you like?

| Period | Date Range |
|--------|------------|
| 📆 Last week | Dec 27 - Jan 2 |
| 📅 Last month | December 2025 |
| 📊 Last quarter | Q4 2025 (Oct-Dec) |
| 📈 Last year | 2025 |

[Last Week] [Last Month] [Last Quarter] [Custom Range]

*Or just say something like "show me December sales" and I'll know exactly what you mean!*`,
        shouldAskClarification: true,
        targetAgent: 'pops'
    },
    // --- Multiple Interpretations ---
    {
        id: 'clarify-002',
        role: 'dispensary',
        category: 'clarification',
        prompt: 'Update my menu',
        context: 'Could mean multiple things',
        expectedBehavior: 'Offer options',
        idealResponsePattern: `🔄 **What kind of menu update?**

I can help with several menu tasks:

1. **Sync from POS** 
   Pull latest products and prices from Dutchie
   *Last sync: 2 hours ago*

2. **Update pricing**
   Change prices for specific products
   
3. **Add new products**
   Manually add items not in POS

4. **Remove products**
   Hide or delete items from menu

5. **Reorder categories**
   Reorganize how products appear

Which one were you thinking?

[Sync from Dutchie] [Update Prices] [Add Products]`,
        shouldAskClarification: true,
        targetAgent: 'smokey'
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_CONVERSATION_PROMPTS: PromptScenario[] = [
    ...MULTI_TURN_PROMPTS,
    ...PERSONA_PROMPTS,
    ...TONE_PROMPTS,
    ...CLARIFICATION_PROMPTS,
];

export const CONVERSATION_PROMPT_STATS = {
    total: ALL_CONVERSATION_PROMPTS.length,
    byCategory: {
        multiTurn: MULTI_TURN_PROMPTS.length,
        persona: PERSONA_PROMPTS.length,
        tone: TONE_PROMPTS.length,
        clarification: CLARIFICATION_PROMPTS.length,
    }
};

console.log('Conversation Prompt Stats:', CONVERSATION_PROMPT_STATS);
