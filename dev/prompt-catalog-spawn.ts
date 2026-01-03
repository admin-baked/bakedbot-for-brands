/**
 * Sub-Agent Spawning and Intention OS Prompts
 * 
 * Covers:
 * - Sub-agent spawning for parallel task execution
 * - Intention OS semantic commits
 * - Ambiguity resolution workflows
 * - Deep research with spawned workers
 */

import type { PromptScenario } from './prompt-catalog';

// =============================================================================
// INTENTION OS SCENARIOS
// =============================================================================

export interface IntentionScenario extends PromptScenario {
    intentionOS: {
        isAmbiguous: boolean;
        semanticCommit?: {
            goal: string;
            plan: string[];
            assumptions: string[];
        };
        clarificationNeeded?: {
            question: string;
            possibleIntents: string[];
        };
    };
}

export const INTENTION_OS_PROMPTS: IntentionScenario[] = [
    // --- Clear Intent: Semantic Commit ---
    {
        id: 'intent-001',
        role: 'dispensary',
        category: 'intention_os',
        prompt: 'Compare my prices to Sunnyside for flower products',
        expectedBehavior: 'Form semantic commit and execute',
        idealResponsePattern: `**[Intention OS: Commit Formed]**

🎯 **Goal:** Compare your flower pricing to Sunnyside
📋 **Plan:**
1. Fetch your current flower menu
2. Discover Sunnyside flower prices
3. Generate comparison report

💭 **Assumptions:**
• Comparing 3.5g flower units
• Using Chicago Sunnyside locations
• Including all flower categories

---

🔍 **Executing Comparison...**

📊 **Price Comparison: Your Store vs Sunnyside**

| Product | You | Sunnyside | Gap | Recommendation |
|---------|-----|-----------|-----|----------------|
| Cresco Rise 3.5g | $52 | $45 | +15% | Consider matching |
| GTI Rhythm 3.5g | $55 | $50 | +10% | Slight premium |
| Verano Reserve | $58 | $55 | +5% | Acceptable gap |

**Summary:**
You're averaging 10% above Sunnyside on flower.

[Match Top 3 SKUs] [View Full Report]`,
        shouldAskClarification: false,
        targetAgent: 'ezal',
        intentionOS: {
            isAmbiguous: false,
            semanticCommit: {
                goal: 'Compare flower pricing between user store and Sunnyside',
                plan: [
                    'Retrieve user flower menu from connected POS',
                    'Query Sunnyside flower pricing via web discovery',
                    'Generate side-by-side comparison with recommendations'
                ],
                assumptions: [
                    'User wants flower category only',
                    'Comparing standard 3.5g units',
                    'Chicago market Sunnyside locations'
                ]
            }
        }
    },
    // --- Ambiguous Intent: Needs Clarification ---
    {
        id: 'intent-002',
        role: 'dispensary',
        category: 'intention_os',
        prompt: 'Optimize my menu',
        expectedBehavior: 'Request clarification on optimization goal',
        idealResponsePattern: `**[Intention OS: Clarification Needed]**

I can optimize your menu in several ways. Could you clarify what you'd like to focus on?

**Possible Interpretations:**
1. 📈 **Revenue Optimization** - Adjust pricing for max profit
2. 📊 **Selection Optimization** - Add/remove products based on demand
3. 🏆 **Competitive Optimization** - Align with competitor offerings
4. 🎯 **Category Balance** - Optimize product mix ratios

**Quick Examples:**
• "Optimize my pricing for higher margins"
• "Show me products I should add"
• "Balance my flower to edibles ratio"

Which direction would you like to take?`,
        shouldAskClarification: true,
        targetAgent: 'smokey',
        intentionOS: {
            isAmbiguous: true,
            clarificationNeeded: {
                question: 'What aspect of your menu would you like to optimize?',
                possibleIntents: [
                    'Revenue optimization - pricing adjustments',
                    'Selection optimization - product additions/removals',
                    'Competitive alignment - matching market',
                    'Category balancing - mix ratios'
                ]
            }
        }
    },
    // --- Vague Intent: Multiple Steps ---
    {
        id: 'intent-003',
        role: 'brand',
        category: 'intention_os',
        prompt: 'Help me grow',
        expectedBehavior: 'Clarify growth dimension',
        idealResponsePattern: `**[Intention OS: Clarification Needed]**

I'd love to help you grow! To give you the best advice, I need to understand your focus:

**Growth Dimensions:**
1. 📍 **Distribution** - More retail partners
2. 💰 **Revenue** - Increase wholesale sales
3. 📊 **Market Share** - Outperform competitors
4. 🆕 **Product Line** - Expand SKU count
5. 🗺️ **Geographic** - New states/markets

**Current Baseline (from your data):**
• 45 retail partners in Illinois
• $487K monthly wholesale
• 8.2% market share

Which area should we focus on?`,
        shouldAskClarification: true,
        targetAgent: 'pops',
        intentionOS: {
            isAmbiguous: true,
            clarificationNeeded: {
                question: 'Which dimension of growth would you like to focus on?',
                possibleIntents: [
                    'Distribution growth - more retail partners',
                    'Revenue growth - increase sales volume',
                    'Market share growth - competitive positioning',
                    'Product growth - new SKUs',
                    'Geographic growth - new markets'
                ]
            }
        }
    },
    // --- Complex Intent: Multi-Agent Plan ---
    {
        id: 'intent-004',
        role: 'super_admin',
        category: 'intention_os',
        prompt: 'Prepare a quarterly business review for our investors',
        expectedBehavior: 'Form complex multi-agent semantic commit',
        idealResponsePattern: `**[Intention OS: Commit Formed]**

🎯 **Goal:** Generate comprehensive Q4 investor report

📋 **Execution Plan:**
1. **Pops** → Compile revenue metrics and trends
2. **Ezal** → Gather competitive positioning data
3. **Money Mike** → Analyze margins and unit economics
4. **Craig** → Format final presentation

💭 **Assumptions:**
• Q4 2025 period (Oct-Dec)
• Include MRR, growth, churn
• Competitive benchmarks needed
• Presentation format preferred

---

⏳ **Spawning sub-agents...**

**Agent Status:**
• 📊 Pops: Compiling metrics... ✅
• 🔍 Ezal: Market research... ✅
• 💰 Money Mike: Unit economics... ✅
• 📣 Craig: Formatting... ⏳

[ETA: 2 minutes for full report]`,
        shouldAskClarification: false,
        targetAgent: 'leo',
        intentionOS: {
            isAmbiguous: false,
            semanticCommit: {
                goal: 'Generate Q4 2025 investor business review',
                plan: [
                    'Query Pops for revenue, MRR, growth, churn metrics',
                    'Query Ezal for competitive positioning and market trends',
                    'Query Money Mike for margin analysis and unit economics',
                    'Have Craig format into investor presentation'
                ],
                assumptions: [
                    'Period: Q4 2025 (Oct-Dec)',
                    'Standard investor metrics expected',
                    'Presentation format (not raw data)',
                    'Include YoY comparisons'
                ]
            }
        }
    },
];

// =============================================================================
// SUB-AGENT SPAWNING SCENARIOS
// =============================================================================

export interface SubAgentScenario extends PromptScenario {
    subAgents: {
        spawned: string[];
        parallelExecution: boolean;
        orchestrator: string;
    };
}

export const SUB_AGENT_PROMPTS: SubAgentScenario[] = [
    // --- Parallel Research ---
    {
        id: 'spawn-001',
        role: 'super_admin',
        category: 'sub_agent_spawn',
        prompt: 'Research all top 5 competitors and compare their strategies',
        expectedBehavior: 'Spawn parallel research sub-agents',
        idealResponsePattern: `🤖 **Spawning Research Sub-Agents...**

**Task:** Research top 5 competitors
**Mode:** Parallel execution

---

**Sub-Agent Fleet:**

| Agent | Target | Status |
|-------|--------|--------|
| 🔍 Ezal-1 | Cresco Labs | Researching... |
| 🔍 Ezal-2 | GTI/Rise | Researching... |
| 🔍 Ezal-3 | Verano | Researching... |
| 🔍 Ezal-4 | Curaleaf | Researching... |
| 🔍 Ezal-5 | Trulieve | Researching... |

**Orchestrator:** Leo (COO)
**Estimated Time:** 45 seconds

---

⏳ Collecting results...

✅ **All sub-agents complete!**

📊 **Competitor Strategy Matrix:**

| Company | Market Focus | Key Strategy | Moat |
|---------|--------------|--------------|------|
| Cresco | Volume | Wholesale dominance | Distribution |
| GTI/Rise | Retail | Vertical integration | Brand loyalty |
| Verano | Value | Price leadership | Efficiency |
| Curaleaf | Scale | M&A expansion | Capital |
| Trulieve | Regional | State dominance | First-mover |

[Download Full Report] [Deep Dive on Any]`,
        shouldAskClarification: false,
        targetAgent: 'leo',
        subAgents: {
            spawned: ['ezal-worker-1', 'ezal-worker-2', 'ezal-worker-3', 'ezal-worker-4', 'ezal-worker-5'],
            parallelExecution: true,
            orchestrator: 'leo'
        }
    },
    // --- Multi-Market Deep Research ---
    {
        id: 'spawn-002',
        role: 'brand',
        category: 'sub_agent_spawn',
        prompt: 'Analyze cannabis markets in all states where we could expand',
        expectedBehavior: 'Spawn market research agents for each state',
        idealResponsePattern: `🌍 **Multi-State Market Analysis**

**Spawning State Research Agents...**

**Target States (Legal Adult-Use):**
| State | Sub-Agent | Status |
|-------|-----------|--------|
| Michigan | 🔍 Market-MI | ⏳ |
| New York | 🔍 Market-NY | ⏳ |
| New Jersey | 🔍 Market-NJ | ⏳ |
| Missouri | 🔍 Market-MO | ⏳ |
| Arizona | 🔍 Market-AZ | ⏳ |
| Colorado | 🔍 Market-CO | ⏳ |

**Orchestrator:** Leo
**Research Depth:** Comprehensive (licensing, market size, competition)

---

⏳ Agents working in parallel...

✅ **Research Complete!**

📊 **Market Opportunity Ranking:**

| Rank | State | Opportunity Score | Barrier to Entry |
|------|-------|-------------------|------------------|
| 1 | 🏆 Missouri | 92/100 | Medium |
| 2 | Michigan | 85/100 | Low |
| 3 | New Jersey | 80/100 | High |
| 4 | Arizona | 75/100 | Medium |
| 5 | New York | 70/100 | Very High |
| 6 | Colorado | 65/100 | Saturated |

**Best Fit:** Missouri (high growth, achievable licensing)

[View State Details] [Start Licensing Research]`,
        shouldAskClarification: false,
        targetAgent: 'leo',
        subAgents: {
            spawned: ['market-mi', 'market-ny', 'market-nj', 'market-mo', 'market-az', 'market-co'],
            parallelExecution: true,
            orchestrator: 'leo'
        }
    },
    // --- Audit Sub-Agents ---
    {
        id: 'spawn-003',
        role: 'super_admin',
        category: 'sub_agent_spawn',
        prompt: 'Audit all tenant content for compliance',
        expectedBehavior: 'Spawn compliance audit workers',
        idealResponsePattern: `🛡️ **Compliance Audit - Full Platform**

**Spawning Audit Sub-Agents...**

**Scope:** All 172 active tenants
**Audit Type:** Content compliance

---

**Worker Allocation:**
| Worker | Tenant Batch | Status |
|--------|--------------|--------|
| 🛡️ Deebo-1 | Tenants 1-35 | Scanning... |
| 🛡️ Deebo-2 | Tenants 36-70 | Scanning... |
| 🛡️ Deebo-3 | Tenants 71-105 | Scanning... |
| 🛡️ Deebo-4 | Tenants 106-140 | Scanning... |
| 🛡️ Deebo-5 | Tenants 141-172 | Scanning... |

**Orchestrator:** Leo
**Estimated Time:** 3 minutes

---

⏳ Scanning content across all tenants...

✅ **Audit Complete!**

📋 **Results Summary:**

| Result | Count | % |
|--------|-------|---|
| ✅ Passing | 165 | 95.9% |
| ⚠️ Warnings | 5 | 2.9% |
| ❌ Violations | 2 | 1.2% |

**Violations (Immediate Action):**
1. **GreenLeaf Dispensary** - Health claim in email
2. **SunnyDay Brand** - Minor-appealing imagery

**Warnings:**
• 3 tenants missing age-gate language
• 2 tenants need packaging updates

[View Full Report] [Fix Violations Now]`,
        shouldAskClarification: false,
        targetAgent: 'leo',
        subAgents: {
            spawned: ['deebo-worker-1', 'deebo-worker-2', 'deebo-worker-3', 'deebo-worker-4', 'deebo-worker-5'],
            parallelExecution: true,
            orchestrator: 'leo'
        }
    },
    // --- Playbook Execution ---
    {
        id: 'spawn-004',
        role: 'dispensary',
        category: 'sub_agent_spawn',
        prompt: 'Run my weekly competitor monitoring playbook',
        context: 'User has a saved playbook',
        expectedBehavior: 'Execute playbook with specialized sub-agents',
        idealResponsePattern: `📋 **Executing Playbook: Weekly Competitor Monitor**

**Playbook Steps:**
1. Scan competitor prices (Ezal)
2. Check competitor promotions (Ezal)
3. Analyze your position (Pops)
4. Draft response strategy (Craig)
5. Send summary email (Puff)

---

**Spawning Playbook Agents...**

| Step | Agent | Status |
|------|-------|--------|
| 1 | 🔍 Ezal (Pricing) | ✅ Complete |
| 2 | 🔍 Ezal (Promos) | ✅ Complete |
| 3 | 📊 Pops (Analysis) | ✅ Complete |
| 4 | 📣 Craig (Strategy) | ⏳ Working... |
| 5 | 📧 Puff (Email) | ⏱️ Pending |

---

✅ **Playbook Complete!**

**Weekly Summary:**
• 3 price changes detected
• 2 new competitor promotions
• Your position: Competitive
• Strategy drafted: Match 1 SKU

**Email sent to:** you@store.com

[View Full Analysis] [Adjust Playbook]`,
        shouldAskClarification: false,
        targetAgent: 'leo',
        subAgents: {
            spawned: ['ezal-pricing', 'ezal-promos', 'pops-analysis', 'craig-strategy', 'puff-email'],
            parallelExecution: false,
            orchestrator: 'leo'
        }
    },
];

// =============================================================================
// DEEP RESEARCH WITH SPAWNED WORKERS
// =============================================================================

export const DEEP_RESEARCH_SPAWN_PROMPTS: SubAgentScenario[] = [
    {
        id: 'deep-spawn-001',
        role: 'super_admin',
        category: 'deep_research_spawn',
        prompt: 'Research all new 2026 cannabis legislation across the US',
        expectedBehavior: 'Spawn research workers by region',
        idealResponsePattern: `📚 **Deep Research: 2026 Cannabis Legislation**

**Spawning Regional Research Agents...**

| Region | Agent | Focus |
|--------|-------|-------|
| Northeast | 🔍 Researcher-NE | NY, NJ, CT, MA, PA |
| Southeast | 🔍 Researcher-SE | FL, GA, NC, VA |
| Midwest | 🔍 Researcher-MW | IL, MI, OH, MN, MO |
| Southwest | 🔍 Researcher-SW | TX, AZ, NM, CO |
| West | 🔍 Researcher-W | CA, WA, OR, NV |

**Status:** Researching in parallel...

---

⏳ Compiling legislation updates...

✅ **Research Complete!**

📋 **2026 Legislation Summary:**

**Major Changes:**
| State | Change | Effective |
|-------|--------|-----------|
| 🟢 Florida | Adult-use ballot passed | July 2026 |
| 🟢 Pennsylvania | Medical expansion | March 2026 |
| 🟡 Ohio | Delivery regulations | Feb 2026 |
| 🔴 Texas | Failed legalization | — |

**Regulatory Updates:**
• NY: New social equity provisions
• CA: Tax reduction (15% → 12%)
• IL: Interstate commerce pilot
• MI: Home cultivation expanded

**Impact Analysis:**
• Florida opens ~$5B market opportunity
• PA medical expansion = new wholesale channel
• CA tax cut improves margins 3%

[Download Full Report] [Set Legislative Alerts]`,
        shouldAskClarification: false,
        targetAgent: 'leo',
        subAgents: {
            spawned: ['researcher-ne', 'researcher-se', 'researcher-mw', 'researcher-sw', 'researcher-w'],
            parallelExecution: true,
            orchestrator: 'leo'
        }
    },
];

// =============================================================================
// INTUITION OS SCENARIOS (Proactive Inference)
// =============================================================================

/**
 * Intuition OS handles:
 * - Proactive suggestions based on context
 * - Predictive insights ("you might want to...")
 * - Context inference from partial information
 * - Pattern recognition and anomaly detection
 */
export interface IntuitionScenario extends PromptScenario {
    intuitionOS: {
        contextInferred: string[];
        proactiveInsight: string;
        confidenceLevel: 'high' | 'medium' | 'low';
        triggerCondition: string;
    };
}

export const INTUITION_OS_PROMPTS: IntuitionScenario[] = [
    // --- Proactive Revenue Insight ---
    {
        id: 'intuition-001',
        role: 'dispensary',
        category: 'intuition_os',
        prompt: '[SYSTEM] User viewing Monday sales dashboard',
        context: 'User is looking at low Monday sales',
        expectedBehavior: 'Intuit user concern and offer solution',
        idealResponsePattern: `💡 **[Intuition OS: Insight Detected]**

I noticed you're looking at Monday sales data. Based on patterns I've observed:

**What I'm seeing:**
📉 Mondays are averaging 35% below your weekly mean
📊 This is consistent for the past 6 weeks

**What I think you might be wondering:**
"How can I boost Monday traffic?"

**Proactive Suggestion:**
Many dispensaries see success with "Monday Motivation" deals:
• 15% off sativa strains
• Double loyalty points
• Early bird discount (before noon)

**Predicted Impact:** +18-25% Monday revenue

Would you like me to draft a Monday promotion campaign?`,
        shouldAskClarification: false,
        targetAgent: 'pops',
        intuitionOS: {
            contextInferred: [
                'User viewing Monday-specific data',
                'Monday consistently underperforms',
                'User likely concerned about low traffic day'
            ],
            proactiveInsight: 'User may want Monday promotional strategy',
            confidenceLevel: 'high',
            triggerCondition: 'User views underperforming day metrics'
        }
    },
    // --- Anomaly Detection ---
    {
        id: 'intuition-002',
        role: 'dispensary',
        category: 'intuition_os',
        prompt: '[SYSTEM] Unusual sales pattern detected',
        context: 'Sales dropped 40% mid-day for no apparent reason',
        expectedBehavior: 'Proactively alert and investigate',
        idealResponsePattern: `🚨 **[Intuition OS: Anomaly Detected]**

**Alert:** Unusual sales drop detected

**What I noticed:**
• Sales dropped 40% between 2-4pm today
• This is outside normal variance (±15%)
• No scheduled events or weather issues

**Possible Causes (Ranked by Likelihood):**
1. 🔧 POS system issue (checking...)
2. 🚶 Staff shortage during shift change
3. 🏪 Competitor flash sale in progress
4. 🔒 Unexpected closure/issue

**Investigating...**

✅ **POS Status:** Online, no errors
⚠️ **Staff Check:** 1 budtender called in sick
🔍 **Competitor Check:** Sunnyside running 2-hour flash sale

**Root Cause:** Likely combination of:
- Short-staffed during peak
- Competitor drawing traffic

**Recommended Actions:**
1. Call in backup staff if available
2. Post "Today Only" deal on social
3. Send SMS to nearby customers

[Deploy Counter-Promotion] [View Full Analysis]`,
        shouldAskClarification: false,
        targetAgent: 'pops',
        intuitionOS: {
            contextInferred: [
                'Sales dropped significantly mid-day',
                'Pattern is abnormal compared to baseline',
                'Multiple potential causes to investigate'
            ],
            proactiveInsight: 'Unexpected sales drop needs immediate investigation',
            confidenceLevel: 'high',
            triggerCondition: 'Sales deviate >30% from expected hourly average'
        }
    },
    // --- Context Inference ---
    {
        id: 'intuition-003',
        role: 'brand',
        category: 'intuition_os',
        prompt: 'Show me Sunnyside',
        context: 'Minimal query, needs context inference',
        expectedBehavior: 'Infer most likely intent based on user role and recent activity',
        idealResponsePattern: `💭 **[Intuition OS: Context Inferred]**

Based on your role (Brand) and recent activity, I believe you want:

**Sunnyside - Distribution & Sell-Through**

| Location | Your Products | Sell-Through | Status |
|----------|---------------|--------------|--------|
| Chicago (5 locs) | ✅ Carried | 85% | Strong |
| Rockford | ✅ Carried | 72% | Good |
| Naperville | ❌ Not carried | — | Opportunity |

**Your Revenue at Sunnyside:** $125K/month

**Recent Changes:**
• They added 2 new SKUs last week
• Your bestseller is Purple Punch

*Not what you were looking for?*
• [Sunnyside Pricing] 
• [Sunnyside Contact Info]
• [Competitive Position vs Sunnyside]`,
        shouldAskClarification: false,
        targetAgent: 'ezal',
        intuitionOS: {
            contextInferred: [
                'User is a brand (not dispensary or consumer)',
                'Brands typically care about distribution at retailers',
                'Recent activity shows wholesale focus'
            ],
            proactiveInsight: 'Brand asking about retailer likely wants distribution data',
            confidenceLevel: 'medium',
            triggerCondition: 'Minimal query + role context available'
        }
    },
    // --- Predictive Churn Warning ---
    {
        id: 'intuition-004',
        role: 'dispensary',
        category: 'intuition_os',
        prompt: '[SYSTEM] Customer churn patterns detected',
        context: 'System identifies at-risk customers proactively',
        expectedBehavior: 'Alert before churn occurs',
        idealResponsePattern: `⚠️ **[Intuition OS: Churn Prediction]**

**Early Warning:** 12 high-value customers showing churn signals

**Pattern Detected:**
These customers typically:
• Visited weekly, now haven't visited in 14+ days
• Average LTV: $850+
• Last purchase showed smaller basket than usual

**Top 5 At-Risk (by LTV):**
| Customer | Last Visit | LTV | Risk Score |
|----------|------------|-----|------------|
| Sarah M. | 18 days | $1,250 | 🔴 High |
| John D. | 16 days | $980 | 🔴 High |
| Mike R. | 21 days | $920 | 🔴 High |
| Lisa T. | 15 days | $890 | 🟡 Medium |
| Chris P. | 14 days | $850 | 🟡 Medium |

**Intuition Insight:**
If no action taken, expected churn: 40% within 30 days
Revenue at risk: ~$4,200/month

**Recommended Win-Back:**
Personalized SMS with 20% off their favorite products

[Send Win-Back SMS] [View All At-Risk] [Dismiss]`,
        shouldAskClarification: false,
        targetAgent: 'mrs_parker',
        intuitionOS: {
            contextInferred: [
                'Multiple high-value customers showing decreased engagement',
                'Pattern matches historical churn behavior',
                'Early intervention window exists'
            ],
            proactiveInsight: 'High-value customers at risk of churning within 30 days',
            confidenceLevel: 'high',
            triggerCondition: 'Multiple customers match churn prediction model'
        }
    },
    // --- Opportunity Inference ---
    {
        id: 'intuition-005',
        role: 'brand',
        category: 'intuition_os',
        prompt: '[SYSTEM] Market opportunity detected',
        context: 'System spots untapped opportunity',
        expectedBehavior: 'Proactively surface business opportunity',
        idealResponsePattern: `💡 **[Intuition OS: Opportunity Detected]**

**Insight:** Underserved category in your distribution

**What I noticed:**
• Your edibles have 12% market share
• But only 8% of shelf space at retailers
• Competitor edibles growing +25% YoY

**The Opportunity:**
You could be leaving $180K/year on the table if retailers featured your edibles more prominently.

**Top Retailers Under-Featuring Your Edibles:**
| Retailer | Your Share | Shelf % | Gap |
|----------|------------|---------|-----|
| Dispensary33 | 15% | 5% | -10% |
| Zen Leaf | 12% | 6% | -6% |
| EarthMed | 10% | 4% | -6% |

**Suggested Action:**
Request shelf space reallocation or co-marketing promotion.

**Draft Ask:**
> "We've seen 25% growth in edibles this quarter. Would you consider expanding our selection to 10% of your edible shelf? We'll support with in-store marketing."

[Draft Retailer Emails] [View Category Analytics]`,
        shouldAskClarification: false,
        targetAgent: 'ezal',
        intuitionOS: {
            contextInferred: [
                'Edibles category outperforming market',
                'Shelf space allocation not matching demand',
                'Revenue opportunity from better placement'
            ],
            proactiveInsight: 'Untapped revenue from under-featured product category',
            confidenceLevel: 'medium',
            triggerCondition: 'Category performance exceeds shelf allocation by >4%'
        }
    },
];

// =============================================================================
// EXPORT ALL
// =============================================================================

export const ALL_SPAWN_INTENTION_PROMPTS = [
    ...INTENTION_OS_PROMPTS,
    ...INTUITION_OS_PROMPTS,
    ...SUB_AGENT_PROMPTS,
    ...DEEP_RESEARCH_SPAWN_PROMPTS,
];

export const SPAWN_INTENTION_STATS = {
    total: ALL_SPAWN_INTENTION_PROMPTS.length,
    byCategory: {
        intentionOS: INTENTION_OS_PROMPTS.length,
        intuitionOS: INTUITION_OS_PROMPTS.length,
        subAgentSpawning: SUB_AGENT_PROMPTS.length,
        deepResearchSpawn: DEEP_RESEARCH_SPAWN_PROMPTS.length,
    },
    intentionStats: {
        ambiguous: INTENTION_OS_PROMPTS.filter(p => p.intentionOS.isAmbiguous).length,
        semanticCommit: INTENTION_OS_PROMPTS.filter(p => !p.intentionOS.isAmbiguous).length,
    },
    intuitionStats: {
        high: INTUITION_OS_PROMPTS.filter(p => p.intuitionOS.confidenceLevel === 'high').length,
        medium: INTUITION_OS_PROMPTS.filter(p => p.intuitionOS.confidenceLevel === 'medium').length,
    }
};

console.log('Sub-Agent, Intention & Intuition OS Stats:', SPAWN_INTENTION_STATS);
