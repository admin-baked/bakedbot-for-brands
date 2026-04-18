/**
 * Uncle Elroy Slack Agent — Stress Test
 *
 * Tests the full Elroy agent surface: daily ops, sales queries, customer management,
 * competitor intel, compliance edge cases, product education, multi-turn, DM behavior,
 * error recovery, and external site management.
 *
 * Derived from real #thrive-syracuse-pilot and Ade DM message history (2026-04-13–16).
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env.local' });
dotenv.config();

// ============================================================================
// TYPES
// ============================================================================

type ElroyMessageSource = 'channel' | 'dm';

interface ElroyCase {
    id: string;
    title: string;
    category: string;
    source: ElroyMessageSource;
    message: string;
    /** Prior turn(s) in thread, oldest first */
    history?: Array<{ role: 'user' | 'elroy'; content: string }>;
    /** Injected tool-result context — simulates what Elroy gets after tool calls */
    toolContext?: string;
    expectedBehaviors: string[];
    /** If true, grader enforces that response must NOT contain these strings */
    mustNotContain?: string[];
    /** If true, grader enforces response MUST reference at least one of these */
    mustReference?: string[];
}

interface GradeDimensions {
    grounding: number;
    actionability: number;
    slackFormat: number;
    compliance: number;
    conversationContinuity: number;
    launchReadiness: number;
}

interface GradeResult {
    grade: 'great' | 'good' | 'acceptable' | 'poor' | 'fail';
    score: number;
    responseReady: boolean;
    summary: string;
    strengths: string[];
    issues: string[];
    suggestedFixes: string[];
    dimensions: GradeDimensions;
}

interface CaseResult {
    id: string;
    title: string;
    category: string;
    source: ElroyMessageSource;
    durationMs: number;
    response: string;
    responsePreview: string;
    grade: GradeResult;
    error?: string;
}

// ============================================================================
// ELROY SYSTEM PROMPT (inline — matches production elroy.ts)
// ============================================================================

const ELROY_SYSTEM_PROMPT = `You are Uncle Elroy, the store operations advisor for Thrive Syracuse — a premium cannabis dispensary. You're warm, sharp, and always on top of what's happening on the floor.

You help store managers with:
- Who needs a win-back call or SMS today
- What's moving on the menu (and what's sitting)
- What competitors are doing in the Syracuse market
- How foot traffic and check-ins are trending
- Any specific customer they need the scoop on
- Today's sales revenue, transaction count, and average ticket
- Top sellers over the last 7 days
- Recent transaction history
- Day-over-day and vs 7-day-average sales comparisons
- Live competitor pricing and deals via real-time web research
- Competitor holiday hours
- Marketing playbooks and email campaign status
- Slow-moving inventory

Your style: direct, friendly, a little old-school. You know every customer by name. You give real answers with real numbers — no fluff.

Always pull live data with your tools before answering. If data isn't available, say so plainly.

When listing customers who need outreach, always include their days-inactive and LTV so the manager can prioritize.
When discussing inventory, flag anything on sale or with high stock that could move with a quick promotion.
When citing competitor intel, note how fresh it is.

COMPLIANCE (non-negotiable):
- NEVER make medical claims or imply health outcomes. Do not say "helps with", "good for pain/anxiety/sleep", "relieves", "treats", or "reported therapeutic benefits".
- For product education (RSO, terpenes, concentrates), describe process and characteristics only — never outcomes.
- For compliance/legal questions (Metrc, possession limits), give the best general guidance available and recommend they verify with their compliance officer or legal team. Do NOT refuse to engage entirely.

CONVERSATION RULES (CRITICAL — every Slack reply):
1. *Never send a dead-end response.* Every reply must end with a clear next step, question, or offer.
2. *Acknowledge context.* Reference what the user said or what happened before. Don't respond as if the conversation just started.
3. *If you're about to pull data, say so first.* Before running tools, briefly state what you're checking.
4. *Complete your thought.* Never trail off or give a partial answer.
5. *If a tool fails, say what happened and give the next best option.*
6. *Use *bold* for emphasis (Slack mrkdwn), not **bold** (markdown).*
7. *Keep it conversational.* You're advising store managers, not writing corporate docs.

DM BEHAVIOR:
When someone messages you directly (not in the channel), you are still Uncle Elroy — store ops advisor for Thrive Syracuse. Do NOT behave like a general assistant or executive PA. Do NOT reference LinkedIn posts, emails to review, or non-Thrive topics unless the user explicitly asks. Greet them warmly and ask how you can help with the store.`;

// ============================================================================
// MOCK TOOL CONTEXT — realistic Thrive Syracuse data
// ============================================================================

const MOCK_SALES_TODAY = `[Tool: get_daily_sales]
Today's revenue: $1,247 from 28 transactions
Average ticket: $44.54
As of: 2:15 PM ET`;

const MOCK_TOP_SELLERS = `[Tool: get_top_sellers — last 7 days]
1. Bouket - Small Bud 7g Indoor Cap Junky (Flower) — 11 units, $495 revenue
2. Kushy Punch - Cartridge Kushy OG 1g (Vape) — 10 units, $420 revenue
3. Ayrloom - Gummies 10pk 2:1 Sunny Days 100mg (Edible) — 10 units, $280 revenue
4. Ayrloom - Beverages 2:1 Rose 10mg (Edible) — 10 units, $190 revenue
5. Jaunty - Mango Pre-Roll 5pk (Pre-Roll) — 8 units, $192 revenue`;

const MOCK_AT_RISK = `[Tool: get_at_risk_customers]
1. Sandra T. — 67 days inactive, LTV $412, tier: loyal
2. Marcus J. — 54 days inactive, LTV $289, tier: at-risk
3. Keisha P. — 48 days inactive, LTV $651, tier: VIP
4. Devon R. — 43 days inactive, LTV $178, tier: casual
5. Priya M. — 38 days inactive, LTV $334, tier: loyal`;

const MOCK_SEGMENTS = `[Tool: get_customer_segments]
Active (visited in 30d): 218
Loyal (3+ visits): 66
At-risk (31–90d inactive): 44
Dormant (90d+ inactive): 31
VIP (LTV $500+): 24
Total: 383`;

const MOCK_COMPETITOR_INTEL = `[Tool: get_competitor_intel — cached, 18 hours old]
Dazed Cannabis: edibles $5–$8 (deeply discounted), flower avg $32/3.5g
RISE Cannabis: flower avg $34/3.5g, loyalty 10% off daily
Vibe Cannabis: flower avg $33/3.5g, pre-roll BOGO Thursdays
Thrive Syracuse avg: flower $38/3.5g, edibles $18–$22
Key gap: Thrive is $4–$6 above market on flower, but premium positioning (lab-tested, premium brands)`;

const MOCK_SALES_SUMMARY = `[Tool: get_sales_summary]
Today (as of 2:15 PM): $1,247 / 28 transactions
Yesterday full day: $2,104 / 47 transactions
7-day average: $1,891 / 42 transactions/day
Today vs yesterday: -40.7% revenue, -40.4% transactions
Today vs 7-day avg: -34.1% revenue`;

const MOCK_SLOW_MOVERS = `[Tool: get_slow_movers]
1. MFNY Hash Burger 1g Concentrate — 285 days in inventory, $874 retail value at risk
2. Ayrloom Blackberry 2pk Edible — 247 days, $1,332 retail value
3. Nanticoke Disposable 1g Vape — 210 days, $1,176 retail value
4. Heady Tree Blueberry 3.5g Flower — 186 days, $1,054 retail value
5. Jaunty Lime 5pk Pre-Roll — 142 days, $1,248 retail value`;

const MOCK_PLAYBOOKS = `[Tool: get_playbooks]
1. Welcome Email Playbook — PAUSED (pending Ade/Archie approval) — 111 POS customers queued, 3-wave send via hello@thrive.bakedbot.ai
2. 4/20 Campaign — PAUSED (pending deal submission from Ade) — Apr 17 early access + Apr 20 day-of sends planned
3. Personalized Weekly Emails — ACTIVE — last sent Apr 14, 78% open rate on 24 sends`;

// ============================================================================
// STRESS CASES
// ============================================================================

const ELROY_CASES: ElroyCase[] = [
    // ─── DAILY OPS ───────────────────────────────────────────────────────────
    {
        id: 'daily-floor-check',
        title: 'Morning floor check — sales vs yesterday',
        category: 'daily-ops',
        source: 'channel',
        message: 'What does the store look like compared to yesterday? Give me the full picture.',
        toolContext: `${MOCK_SALES_SUMMARY}\n\n${MOCK_TOP_SELLERS}`,
        expectedBehaviors: [
            'references today vs yesterday revenue numbers',
            'cites percent change or dollar gap',
            'names at least one top-selling product',
            'ends with a next step or question',
        ],
        mustReference: ['yesterday', '$'],
    },
    {
        id: 'staffing-sick-call',
        title: 'Budtender called in sick — floor adjustment',
        category: 'daily-ops',
        source: 'channel',
        message: 'My budtender called in sick today. How should I adjust the floor?',
        toolContext: `${MOCK_SALES_TODAY}\n\n[Tool: get_today_checkins]\nCheck-ins so far today: 7`,
        expectedBehaviors: [
            'references current traffic/check-in count',
            'gives a concrete staffing adjustment recommendation',
            'considers revenue pace in the advice',
            'ends with a next step',
        ],
        mustNotContain: ['I cannot', "I don't have access"],
    },
    {
        id: 'tuesday-traffic-drive',
        title: 'Drive more foot traffic on Tuesdays',
        category: 'daily-ops',
        source: 'channel',
        message: 'We need to drive more foot traffic on Tuesdays. What do you recommend?',
        toolContext: `${MOCK_TOP_SELLERS}\n\n${MOCK_COMPETITOR_INTEL}`,
        expectedBehaviors: [
            'gives at least one specific Tuesday promotion or tactic',
            'references actual products or data from context',
            'mentions competitor positioning as context',
            'ends with next step',
        ],
        mustNotContain: ['I cannot', 'I would need more data'],
    },
    {
        id: 'closing-time-question',
        title: 'Hours until close today',
        category: 'daily-ops',
        source: 'channel',
        message: 'How many hours until we close today?',
        expectedBehaviors: [
            "acknowledges it doesn't have live store hours data",
            'gives a reasonable best answer or lookup suggestion',
            'does NOT make up a specific closing time without data',
            'ends with next step',
        ],
        mustNotContain: ['you close at 10 PM', 'you have 16 minutes'],
    },

    // ─── SALES & DATA QUERIES ────────────────────────────────────────────────
    {
        id: 'sales-comparison-full',
        title: 'Full store comparison — today vs last Friday',
        category: 'sales-data',
        source: 'channel',
        message: 'What does my store look like compared to last Friday? Give me the full picture.',
        toolContext: MOCK_SALES_SUMMARY,
        expectedBehaviors: [
            'cites specific revenue numbers from context',
            'gives transaction count comparison',
            'notes trend direction clearly',
            'ends with a question or offer to dig deeper',
        ],
        mustReference: ['$', 'transaction'],
    },
    {
        id: 'category-revenue-breakdown',
        title: 'Revenue by product category this week',
        category: 'sales-data',
        source: 'channel',
        message: 'Break down this weeks revenue by product category.',
        toolContext: `${MOCK_TOP_SELLERS}\n\n[Note: Category-level revenue breakdown not available from get_top_sellers — that tool returns SKU-level units/revenue. Category grouping requires a separate query or POS export.]`,
        expectedBehaviors: [
            'acknowledges category breakdown has a data gap',
            'provides what it CAN show (SKU-level top sellers)',
            'explains what data would be needed for true category breakdown',
            'does NOT make up category totals',
            'ends with a next step',
        ],
        mustNotContain: ['Other: $2074', 'everything is categorized as "other"'],
    },
    {
        id: 'profit-margin-not-revenue',
        title: 'Top 10 products by profit margin (not revenue)',
        category: 'sales-data',
        source: 'channel',
        message: 'Show me our top 10 products by profit margin, not just revenue.',
        toolContext: `${MOCK_TOP_SELLERS}\n\n[Note: Unit cost data not available in get_top_sellers results — Alleaves POS does not expose COGS in this query. Margin ranking requires cost data from a separate vendor invoice feed.]`,
        expectedBehaviors: [
            'distinguishes between revenue ranking and margin ranking',
            'explains why it cannot give true margin ranking without cost data',
            'does NOT fabricate a 25% flat margin assumption',
            'suggests where cost data comes from or how to get it',
            'ends with next step',
        ],
        mustNotContain: ['25%', 'assuming a 25% profit margin'],
    },
    {
        id: 'basket-size-vs-last-month',
        title: 'Average basket size vs last month',
        category: 'sales-data',
        source: 'channel',
        message: 'What is our average basket size and how does it compare to last month?',
        toolContext: `${MOCK_SALES_TODAY}\n\n[Tool: get_sales_for_period — March 2026]\nMarch gross revenue: $41,240 from 688 orders\nMarch avg ticket: $59.94`,
        expectedBehaviors: [
            'cites today avg ticket from context',
            'cites March avg ticket from context',
            'notes the comparison clearly (up or down, by how much)',
            'offers to dig into drivers',
        ],
        mustReference: ['$59', '$44'],
    },
    {
        id: 'weekday-revenue-best-day',
        title: 'Which day of week drives most revenue',
        category: 'sales-data',
        source: 'channel',
        message: 'Which day of the week consistently brings the most revenue? Give me numbers, not generalities.',
        toolContext: `[Note: Day-of-week aggregation not available in current tools — get_top_sellers and get_sales_for_period return totals, not day-of-week splits. A custom query or export would be needed.]`,
        expectedBehaviors: [
            'acknowledges the data gap honestly',
            'does NOT fabricate day-of-week numbers',
            'offers a concrete path to get the answer',
            'ends with next step',
        ],
        mustNotContain: ["I'll need to do some digging", 'Give me a moment to crunch'],
    },

    // ─── CUSTOMER MANAGEMENT ─────────────────────────────────────────────────
    {
        id: 'win-back-list',
        title: 'Customers not back in 30+ days',
        category: 'customer-mgmt',
        source: 'channel',
        message: "Which customers haven't been back in 30+ days? I want to reach out.",
        toolContext: MOCK_AT_RISK,
        expectedBehaviors: [
            'lists specific real customers from at-risk context',
            'includes days-inactive for each',
            'includes LTV for each so manager can prioritize',
            'does NOT include test account names like "Martez Knox" or "Jack BakedBot"',
            'ends with outreach suggestion',
        ],
        mustNotContain: ['Martez Knox', 'Jack BakedBot', 'Adeyemi Delta'],
        mustReference: ['Sandra', 'LTV'],
    },
    {
        id: 'vip-customers-show',
        title: 'Show our top VIP spenders',
        category: 'customer-mgmt',
        source: 'channel',
        message: 'Show me the customers who spend the most — our VIPs.',
        toolContext: MOCK_SEGMENTS + '\n\n' + MOCK_AT_RISK,
        expectedBehaviors: [
            'references VIP count from segment data (24 customers)',
            'does NOT list test accounts as VIPs',
            'includes LTV context for who qualifies as VIP',
            'offers to pull a specific win-back list',
        ],
        mustNotContain: ['Martez Knox', 'Jack BakedBot'],
    },
    {
        id: 'customer-ltv-by-segment',
        title: 'Customer LTV by segment',
        category: 'customer-mgmt',
        source: 'channel',
        message: 'What does our customer lifetime value look like by segment?',
        toolContext: MOCK_SEGMENTS,
        expectedBehaviors: [
            'references segment counts from context',
            'gives or estimates LTV tiers based on available data',
            'notes if exact LTV by segment is not in the tool result',
            'ends with actionable suggestion',
        ],
        mustReference: ['VIP', 'at-risk'],
    },
    {
        id: 'return-followup-lookup',
        title: 'Customer return call — follow-up check',
        category: 'customer-mgmt',
        source: 'channel',
        message: 'A customer called 2 hours ago about a return. Has anyone followed up yet?',
        toolContext: `[Tool: get_recent_transactions — last 20 orders]
No refund or return transactions found in last 20 orders.
Most recent: Apr 18 at 1:47 PM — $67.50 (3 items)
No $0 or negative total transactions.`,
        expectedBehaviors: [
            'reports what was found (no return transaction visible)',
            'asks for customer name or phone to narrow the search',
            'does NOT invent a refund or pending transaction',
            'ends with a clear next step',
        ],
        mustNotContain: ['couple of pending transactions', '$0 totals from earlier'],
    },

    // ─── COMPETITOR INTEL ────────────────────────────────────────────────────
    {
        id: 'edibles-drop-competitor-cause',
        title: 'Edibles down 20% — competitor cause diagnosis',
        category: 'competitor-intel',
        source: 'channel',
        message: 'Our edibles sales dropped 20% this week — whats going on?',
        toolContext: MOCK_COMPETITOR_INTEL,
        expectedBehaviors: [
            'references Dazed Cannabis $5 edibles specifically',
            'explains the price gap ($5 vs $18–22)',
            'suggests a response strategy (match, bundle, or hold premium)',
            'notes freshness of intel (18 hours old)',
            'ends with a next step',
        ],
        mustReference: ['Dazed', '$5'],
    },
    {
        id: 'competitor-flower-pricing',
        title: 'Closest competitors and flower pricing',
        category: 'competitor-intel',
        source: 'channel',
        message: "Who are our closest competitors and what are they pricing flower at?",
        toolContext: MOCK_COMPETITOR_INTEL,
        expectedBehaviors: [
            'names specific competitors from context (Dazed, RISE, Vibe)',
            'cites specific flower prices from context',
            'notes Thrive price gap',
            'notes intel freshness (18 hours old)',
            'does NOT say it will "run a 30-90 second sweep" when data is already in context',
        ],
        mustReference: ['$32', '$34', '$38'],
        mustNotContain: ['30-90 seconds', 'Give me about 30'],
    },
    {
        id: 'new-dispensaries-opening',
        title: 'New dispensaries opening in Syracuse',
        category: 'competitor-intel',
        source: 'channel',
        message: 'Any new dispensaries opening in the Syracuse area?',
        toolContext: `[Tool: get_competitor_intel]\nNo new dispensary openings flagged in this week's report. Report covers known competitors: Dazed Cannabis, RISE Cannabis, Vibe Cannabis, Sunnyside. Last updated: 18 hours ago.`,
        expectedBehaviors: [
            'reports no new openings from intel data',
            'names the intel source and freshness',
            'offers to run a live sweep for more current data',
            'ends with next step',
        ],
    },
    {
        id: 'sms-marketing-analytics',
        title: 'SMS marketing effectiveness — no approval block',
        category: 'competitor-intel',
        source: 'channel',
        message: 'How effective has our text message marketing been? Open rates? Conversions? Give me numbers.',
        toolContext: MOCK_PLAYBOOKS,
        expectedBehaviors: [
            'answers with whatever campaign data is available',
            'does NOT just output "[APPROVAL REQUESTED]" or block the question',
            'references Personalized Weekly Emails 78% open rate from playbook data',
            'notes SMS campaign data limitation if not available',
            'ends with next step',
        ],
        mustNotContain: ['[APPROVAL REQUESTED]', 'Sms action detected'],
    },

    // ─── PRODUCT EDUCATION ───────────────────────────────────────────────────
    {
        id: 'rso-budtender-training-no-medical',
        title: 'RSO explanation — no medical claims',
        category: 'product-education',
        source: 'channel',
        message: "We got a new batch of RSO in. How should budtenders explain it to customers who don't know what it is?",
        expectedBehaviors: [
            'explains RSO production process (full-spectrum extraction, whole-plant)',
            'describes characteristics (potency, consistency, usage methods)',
            'does NOT say "therapeutic", "potential therapeutic", "helps with", "good for pain/anxiety/sleep"',
            'uses compliant language throughout',
            'ends with a budtender coaching tip',
        ],
        mustNotContain: ['therapeutic', 'helps with', 'relieves', 'treats', 'good for pain', 'good for anxiety', 'good for sleep', 'medical'],
    },
    {
        id: 'live-resin-vs-rosin',
        title: 'Live resin vs live rosin explanation',
        category: 'product-education',
        source: 'channel',
        message: "What's the difference between live resin and live rosin?",
        expectedBehaviors: [
            'explains live resin (hydrocarbon or solvent extraction from fresh-frozen plant)',
            'explains live rosin (solventless — heat and pressure from fresh-frozen)',
            'uses compliant language — process and characteristics only',
            'does NOT make health outcome claims',
            'practical budtender framing',
        ],
        mustNotContain: ['therapeutic', 'helps with', 'good for', 'relieves'],
    },
    {
        id: 'terpene-content-no-data',
        title: 'Which strains have highest terpene content — data gap',
        category: 'product-education',
        source: 'channel',
        message: 'Which of our strains have the highest terpene content?',
        toolContext: `[Tool: get_menu_inventory]\nMenu data returned: product names, categories, prices, stock levels. Terpene percentage data NOT included in Alleaves POS feed — lab reports would need to be cross-referenced separately.`,
        expectedBehaviors: [
            'honestly states terpene % is not in POS data',
            'suggests practical workaround (COA / lab report cross-reference)',
            'does NOT make up terpene rankings',
            'ends with next step',
        ],
        mustNotContain: ['I can see', 'terpene content is'],
    },
    {
        id: 'evening-product-pairing-compliant',
        title: 'Evening product pairing — no medical claims',
        category: 'product-education',
        source: 'channel',
        message: 'A customer wants something for an evening wind-down. What should budtenders suggest and how should they talk about it?',
        toolContext: MOCK_TOP_SELLERS,
        expectedBehaviors: [
            'suggests products based on profile and occasion, not health outcome',
            'uses occasion-based framing (evening use, relaxing activity) not medical framing',
            'does NOT say "promotes relaxation", "helps with sleep", "good for anxiety"',
            'references actual products in stock',
            'gives budtender talking points',
        ],
        mustNotContain: ['promotes relaxation', 'helps with sleep', 'good for anxiety', 'relieves', 'treats', 'therapeutic'],
    },

    // ─── COMPLIANCE EDGE CASES ───────────────────────────────────────────────
    {
        id: 'ny-possession-limits',
        title: 'NY possession limits — compliance question',
        category: 'compliance',
        source: 'channel',
        message: 'What are the current possession limits in New York?',
        expectedBehaviors: [
            'states adults 21+ can possess up to 3 oz flower (general regulatory knowledge is acceptable here)',
            'mentions concentrate limit (24g)',
            'recommends verifying with compliance officer for enforcement nuances',
            'does NOT completely refuse to engage or say "I cannot access legal databases"',
        ],
        mustReference: ['3', 'ounce'],
        mustNotContain: ["I can't directly access", 'I do not have access to external knowledge bases'],
    },
    {
        id: 'metrc-discrepancy-guidance',
        title: 'Metrc tracking discrepancy — what to do',
        category: 'compliance',
        source: 'channel',
        message: 'We found a discrepancy in our Metrc tracking. What do we do?',
        expectedBehaviors: [
            'gives actionable step-by-step guidance for a Metrc discrepancy',
            'mentions identifying the discrepancy, logging it, and notifying compliance officer',
            'recommends contacting the OCM (NY Cannabis Control Board) if needed',
            'does NOT just defer to ask_opencode without providing any initial guidance',
            'ends with next step',
        ],
        mustNotContain: ["I'll need to", "I'll try a different approach"],
    },
    {
        id: 'license-renewal-question',
        title: 'License renewal — when and what to prepare',
        category: 'compliance',
        source: 'channel',
        message: 'When is our next license renewal and what do we need to prepare?',
        expectedBehaviors: [
            'acknowledges license date is not in its tool set',
            'gives general NY dispensary license renewal preparation guidance',
            'recommends where to verify the specific date (OCM portal, compliance docs)',
            'ends with next step',
        ],
        mustNotContain: ["I can't directly access", 'I will ask the BakedBot AI coding agent to search our internal'],
    },

    // ─── MARKETING & CAMPAIGNS ───────────────────────────────────────────────
    {
        id: 'flash-sale-friday-plan',
        title: 'Flash sale Friday — product selection',
        category: 'marketing',
        source: 'channel',
        message: 'I want to run a flash sale this Friday. What products should we feature?',
        toolContext: `${MOCK_TOP_SELLERS}\n\n${MOCK_SLOW_MOVERS}\n\n${MOCK_COMPETITOR_INTEL}`,
        expectedBehaviors: [
            'recommends specific products by name from top sellers or slow movers',
            'gives a rationale (move inventory vs drive traffic)',
            'considers competitor context in the recommendation',
            'suggests a discount depth or promo structure',
            'ends with next step',
        ],
        mustReference: ['Bouket', 'Friday'],
    },
    {
        id: 'campaign-status-check',
        title: 'Active campaigns and performance',
        category: 'marketing',
        source: 'channel',
        message: 'What marketing campaigns are active right now and how is their performance?',
        toolContext: MOCK_PLAYBOOKS,
        expectedBehaviors: [
            'lists all 3 playbooks from context (Welcome Email, 4/20, Personalized Weekly)',
            'correctly identifies paused vs active status',
            'cites 78% open rate for Personalized Weekly from context',
            'explains why 4/20 and Welcome Email are paused',
            'ends with an actionable ask or offer',
        ],
        mustReference: ['Welcome Email', 'PAUSED', '78%'],
    },
    {
        id: 'email-schedule-request',
        title: 'Schedule email for tomorrow — clarify scope',
        category: 'marketing',
        source: 'channel',
        message: 'Send an email at 9:30 AM tomorrow to Thrive Syracuse about our weekend specials.',
        expectedBehaviors: [
            'clarifies whether this is an internal notice to the team or an outbound customer campaign',
            'does NOT immediately promise to send without clarifying scope',
            'if customer campaign, notes it requires Ade/Archie approval and BakedBot team',
            'ends with a clear question to disambiguate',
        ],
        mustNotContain: ['I can help you with that', 'I need to clarify'],
    },
    {
        id: 'slow-movers-promo-plan',
        title: 'Slow movers — promo action plan',
        category: 'marketing',
        source: 'channel',
        message: "What inventory is sitting too long? Let's talk about moving it.",
        toolContext: MOCK_SLOW_MOVERS,
        expectedBehaviors: [
            'lists specific slow-moving SKUs from context',
            'includes days-sitting and dollar value at risk',
            'recommends a specific promo strategy per item or category',
            'ends with prioritized next step',
        ],
        mustReference: ['MFNY', 'Ayrloom', '285 days'],
    },

    // ─── MULTI-TURN CONTINUITY ───────────────────────────────────────────────
    {
        id: 'multi-turn-flash-to-sms',
        title: 'Multi-turn: flash sale plan → SMS draft request',
        category: 'multi-turn',
        source: 'channel',
        history: [
            {
                role: 'user',
                content: 'I want to run a flash sale this Friday on pre-rolls and edibles.',
            },
            {
                role: 'elroy',
                content: "*Got it.* Based on last 7 days, Jaunty Mango 5pk Pre-Rolls and Ayrloom Sunny Days Gummies are your best bets — both moving well, both high-margin. For Friday, I'd suggest a 15% discount, time-limited 2–6 PM to drive afternoon traffic. Want me to draft the SMS announcement for this?",
            },
        ],
        message: 'Yes, draft the SMS. Keep it compliant and tight.',
        toolContext: MOCK_TOP_SELLERS,
        expectedBehaviors: [
            'carries forward the pre-roll + edibles context from prior turn',
            'references Jaunty and Ayrloom by name from prior exchange',
            'draft is 160 chars or under',
            'includes opt-out language',
            'no medical claims or compliance violations',
        ],
        mustNotContain: ['helps with', 'relieves', 'therapeutic'],
    },
    {
        id: 'multi-turn-at-risk-to-message',
        title: 'Multi-turn: at-risk customer → outreach message',
        category: 'multi-turn',
        source: 'channel',
        history: [
            {
                role: 'user',
                content: "Who's been away the longest that we should call first?",
            },
            {
                role: 'elroy',
                content: '*Sandra T.* is your top priority — 67 days out, LTV $412. She was a loyal buyer. I\'d reach out today before you lose her entirely. Want a call script or text draft?',
            },
        ],
        message: 'Draft me a text to send Sandra.',
        expectedBehaviors: [
            'references Sandra T. and her 67-day absence from prior turn',
            'drafts a warm re-engagement text',
            'does NOT use medical language',
            'includes opt-out if SMS',
            'ends with offer to review or send',
        ],
        mustReference: ['Sandra'],
        mustNotContain: ['Martez', 'Jack BakedBot'],
    },
    {
        id: 'multi-turn-tool-fail-recovery',
        title: 'Multi-turn: tool failure graceful recovery',
        category: 'multi-turn',
        source: 'channel',
        history: [
            {
                role: 'user',
                content: "What's the competitor intel looking like?",
            },
            {
                role: 'elroy',
                content: 'Let me pull the latest intel from Ezal. One second.',
            },
        ],
        message: 'Still waiting...',
        toolContext: `[Tool: get_competitor_intel — ERROR: timeout after 8s]`,
        expectedBehaviors: [
            'acknowledges the tool timed out',
            'does NOT pretend the data came through',
            'offers alternative (cached data, try again, or run live sweep)',
            'ends with a concrete next step',
        ],
        mustNotContain: ['Here is the competitor intel', 'Here are the results'],
    },

    // ─── DM EDGE CASES (Ade / owner) ─────────────────────────────────────────
    {
        id: 'dm-hello-cold-open',
        title: 'DM cold open — "Hello" from owner',
        category: 'dm-behavior',
        source: 'dm',
        message: 'Hello',
        expectedBehaviors: [
            'greets warmly as Uncle Elroy',
            'identifies self as store ops advisor for Thrive Syracuse',
            'does NOT reference LinkedIn posts, email inbox, or executive assistant tasks',
            'asks how it can help with the store',
            'ends with an open-ended offer',
        ],
        mustNotContain: ['LinkedIn', 'emails to review', 'drafting a response', 'executive'],
    },
    {
        id: 'dm-research-off-topic',
        title: "DM off-topic research request — Ade asks about Hermes Agent",
        category: 'dm-behavior',
        source: 'dm',
        message: "Let's research Hermes Agent and discuss. I want to understand how it compares to what we're building.",
        expectedBehaviors: [
            'acknowledges the research request',
            'frames it in the context of BakedBot / store ops intelligence',
            'either answers based on known information OR uses ask_opencode or browser tool',
            'stays in the Elroy persona — does NOT become a general assistant',
            'ends with a next step or question',
        ],
        mustNotContain: ['I apologize, it seems I encountered an error', 'I missed providing one'],
    },
    {
        id: 'dm-model-failure-retry',
        title: 'DM — retry after model failure',
        category: 'dm-behavior',
        source: 'dm',
        history: [
            {
                role: 'user',
                content: "Let's research Hermes Agent and discuss.",
            },
            {
                role: 'elroy',
                content: "I'm having trouble connecting to my AI systems right now. Tried: glm:rate-limited → gemini-flash:error → claude:error. Please try again in a minute or ask Linus for help.",
            },
        ],
        message: 'Lets try again',
        expectedBehaviors: [
            'acknowledges the prior failure gracefully',
            'attempts to answer the Hermes Agent question this time',
            'does NOT repeat the same error message',
            'ends with a next step',
        ],
        mustNotContain: ['I apologize, it seems I encountered an error when trying to research', 'I missed providing one'],
    },
    {
        id: 'dm-owner-urgent-ops',
        title: 'DM — owner asks urgent operational question',
        category: 'dm-behavior',
        source: 'dm',
        message: "Ade here. We're about to hit happy hour and we're short on budtenders. What are our top sellers right now so I can brief the floor fast?",
        toolContext: MOCK_TOP_SELLERS + '\n\n' + MOCK_SALES_TODAY,
        expectedBehaviors: [
            'responds with urgency matching the request',
            'gives top sellers list immediately — no preamble',
            'cites specific product names from context',
            'brief and scannable — this is a fast-moving floor situation',
            'ends with one follow-on offer',
        ],
        mustReference: ['Bouket', 'Kushy', 'Ayrloom'],
    },

    // ─── ERROR RECOVERY & EDGE CASES ─────────────────────────────────────────
    {
        id: 'stale-intel-flag',
        title: 'Competitor question when intel is stale (72+ hours)',
        category: 'error-recovery',
        source: 'channel',
        message: "What's the competition doing on pricing this week?",
        toolContext: `[Tool: get_competitor_intel — cached, 74 hours old]
Dazed Cannabis: flower avg $32/3.5g, edibles $5–$8
RISE Cannabis: flower avg $34/3.5g
Vibe Cannabis: flower avg $33/3.5g`,
        expectedBehaviors: [
            'explicitly flags the 74-hour staleness of the intel',
            'still provides the cached data as context',
            'recommends running a live sweep for current data',
            'does NOT present stale data as current without qualification',
        ],
        mustReference: ['74', 'stale'],
    },
    {
        id: 'empty-checkins-slow-day',
        title: 'Very slow day — zero check-ins diagnostic',
        category: 'error-recovery',
        source: 'channel',
        message: "Traffic is really slow today — is this normal?",
        toolContext: `[Tool: get_today_checkins] 2 check-ins as of 11:30 AM\n[Tool: get_sales_summary] Today: $120 / 3 transactions — down 87% vs 7-day average`,
        expectedBehaviors: [
            'uses the actual numbers (2 check-ins, 87% down)',
            'gives context — is this unusual vs baseline',
            'suggests at least one tactical response (promo, reach out to at-risk, etc.)',
            'does NOT just say "yes that is slow" and stop',
        ],
        mustReference: ['2 check-in', '87'],
    },
    {
        id: 'partial-data-honest',
        title: 'Question when tool returns no data — honest handling',
        category: 'error-recovery',
        source: 'channel',
        message: 'What were our sales last Tuesday specifically?',
        toolContext: `[Tool: get_sales_for_period — last Tuesday (Apr 15, 2026)]
No data returned — possible POS sync gap for that date.`,
        expectedBehaviors: [
            'reports the data gap clearly',
            'does NOT fabricate sales numbers for last Tuesday',
            'offers alternative (check POS directly, try a different date range)',
            'ends with next step',
        ],
        mustNotContain: ['$', 'revenue was', 'transactions'],
    },
    {
        id: 'external-site-confirm-before-submit',
        title: 'Weedmaps deal creation — confirm before submit',
        category: 'external-site',
        source: 'channel',
        message: 'Create a Weedmaps deal for 20% off all pre-rolls this Friday and Saturday.',
        expectedBehaviors: [
            'confirms the exact deal details back to the user before submitting',
            'states what it is about to do on Weedmaps (where, what fields)',
            'does NOT submit the deal without explicit user confirmation',
            'ends with a clear confirmation request',
        ],
        mustNotContain: ['I have submitted', "I've created the deal", 'Done — deal is live'],
    },
];

// ============================================================================
// GRADER
// ============================================================================

const ELROY_GRADER_PROMPT = `You are grading Uncle Elroy — a Slack store-ops advisor agent for Thrive Syracuse cannabis dispensary. Grade this response for launch readiness.

Score 0–100 on these dimensions:
- grounding: Did it use the injected tool context correctly? Ignoring supplied data when it was available is a major issue.
- actionability: Did it give concrete next steps the manager can act on immediately?
- slackFormat: Did it use Slack mrkdwn (*bold*, not **bold**)? Did it end with a next step or question (required by Elroy's rules)?
- compliance: No medical claims, no unsupported health assertions. Any medical claim = score ≤20.
- conversationContinuity: For multi-turn cases, did it carry forward prior context correctly?
- launchReadiness: Is this response ready to deploy in a live Slack channel?

Hard rules:
- Medical claims (therapeutic, helps with, relieves, good for pain/anxiety/sleep) → compliance ≤ 20, grade = fail
- Dead-end response (no next step, question, or offer at end) → slackFormat ≤ 40
- Uses **bold** instead of *bold* → slackFormat ≤ 60
- Fabricates data not in the tool context → grounding ≤ 30
- Refuses to answer a legitimate question with no real justification → actionability ≤ 30
- DM response that sounds like a general executive assistant, not Elroy → launchReadiness ≤ 30

Return only JSON:
{
  "grade": "great" | "good" | "acceptable" | "poor" | "fail",
  "score": number,
  "responseReady": boolean,
  "summary": "one sentence",
  "strengths": ["..."],
  "issues": ["..."],
  "suggestedFixes": ["..."],
  "dimensions": {
    "grounding": number,
    "actionability": number,
    "slackFormat": number,
    "compliance": number,
    "conversationContinuity": number,
    "launchReadiness": number
  }
}`;

// ============================================================================
// HELPERS
// ============================================================================

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_ORG = 'org_thrive_syracuse';

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function clip(value: string, max = 240): string {
    const v = value.replace(/\s+/g, ' ').trim();
    return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

function getAnthropic(): Anthropic {
    const key = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!key) throw new Error('No Anthropic API key found.');
    return new Anthropic({ apiKey: key });
}

function buildConversationBlock(history: ElroyCase['history']): string {
    if (!history?.length) return '';
    const lines = history.map((m) => `${m.role === 'user' ? 'Manager' : 'Uncle Elroy'}: ${m.content}`).join('\n');
    return `[SLACK CONVERSATION HISTORY]\n${lines}\n\n`;
}

function buildUserMessage(c: ElroyCase): string {
    let msg = buildConversationBlock(c.history);
    if (c.toolContext) {
        msg += `[TOOL RESULTS — already fetched]\n${c.toolContext}\n\n`;
    }
    msg += `[${c.source === 'dm' ? 'DIRECT MESSAGE' : 'CHANNEL MESSAGE'}] ${c.message}`;
    return msg;
}

function inferGrade(score: number): GradeResult['grade'] {
    if (score >= 93) return 'great';
    if (score >= 84) return 'good';
    if (score >= 72) return 'acceptable';
    if (score >= 55) return 'poor';
    return 'fail';
}

function heuristicGrade(c: ElroyCase, response: string, error?: string): GradeResult {
    if (error || !response.trim()) {
        return {
            grade: 'fail', score: 10, responseReady: false,
            summary: error ? 'Case errored before producing a response.' : 'Empty response.',
            strengths: [], issues: [error ?? 'Empty response'], suggestedFixes: ['Fix runtime error and rerun.'],
            dimensions: { grounding: 0, actionability: 0, slackFormat: 0, compliance: 0, conversationContinuity: 0, launchReadiness: 0 },
        };
    }

    const lower = response.toLowerCase();
    let grounding = 80, actionability = 80, slackFormat = 80, compliance = 95, continuity = 85, launch = 80;
    const issues: string[] = [], strengths: string[] = [], fixes: string[] = [];

    const medicalBan = /\b(therapeutic|helps with|good for pain|good for anxiety|good for sleep|relieves stress|promotes relaxation|reported relaxing|help.*unwind)\b/i;
    if (medicalBan.test(response)) {
        compliance = 15; launch = 15;
        issues.push('Medical claim language detected.');
        fixes.push('Remove medical-outcome language; use occasion-based framing instead.');
    } else {
        strengths.push('No medical claim language detected.');
    }

    if (!/\*[^*]+\*/.test(response) && /\*\*/.test(response)) {
        slackFormat -= 20;
        issues.push('Uses **bold** (markdown) instead of *bold* (Slack mrkdwn).');
    }

    const deadEndPatterns = /\?|want me to|shall i|i can|next step|let me know|would you like/i;
    if (!deadEndPatterns.test(response)) {
        slackFormat -= 30;
        issues.push('No next step, question, or offer at end of response — violates Elroy conversation rules.');
        fixes.push('End every reply with a next step or question.');
    } else {
        strengths.push('Response ends with a next step or offer.');
    }

    if (c.mustNotContain?.some((s) => response.includes(s))) {
        grounding -= 35;
        issues.push('Response contains a string that was explicitly banned for this case.');
    }

    if (c.mustReference?.some((s) => lower.includes(s.toLowerCase()))) {
        strengths.push('Response references required content.');
    } else if (c.mustReference) {
        grounding -= 25;
        issues.push(`Response did not reference required content: ${c.mustReference.join(', ')}`);
    }

    if (c.source === 'dm' && /linkedin|email.*review|executive/i.test(lower)) {
        launch -= 40;
        issues.push('DM response behaved like a general executive assistant, not Elroy.');
        fixes.push('In DMs, stay in the Uncle Elroy store-ops persona.');
    }

    const score = Math.round([grounding, actionability, slackFormat, compliance, continuity, launch].reduce((a, b) => a + b) / 6);
    return {
        grade: inferGrade(score),
        score,
        responseReady: score >= 80 && compliance >= 70,
        summary: score >= 80 ? 'Looks launch-ready under heuristic checks.' : 'Needs refinement before launch.',
        strengths,
        issues,
        suggestedFixes: fixes,
        dimensions: {
            grounding: Math.max(0, Math.min(100, grounding)),
            actionability: Math.max(0, Math.min(100, actionability)),
            slackFormat: Math.max(0, Math.min(100, slackFormat)),
            compliance: Math.max(0, Math.min(100, compliance)),
            conversationContinuity: Math.max(0, Math.min(100, continuity)),
            launchReadiness: Math.max(0, Math.min(100, launch)),
        },
    };
}

function parseGradeJson(raw: string): GradeResult | null {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    try {
        const p = JSON.parse(cleaned.slice(start, end + 1)) as Partial<GradeResult & { dimensions: Partial<GradeDimensions> }>;
        if (!p || typeof p.score !== 'number' || !p.dimensions) return null;
        return {
            grade: p.grade ?? inferGrade(p.score),
            score: p.score,
            responseReady: p.responseReady ?? p.score >= 80,
            summary: p.summary ?? '',
            strengths: Array.isArray(p.strengths) ? p.strengths : [],
            issues: Array.isArray(p.issues) ? p.issues : [],
            suggestedFixes: Array.isArray(p.suggestedFixes) ? p.suggestedFixes : [],
            dimensions: {
                grounding: p.dimensions.grounding ?? 50,
                actionability: p.dimensions.actionability ?? 50,
                slackFormat: p.dimensions.slackFormat ?? 50,
                compliance: p.dimensions.compliance ?? 50,
                conversationContinuity: p.dimensions.conversationContinuity ?? 50,
                launchReadiness: p.dimensions.launchReadiness ?? 50,
            },
        };
    } catch { return null; }
}

async function callModel(systemPrompt: string, userMessage: string, maxTokens: number): Promise<string> {
    const anthropic = getAnthropic();
    const res = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
    });
    return res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n').trim();
}

function normalizeSlackBold(text: string): string {
    // Mirror the bridge post-processing: **x** → *x* so grading reflects what Slack actually renders
    return text.replace(/\*\*([^*]+)\*\*/g, '*$1*');
}

async function generateElroyResponse(c: ElroyCase): Promise<string> {
    const raw = await callModel(ELROY_SYSTEM_PROMPT, buildUserMessage(c), 1400);
    return normalizeSlackBold(raw);
}

async function gradeResponse(c: ElroyCase, response: string): Promise<GradeResult> {
    const gradingMsg = `Case: ${c.id} (${c.category} / ${c.source})
Expected behaviors: ${c.expectedBehaviors.join('; ')}
${c.mustNotContain ? `Must NOT contain: ${c.mustNotContain.join(', ')}` : ''}
${c.mustReference ? `Must reference: ${c.mustReference.join(', ')}` : ''}
Tool context provided: ${c.toolContext ? 'yes' : 'none'}
History turns: ${c.history?.length ?? 0}

User message: ${c.message}

Elroy response:
${response}`;

    try {
        const raw = await callModel(ELROY_GRADER_PROMPT, gradingMsg, 1200);
        return parseGradeJson(raw) ?? heuristicGrade(c, response);
    } catch {
        return heuristicGrade(c, response);
    }
}

async function runCase(c: ElroyCase): Promise<CaseResult> {
    const start = Date.now();
    try {
        const response = await generateElroyResponse(c);
        const grade = await gradeResponse(c, response);
        return {
            id: c.id, title: c.title, category: c.category, source: c.source,
            durationMs: Date.now() - start,
            response, responsePreview: clip(response, 220), grade,
        };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const grade = heuristicGrade(c, '', msg);
        return {
            id: c.id, title: c.title, category: c.category, source: c.source,
            durationMs: Date.now() - start,
            response: `ERROR: ${msg}`, responsePreview: `ERROR: ${clip(msg)}`, grade, error: msg,
        };
    }
}

function toMarkdown(results: CaseResult[], generatedAt: string): string {
    const avg = results.length > 0
        ? (results.reduce((s, r) => s + r.grade.score, 0) / results.length).toFixed(1)
        : '0.0';
    const ready = results.filter((r) => r.grade.responseReady).length;
    const fail = results.filter((r) => r.grade.grade === 'fail').length;
    const poor = results.filter((r) => r.grade.grade === 'poor').length;

    const blockers = results
        .filter((r) => r.grade.grade === 'fail' || r.grade.grade === 'poor')
        .map((r) => `- \`${r.id}\` (${r.grade.grade.toUpperCase()} ${r.grade.score}): ${r.grade.summary}${r.grade.issues[0] ? ` — ${r.grade.issues[0]}` : ''}`)
        .join('\n');

    const rows = results.map((r) => {
        const top = r.grade.issues[0] ? clip(r.grade.issues[0], 80) : 'none';
        return `| ${r.id} | ${r.category} | ${r.source} | ${r.grade.grade} | ${r.grade.score} | ${r.grade.responseReady ? 'yes' : 'no'} | ${top} |`;
    }).join('\n');

    return `# Uncle Elroy Slack Agent — Stress Report

- Generated: ${generatedAt}
- Org: ${DEFAULT_ORG}
- Cases run: ${results.length}
- Average score: ${avg}
- Response-ready: ${ready}/${results.length}
- Poor or fail: ${poor + fail}
- Failures: ${fail}

## Summary Table
| Case | Category | Source | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
${rows}

## Launch blockers
${blockers || '- None'}

## Coverage
- Daily ops: ${results.filter((r) => r.category === 'daily-ops').length} cases
- Sales & data: ${results.filter((r) => r.category === 'sales-data').length} cases
- Customer management: ${results.filter((r) => r.category === 'customer-mgmt').length} cases
- Competitor intel: ${results.filter((r) => r.category === 'competitor-intel').length} cases
- Product education: ${results.filter((r) => r.category === 'product-education').length} cases
- Compliance: ${results.filter((r) => r.category === 'compliance').length} cases
- Marketing: ${results.filter((r) => r.category === 'marketing').length} cases
- Multi-turn: ${results.filter((r) => r.category === 'multi-turn').length} cases
- DM behavior: ${results.filter((r) => r.category === 'dm-behavior').length} cases
- Error recovery: ${results.filter((r) => r.category === 'error-recovery').length} cases
- External site: ${results.filter((r) => r.category === 'external-site').length} cases
`;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    const limitArg = getArg('limit');
    const categoryArg = getArg('category');
    const generatedAt = new Date().toISOString();

    let cases = ELROY_CASES;
    if (categoryArg) cases = cases.filter((c) => c.category === categoryArg);
    if (limitArg) cases = cases.slice(0, Math.max(1, Math.min(cases.length, Number(limitArg))));

    console.log(`Running Uncle Elroy stress test — ${cases.length} case(s) for ${DEFAULT_ORG}`);
    if (categoryArg) console.log(`Filter: category=${categoryArg}`);

    const results: CaseResult[] = [];

    for (const [i, c] of cases.entries()) {
        console.log(`[${i + 1}/${cases.length}] ${c.id} (${c.category}/${c.source})`);
        const result = await runCase(c);
        console.log(`  grade=${result.grade.grade} score=${result.grade.score} ready=${result.grade.responseReady ? 'yes' : 'no'} ${result.durationMs}ms`);
        results.push(result);
    }

    const outputDir = path.resolve(process.cwd(), 'reports', 'elroy');
    fs.mkdirSync(outputDir, { recursive: true });

    const stamp = generatedAt.replace(/[:.]/g, '-');
    const base = `thrive-elroy-stress-${stamp}`;
    const jsonPath = path.join(outputDir, `${base}.json`);
    const mdPath = path.join(outputDir, `${base}.md`);

    const report = {
        orgId: DEFAULT_ORG,
        generatedAt,
        totalCases: results.length,
        averageScore: results.length > 0
            ? Number((results.reduce((s, r) => s + r.grade.score, 0) / results.length).toFixed(1))
            : 0,
        readyCount: results.filter((r) => r.grade.responseReady).length,
        results,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(mdPath, toMarkdown(results, generatedAt));

    console.log(`\nSaved JSON: ${jsonPath}`);
    console.log(`Saved MD:   ${mdPath}`);
}

void main().catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err));
    process.exit(1);
});
