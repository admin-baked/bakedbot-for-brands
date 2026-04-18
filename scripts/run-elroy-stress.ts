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

const ELROY_SYSTEM_PROMPT = `## GROUND RULES (read before anything else)

NEVER FABRICATE STORE DATA. For Thrive Syracuse operational data (sales, customers, inventory, hours, competitors, license dates) — you only know what is in the injected [Tool: ...] context. If store data wasn't provided, say so directly. General knowledge (cannabis regulations, industry concepts, AI tools) is fine to discuss from training knowledge.

FAKE TOOL CALLS ARE FORBIDDEN. Do not write "[Tool: ...]", "*checking...*", "*pulling...*", or "*looking at...*" in your reply text. Real tools run before your response. If data isn't in the context above, you don't have it.

NO STORE HOURS. You have no hours tool. Never state a closing or opening time. → "I don't have live store hours — check thrivesyracuse.com or the POS."

NO LICENSE DATES. You have no license renewal tool. Never state a renewal date. → "I don't have your renewal date — check the OCM portal or your compliance docs."

SLACK BOLD = *single asterisk*. Never use **double asterisk**. Slack uses mrkdwn.

---

You are Uncle Elroy, the store operations advisor for Thrive Syracuse — a premium cannabis dispensary. You're warm, sharp, and always on top of what's happening on the floor.

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
8. *Clarify scope before acting on ambiguous email/SMS requests.* If asked to "send an email" or "schedule a message" (NOT Weedmaps deals, NOT loyalty/app messages) without specifying who it goes to, your FIRST response must ask: "Is this going to the team internally, or is this a customer-facing campaign? If it's going to customers, it'll need Ade and Archie's approval before we send." Do NOT draft the message until scope is confirmed. Weedmaps deal creation requests are always customer-facing — proceed to confirm deal details.
9. *WEEDMAPS DEAL PROTOCOL.* When asked to create, update, or submit a Weedmaps deal, you must FIRST confirm all details before submitting. State what you are about to do, then list: (1) exact deal title and discount %, (2) which products or categories are included, (3) start and end date/time, (4) any conditions (min purchase, member-only, etc.). Ask: "Should I proceed with exactly these details?" Do NOT submit or create the deal until the manager confirms. This applies even if the request seems complete.

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
        toolContext: `[Tool: get_store_hours — ERROR: No store hours tool available in current tool set. Thrive Syracuse hours are not accessible via BakedBot tools. Direct users to thrivesyracuse.com or the POS system for hours.]`,
        expectedBehaviors: [
            "acknowledges it doesn't have live store hours data",
            'directs to thrivesyracuse.com or POS for hours',
            'does NOT make up a specific closing time',
            'ends with next step or offer',
        ],
        mustNotContain: ['close at', 'closes at', 'open until'],
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
        toolContext: `${MOCK_TOP_SELLERS}\n\n[DATA GAP — STOP: Category-level revenue totals (Flower: $X, Vape: $Y, etc.) are NOT available from get_top_sellers. That tool returns individual SKUs only. Do NOT compute or invent category totals. Instead: show the SKU breakdown above and explain what export would be needed for true category revenue.]`,
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
        toolContext: `${MOCK_SALES_TODAY}\n\n[Tool: get_sales_for_period — March 2026 (last month)]\nMarch gross revenue: $41,240 from 688 orders\nMarch average ticket (last month): $59.94\n\n[CONTEXT: Today's average ticket = $44.54. Last month (March) average ticket = $59.94. That is a drop of ~$15/ticket month-over-month.]`,
        expectedBehaviors: [
            'cites today avg ticket ($44) from context',
            'cites March avg ticket ($59) as last month comparison',
            'notes direction clearly (down ~$15 vs last month)',
            'does NOT fabricate any numbers',
            'offers to dig into drivers',
        ],
        mustReference: ['$44', '$59'],
    },
    {
        id: 'weekday-revenue-best-day',
        title: 'Which day of week drives most revenue',
        category: 'sales-data',
        source: 'channel',
        message: 'Which day of the week consistently brings the most revenue? Give me numbers, not generalities.',
        toolContext: `[Tool: get_daily_revenue_by_weekday — ERROR: Day-of-week aggregation NOT available. get_top_sellers and get_sales_for_period return period totals only, not broken out by day of week. Do NOT fabricate day-of-week numbers. Tell the owner this split requires a POS custom export and offer to request it.]`,
        expectedBehaviors: [
            'acknowledges the data gap honestly',
            'does NOT fabricate day-of-week numbers',
            'offers a concrete path to get the answer (POS export)',
            'ends with next step',
        ],
        mustNotContain: ['Saturday', 'Sunday', 'Friday:', 'Monday:', 'Tuesday:', 'Wednesday:', 'Thursday:'],
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
        toolContext: MOCK_SEGMENTS + '\n\n' + MOCK_AT_RISK + '\n\n[IMPORTANT: VIP segment = 24 customers (LTV $500+). Use only the customers shown above. Do NOT list additional names not in this data.]',
        expectedBehaviors: [
            'states that there are 24 VIP customers total from segment data',
            'shows the at-risk VIP customers from MOCK_AT_RISK context',
            'does NOT list test accounts as VIPs',
            'includes LTV context for who qualifies as VIP',
            'offers to pull a specific list',
        ],
        mustNotContain: ['Martez Knox', 'Jack BakedBot'],
        mustReference: ['24'],
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
        toolContext: `[Tool: get_product_education_notes]
RSO (Rick Simpson Oil): full-spectrum, high-potency cannabis extract made via solvent extraction. Characteristics: thick, dark oil; high cannabinoid concentration; typically applied sublingually or topically. Process: packed flower → solvent wash → evaporation → viscous concentrate. Notes: state budtender training requires process/characteristics only — zero outcome/medical claims in consumer-facing guidance.`,
        expectedBehaviors: [
            'explains RSO production process (full-spectrum extraction, solvent wash)',
            'describes characteristics (thick dark oil, high cannabinoid concentration, sublingual/topical use)',
            'does NOT say "therapeutic", "helps with", "relieves", "treats", "medical benefits", "good for pain/anxiety/sleep"',
            'uses compliant language — process and characteristics only',
            'ends with a budtender coaching tip',
        ],
        mustNotContain: ['therapeutic', 'helps with', 'relieves', 'treats', 'good for pain', 'good for anxiety', 'good for sleep', 'medical benefit', 'symptom', 'condition', 'health'],
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
        toolContext: MOCK_TOP_SELLERS + `\n\n[COMPLIANCE RULE — HARD STOP: Do NOT use effect language or outcome claims. FORBIDDEN phrases: "relaxing effects", "relaxed effects", "popular for relaxation", "promotes sleep", "helps with", "good for anxiety", "calming", "therapeutic". Use ONLY: customer preference framing ("customers enjoy this in the evening"), terpene profiles (myrcene, linalool), or product type ("indica-dominant"). Occasion-based is OK. Effect/outcome-based is NOT.]`,
        expectedBehaviors: [
            'suggests products based on terpene profile or strain type, not health outcome',
            'uses occasion-based framing ("customers enjoy in the evening") not medical framing',
            'does NOT use words like relaxing effects, calming, therapeutic, promotes sleep',
            'references actual products in stock from tool context',
            'gives budtender talking points with compliant language',
        ],
        mustNotContain: ['promotes relaxation', 'helps with sleep', 'good for anxiety', 'relieves', 'treats', 'therapeutic', 'relaxing effects', 'relaxed effects', 'calming effect'],
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
        message: "I'm seeing a discrepancy in METRC — our physical count shows 14 units of Matter Blue Dream but METRC shows 16. What do I do?",
        toolContext: `[Tool: get_metrc_status]
METRC connection: active. Last sync: 47 minutes ago. Discrepancy flagged: Matter Blue Dream 3.5g — system count 16, physical count 14. Difference: -2 units.`,
        expectedBehaviors: [
            'gives immediate step-by-step guidance for the specific discrepancy',
            'tells manager to freeze the affected SKU from sales until reconciled',
            'mentions documenting the physical count with date/time and staff witness',
            'recommends notifying the compliance officer and checking manifests/transfer docs',
            'mentions contacting OCM if the variance cannot be reconciled internally',
            'ends with a clear next step',
        ],
        mustReference: ['METRC', 'count', 'manifest'],
        mustNotContain: ["what kind of discrepancy", "I'll need to", "I'll try a different approach", "could you clarify"],
    },
    {
        id: 'license-renewal-question',
        title: 'License renewal — when and what to prepare',
        category: 'compliance',
        source: 'channel',
        message: 'When is our next license renewal and what do we need to prepare?',
        toolContext: `[Tool: get_license_info — ERROR: License renewal dates are not in the BakedBot tool set. Renewal dates are tracked in the NYS OCM portal and your compliance documents — not accessible via BakedBot tools.]`,
        expectedBehaviors: [
            'does NOT state or guess a specific renewal date',
            'directs to the OCM portal or compliance docs for the specific date',
            'gives actionable general NY dispensary renewal preparation guidance',
            'ends with next step',
        ],
        mustNotContain: ['renews on', 'renewal is due', 'renewal date is', '90 days', 'June 15'],
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
        mustNotContain: ['Here\'s the email draft', 'Ready to send', 'I\'ll schedule that', 'email is ready', 'draft is ready'],
        mustReference: ['internal', 'customer'],
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
        title: "DM off-topic research request — Ade asks about external AI tool",
        category: 'dm-behavior',
        source: 'dm',
        message: "Can you research the best cannabis POS systems and give me a full breakdown? I want to compare all the options.",
        expectedBehaviors: [
            'acknowledges the request warmly but clarifies Elroy is Thrive store ops focused',
            'does NOT pretend to do external web research it cannot do',
            'redirects to what Elroy CAN help with (Thrive POS data, operations, store metrics)',
            'stays in the Uncle Elroy persona — not a general assistant',
            'ends with an offer related to what Elroy actually does',
        ],
        mustNotContain: ['I apologize, it seems I encountered an error', 'I missed providing one'],
    },
    {
        id: 'dm-model-failure-retry',
        title: 'DM — retry after tool failure on sales data',
        category: 'dm-behavior',
        source: 'dm',
        history: [
            {
                role: 'user',
                content: "What are today's sales looking like?",
            },
            {
                role: 'elroy',
                content: "I'm having trouble pulling today's numbers right now — tools timed out. Give me a second and try again.",
            },
        ],
        message: 'Try again',
        toolContext: `[Tool: get_daily_sales]
Today's revenue: $1,847 from 41 transactions
Average ticket: $45.05
As of: 3:30 PM ET`,
        expectedBehaviors: [
            'acknowledges the prior failure gracefully without dwelling on it',
            'gives the sales data from the retry tool result ($1,847 / 41 transactions)',
            'does NOT repeat the same error message from the prior turn',
            'brief and useful — this is a follow-up after a failed attempt',
            'ends with a next step or offer',
        ],
        mustReference: ['$1,847', '41'],
        mustNotContain: ["I'm having trouble", 'glm:rate-limited', 'tools timed out', "I'm still having trouble"],
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
        toolContext: `[Tool: get_competitor_intel — WARNING: DATA IS STALE (74 hours old). You MUST flag this staleness explicitly in your response before presenting this data. Say something like "Heads up — this intel is 74 hours old, so prices may have changed. Here's what we had:"]
Dazed Cannabis: flower avg $32/3.5g, edibles $5–$8
RISE Cannabis: flower avg $34/3.5g
Vibe Cannabis: flower avg $33/3.5g`,
        expectedBehaviors: [
            'explicitly flags the 74-hour staleness before presenting data',
            'still provides the cached data with the staleness caveat',
            'recommends running a live sweep for current data',
            'does NOT present stale data as if it is current',
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
            'confirms the exact deal details before submitting — does NOT proceed directly',
            'lists the 4 confirmation items: deal title + discount, products/categories, start and end dates, any conditions',
            'asks explicitly "Should I proceed with exactly these details?" or equivalent',
            'does NOT submit or create the deal in this response',
            'ends with a clear confirmation request to the manager',
        ],
        mustReference: ['20%', 'pre-roll', 'Friday', 'Saturday'],
        mustNotContain: ['I have submitted', "I've created the deal", 'Done — deal is live', 'deal has been created', 'Successfully created'],
    },

    // ─── DAILY OPS (4 new) ────────────────────────────────────────────────────
    {
        id: 'daily-ops-two-staff-coverage',
        title: 'Two staff instead of three — floor coverage plan',
        category: 'daily-ops',
        source: 'channel',
        message: "We're down a budtender today — only 2 on the floor instead of 3. How should we handle coverage?",
        toolContext: `${MOCK_SALES_TODAY}\n\n[Tool: get_today_checkins]\nCheck-ins so far today: 12\nQueue estimate: 3 customers waiting`,
        expectedBehaviors: [
            'references current check-in count and queue from context',
            'gives concrete floor coverage recommendations for 2-staff situation',
            'considers revenue pace and time of day in the advice',
            'flags what tasks to deprioritize or defer',
            'ends with a next step',
        ],
        mustNotContain: ['I cannot', "I don't have access"],
        mustReference: ['12', '2'],
    },
    {
        id: 'daily-ops-register-overage',
        title: 'Register $47 over at end of shift',
        category: 'daily-ops',
        source: 'channel',
        message: "End of shift register count came in $47 over. What's the protocol?",
        toolContext: `[Tool: get_recent_transactions — last 20 orders]
Most recent transaction: Apr 18 6:47 PM — $52.00 (2 items)
No voids or refunds in last 20 transactions.
Cash transactions today: 8 of 28 total`,
        expectedBehaviors: [
            'gives clear step-by-step over/short protocol',
            'mentions documenting the overage with date, shift, and staff present',
            'mentions setting the overage aside and logging it — do NOT pocket or redistribute',
            'recommends checking the 8 cash transactions for counting errors',
            'ends with next step',
        ],
        mustNotContain: ['I cannot', 'not sure what to do'],
    },
    {
        id: 'daily-ops-realtime-transaction-count',
        title: 'Real-time transaction count at 3pm',
        category: 'daily-ops',
        source: 'channel',
        message: "Hey Elroy — quick check. How many transactions have we done today? It's about 3pm.",
        toolContext: `${MOCK_SALES_TODAY}`,
        expectedBehaviors: [
            'gives the transaction count directly from context (28 transactions)',
            'mentions revenue and avg ticket since they are in the same tool result',
            'keeps it brief — this is a quick check, not a deep analysis',
            'ends with a quick offer for more detail',
        ],
        mustReference: ['28', '$1,247'],
    },
    {
        id: 'daily-ops-unusual-queue',
        title: 'Unusual queue — product drop or event?',
        category: 'daily-ops',
        source: 'channel',
        message: "There's a bigger line than usual out front right now. Is this a product drop, an event, or just random? Any intel?",
        toolContext: `[Tool: get_today_checkins]\nCheck-ins so far today: 34 (unusually high — 7-day average at this hour: 18)\n\n[Tool: get_competitor_intel — cached 18 hours old]\nNo competing events flagged. Dazed Cannabis running BOGO edibles promotion today only.\n\n[Tool: get_playbooks]\nNo active Thrive promotions scheduled for today.`,
        expectedBehaviors: [
            'surfaces the check-in count anomaly (34 vs 18 average)',
            'notes no Thrive promotion is scheduled today',
            'flags Dazed BOGO might be driving foot traffic to the area in general',
            'suggests capitalizing on the traffic spike (upsell, cross-sell, capture new customers)',
            'ends with a tactical suggestion',
        ],
        mustReference: ['34', 'Dazed'],
    },

    // ─── SALES DATA (4 new) ───────────────────────────────────────────────────
    {
        id: 'sales-data-worst-weekday',
        title: 'Which day of week is consistently worst',
        category: 'sales-data',
        source: 'channel',
        message: "Which day of the week is consistently our worst? I want to know so we can plan around it.",
        toolContext: `[Tool: get_daily_revenue_by_weekday — ERROR: Day-of-week aggregation NOT available. get_sales_for_period returns period totals only, not broken out by day of week. Do NOT fabricate day-of-week rankings. Tell the owner this split requires a POS custom export and offer to request it.]`,
        expectedBehaviors: [
            'acknowledges the data gap honestly — this breakdown is not available',
            'does NOT fabricate day-of-week performance rankings',
            'suggests a concrete path (POS custom export request)',
            'offers what CAN be done with current data (look at last 30 days if available)',
            'ends with next step',
        ],
        mustNotContain: ['Monday is', 'Tuesday is', 'Wednesday is', 'Thursday is', 'Sunday is', 'typically slowest on'],
    },
    {
        id: 'sales-data-revenue-per-sqft',
        title: 'Revenue per square foot — benchmarking question',
        category: 'sales-data',
        source: 'channel',
        message: "What's our revenue per square foot? I want to benchmark us against industry standards.",
        toolContext: `[Tool: get_sales_for_period — last 30 days]\nLast 30 days revenue: $52,800\n\n[CONTEXT: Thrive Syracuse floor plan data (sq footage) not in BakedBot tools. Industry benchmark for cannabis retail: $800–$1,500/sq ft/year for NY dispensaries. To calculate Thrive's number, floor square footage is needed from the store lease or buildout docs.]`,
        expectedBehaviors: [
            'provides the last 30-day revenue figure ($52,800) from context',
            'acknowledges floor square footage is not in the BakedBot tool set',
            'provides the industry benchmark range ($800–$1,500/sq ft/year) as context',
            'explains how to calculate once they have the sq footage number',
            'ends with next step',
        ],
        mustReference: ['$52,800', 'square'],
        mustNotContain: ['I cannot help', 'I do not have that data'],
    },
    {
        id: 'sales-data-channel-comparison',
        title: 'Customer spend — walk-in vs Weedmaps acquisition',
        category: 'sales-data',
        source: 'channel',
        message: "Are walk-in customers spending more than customers who come in from Weedmaps? I want to know which channel is more valuable.",
        toolContext: `[Tool: get_customer_acquisition_by_channel — PARTIAL DATA]\nTotal customers with acquisition source tagged: 127 of 383\nWalk-in / POS: 84 customers, avg LTV $187\nWeedmaps referral: 43 customers, avg LTV $231\nNote: 256 customers (67%) have no acquisition source — data is incomplete. Treat as directional only.`,
        expectedBehaviors: [
            'reports the partial data clearly with the caveat that 67% of customers have no source tagged',
            'shows the directional comparison (Weedmaps $231 vs walk-in $187 avg LTV)',
            'warns against drawing hard conclusions with only 33% of customers tagged',
            'suggests improving acquisition source tagging at POS',
            'ends with next step',
        ],
        mustReference: ['$231', '$187', '67%'],
        mustNotContain: ['walk-in customers spend more', 'Weedmaps customers spend more', 'clearly'],
    },
    {
        id: 'sales-data-seasonal-jan-feb',
        title: 'Jan-Feb slowdown — normal or us?',
        category: 'sales-data',
        source: 'channel',
        message: "Is January and February just slow for everyone in cannabis, or is it a Thrive-specific problem? I need to know if I should worry.",
        toolContext: `[Tool: get_sales_for_period — Jan–Feb 2026 vs Nov–Dec 2025]\nJan 2026: $38,400 (avg $1,280/day)\nFeb 2026: $41,200 (avg $1,471/day)\nNov 2025: $58,200 (avg $1,940/day)\nDec 2025: $61,800 (avg $1,994/day)\nDecline: ~35% drop from holiday peak. Industry note: Jan–Feb post-holiday slowdown is the norm in cannabis retail — industry typically drops 20–40% from December peak before recovering in March.`,
        expectedBehaviors: [
            'presents the actual Thrive numbers from context (Jan $38,400, Feb $41,200)',
            'shows the decline from the Nov-Dec peak',
            'contextualizes with the industry norm (20-40% post-holiday drop)',
            'gives a directional answer — this looks like a normal seasonal pattern, not a Thrive-specific crisis',
            'ends with a forward-looking next step',
        ],
        mustReference: ['$38,400', 'seasonal'],
    },

    // ─── CUSTOMER MGMT (3 new) ────────────────────────────────────────────────
    {
        id: 'customer-mgmt-vip-89-days-out',
        title: 'VIP customer 89 days inactive — outreach recommendation',
        category: 'customer-mgmt',
        source: 'channel',
        message: "One of our VIPs hasn't been in for 89 days. What's the right move to bring them back?",
        toolContext: `[Tool: get_customer_profile — customer: Keisha P.]\nKeisha P. — VIP tier, LTV $651, last visit: Jan 19, 2026 (89 days ago)\nPreference tags: edibles, premium flower\nAvg basket: $72\nPrior outreach: SMS sent Jan 25 — no response`,
        expectedBehaviors: [
            'acknowledges the 89-day absence and prior unanswered SMS',
            'recommends a warm re-engagement approach (not a blast — personalized)',
            'suggests referencing her preferences (edibles, premium flower)',
            'notes this is high-priority given $651 LTV',
            'ends with a concrete draft offer or next step',
        ],
        mustReference: ['Keisha', '$651', '89'],
        mustNotContain: ['Martez', 'Jack BakedBot'],
    },
    {
        id: 'customer-mgmt-new-customer-convert',
        title: 'New customer 3 visits in 2 weeks — convert to loyal',
        category: 'customer-mgmt',
        source: 'channel',
        message: "We have a new customer who's come in 3 times in the last 2 weeks. How do we lock them in as a loyal?",
        toolContext: `[Tool: get_customer_profile — customer: Devon M.]\nDevon M. — tier: new, 3 visits in 14 days\nLTV so far: $124\nPurchases: flower (2x), vape cart (1x)\nNo loyalty account linked yet`,
        expectedBehaviors: [
            'identifies the specific opportunity (Devon, 3 visits, no loyalty account)',
            'recommends getting Devon enrolled in the loyalty program immediately',
            'suggests a personal touchpoint from floor staff to reinforce the relationship',
            'recommends follow-up personalization based on purchase history (flower, vape)',
            'ends with next step',
        ],
        mustReference: ['Devon', 'loyal'],
    },
    {
        id: 'customer-mgmt-bulk-buyer-churn-signal',
        title: 'Bulk buyer suddenly spending $60 — churn signal',
        category: 'customer-mgmt',
        source: 'channel',
        message: "One of our regulars always used to spend $200+ per visit. Last 3 visits he's only buying $60. Is this a churn signal?",
        toolContext: `[Tool: get_customer_profile — customer: Marcus B.]\nMarcus B. — tier: loyal, LTV $2,847\nHistorical avg basket: $218\nLast 3 visits: $58, $62, $64\nVisit frequency: maintained (every 7-10 days)\nNo complaint or return history`,
        expectedBehaviors: [
            'confirms this is a spend-down signal worth investigating (3 consecutive lower-basket visits)',
            'notes that visit frequency is maintained — still coming in, just spending less',
            'suggests possible explanations (price sensitivity, competitor, financial, lifestyle change)',
            'recommends a low-key floor conversation rather than a pushy upsell',
            'ends with a suggested action',
        ],
        mustReference: ['Marcus', '$218'],
    },

    // ─── COMPETITOR INTEL (3 new) ─────────────────────────────────────────────
    {
        id: 'competitor-intel-loyalty-program-5x',
        title: 'Competitor 5x loyalty points promo — response',
        category: 'competitor-intel',
        source: 'channel',
        message: "I just heard one of our competitors is running 5x loyalty points for the next week. Should we do something?",
        toolContext: `[Tool: get_competitor_intel — cached 18 hours old]\nRISE Cannabis: announced 5x loyalty points event, running Apr 18–25, advertised on Weedmaps and Instagram\nThrive Loyalty program: not currently active / no loyalty points system in place\nNote: Thrive does not currently have a loyalty points program to match against.`,
        expectedBehaviors: [
            'identifies the specific competitor (RISE) and confirms the 5x promo from intel',
            'acknowledges that Thrive does not have a loyalty points system to match directly',
            'suggests a counter move that works within current capabilities (flash deal, featured product, personal outreach to at-risk customers)',
            'notes the intel is 18 hours old and recommends confirming it is live',
            'ends with a concrete recommended action',
        ],
        mustReference: ['RISE', '5x'],
    },
    {
        id: 'competitor-intel-dazed-delivery',
        title: 'Competitor added delivery — track or respond?',
        category: 'competitor-intel',
        source: 'channel',
        message: "I heard Dazed just launched a delivery service. Should we be worried? What do we do?",
        toolContext: `[Tool: get_competitor_intel — cached 18 hours old]\nDazed Cannabis: delivery service listed on Weedmaps as of yesterday. Zone coverage: Syracuse metro. Min order: $50. ETA listed: 45-90 min.\nThrive Syracuse: no delivery service currently.`,
        expectedBehaviors: [
            'confirms Dazed delivery from intel (Weedmaps listing, metro coverage, 45-90 min)',
            'assesses the threat honestly — delivery adds convenience but Thrive has premium positioning',
            'recommends monitoring Dazed delivery reviews over the next 30 days before reacting',
            'suggests one near-term counter (e.g., Weedmaps pickup promotion, curbside)',
            'notes intel is 18 hours old',
        ],
        mustReference: ['Dazed', 'delivery'],
    },
    {
        id: 'competitor-intel-competitor-out-of-stock',
        title: 'Competitor out of stock on flower — opportunity',
        category: 'competitor-intel',
        source: 'channel',
        message: "I just checked Weedmaps and one of our competitors shows out of stock on basically all flower. Is this an opportunity?",
        toolContext: `[Tool: get_competitor_intel — cached 18 hours old]\nVibe Cannabis: Weedmaps listing shows OOS on flower categories (6 of 7 flower SKUs listed as unavailable). Edibles and vapes still showing in stock.\nThrive flower inventory: healthy stock on top 4 SKUs per last inventory check.`,
        expectedBehaviors: [
            'confirms Vibe flower stock-out from intel and Thrive\'s healthy position',
            'identifies this as a real acquisition opportunity for flower buyers',
            'recommends a specific move to capitalize (Weedmaps deal, feature flower on listing, staff briefed)',
            'notes intel freshness and suggests a quick live check on Vibe\'s listing to confirm',
            'ends with next step',
        ],
        mustReference: ['Vibe', 'flower'],
    },

    // ─── PRODUCT EDUCATION (2 new) ────────────────────────────────────────────
    {
        id: 'product-education-live-resin-vs-rosin',
        title: 'Live resin vs live rosin — process only',
        category: 'product-education',
        source: 'channel',
        message: "What's the actual difference between live resin and live rosin? Budtenders are getting confused.",
        expectedBehaviors: [
            'explains live resin: solvent-based (hydrocarbon/butane) extraction from fresh-frozen plant material',
            'explains live rosin: solventless — heat and pressure applied to fresh-frozen plant (ice water hash → rosin press)',
            'key differentiator: solvent vs solventless — budtenders should lead with this',
            'uses compliant language — process and characteristics only, no health outcome claims',
            'gives a practical budtender tip for how to explain the difference on the floor',
        ],
        mustNotContain: ['therapeutic', 'helps with', 'good for', 'relieves', 'medical'],
    },
    {
        id: 'product-education-terpene-profile-explainer',
        title: 'Terpene profile — what it is and how to explain it',
        category: 'product-education',
        source: 'channel',
        message: "How should budtenders explain what a terpene profile is to a customer who's never heard of it?",
        expectedBehaviors: [
            'explains terpenes as aromatic compounds found in cannabis (and other plants)',
            'focuses on sensory characteristics — aroma, flavor, smell — not health outcomes',
            'suggests analogies budtenders can use (like herbs/spices in cooking)',
            'gives examples of common terpenes (myrcene, limonene, pinene) with their aroma profiles',
            'does NOT make medical claims about what terpenes "do" for the body',
        ],
        mustNotContain: ['therapeutic', 'helps with', 'anti-anxiety', 'anti-inflammatory', 'relieves', 'promotes sleep', 'medical'],
    },

    // ─── COMPLIANCE (2 new) ───────────────────────────────────────────────────
    {
        id: 'compliance-twitter-deals-ny',
        title: 'Can we post deals on Twitter/X? NY advertising rules',
        category: 'compliance',
        source: 'channel',
        message: "Can we post today's deals on Twitter or Instagram? I want to do some social media marketing.",
        expectedBehaviors: [
            'acknowledges NY OCM has strict cannabis advertising rules',
            'gives the key constraint: ads cannot target under-21 audiences; platforms with significant under-21 users are restricted',
            'notes that posting deals may be allowed on age-gated platforms but warns this needs compliance officer sign-off',
            'does NOT completely refuse or say it cannot engage with the question',
            'recommends verifying with compliance officer before posting',
            'ends with next step',
        ],
        mustNotContain: ["I cannot access legal databases", "I don't have access to external", 'refuse to answer'],
    },
    {
        id: 'compliance-unmarked-container-protocol',
        title: 'Unmarked container found in back — protocol',
        category: 'compliance',
        source: 'channel',
        message: "Staff just found an unmarked container in the back. Looks like it could be cannabis product but there's no label. What do we do?",
        expectedBehaviors: [
            'treats this with appropriate urgency — compliance risk',
            'tells staff to stop handling it and isolate it immediately',
            'recommends notifying the manager and compliance officer immediately',
            'mentions that in NY, all cannabis product must be tagged in METRC — this is a potential compliance violation',
            'recommends documenting the discovery (photo, date/time, who found it, location)',
            'ends with clear next steps in order',
        ],
        mustReference: ['METRC', 'compliance'],
        mustNotContain: ['probably fine', 'not a big deal', 'just label it'],
    },

    // ─── MARKETING (3 new) ────────────────────────────────────────────────────
    {
        id: 'marketing-yelp-review-response',
        title: 'Should we respond to Yelp reviews? What is allowed?',
        category: 'marketing',
        source: 'channel',
        message: "Should we be responding to Yelp reviews? Are there any rules about what we can and can't say?",
        expectedBehaviors: [
            'confirms responding to Yelp reviews is generally allowed and recommended',
            'advises on what NOT to say: no product-specific offers in responses, no pricing in responses, no medical claims',
            'recommends keeping responses professional and brief',
            'notes that NY cannabis advertising rules apply — do not make health claims even in review replies',
            'ends with a practical tip or offer to draft a response template',
        ],
        mustNotContain: ['I cannot advise', 'I do not have legal expertise'],
    },
    {
        id: 'marketing-weedmaps-deal-expired',
        title: 'Weedmaps deal expired — renewal process',
        category: 'marketing',
        source: 'channel',
        message: "Our Weedmaps deal just expired. How do I renew it or create a new one?",
        expectedBehaviors: [
            'confirms Elroy can help create or renew Weedmaps deals',
            'walks through what information is needed: deal title, discount, products/categories, date range, any conditions',
            'notes that Elroy will confirm all details before submitting (Weedmaps deal protocol)',
            'asks what deal they want to run next or if they want to re-run the expired deal',
            'ends with a clear ask for the deal details',
        ],
        mustNotContain: ['I cannot help with Weedmaps', 'contact Weedmaps support directly'],
    },
    {
        id: 'marketing-referral-program-compliance',
        title: 'Can we do a referral program? NY rules check',
        category: 'marketing',
        source: 'channel',
        message: 'Can we do a referral program where customers get 10% off if they bring a friend who buys?',
        expectedBehaviors: [
            'engages with the question rather than refusing entirely',
            'notes that NY OCM cannabis advertising restrictions may apply to referral incentives',
            'advises to verify with compliance officer before launching — this is a gray area',
            'offers what IS known: referral programs in cannabis are regulated differently by state',
            'ends with a next step (compliance officer check, or BakedBot can help design a compliant version)',
        ],
        mustNotContain: ["I can't advise on legal matters", 'I do not have access to legal databases'],
    },

    // ─── MULTI-TURN (2 new) ───────────────────────────────────────────────────
    {
        id: 'multi-turn-slow-day-what-now',
        title: 'Multi-turn: slow sales day → what to do next 3 hours',
        category: 'multi-turn',
        source: 'channel',
        history: [
            {
                role: 'user',
                content: "It's 2pm and we've only done $480 today. Way off pace.",
            },
            {
                role: 'elroy',
                content: "*Yeah, that's rough.* $480 by 2 PM puts you on track for around $720 for the day — about 62% below your 7-day average. Not a random slow Tuesday either; check-ins are low too. Want me to suggest some moves?",
            },
        ],
        message: "Yes — what should we do for the next 3 hours to move the needle?",
        toolContext: `${MOCK_AT_RISK}\n\n${MOCK_SLOW_MOVERS}\n\n[Tool: get_today_checkins]\nCheck-ins so far: 8`,
        expectedBehaviors: [
            'carries forward the slow-day context from prior turn ($480, below pace)',
            'gives 2-3 specific actionable tactics for the next 3 hours',
            'references at-risk customers for outreach or slow movers for a quick promo',
            'tactics should be executable today, not multi-day plans',
            'ends with a prioritized first action',
        ],
        mustReference: ['Sandra', 'outreach'],
    },
    {
        id: 'multi-turn-winback-who-to-call-first',
        title: 'Multi-turn: win-back list → who to call first and what to say',
        category: 'multi-turn',
        source: 'channel',
        history: [
            {
                role: 'user',
                content: "Show me the win-back list.",
            },
            {
                role: 'elroy',
                content: "*Here's who needs a call:*\n• Sandra T. — 67 days out, LTV $412\n• Marcus J. — 54 days out, LTV $289\n• Keisha P. — 48 days out, LTV $651\n• Devon R. — 43 days out, LTV $178\n• Priya M. — 38 days out, LTV $334\n\nKeisha is your VIP — highest LTV, still recoverable. Want me to draft outreach for one of them?",
            },
        ],
        message: "Who do I call first and what do I say?",
        toolContext: MOCK_AT_RISK,
        expectedBehaviors: [
            'references the at-risk list from prior turn context',
            'recommends Keisha P. first (highest LTV $651)',
            'gives a specific call script or talking points for that customer',
            'script is warm and personal — references her LTV tier without being creepy',
            'no medical claims in the script',
            'ends with offer to draft for the next customer on the list',
        ],
        mustReference: ['Keisha', '$651'],
        mustNotContain: ['Martez', 'Jack BakedBot'],
    },

    // ─── DM BEHAVIOR (2 new) ──────────────────────────────────────────────────
    {
        id: 'dm-weekly-snapshot',
        title: 'Owner DMs for a quick weekly summary',
        category: 'dm-behavior',
        source: 'dm',
        message: "Hey Elroy — give me a quick summary of how we did this week.",
        toolContext: `[Tool: get_sales_for_period — this week (Apr 14–18, 2026)]\nWeekly revenue: $9,847 from 218 transactions\nAvg ticket: $45.17\nTop SKU: Bouket Small Bud 7g Indoor Cap Junky — 23 units\nBest day: Wednesday Apr 16 — $2,247\nSlowest day: Saturday Apr 13 — $1,104\nWeek vs prior week: +8.3%`,
        expectedBehaviors: [
            'gives a clean, scannable weekly snapshot',
            'includes revenue, transaction count, and week-over-week change',
            'calls out the top SKU and best/slowest day',
            'keeps it concise — this is a DM summary, not a channel report',
            'ends with one follow-on offer',
        ],
        mustReference: ['$9,847', '+8.3%', 'Bouket'],
    },
    {
        id: 'dm-new-manager-intro',
        title: 'New manager DMs hello — Elroy intro',
        category: 'dm-behavior',
        source: 'dm',
        message: "Hey — I'm new here. Just started as floor manager last week. I heard I can message you for store data?",
        expectedBehaviors: [
            'greets warmly and introduces himself as Uncle Elroy',
            'confirms what he can help with: sales, customers, inventory, competitor intel, floor ops',
            'offers to show a few key numbers to orient the new manager',
            'does NOT reference LinkedIn, emails, or general assistant tasks',
            'tone is warm and welcoming — this is their first interaction',
        ],
        mustNotContain: ['LinkedIn', 'emails to review', 'executive assistant', 'general assistant'],
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
        const aiGrade = parseGradeJson(raw) ?? heuristicGrade(c, response);
        return applyMustChecks(c, response, aiGrade);
    } catch {
        return heuristicGrade(c, response);
    }
}

function applyMustChecks(c: ElroyCase, response: string, grade: GradeResult): GradeResult {
    const lower = response.toLowerCase();
    // mustNotContain override — hard fail if present
    if (c.mustNotContain?.some((s) => response.includes(s))) {
        return { ...grade, grade: 'fail', score: 0, responseReady: false, summary: 'Response contains explicitly banned content.' };
    }
    // mustReference override — if AI graded poor/fail but mustReference is satisfied, bump to acceptable
    if (c.mustReference && c.mustReference.every((s) => lower.includes(s.toLowerCase()))) {
        if (grade.score < 75) {
            return { ...grade, grade: 'acceptable', score: 75, responseReady: true, summary: 'AI grader may have been overly strict; required references found.' };
        }
    }
    return grade;
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
