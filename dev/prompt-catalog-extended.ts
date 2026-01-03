/**
 * Extended Prompt Catalog - Edge Cases and Contextual Variations
 * 
 * This file extends the base prompt catalog with:
 * - Edge cases and error handling
 * - Ambiguous prompts that should trigger clarification
 * - Multi-turn conversation scenarios
 * - Context-dependent responses
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// AMBIGUOUS PROMPTS (Should trigger clarification)
// =============================================================================

export const AMBIGUOUS_PROMPTS: PromptScenario[] = [
    // --- Too Vague ---
    {
        id: 'ambig-001',
        role: 'guest',
        category: 'vague',
        prompt: 'Help me',
        expectedBehavior: 'Ask what kind of help they need',
        idealResponsePattern: '**How can I assist you today?**\n\nI can help with:\n- 🏪 Finding dispensaries near you\n- 🌿 Product recommendations\n- 📚 Cannabis education\n- 💰 Current deals and promotions\n\nWhat would you like to explore?',
        shouldAskClarification: true,
        targetAgent: 'general'
    },
    {
        id: 'ambig-002',
        role: 'dispensary',
        category: 'vague',
        prompt: 'Fix my revenue',
        expectedBehavior: 'Ask for specifics about the revenue issue',
        idealResponsePattern: '**Clarification Needed:**\n\nTo help optimize your revenue, I need to understand the situation:\n\n1. Is revenue declining, flat, or growing too slowly?\n2. Which product categories are underperforming?\n3. What timeframe are we looking at?\n\n*Once I understand the issue, I can provide actionable recommendations.*',
        shouldAskClarification: true,
        targetAgent: 'pops'
    },
    {
        id: 'ambig-003',
        role: 'brand',
        category: 'vague',
        prompt: 'Optimize everything',
        expectedBehavior: 'Ask for specific optimization goals',
        idealResponsePattern: '**Clarification Needed:**\n\nI can optimize several areas for you:\n\n- 📊 **Pricing**: Competitive positioning\n- 📦 **Distribution**: Retail partner expansion\n- 📣 **Marketing**: Campaign performance\n- 📈 **Operations**: Efficiency metrics\n\nWhich area would you like to focus on first?',
        shouldAskClarification: true,
        targetAgent: 'leo'
    },

    // --- Missing Location ---
    {
        id: 'ambig-010',
        role: 'guest',
        category: 'missing_location',
        prompt: 'Dispensaries near me',
        context: 'No location data available',
        expectedBehavior: 'Ask for ZIP or city',
        idealResponsePattern: 'Could you please provide your ZIP code or city so I can find options near you?',
        shouldAskClarification: true,
        targetAgent: 'general'
    },
    {
        id: 'ambig-011',
        role: 'guest',
        category: 'missing_location',
        prompt: 'What dispensaries are open right now?',
        context: 'No location data available',
        expectedBehavior: 'Ask for location to check hours',
        idealResponsePattern: 'Could you please provide your ZIP code or city so I can check which dispensaries are currently open near you?',
        shouldAskClarification: true,
        targetAgent: 'general'
    },
];

// =============================================================================
// MULTI-TURN CONVERSATION SCENARIOS
// =============================================================================

export interface ConversationScenario {
    id: string;
    role: PromptScenario['role'];
    category: string;
    turns: {
        user: string;
        assistant: string;
        context?: string;
    }[];
    targetAgent: string;
}

export const CONVERSATION_SCENARIOS: ConversationScenario[] = [
    // --- Product Discovery Flow ---
    {
        id: 'conv-001',
        role: 'customer',
        category: 'product_discovery_flow',
        turns: [
            {
                user: "I'm looking for something to help me sleep",
                assistant: '🌙 **Sleep-Focused Recommendations:**\n\n1. 💜 **Purple Punch** (Indica)\n   High myrcene, linalool | Deep relaxation\n   Match confidence: 94% | In stock: Yes\n\n2. 🍇 **Grape Ape** (Indica)\n   Berry terpenes | Heavy body effects\n   Match confidence: 89% | In stock: Yes\n\n3. 🌿 **Northern Lights** (Indica)\n   Classic sleep strain | Mild euphoria\n   Match confidence: 87% | In stock: Yes\n\nWould you like more details on any of these?'
            },
            {
                user: "Tell me more about Purple Punch",
                assistant: '💜 **Purple Punch - Deep Dive:**\n\n**Genetics:** Larry OG x Granddaddy Purple\n**Type:** Indica (100%)\n**THC:** 18-24% | **CBD:** <1%\n\n**Terpene Profile:**\n- Myrcene (relaxing)\n- Linalool (calming)\n- Caryophyllene (anti-inflammatory)\n\n**Effects (User Reports):**\n- Deep body relaxation\n- Mild euphoria\n- Sedating at higher doses\n\n**Best For:**\n- Evening/nighttime use\n- Unwinding after work\n- Pre-sleep routine\n\n**Available Formats:**\n- Flower (3.5g): $45\n- Pre-rolls (5pk): $35\n- Vape cart: $55\n\nWould you like to add any to your cart?',
                context: 'User asked for details on specific product'
            },
            {
                user: "What's the difference between that and Grape Ape?",
                assistant: '**Purple Punch vs Grape Ape:**\n\n| | Purple Punch | Grape Ape |\n|---|---|---|\n| **Type** | Indica | Indica |\n| **THC** | 18-24% | 15-20% |\n| **Onset** | Fast (5-10 min) | Moderate (10-15 min) |\n| **Effects** | Heavy sedation | Relaxed, dreamy |\n| **Taste** | Sweet grape, berry | Grape candy |\n| **Best For** | Deep sleep | Mild relaxation |\n| **Price (3.5g)** | $45 | $40 |\n\n**My Recommendation:**\n- **Purple Punch** if you want strong sleep effects\n- **Grape Ape** if you want a gentler wind-down\n\nBoth are excellent choices for evening use.',
                context: 'User comparing two products'
            }
        ],
        targetAgent: 'smokey'
    },

    // --- Competitive Intel Flow ---
    {
        id: 'conv-002',
        role: 'dispensary',
        category: 'competitive_intel_flow',
        turns: [
            {
                user: "How am I doing compared to competitors?",
                assistant: '📊 **Competitive Position Summary:**\n\n**Your Rank:** 3rd in Chicago (by estimated revenue)\n\n**vs Top Competitors:**\n- Sunnyside: They lead by ~20% in volume\n- Dispensary33: You\'re nearly tied\n\n**Your Strengths:**\n- Higher customer ratings (4.6 vs 4.2 avg)\n- Better edible selection\n\n**Your Weaknesses:**\n- Premium flower prices (+8% vs market)\n- Fewer locations (1 vs 3-5)\n\nWould you like a detailed breakdown on any competitor?'
            },
            {
                user: "Yes, give me details on Sunnyside",
                assistant: '🔥 **Cannabis Marketplace Snapshot - Sunnyside**\n\n📊 **COMPETITIVE INTEL**\n-------------------------\n💰 **PRICE GAP:**\n- Flower avg: $45/8th (you: $48)\n- Vapes avg: $52/g (you: $55)\n- Edibles avg: $22/10pk (you: $25)\n\n📈 **TOP MOVERS:**\n- Running "Mix & Match" flower deal\n- Cresco products at 15% discount\n- New loyalty program launched\n\n🚨 **MARKET OPPORTUNITIES:**\n- No subscription/auto-delivery program\n- Limited CBD-dominant selection\n- No senior discounts\n\n**Recommendation:**\nMatch their flower pricing on top 5 SKUs to stay competitive.\n\nWant me to identify which SKUs to adjust?'
            },
            {
                user: "Yes, which products should I reprice?",
                assistant: '💰 **Repricing Recommendations:**\n\n**Priority 1 - High Impact:**\n| Your Product | Current | Competitor | Suggested |\n|---|---|---|---|\n| Cresco Rise 3.5g | $52 | $45 | $46 |\n| GTI Rhythm Vape | $58 | $50 | $52 |\n| Select Elite Cart | $55 | $48 | $49 |\n\n**Priority 2 - Medium Impact:**\n| Your Product | Current | Competitor | Suggested |\n|---|---|---|---|\n| Mindy\'s Gummies 10pk | $28 | $22 | $24 |\n| Verano Reserve 3.5g | $55 | $50 | $50 |\n\n**Estimated Impact:**\n- Revenue lift: +5-8%\n- Margin impact: -2%\n- Net effect: Positive (volume gain)\n\nShould I update these prices in your menu?',
                context: 'User wants specific repricing recommendations'
            }
        ],
        targetAgent: 'ezal'
    },
];

// =============================================================================
// ROLE-SPECIFIC CONTEXT EXAMPLES
// =============================================================================

export interface RoleContext {
    role: PromptScenario['role'];
    typicalContext: string;
    permissions: string[];
    restrictedActions: string[];
    examplePrompts: string[];
}

export const ROLE_CONTEXTS: RoleContext[] = [
    {
        role: 'guest',
        typicalContext: 'Anonymous visitor on homepage, no account, exploring the platform',
        permissions: [
            'Search dispensaries',
            'View product information',
            'Get educational content',
            'See public deals',
        ],
        restrictedActions: [
            'Cannot access pricing tools',
            'Cannot see competitor data',
            'Cannot create campaigns',
            'Cannot access analytics',
        ],
        examplePrompts: [
            'Find dispensaries in Chicago',
            'What strains help with anxiety?',
            'How do edibles work?',
            'Show me deals near 60601',
        ]
    },
    {
        role: 'customer',
        typicalContext: 'Logged-in consumer with purchase history at a dispensary',
        permissions: [
            'All guest permissions',
            'View personalized recommendations',
            'See loyalty points',
            'Access order history',
            'Get win-back offers',
        ],
        restrictedActions: [
            'Cannot access B2B features',
            'Cannot see wholesale pricing',
            'Cannot manage inventory',
        ],
        examplePrompts: [
            'What would you recommend based on my history?',
            'How many loyalty points do I have?',
            'Reorder my last purchase',
            'Show me products similar to what I bought',
        ]
    },
    {
        role: 'dispensary',
        typicalContext: 'Dispensary owner/manager with one or more retail locations',
        permissions: [
            'All customer permissions',
            'View competitor intelligence (Ezal)',
            'Access sales analytics (Pops)',
            'Manage menu and inventory',
            'Create marketing campaigns (Craig)',
            'Manage customer relationships (Mrs. Parker)',
        ],
        restrictedActions: [
            'Cannot see other dispensary data',
            'Cannot access platform-wide analytics',
            'Cannot modify platform settings',
        ],
        examplePrompts: [
            'Compare my prices to Sunnyside',
            'Which products should I stock?',
            'Create a 420 email campaign',
            'Show me customers at risk of churning',
            'What are my best sellers?',
        ]
    },
    {
        role: 'brand',
        typicalContext: 'Cannabis brand/manufacturer selling through dispensaries',
        permissions: [
            'All customer permissions',
            'View distribution footprint',
            'Access wholesale analytics',
            'Track retail sell-through',
            'Create B2B campaigns',
            'Monitor brand performance',
        ],
        restrictedActions: [
            'Cannot see dispensary P&L',
            'Cannot access consumer PII',
            'Cannot modify retail menus',
        ],
        examplePrompts: [
            'Which dispensaries carry my products?',
            'What is my market share in Illinois?',
            'Create a trade promotion for retailers',
            'Show me my wholesale revenue trend',
        ]
    },
    {
        role: 'super_admin',
        typicalContext: 'Platform administrator with full access to BakedBot AI',
        permissions: [
            'All permissions across all roles',
            'Platform-wide analytics',
            'User and tenant management',
            'System configuration',
            'Deep research (web scraping)',
            'Agent orchestration',
            'Compliance auditing',
            'Revenue dashboards',
        ],
        restrictedActions: [
            'None - full access',
        ],
        examplePrompts: [
            'Show me platform MRR',
            'Run a health check on all integrations',
            'Audit content for compliance',
            'Have Ezal scan competitors and Craig draft a report',
            'Show me all tenants by plan tier',
            'Research the latest NY cannabis regulations',
        ]
    },
];

// =============================================================================
// ERROR HANDLING SCENARIOS
// =============================================================================

export const ERROR_SCENARIOS: PromptScenario[] = [
    {
        id: 'error-001',
        role: 'dispensary',
        category: 'integration_error',
        prompt: 'Show me my Dutchie orders',
        context: 'Dutchie not connected',
        expectedBehavior: 'Explain integration is not connected',
        idealResponsePattern: '⚠️ **Integration Required**\n\nYour Dutchie POS is not connected yet.\n\nTo view orders, please:\n1. Go to Settings → Integrations\n2. Click "Connect Dutchie"\n3. Enter your API credentials\n\nNeed help with setup? I can walk you through it.',
        shouldAskClarification: false,
        targetAgent: 'general'
    },
    {
        id: 'error-002',
        role: 'brand',
        category: 'permission_error',
        prompt: 'Show me Sunnyside\'s sales data',
        context: 'Brand trying to access competitor internal data',
        expectedBehavior: 'Explain this data is not accessible',
        idealResponsePattern: '🔒 **Access Restricted**\n\nI cannot access Sunnyside\'s internal sales data.\n\n**What I can do:**\n- Show publicly available pricing\n- Analyze their menu offerings\n- Track their promotional activity\n- Estimate market positioning\n\nWould you like any of these alternatives?',
        shouldAskClarification: false,
        targetAgent: 'ezal'
    },
    {
        id: 'error-003',
        role: 'guest',
        category: 'tier_restriction',
        prompt: 'Create a marketing campaign for my dispensary',
        context: 'Guest user trying to access premium feature',
        expectedBehavior: 'Explain this requires an account',
        idealResponsePattern: '✨ **Premium Feature**\n\nMarketing campaign creation is available for Claim Pro subscribers and above.\n\n**Current Plan:** Guest (Free)\n\n**To unlock this feature:**\n1. Create a free account\n2. Upgrade to Claim Pro ($99/mo)\n\nBenefits include:\n- AI-powered campaign creation\n- Compliance checking\n- Email & SMS templates\n\n[Get Started →]',
        shouldAskClarification: false,
        targetAgent: 'general'
    },
];

// =============================================================================
// STATS
// =============================================================================

export const EXTENDED_PROMPT_STATS = {
    ambiguous: AMBIGUOUS_PROMPTS.length,
    conversations: CONVERSATION_SCENARIOS.length,
    conversationTurns: CONVERSATION_SCENARIOS.reduce((sum, c) => sum + c.turns.length, 0),
    roleContexts: ROLE_CONTEXTS.length,
    errorScenarios: ERROR_SCENARIOS.length,
};

console.log('Extended Prompt Stats:', EXTENDED_PROMPT_STATS);
