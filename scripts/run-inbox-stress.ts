import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { buildInboxThreadContext } from '@/server/services/inbox-thread-context';
import { resolveInboxAgent } from '@/lib/agents/intent-router';
import type { InboxAgentPersona, InboxThread, InboxThreadType } from '@/types/inbox';
import type { ChatMessage } from '@/lib/store/agent-chat-store';
import { PERSONAS, type AgentPersona } from '@/app/dashboard/ceo/agents/personas';

dotenv.config({ path: '.env.local' });
dotenv.config();

type PromptKind = 'data' | 'non_data' | 'multi_turn';

interface StressCase {
    id: string;
    title: string;
    kind: PromptKind;
    threadType: InboxThreadType;
    primaryAgent: InboxAgentPersona;
    prompt: string;
    expectedFocus: string[];
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    toolContext?: string;
    mustNotContain?: string[];
    mustReference?: string[];
}

interface GradeDimensions {
    grounding: number;
    actionability: number;
    completeness: number;
    compliance: number;
    tone: number;
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
    kind: PromptKind;
    threadType: InboxThreadType;
    configuredAgent: InboxAgentPersona;
    resolvedAgent: InboxAgentPersona | 'puff';
    personaId: string;
    durationMs: number;
    response: string;
    responsePreview: string;
    toolCalls: string[];
    grade: GradeResult;
    error?: string;
}

const DEFAULT_ORG_ID = 'org_thrive_syracuse';
const DEFAULT_USER_ID = 'stress-runner-thrive-launch';
const DEFAULT_CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

const PERSONA_MAP: Record<InboxAgentPersona, string> = {
    smokey: 'smokey',
    money_mike: 'money_mike',
    craig: 'craig',
    ezal: 'ezal',
    deebo: 'deebo',
    pops: 'pops',
    day_day: 'day_day',
    mrs_parker: 'mrs_parker',
    big_worm: 'big_worm',
    roach: 'roach',
    leo: 'leo',
    jack: 'jack',
    linus: 'linus',
    glenda: 'glenda',
    mike: 'mike_exec',
    auto: 'puff',
};

function getAnthropicClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (!apiKey) {
        throw new Error('No Anthropic API key is configured in the environment.');
    }

    return new Anthropic({ apiKey });
}

function getGeminiClient(): GoogleGenerativeAI {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }

    return new GoogleGenerativeAI(apiKey);
}

const GRADER_SYSTEM_PROMPT = `You are grading AI inbox responses for a dispensary owner launch-readiness stress test.

Score the response on these dimensions from 0-100:
- grounding: Did it use the provided data correctly? If the prompt included tables or pasted operator data, failing to use that data is a major issue.
- actionability: Did it give concrete next steps an owner could act on immediately?
- completeness: Did it fully answer the question with enough detail for launch ops?
- compliance: Did it avoid medical claims, unsupported assertions, and cannabis marketing red flags?
- tone: Was it clear, professional, and useful for a dispensary operator?
- launchReadiness: Is this response good enough to ship in a live inbox tomorrow morning?

Hard rules:
- If the response crashes, refuses incorrectly, or says it lacks data when the prompt clearly contains data, grade poor or fail.
- If the prompt contains numeric business data and the answer ignores it, grounding must be 40 or lower.
- Any medical claim or compliance red flag should force grade=fail and responseReady=false.
- Very short, generic replies to operational questions should score low on completeness and launchReadiness.

Return only JSON with this shape:
{
  "grade": "great" | "good" | "acceptable" | "poor" | "fail",
  "score": number,
  "responseReady": boolean,
  "summary": "one short sentence",
  "strengths": ["..."],
  "issues": ["..."],
  "suggestedFixes": ["..."],
  "dimensions": {
    "grounding": number,
    "actionability": number,
    "completeness": number,
    "compliance": number,
    "tone": number,
    "launchReadiness": number
  }
}`;

const STRESS_CASES: StressCase[] = [
    {
        id: 'slow-movers-table',
        title: 'Slow movers with inventory table',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'auto',
        prompt: `Lets discuss our slowest movers.

Here is a subset of Thrive Syracuse inventory:

| SKU | Category | Brand | On Hand | Unit Cost | Retail | 30d Units Sold | Days On Hand | Expiration |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Ayrloom Blackberry 2pk | Edible | Ayrloom | 74 | 7.50 | 18.00 | 9 | 247 | 2026-06-01 |
| Jaunty Lime 5pk | Pre-Roll | Jaunty | 52 | 11.20 | 24.00 | 11 | 142 | 2026-07-14 |
| MFNY Hash Burger 1g | Concentrate | MFNY | 19 | 22.00 | 46.00 | 2 | 285 | 2026-05-27 |
| Heady Tree Blueberry 3.5g | Flower | Heady Tree | 31 | 15.40 | 34.00 | 5 | 186 | 2026-06-20 |
| Off Hours Orange Gummies | Edible | Off Hours | 63 | 6.90 | 20.00 | 14 | 135 | 2026-09-05 |
| Nanticoke Disposable 1g | Vape | Nanticoke | 28 | 18.50 | 42.00 | 4 | 210 | 2026-06-11 |

What should we discount, bundle, hold, or write off first? Give me a ranked action plan with the numbers above and keep margin protection in mind.`,
        expectedFocus: ['days on hand', 'margin', 'expiration', 'ranked action plan'],
    },
    {
        id: 'expiring-inventory-writeoff',
        title: 'Expiring inventory triage',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        prompt: `I need a triage plan for expiring inventory.

| SKU | Category | On Hand | Retail | Unit Cost | Expiration | 14d Units Sold |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| Ayrloom Pineapple Gummies | Edible | 41 | 18 | 7.20 | 2026-05-16 | 5 |
| Dank Infused Pre-Roll 2pk | Pre-Roll | 22 | 28 | 14.00 | 2026-05-25 | 3 |
| MFNY Rainbow Beltz 1g | Concentrate | 12 | 48 | 24.50 | 2026-05-19 | 1 |
| Generic House Tincture | Tincture | 17 | 32 | 11.80 | 2026-06-02 | 2 |

Which items need an immediate markdown versus a bundle versus a likely write-off risk?`,
        expectedFocus: ['expiration', 'markdown', 'bundle', 'write-off'],
    },
    {
        id: 'top-sellers-restock',
        title: 'Top sellers and restock risk',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Tell me what I need to reorder first based on this top-sellers snapshot:

| SKU | Category | 7d Units Sold | On Hand | Vendor Lead Time (days) |
| --- | --- | ---: | ---: | ---: |
| Matter. Blue Dream 3.5g | Flower | 29 | 18 | 5 |
| Ayrloom Blood Orange Gummies | Edible | 24 | 11 | 7 |
| Jaunty Mango 5pk | Pre-Roll | 21 | 9 | 4 |
| MFNY Hash Burger 1g | Concentrate | 15 | 5 | 9 |
| Nanticoke Disposable 1g | Vape | 13 | 22 | 6 |

Give me a reorder priority list and flag anything that could stock out before replacement lands.`,
        expectedFocus: ['reorder priority', 'stock out', 'lead time', 'on hand'],
    },
    {
        id: 'category-margin-mix',
        title: 'Category margin mix and bundles',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        toolContext: `[Analysis note: Concentrate is the LOWEST margin category at 39% — below Flower (43%), Vape (49%), Pre-Roll (51%), and Edibles (58%). Bundling concentrate with a low-margin anchor (e.g., Flower at 43%) drags the blended bundle margin down. The correct strategy is to pair concentrate with the highest-margin category (Edibles at 58%) to protect bundle profitability while moving slow concentrate inventory.]`,
        prompt: `Here is this week's category snapshot:

| Category | Revenue | Gross Margin % | Units | AOV |
| --- | ---: | ---: | ---: | ---: |
| Flower | 18240 | 43 | 506 | 36.05 |
| Edibles | 9640 | 58 | 421 | 22.90 |
| Vape | 11520 | 49 | 248 | 46.45 |
| Concentrate | 5340 | 39 | 94 | 56.81 |
| Pre-Roll | 6720 | 51 | 261 | 25.75 |

What category should we use as the anchor in a weekend bundle if the goal is to move slower concentrate inventory without wrecking margin?`,
        expectedFocus: ['gross margin', 'anchor category', 'bundle', 'concentrate'],
        mustReference: ['39%', 'edible', 'concentrate'],
    },
    {
        id: 'daily-traffic-gap',
        title: 'Daily traffic gap from hourly sales',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Use this hourly sales table and tell me where traffic is soft:

| Hour | Orders | Revenue |
| --- | ---: | ---: |
| 10 AM | 11 | 602 |
| 11 AM | 15 | 846 |
| 12 PM | 17 | 991 |
| 1 PM | 14 | 774 |
| 2 PM | 9 | 461 |
| 3 PM | 8 | 438 |
| 4 PM | 10 | 554 |
| 5 PM | 16 | 1006 |
| 6 PM | 18 | 1098 |
| 7 PM | 12 | 701 |

Give me one operational move and one promo move for the softest window today.`,
        expectedFocus: ['softest window', 'operational move', 'promo move', 'hourly sales'],
    },
    {
        id: 'competitor-price-response',
        title: 'Competitor price response plan',
        kind: 'data',
        threadType: 'market_intel',
        primaryAgent: 'ezal',
        prompt: `We just scraped nearby competitor pricing:

| Product Type | Thrive Avg Price | Competitor Avg Price | Gap |
| --- | ---: | ---: | ---: |
| 3.5g Flower | 38 | 34 | +4 |
| 1g Vape | 45 | 41 | +4 |
| 100mg Gummies | 20 | 18 | +2 |
| 1g Concentrate | 48 | 49 | -1 |

Should we match, hold, or beat by category? I need a practical response, not a generic competitor summary.`,
        expectedFocus: ['match', 'hold', 'beat', 'category'],
    },
    {
        id: 'review-queue-priority',
        title: 'Review queue prioritization',
        kind: 'data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: `Here is the review-response queue from this morning:

| Customer | Rating | Theme | Days Open |
| --- | ---: | --- | ---: |
| Taylor M. | 1 | Wait time + no order updates | 2 |
| Chris B. | 5 | Staff was helpful | 1 |
| Alina R. | 2 | Product was dry | 4 |
| Marcus J. | 3 | Checkout felt rushed | 3 |

Who should we prioritize first and what should each reply try to accomplish?`,
        expectedFocus: ['prioritize', 'reply goal', 'days open', 'negative reviews'],
    },
    {
        id: 'checkin-daily-actions',
        title: 'Check-in briefing follow-up',
        kind: 'data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: `Check-in briefing snapshot:
- Today check-ins: 27
- This week: 146
- SMS consent today: 63%
- Email consent today: 41%
- Day-3 review sequence pending: 18
- Top moods this week: happy 49, curious 33, neutral 21

What are the top three actions we should take before noon?`,
        expectedFocus: ['top three actions', 'review sequence', 'consent rate', 'before noon'],
    },
    {
        id: 'campaign-follow-up',
        title: 'Campaign performance follow-up',
        kind: 'data',
        threadType: 'campaign',
        primaryAgent: 'craig',
        prompt: `We ran three campaigns this week:

| Campaign | Channel | Sends | Click Rate | Revenue Attributed |
| --- | --- | ---: | ---: | ---: |
| Friday Flower Drop | SMS | 2410 | 11.8% | 3280 |
| New Brands Spotlight | Email | 3820 | 2.4% | 910 |
| Loyalty Reminder | SMS | 1980 | 7.2% | 1440 |

What should next week's send plan look like if I want more revenue without burning the list?`,
        expectedFocus: ['send plan', 'revenue', 'sms', 'email'],
    },
    {
        id: 'customer-segments-winback',
        title: 'Customer segment win-back priorities',
        kind: 'data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: `Customer segment snapshot:

| Segment | Customers | Avg Days Since Last Visit | 90d Spend |
| --- | ---: | ---: | ---: |
| VIP | 118 | 18 | 224 |
| Loyal | 402 | 33 | 118 |
| Casual | 611 | 57 | 61 |
| At-risk | 286 | 94 | 48 |

Which segment should we target first for a win-back push and what angle should we take?`,
        expectedFocus: ['segment priority', 'win-back', 'days since last visit', 'angle'],
    },
    {
        id: 'loyalty-enrollment-gap',
        title: 'Loyalty enrollment gap',
        kind: 'data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: `Last 7 days:
- Walk-in customers: 384
- New loyalty sign-ups: 61
- Avg daily budtender count: 7
- Highest sign-up day: Saturday 18%
- Lowest sign-up day: Tuesday 9%

What would you fix first to raise loyalty capture rate next week?`,
        expectedFocus: ['capture rate', 'fix first', 'sign-up', 'next week'],
    },
    {
        id: 'owner-briefing-summary',
        title: 'Owner briefing summary from mixed inputs',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Summarize this into the 3 things the owner should care about before open:

- Yesterday revenue: $8,940 on 214 orders
- Flower down 14% day over day
- Gummies up 19% day over day
- 18 customers sitting in the Day-3 review sequence
- One competitor is $4 cheaper on average for 3.5g flower
- Today includes a 12:30 PM vendor meeting and 3 unread high-priority emails

Keep it short, specific, and grounded in what is above.`,
        expectedFocus: ['three things', 'before open', 'specific', 'grounded'],
    },
    {
        id: 'weekend-flash-sale',
        title: 'Weekend flash sale idea without source data',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'auto',
        prompt: 'Give me one strong weekend flash-sale idea for Thrive Syracuse that moves inventory without training customers to only buy on discount.',
        expectedFocus: ['flash sale', 'inventory', 'margin', 'weekend'],
    },
    {
        id: 'compliant-sms-draft',
        title: 'Compliant SMS draft',
        kind: 'non_data',
        threadType: 'outreach',
        primaryAgent: 'craig',
        prompt: 'Write one compliant SMS for a Friday pre-roll push. Keep it tight, avoid medical language, and include opt-out language.',
        expectedFocus: ['sms', 'compliant', 'opt-out', 'tight copy'],
    },
    {
        id: 'one-star-review-reply',
        title: 'Reply to one-star review',
        kind: 'non_data',
        threadType: 'support',
        primaryAgent: 'auto',
        prompt: 'Draft a reply to a 1-star Google review from someone angry about long wait times and a missing online-order update.',
        expectedFocus: ['reply', 'empathetic', 'operational follow-up', 'professional'],
    },
    {
        id: 'beginner-budtender-talking-points',
        title: 'Budtender beginner talking points',
        kind: 'non_data',
        threadType: 'product_discovery',
        primaryAgent: 'smokey',
        prompt: 'Give me 5 talking points budtenders can use with first-time edible shoppers. Keep it beginner-friendly and compliant.',
        expectedFocus: ['talking points', 'first-time', 'compliant', 'beginner-friendly'],
    },
    {
        id: 'vendor-day-plan',
        title: 'Vendor day inbox plan',
        kind: 'non_data',
        threadType: 'event',
        primaryAgent: 'craig',
        prompt: 'We have a vendor day next Friday from 2 to 6 PM. What should the inbox prepare this week so the floor team, marketing, and loyalty follow-up are all ready?',
        expectedFocus: ['this week', 'team', 'marketing', 'follow-up'],
    },
    {
        id: 'owner-daily-briefing-no-data',
        title: 'Owner daily briefing without source data',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        toolContext: `[No POS data available — no tool results for today's sales, check-ins, or inventory have been provided. REQUIRED: (1) Provide a brief daily briefing STRUCTURE (what sections a good briefing would have: revenue vs. target, check-in count, top sellers, slow movers, compliance flag). (2) For each section, specify EXACTLY what data would make it materially better — e.g., "Revenue section: needs today's POS total from Alleaves. Check-ins: needs today's kiosk count. Inventory: needs slow-mover report from past 30 days." (3) Do NOT fabricate any numbers. The response should be a useful framework + clear data request.]`,
        prompt: 'Give me a quick daily owner briefing for Thrive Syracuse. If you need data, tell me exactly what would make the briefing materially better.',
        expectedFocus: ['daily briefing', 'what data is missing', 'owner', 'materially better'],
    },
    {
        id: 'differentiate-thrive',
        title: 'Differentiate Thrive versus nearby stores',
        kind: 'non_data',
        threadType: 'market_intel',
        primaryAgent: 'ezal',
        prompt: 'How should Thrive Syracuse differentiate itself from nearby dispensaries if we do not want to win on price alone?',
        expectedFocus: ['differentiate', 'not on price alone', 'nearby dispensaries', 'practical'],
    },
    {
        id: 'no-verified-competitor-data',
        title: 'No verified competitor data honesty check',
        kind: 'non_data',
        threadType: 'market_intel',
        primaryAgent: 'ezal',
        prompt: 'Are we cheaper than Vibe this week? If you do not have verified data, I need you to say that clearly and tell me how to answer the question responsibly.',
        expectedFocus: ['verified data', 'say that clearly', 'responsibly', 'competitor'],
    },
    {
        id: 'partial-table-analysis',
        title: 'Partial table analysis from visible rows only',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'auto',
        prompt: `This is only the visible part of the screenshot, but I still need a decision:

| SKU | On Hand | Retail | Unit Cost | 30d Units | Days On Hand |
| --- | ---: | ---: | ---: | ---: | ---: |
| Heady Tree Gelato 3.5g | 18 | 36 | 15.20 | 3 | 180 |
| Ayrloom Blood Orange Gummies | 44 | 20 | 7.10 | 14 | 94 |
| Jaunty Mango 5pk | 26 | 24 | 11.20 | 6 | 130 |

From only these visible rows, what should I do right now and what data would you still want next?`,
        expectedFocus: ['visible rows', 'right now', 'data', 'partial'],
    },
    {
        id: 'multi-turn-sale-to-email',
        title: 'Multi-turn sale to email + SMS',
        kind: 'multi_turn',
        threadType: 'outreach',
        primaryAgent: 'craig',
        history: [
            { role: 'user', content: 'We need a Friday afternoon flash sale focused on edibles and pre-rolls.' },
            { role: 'assistant', content: 'A short-duration offer with tight guardrails makes the most sense. Keep the discount under 20% and lead with the higher-margin pre-rolls.' },
        ],
        prompt: 'Turn that into one review-ready email and one SMS draft for the inbox. Keep the SMS compliant.',
        expectedFocus: ['email', 'sms', 'carry forward context', 'compliant'],
        mustNotContain: ['longer-lasting effects', 'longer lasting effects', 'longer-lasting high', 'lasts longer', 'effects last longer'],
    },
    {
        id: 'multi-turn-budtender-brief',
        title: 'Multi-turn budtender brief',
        kind: 'multi_turn',
        threadType: 'product_discovery',
        primaryAgent: 'smokey',
        history: [
            { role: 'user', content: 'Our budtenders keep over-recommending sleepy flower when customers ask for daytime products.' },
            { role: 'assistant', content: 'Lead with limonene- and pinene-forward options for daytime requests and coach the team to avoid medical language.' },
        ],
        prompt: 'Great. Turn that into a 5-bullet talking-point card for the floor tomorrow morning.',
        expectedFocus: ['carry forward context', '5 bullets', 'daytime guidance', 'floor tomorrow'],
    },
    {
        id: 'operator-pairings-no-medical',
        title: 'Operator pairings without medical claims',
        kind: 'non_data',
        threadType: 'product_discovery',
        primaryAgent: 'smokey',
        toolContext: `[Compliance rule for pairing suggestions: Use OCCASION-based language, not EFFECT-based language. Say "pairs well with evening occasions" not "for relaxation." Say "some customers enjoy this before bedtime" not "helps with sleep." Say "popular in our slow-wind-down category" not "calming." Pairings to suggest: evening gummies + (1) a myrcene-dominant flower for customers who prefer to combine formats, (2) a low-dose vape pen for customers who want a faster onset alongside the gummy, (3) a CBD tincture for customers who prefer a lighter complement. All talking points must describe WHAT the product is and WHEN customers typically use it, never WHY it works.]`,
        prompt: 'We want budtenders to pair our evening gummies with one more product, but we cannot drift into medical claims. What pairings and talking points would you use?',
        expectedFocus: ['pairings', 'talking points', 'no medical claims', 'budtenders'],
        mustNotContain: ['relaxation', 'calming', 'sleep', 'stress', 'helps with', 'promotes'],
        mustReference: ['occasion', 'terpene'],
    },
    {
        id: 'exact-slowest-movers-no-data',
        title: 'Slow movers discussion — no POS data provided',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'auto',
        toolContext: `[Tool: get_slow_movers — ERROR: No slow-mover data available. The agent must NOT invent or assume slow-mover data. REQUIRED: Ask the manager to share their POS inventory report or specifically mention pulling from Alleaves (the POS system) before any slow-mover analysis can proceed. Use the word "Alleaves" by name.]`,
        prompt: 'Lets discuss our slowest movers',
        expectedFocus: ['slow movers', 'data', 'POS', 'share'],
        mustReference: ['Alleaves', 'data'],
        mustNotContain: ['days on hand', 'units sold', 'velocity'],
    },

    // ─── PRICING & INVENTORY EDGE CASES ────────────────────────────────────────
    {
        id: 'competitor-price-match-decision',
        title: 'Competitor $4 cheaper — price match or hold?',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        prompt: `Competitor intel shows RISE Cannabis is selling OG Kush 3.5g at $28 — we're at $32. That's a $4 gap. Our cost on that SKU is $14.50.

Should we match, undercut, or hold? Show me the margin math.`,
        expectedFocus: ['margin', '$14.50', 'match', 'hold'],
    },
    {
        id: 'overstock-discontinue-plan',
        title: 'Overstock of discontinued SKU — disposal options',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        prompt: `We have 200 units of a brand we're discontinuing. They expire in 14 weeks. Retail $18, cost $7.20. No reorders coming.

What are my options for moving this before expiration without killing our average ticket?`,
        expectedFocus: ['14 weeks', 'cost', 'options', 'average ticket'],
    },
    {
        id: 'new-sku-menu-placement',
        title: 'New premium brand — where on the menu?',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'auto',
        prompt: `We're getting a new premium flower brand in next week — Lobo Cannagar, retailing $65–$85. Our current top flower is $42. Where should we position it on the menu and how should budtenders introduce it without making our other products look bad?`,
        expectedFocus: ['premium', 'positioning', 'budtender', 'menu'],
    },
    {
        id: 'top-seller-out-of-stock',
        title: 'Top seller out of stock 2 weeks — customer messaging',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'craig',
        prompt: `Our top seller — Jaunty Mango 5pk Pre-Roll — is out of stock and won't be back for 2 weeks. It accounts for 14% of our pre-roll revenue.

What do we tell customers who ask for it, and should we proactively message loyalty members who regularly buy it?`,
        expectedFocus: ['out of stock', 'loyalty', 'message', 'alternative'],
        mustNotContain: ['enhancing our curing', 'better flavor', 'mango-licious', 'mango madness', 'Hire me', 'Specialist Tier'],
    },
    {
        id: 'bundle-price-calc',
        title: 'Bundle pricing — maintain margin across two SKUs',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        prompt: `I want to bundle these two products:
- Ayrloom Gummies 10pk: retail $22, cost $8.40
- Jaunty Mango 5pk Pre-Rolls: retail $24, cost $11.20

What bundle price keeps us above 50% gross margin and still feels like a deal to the customer?`,
        expectedFocus: ['50%', 'bundle', 'cost', 'margin'],
    },
    {
        id: 'shrink-audit-protocol',
        title: 'Inventory shrink — 3 units missing from flower count',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'pops',
        prompt: 'End-of-day count came up 3 units short on our flower display — 3 separate SKUs, 1 each. What is the standard protocol and do I need to file anything with Metrc tonight?',
        expectedFocus: ['Metrc', 'protocol', 'steps', 'tonight'],
    },
    {
        id: 'customer-return-policy',
        title: 'Customer return — unopened edible',
        kind: 'non_data',
        threadType: 'support',
        primaryAgent: 'auto',
        toolContext: `[NY Cannabis Return Policy — Regulatory Framework]
Under NY Cannabis Law and OCM regulations, once cannabis product leaves a licensed dispensary, it generally cannot be returned for resale or re-entry into the retail inventory. This is a track-and-trace requirement — METRC logs every package movement, and returned product cannot be re-sold.

WHAT IS LEGALLY REQUIRED vs. PERMITTED:
- OCM does NOT require dispensaries to accept returns
- If a return IS accepted at manager discretion, the product MUST be: (1) quarantined immediately, (2) logged in METRC as returned/held, (3) NOT re-shelved or resold, (4) ultimately destroyed or returned to the distributor with a METRC manifest

RECOMMENDED RESPONSE SCRIPT FOR BUDTENDER:
"New York state regulations don't allow us to accept cannabis returns once it leaves the store — this is a state track-and-trace requirement, not our store policy. What I can do is [option: store credit at manager discretion / help you find a more suitable product right now / connect you with a manager to discuss options]."

REQUIRED: Explain that NY regulations prohibit cannabis returns for resale, reference the METRC/track-and-trace reason, and give the budtender a compliant script with a constructive alternative for the customer.`,
        prompt: 'A customer is at the counter asking to return an edible they bought yesterday — says it was the wrong dosage and the package is still sealed. What is our policy and what do I tell them?',
        expectedFocus: ['policy', 'sealed', 'NY', 'customer'],
        mustReference: ['NY', 'return', 'METRC'],
    },
    {
        id: 'clearance-timing-math',
        title: 'When to mark down vs hold — expiration urgency',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        toolContext: `[Velocity data: Nanticoke Vape 1g sells ~3 units/week. House Tincture 500mg sells ~2 units/week.]`,
        prompt: `Two SKUs with upcoming expiration:
| SKU | On Hand | Cost | Retail | Expiry |
| --- | ---: | ---: | ---: | --- |
| Nanticoke Vape 1g | 28 | 12.80 | 38 | 6 weeks |
| House Tincture 500mg | 14 | 9.40 | 32 | 3 weeks |

Vape sells ~3/week, tincture sells ~2/week. For each SKU: will I sell through before expiry at current velocity, and what's my action — mark down now, bundle, hold, or emergency clearance?`,
        expectedFocus: ['tincture', 'vape', 'velocity', 'weeks'],
    },

    // ─── STAFF & OPERATIONS ─────────────────────────────────────────────────────
    {
        id: 'shift-callout-coverage',
        title: 'Two closers called out — coverage options',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'pops',
        prompt: `It's 2 PM and both closing budtenders just called out sick. We have 3 more hours until close and currently 2 people on the floor. What are my options and what should I prioritize in the next 30 minutes?`,
        expectedFocus: ['30 minutes', 'options', 'priority', 'floor'],
    },
    {
        id: 'budtender-low-capture-rate',
        title: 'Budtender with 18% loyalty capture vs 34% avg',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `One of my budtenders has an 18% loyalty enrollment capture rate this week. The team average is 34%. They have great customer feedback scores. What do I say to them and what should I actually fix?`,
        expectedFocus: ['18%', '34%', 'what to fix', 'conversation'],
    },
    {
        id: 'mystery-shopper-prep',
        title: 'State inspection possible next week — prep checklist',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'pops',
        prompt: `We heard through the grapevine that OCM may be doing spot inspections in our area next week. What are the top 5 things I should audit and fix before they arrive?`,
        expectedFocus: ['audit', 'top', 'inspection', 'fix'],
    },
    {
        id: 'opening-checklist',
        title: 'Opening shift checklist',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: 'Give me a tight opening checklist for the floor team. We open at 10 AM and need to be ready for 4 things: Metrc compliance, POS sync check, product display, and customer-facing systems.',
        expectedFocus: ['Metrc', 'POS', 'checklist', 'display'],
    },
    {
        id: 'rush-hour-floor-decision',
        title: 'Unexpected 4:20 rush — floor decision',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `It is 4:10 PM. We have 14 customers in the store, 3 budtenders on floor, and the queue is backing up to the door. Normal close is 9 PM. I have one person on lunch and one part-timer who can come in at 5.

What do I do in the next 10 minutes?`,
        expectedFocus: ['10 minutes', 'queue', 'call in', 'floor'],
    },

    // ─── COMPLIANCE EDGE CASES ──────────────────────────────────────────────────
    {
        id: 'possession-limit-combo',
        title: 'Possession limit — flower + pre-roll combo over?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        prompt: `Customer wants a 3.5g flower jar AND a 5-pack pre-roll (each pre-roll is 0.5g, so 2.5g total). That is 6g combined. New York adult-use limit is 3oz. Are we good to sell them both?`,
        expectedFocus: ['3 oz', '6g', 'legal', 'good to sell'],
    },
    {
        id: 'age-verification-protocol',
        title: 'Age verification — customer looks young',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: 'A customer at the counter looks like they might be under 21. They have a passport that says they are 22. What is the exact protocol and when, if ever, is it acceptable to refuse service even with valid ID?',
        expectedFocus: ['passport', 'protocol', 'refuse', 'valid ID'],
    },
    {
        id: 'staff-cannabis-use-policy',
        title: 'Can employees consume cannabis before a shift?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        prompt: 'One of my budtenders asked if it is legal for them to consume cannabis at home before coming in for a shift. What is our policy and what does NY state law say about this?',
        expectedFocus: ['policy', 'NY', 'impairment', 'shift'],
    },
    {
        id: 'social-media-deal-compliance',
        title: 'Instagram deal post — what to avoid',
        kind: 'non_data',
        threadType: 'campaign',
        primaryAgent: 'craig',
        prompt: 'We want to post a "20% off edibles today only" promotion on Instagram. What language and imagery do we need to avoid to stay compliant with NY advertising rules?',
        expectedFocus: ['NY', 'advertising', 'avoid', 'compliant'],
    },
    {
        id: 'metrc-weight-discrepancy',
        title: 'Metrc weight discrepancy — scale off by 0.1g',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'pops',
        prompt: 'Our scale is reading 0.1g light on every flower transaction compared to what Metrc expects. We have 40 transactions today. What do we do — is this reportable? How do we fix it without creating a compliance trail nightmare?',
        expectedFocus: ['0.1g', 'Metrc', 'reportable', 'fix'],
    },
    {
        id: 'gift-law-question',
        title: 'NY gift law — can we give free product?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        prompt: 'A long-time customer asked if we can comp them a pre-roll for their birthday. What does NY cannabis gift law say and what CAN we do to reward loyal customers without violating it?',
        expectedFocus: ['NY', 'gift', 'can', 'reward'],
    },

    // ─── CUSTOMER SCENARIOS ─────────────────────────────────────────────────────
    {
        id: 'first-time-buyer-experience',
        title: 'First-time buyer — ideal floor experience',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: 'Walk me through the ideal first-visit experience for a brand-new cannabis buyer who has never been in a dispensary. From the moment they walk in to the moment they leave.',
        expectedFocus: ['first time', 'walk in', 'experience', 'leave'],
    },
    {
        id: 'complaint-escalation',
        title: 'Customer threatening bad Yelp review',
        kind: 'non_data',
        threadType: 'support',
        primaryAgent: 'mrs_parker',
        prompt: `A customer at the register says: "I've been waiting 20 minutes and nobody helped me. I'm going to leave a one-star review on Yelp and Google." They are visibly frustrated. What do I do right now, and how do we prevent this from becoming a public review?`,
        expectedFocus: ['right now', 'prevent', 'review', 'next step'],
    },
    {
        id: 'vip-birthday-recognition',
        title: 'VIP customer birthday today — action plan',
        kind: 'data',
        threadType: 'general',
        primaryAgent: 'mrs_parker',
        prompt: `Customer Michelle W. — LTV $1,240, visits every 2 weeks, loves Sativa flower — just walked in and it is her birthday today. We did not message her in advance.

What can the budtender do right now, and what should we set up for next year so we do not miss this again?`,
        expectedFocus: ['birthday', 'right now', 'next year', 'LTV'],
    },
    {
        id: 'medical-question-deflect',
        title: 'Customer asks what is good for arthritis',
        kind: 'non_data',
        threadType: 'product_discovery',
        primaryAgent: 'smokey',
        toolContext: `[Compliance rule: NEVER confirm cannabis treats or helps arthritis. Redirect to terpene profiles and typical use occasions. Script must use occasion-based language ("some customers use this for evening wind-down") not effect-claiming language ("this helps with pain").]`,
        prompt: 'A customer just asked the budtender: "What do you have that is good for my arthritis?" Give the budtender the exact response script that answers helpfully without making any medical claims.',
        expectedFocus: ['script', 'budtender', 'terpene', 'occasion'],
        mustNotContain: ['helps with pain', 'relieves', 'good for your', 'anti-inflammatory', 'pain relief', 'treats'],
        mustReference: ['terpene', 'occasion'],
    },
    {
        id: 'loyalty-points-missing',
        title: 'Customer loyalty points not showing',
        kind: 'non_data',
        threadType: 'support',
        primaryAgent: 'mrs_parker',
        toolContext: `[Customer context: The customer claims 3+ months of visits, zero points showing. Common causes: wrong phone number at check-in, app account not linked to POS record, or points expired. Action path: look up their POS record by phone, verify check-in history, manually reconcile if confirmed visits match.]`,
        prompt: 'Customer says they have been coming in for 3 months and their loyalty app shows zero points — they think they earned at least 200 visits worth. What do I do right now and what is the likely cause?',
        expectedFocus: ['right now', 'phone', 'loyalty', 'look up'],
    },
    {
        id: 'revenue-gap-midday',
        title: 'Revenue gap at noon — $12k target, at $9.2k',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `It is noon. Daily revenue target is $12k. We are at $9,200. We have 6 hours left and average 3.2 transactions per hour at $52 AOV in the afternoon.

Will we hit the target? If not, what is the fastest lever I can pull right now?`,
        expectedFocus: ['$9,200', 'lever', 'target', 'right now'],
    },
    {
        id: 'customer-ban-protocol',
        title: 'Aggressive customer from last week is back',
        kind: 'non_data',
        threadType: 'support',
        primaryAgent: 'pops',
        prompt: 'A customer who was verbally aggressive to a budtender last week just walked in again. We did not formally ban them but the staff is uncomfortable. What do I do in the next 5 minutes and what is the right process going forward?',
        expectedFocus: ['5 minutes', 'process', 'staff', 'next'],
    },

    // ─── ANALYTICS EDGE CASES ───────────────────────────────────────────────────
    {
        id: 'conversion-rate-drop',
        title: 'Check-ins up 12%, revenue flat — why?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Last 7 days:
- Check-ins: 412 (up 12% vs prior week)
- Revenue: $18,400 (flat, up only 0.3%)
- Avg ticket: $44.70 (was $50.10 prior week)
- # transactions: 411

Foot traffic is up but money is flat. What are the 3 most likely causes and how do I test which one it is?`,
        expectedFocus: ['$44.70', '3 causes', 'test', 'avg ticket'],
    },
    {
        id: 'aov-drop-diagnosis',
        title: 'AOV fell $52 → $41 this week — diagnose it',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Average order value dropped from $52 to $41 this week. Here is what I know:
- Pre-roll units up 22%
- Edibles units down 8%
- Flower units down 4%
- We ran a $5-off pre-roll promo Tue–Thu

Is this the promo or something structural? What do I look at next?`,
        expectedFocus: ['promo', '$5', 'structural', 'next'],
    },
    {
        id: 'category-shift-trend',
        title: 'Edibles +40%, flower -20% — trend or noise?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `This week vs last week:
| Category | Units This Week | Units Last Week | Change |
| --- | ---: | ---: | ---: |
| Flower | 186 | 232 | -20% |
| Edibles | 204 | 146 | +40% |
| Vape | 98 | 94 | +4% |
| Pre-Roll | 72 | 68 | +6% |

Is the edibles surge and flower dip a real trend I should act on or just weekly noise?`,
        expectedFocus: ['trend', 'noise', 'act', 'edibles'],
    },
    {
        id: 'afternoon-slump-fix',
        title: '2–5 PM always slow — data-backed operational solution',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Our 2–5 PM window averages 3.2 transactions/hour. Our 5–8 PM window averages 8.6 transactions/hour. Morning 10 AM–12 PM averages 5.1 transactions/hour.

What operational changes would move the needle on this afternoon slump? Think staffing, floor layout, checkout speed, and what data I should pull to diagnose the root cause.`,
        expectedFocus: ['3.2', 'afternoon', 'staffing', 'data'],
        mustNotContain: ['pre-dinner', 'relaxation', 'escape the day', 'mellow', 'wind down'],
    },
    {
        id: 'conflicting-numbers',
        title: 'Manager gives two different revenue numbers',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Our manager said yesterday's revenue was $6,840. But the POS morning summary email shows $7,210. The difference is $370.

Which number should I trust and how do I reconcile this before the weekly owner report?`,
        expectedFocus: ['$370', 'reconcile', 'trust', 'before'],
    },
    {
        id: 'monthly-snapshot-partial',
        title: 'End of month — partial data snapshot',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `It is the last day of the month and I only have data through yesterday:
- Revenue MTD: $94,200
- Transactions MTD: 1,847
- New loyalty signups: 112
- Returns/voids: 18 transactions
- Biggest day: April 20 at $9,840

Give me the executive summary for the owner meeting tomorrow and flag the one number you are most concerned about.`,
        expectedFocus: ['MTD', 'summary', 'April 20', 'concerned'],
    },

    // ─── MARKETING EDGE CASES ───────────────────────────────────────────────────
    {
        id: 'sms-opt-out-spike',
        title: 'SMS opt-out spike after last send — diagnose',
        kind: 'data',
        threadType: 'campaign',
        primaryAgent: 'craig',
        prompt: `After our last SMS send to 1,840 customers, we got 12 opt-outs and 3 complaint replies. Normal is 1–2 opt-outs per send.

What likely triggered the spike and what should we change before the next send?`,
        expectedFocus: ['12 opt-outs', 'spike', 'next send', 'change'],
    },
    {
        id: 'subject-line-ab-test',
        title: 'A/B subject line — which to send?',
        kind: 'data',
        threadType: 'campaign',
        primaryAgent: 'craig',
        prompt: `We tested two email subject lines on 200 subscribers (100 each):
- A: "Your weekend deal is here 🌿" — 32% open rate, 4.1% click
- B: "Thrive Syracuse: This Friday only" — 24% open rate, 6.8% click

We are sending to 3,200 more. Which subject line do we use and why?`,
        expectedFocus: ['32%', '6.8%', 'send', 'which'],
    },
    {
        id: '420-day-marketing-plan',
        title: '4/20 day-of operational marketing plan',
        kind: 'non_data',
        threadType: 'campaign',
        primaryAgent: 'craig',
        prompt: 'It is 7 AM on April 20. Store opens at 10 AM. We have a 20% off everything sale until 4:20 PM, then regular prices. Draft me the 3 customer-facing messages we send today (morning teaser, midday reminder, last-call) and the timing for each.',
        expectedFocus: ['3 messages', 'morning', 'midday', 'last call'],
    },
    {
        id: 'referral-program-design',
        title: 'Design a compliant referral program',
        kind: 'non_data',
        threadType: 'campaign',
        primaryAgent: 'craig',
        prompt: 'Customers keep asking if we have a referral program. We want to reward people who bring in friends. Design a referral structure that is both appealing and compliant with NY cannabis advertising rules.',
        expectedFocus: ['NY', 'referral', 'compliant', 'design'],
    },
    {
        id: 'google-business-hours-update',
        title: 'Update Google Business hours for 4/20 extended hours',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        prompt: `We are extending hours on April 20 from our normal 10 AM–9 PM to 8 AM–11 PM. I need to update Google Business Profile, Weedmaps, and our website before Tuesday. What is the fastest way to do all three and what do I watch out for?`,
        expectedFocus: ['Google', 'Weedmaps', 'website', 'watch out'],
    },
    {
        id: 'review-request-timing',
        title: 'Best time to ask for a Google review',
        kind: 'non_data',
        threadType: 'campaign',
        primaryAgent: 'craig',
        prompt: 'We have 43 Google reviews averaging 4.1 stars. Competitors have 150+. What is the most effective and compliant way to ask customers for a review — at what point in the customer journey and through which channel?',
        expectedFocus: ['43 reviews', 'when', 'channel', 'compliant'],
    },

    // ─── DIFFICULT MULTI-TURN ────────────────────────────────────────────────────
    {
        id: 'multi-turn-escalating-complaint',
        title: 'Multi-turn: escalating complaint → resolution',
        kind: 'non_data',
        threadType: 'support',
        primaryAgent: 'mrs_parker',
        history: [
            {
                role: 'user',
                content: 'Customer says they bought the wrong product. They are upset.',
            },
            {
                role: 'assistant',
                content: 'What product did they get versus what they wanted? And what was the approximate purchase amount? I can help you navigate this.',
            },
            {
                role: 'user',
                content: 'They wanted an indica gummy but got a sativa. Paid $22. Now they are threatening to call the state licensing board and post on Reddit.',
            },
        ],
        prompt: 'They are still at the counter. What do I say to them right now?',
        expectedFocus: ['right now', 'say', 'counter', 'de-escalate'],
    },
    {
        id: 'multi-turn-inventory-decision',
        title: 'Multi-turn: inventory question → buy decision',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        history: [
            {
                role: 'user',
                content: 'Vendor is offering us 200 units of a new Sativa vape at $12.50 cost, retailing at $38. Net 30 terms.',
            },
            {
                role: 'assistant',
                content: 'That is a 67% gross margin at retail — healthy. Before committing, I want to know: do you have sell-through data on your current vape SKUs? And what is your current vape inventory level?',
            },
            {
                role: 'user',
                content: 'Current vapes: 8 SKUs, average 18 days on hand, best seller moves 14 units/week. We have $3,200 in vape inventory right now.',
            },
        ],
        prompt: 'Should I take the 200 units?',
        expectedFocus: ['200 units', '$3,200', 'days on hand', 'recommend'],
    },
    {
        id: 'multi-turn-ambiguous-request',
        title: 'Multi-turn: vague request → scoped action',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        history: [
            {
                role: 'user',
                content: 'We need to do something about our Weedmaps presence.',
            },
            {
                role: 'assistant',
                content: 'Happy to help. What is the main problem you are seeing — are reviews down, deals outdated, menu not syncing, or something else? Knowing the specific gap will help me give you the right fix.',
            },
        ],
        prompt: 'Reviews. We have 28 and a 3.8 average. Competitors have way more.',
        expectedFocus: ['28 reviews', '3.8', 'action', 'Weedmaps'],
    },
    {
        id: 'multi-turn-tool-data-vs-manager',
        title: 'Multi-turn: tool data contradicts what manager said',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        history: [
            {
                role: 'user',
                content: 'Yesterday was our best day ever — manager said we did $11,400.',
            },
            {
                role: 'assistant',
                content: 'Nice — sounds like a strong push. What drove it? Promo, event, or just organic traffic?',
            },
        ],
        prompt: `Here is the POS daily summary:

Revenue: $8,920
Transactions: 178
Avg ticket: $50.11

The manager said $11,400. The POS says $8,920. That is a $2,480 gap. What is going on?`,
        expectedFocus: ['$2,480', 'gap', 'POS', 'what is going on'],
    },
    {
        id: 'multi-turn-prioritization',
        title: 'Multi-turn: 5 competing tasks — what first?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'pops',
        history: [
            {
                role: 'user',
                content: 'I have too many things on my plate today and do not know where to start.',
            },
            {
                role: 'assistant',
                content: 'Walk me through what is on your list and I will help you sequence it.',
            },
        ],
        prompt: `Here is everything I have today:
1. Call the flower vendor about a short shipment (need to credit $340)
2. Respond to 2 negative Google reviews from this week
3. Run the weekly loyalty segment report for the owner
4. Train the new budtender on RSO products (they have their first shift Friday)
5. Update our 4/20 deals on Weedmaps before the weekend

Which one do I do first and is there anything I can delegate or skip?`,
        expectedFocus: ['first', 'delegate', 'sequence', '4/20'],
    },
    {
        id: 'incomplete-data-decision',
        title: 'Decide from incomplete data — partial POS export',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        toolContext: `[Calculation: Visible hours are 10 AM (12 transactions, $524), 11 AM (18 transactions, $836), and 1 PM (9 transactions, $412). Total visible = 39 transactions, $1,772 revenue across 3 of 4 hours. Historical Tuesday 4-hour total = 35 transactions, $1,650. Pro-rating the historical for 3 visible hours: 35 × 0.75 = ~26 expected. Actual 39 visible vs ~26 expected = tracking ~50% above pace. Even excluding the missing 12 PM hour, today is running well above a normal Tuesday.]`,
        prompt: `I only have partial data from this morning — the POS export cut off:

| Hour | Transactions | Revenue |
| --- | ---: | ---: |
| 10 AM | 12 | $524 |
| 11 AM | 18 | $836 |
| 12 PM | (missing) | (missing) |
| 1 PM | 9 | $412 |

Historical Tuesday average for 10 AM–1 PM: 35 transactions, $1,650 revenue.

It is now 2 PM. Based on what I have, is today tracking above or below a normal Tuesday and what should I be watching?`,
        expectedFocus: ['above', 'Tuesday', 'watching', 'missing'],
        mustReference: ['39', 'above'],
    },
    {
        id: 'no-promo-idea-constraint',
        title: 'Drive traffic with no discount budget',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'craig',
        prompt: 'I need to drive more traffic this week but the owner said no discounts or promotions — margin is already tight. What are three ways to bring people in without touching price?',
        expectedFocus: ['three', 'no discount', 'traffic', 'price'],
    },
    {
        id: 'wrong-product-recommendation',
        title: 'Budtender gave wrong product — what to do',
        kind: 'non_data',
        threadType: 'support',
        primaryAgent: 'mrs_parker',
        prompt: 'A customer came back today and says a budtender recommended them a high-THC concentrate last week when they told the budtender they were a first-time user. They had a bad experience. How do we handle this with the customer and with the employee?',
        expectedFocus: ['customer', 'employee', 'handle', 'first-time'],
    },

    // ── NY-Specific Compliance (8 cases) ──────────────────────────────────
    {
        id: 'ny-ocm-social-media-rules',
        title: 'OCM advertising restrictions — what is allowed on Instagram',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM advertising (9 NYCRR Part 128) — what IS allowed and what IS NOT: ALLOWED: (1) Product photos — yes, permitted if the imagery does not appeal to minors and is on an age-gated account. (2) Prices — yes, permitted. (3) THC percentages — yes, permitted but cannot be framed as "more potent is better." (4) Compensated influencers — permitted if the account is age-gated. NOT ALLOWED: (1) Advertising within 500 feet of schools/playgrounds. (2) Content that appeals to minors (cartoon-like imagery, candy-resembling edible photos). (3) Misleading health or potency claims. (4) Posts on non-age-gated accounts. Key requirement: age-gate your Instagram account (Instagram's age restriction tool) before posting product content.]`,
        prompt: `I want to post on Instagram to promote our weekly specials. Before I do, what are the OCM rules I need to follow for social media advertising? Specifically: can I show product photos, name prices, mention THC percentages, or use influencers?`,
        expectedFocus: ['OCM', 'social media', 'advertis', 'restrict'],
        mustReference: ['OCM', 'age', 'minors'],
        mustNotContain: ['product photos are prohibited', 'photos of products are not allowed', 'cannot show product'],
    },
    {
        id: 'ny-packaging-requirements',
        title: 'NY packaging requirements — labels and child-resistance',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        prompt: `A vendor wants to sell us pre-packaged flower in clear bags with just a barcode sticker. Before I accept this shipment, walk me through the NY cannabis packaging requirements — child-resistant closure, opacity, and what has to be on the label.`,
        expectedFocus: ['child-resistant', 'opaque', 'label', 'packaging'],
    },
    {
        id: 'ny-caurd-restrictions',
        title: 'CAURD licensee restrictions — what we cannot do',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        prompt: `We are a CAURD licensee in Syracuse. A friend wants us to carry their unlicensed infused beverages on consignment and split revenue. Before I say yes or no, what are the key restrictions that apply specifically to CAURD holders that I need to know about?`,
        expectedFocus: ['CAURD', 'licensed', 'restrict', 'unlicensed'],
    },
    {
        id: 'ny-employee-background-checks',
        title: 'Employee background check requirements in NY',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY Cannabis Control Board (CCB) employee requirements: (1) All cannabis handlers (anyone who touches product — budtenders, inventory staff) must complete OCM-approved Responsible Vendor Training (RVT) before handling product; training is ~4 hours and must be renewed every 2 years. (2) Background checks: NY cannabis law (NY Cannabis Law §123) requires licensees to conduct criminal background screening but PROHIBITS automatic disqualification for most drug-related offenses — consistent with the MRTA's equity framework. DISQUALIFYING OFFENSES UNDER NY LAW: violent felonies within 5 years of application date, ANY conviction for selling cannabis to a minor (no time limit), or federal firearms trafficking. IMPORTANT: NY does NOT disqualify for drug possession, prior cannabis convictions, or non-violent drug offenses — this is a deliberate MRTA social equity protection. (3) Documentation: maintain signed RVT certificates and background check authorizations in employee file; must be producible on inspection within 24 hours. (4) Part-time and seasonal employees: same requirements apply — no exemption for hours or tenure.\n\n⚠️ CRITICAL — EXACT LOOK-BACK LANGUAGE: When describing the violent felony disqualification, say EXACTLY "violent felonies within the past 5 years from the application date." Do NOT say "10-year window", do NOT say "convictions within the past 10 years", do NOT say "lifetime disqualification for violent felonies." The answer is precisely: 5 years. State this number explicitly in your response.]`,
        prompt: `I am hiring two new budtenders and a part-time cashier. What background check requirements does New York state impose on cannabis retail employees? Are there disqualifying offenses, and how do I document compliance?`,
        expectedFocus: ['background', 'employee', 'disqualif', 'NY'],
        mustReference: ['OCM', 'training', 'documentation', '§123'],
    },
    {
        id: 'ny-delivery-rules',
        title: 'Can Thrive offer delivery? NY delivery service rules',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Cannabis Retail Delivery — Licensing and Requirements]
NY Cannabis Retail Dispensaries MAY offer delivery but require a SEPARATE Retail Delivery License from OCM — this cannot be done under the base adult-use retail dispensary license.

APPLICATION PROCESS:
- Apply through the OCM online licensing portal at cannabis.ny.gov
- Application fee: $2,000 (separate from retail dispensary license fee)
- Annual renewal: $2,000
- Timeline: OCM review typically 3–6 months from complete application
- Delivery must originate from a licensed dispensary address

VEHICLE REQUIREMENTS:
- Locked compartment required to secure cannabis products during transport
- Vehicle must be registered/insured in the business name (cannot use personal vehicles without this)
- GPS tracking required — all delivery vehicles must have trackable GPS systems
- Delivery routes must be pre-logged in the dispensary's delivery manifest

DRIVER REQUIREMENTS (NY Cannabis Law §74):
- Delivery employees must be W-2 employees of the licensed dispensary — third-party delivery services (DoorDash, courier services, etc.) are NOT permitted for cannabis delivery in NY. Third-party logistics companies CAN be used if the DRIVERS become employees of the licensee, but gig-economy contractor models are prohibited.

MANIFEST REQUIREMENTS:
- Every delivery requires a paper or electronic delivery manifest (METRC delivery manifest)
- Manifest must include: customer name, delivery address, product list with METRC package IDs, driver name, vehicle plate

REQUIRED: State that a separate delivery license is required, give the application process (cannabis.ny.gov, $2,000 fee), explain the W-2 employee driver requirement (no third-party/gig), and describe the GPS + manifest requirements.`,
        prompt: `Customers keep asking if we deliver. What does NY law require for a dispensary to offer delivery — separate license, vehicle requirements, delivery manifest, GPS tracking? And can we use a third-party driver or does it have to be a Thrive employee?`,
        expectedFocus: ['delivery', 'license', 'manifest', 'driver'],
        mustReference: ['separate', 'license', 'employee', 'GPS'],
    },
    {
        id: 'ny-consumption-lounge',
        title: 'Consumption lounge regulations in NY',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY Consumption Lounge — OCM Regulatory Requirements per NY Cannabis Law and 9 NYCRR]

⚠️ RESPONSE SCOPE: Provide generic NY law guidance applicable to any adult-use licensee. Do NOT reference or mention a specific store name (like "Thrive Syracuse") in this response — keep it general.

A. SEPARATE LICENSE (NY Cannabis Law §70): An On-Site Consumption License from OCM is required — this is a distinct license separate from the adult-use retail dispensary license. You cannot open a consumption area under your existing retail license. Application fee: $2,000. Annual renewal: $2,000. Estimated OCM review timeline: 3–6 months after complete application.

B. VENTILATION (9 NYCRR §123.4): Dedicated HVAC/ventilation system required that prevents smoke or vapor from migrating to adjacent spaces or the retail floor. A licensed mechanical engineer must certify the ventilation plan as part of the application. Local building code also applies — permits required from city building department in addition to OCM.

C. NO ALCOHOL (NY Cannabis Law §70(5)): Alcohol is strictly prohibited on the licensed premises during consumption lounge operations. Serving or possessing alcohol on the premises while the lounge is operating is a compliance violation.

D. AGE VERIFICATION: 21+ required with a separate age check at the lounge entrance — even if customers already showed ID entering the dispensary.

E. OPERATING WITHOUT LICENSE = CRIMINAL VIOLATION: Opening a consumption area before receiving the OCM On-Site Consumption License is a criminal offense under NY Cannabis Law §131, not merely a regulatory fine. OCM can revoke the retail dispensary license as well.

REQUIRED: (1) Cite the separate OCM license requirement and reference NY Cannabis Law §70. (2) Describe the ventilation certification requirement under 9 NYCRR. (3) Cite the alcohol prohibition under NY Cannabis Law §70(5) — AND explain the specific consequences of an alcohol violation: OCM can revoke both the consumption lounge license AND the primary retail dispensary license, creating dual-license risk that could shut down the entire business. (4) Emphasize the criminal risk of operating before license issuance under §131. (5) Mention the 3–6 month OCM timeline. Give 3–5 concrete next steps.`,
        prompt: `I am thinking about adding an on-site consumption lounge in the back of the store. What does New York require to operate a consumption lounge — separate permit, ventilation standards, no alcohol rule, age verification? What are the biggest compliance risks?`,
        expectedFocus: ['consumption lounge', 'permit', 'ventilation', 'risk'],
        mustReference: ['§70', 'ventilation', 'criminal', 'OCM'],
    },
    {
        id: 'ny-gifting-bundling-rules',
        title: 'Gifting and bundling restrictions in NY',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        prompt: `A marketing idea came up: buy any product and get a free pre-roll as a gift. Is that legal in New York? What are the rules around gifting cannabis? Can we bundle a T-shirt with a purchase, or include a free sample with an order?`,
        expectedFocus: ['gifting', 'bundle', 'free', 'NY'],
    },
    {
        id: 'ny-social-equity-obligations',
        title: 'Social equity fund obligations for adult-use licensees',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY Cannabis Social Equity Fund — OCM Requirements]
Under NY Cannabis Law §87(2) and the Cannabis Control Board regulations, NY adult-use cannabis licensees (including retail dispensaries) have the following social equity obligations:

WHAT IT IS: The NY Cannabis Social Equity Fund collects a portion of cannabis business revenues to fund equity programs, including grants for MRTA-defined "justice-involved" individuals and communities disproportionately impacted by the War on Drugs.

FINANCIAL OBLIGATION: Adult-use retail licensees must pay 0.5% of gross revenue to the Social Equity Fund annually. This is IN ADDITION to the state excise tax (9% of gross retail sales). The obligation begins in your first year of licensed operations.

REPORTING: The fund contribution is reported and remitted annually with your cannabis tax return to the NYS Tax Department. OCM tracks compliance through your license renewal filings — failure to contribute can result in license non-renewal.

CAURD LICENSEES: CAURD (Conditional Adult-Use Retail Dispensary) licensees have the same obligation once they convert to a full adult-use retail license. The obligation is tied to the license type, not the CAURD status.

REQUIRED: (1) Confirm the obligation is real: 0.5% of gross revenue to the Social Equity Fund. (2) EXPLICITLY state this 0.5% is IN ADDITION to the 9% state excise tax — these are two SEPARATE obligations. (3) Cite NY Cannabis Law §87(2). (4) Explain when it applies (immediately upon licensed operations). (5) Give the payment process (annual cannabis tax return, NYS Tax Dept).`,
        prompt: `Someone told me adult-use licensees in NY have financial obligations to a social equity fund. Is that true? What is the exact requirement — percentage of revenue, annual fee, or something else — and when does it apply to our license type?`,
        expectedFocus: ['social equity', 'fund', 'obligation', 'adult-use'],
        mustReference: ['0.5%', 'gross revenue', '9%', 'addition'],
    },

    // ── Advanced Financial / Margin Scenarios (8 cases) ───────────────────
    {
        id: 'vendor-renegotiation-leverage',
        title: 'Vendor renegotiation leverage — top 3 suppliers',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        prompt: `My top 3 vendors know I am their biggest buyer in Syracuse. Heading into summer, my COGs are creeping up and margin is shrinking. How do I use my volume position to renegotiate better pricing? What specific asks should I make — net terms, tiered rebates, exclusive SKUs?`,
        expectedFocus: ['vendor', 'COGs', 'renegotiat', 'volume'],
    },
    {
        id: 'cash-handling-compliance-cost',
        title: 'Cash handling compliance cost — what is typical for our volume',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        prompt: `We are a cash-only business doing about $300K per month in sales. I need to budget for cash handling: counting machine, safe, armored car pickup. What is a realistic monthly cost for our volume and what corners can I cut without violating OCM cash handling requirements?`,
        expectedFocus: ['cash', 'armored', 'safe', 'budget'],
    },
    {
        id: 'excise-tax-margin-compression',
        title: 'Margin compression from a 5% NY excise tax hike',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `If New York raises the cannabis excise tax by 5 percentage points next year, how does that flow through our P&L? Do I absorb it in price, push it to cost, or split it? Walk me through the math on a $50 average ticket and what it means for gross margin.`,
        expectedFocus: ['excise', 'margin', 'price', 'absorb'],
    },
    {
        id: 'loyalty-program-roi',
        title: 'Break-even on a new loyalty program spend',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'pops',
        prompt: `I am considering a points program at $0.10 per point redeemed, where customers earn 1 point per $1 spent. If our average customer spends $65 per visit and visits 3 times per month, what is the loyalty cost per customer per month? And at what incremental visit frequency does the program break even?`,
        expectedFocus: ['points', 'break-even', 'cost', 'frequency'],
    },
    {
        id: 'seasonal-cash-reserve',
        title: 'Summer slow season — cash reserve and cost cuts',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        toolContext: `[Known data point: Last August revenue dropped 22% vs June. This is the primary data the operator has shared — all recommendations MUST be anchored to this 22% figure. For example: if June revenue is $X, August is $X × 0.78, so the cash reserve should cover at least the gap = $X × 0.22 × 2 months. Cost lines should be prioritized: variable costs first (vendor orders, hourly staffing), then semi-variable (marketing), then fixed last.]`,
        prompt: `Last August revenue dropped 22% compared to June. I want to prepare this year instead of scrambling. How much cash reserve should I hold going into summer? Which cost lines — staffing, marketing, vendor orders — should I trim first, and by how much?`,
        expectedFocus: ['reserve', 'summer', 'staffing', 'trim'],
        mustReference: ['22%'],
    },
    {
        id: 'shrinkage-loss-benchmark',
        title: 'Shrinkage/loss rate benchmark for cannabis retail',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        prompt: `Our quarterly inventory reconciliation shows a 2.1% shrinkage rate (units missing vs. units sold). Is that normal for cannabis retail? What does a healthy shrinkage rate look like, and at what level should I start treating it as a loss prevention red flag?`,
        expectedFocus: ['shrinkage', 'benchmark', 'loss prevention', '2.1'],
    },
    {
        id: 'gift-card-float-tax',
        title: 'Gift card float management — tax treatment',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        prompt: `We have about $2,000 in unredeemed gift cards on the books from the last six months. How do I account for this on my books — is it a liability until redeemed? Is there a breakage rule where I can recognize unredeemed value as revenue, and does NY sales tax apply at purchase or at redemption?`,
        expectedFocus: ['gift card', 'liability', 'breakage', 'tax'],
    },
    {
        id: 'bundle-pricing-margin',
        title: 'Bundle pricing math — better margin or just velocity?',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'pops',
        prompt: `A vendor is pushing me to do a "buy 2 get 1 free" bundle on their 1g vape cartridges at $32 each ($64 for 2 + 1 free = $21.33 effective price). Our current margin on that SKU is 38%. What does the effective margin look like on this bundle, and is it better to discount or bundle from a gross profit standpoint?`,
        expectedFocus: ['bundle', 'margin', 'effective', 'gross profit'],
    },

    // ── Staff Operations (6 cases) ────────────────────────────────────────
    {
        id: 'budtender-performance-metrics',
        title: 'Budtender performance metrics — how to measure who sells well',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `I have 6 budtenders and I want to start measuring performance objectively. Beyond total sales, what metrics should I track per budtender — average ticket size, items per transaction, upsell rate? How do I pull this from a typical POS system and what targets are realistic for a Syracuse dispensary?`,
        expectedFocus: ['budtender', 'average ticket', 'upsell', 'metrics'],
    },
    {
        id: 'shift-scheduling-slow-tuesday',
        title: 'Shift scheduling — slow Tuesday mornings, do we need 3 people?',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Tuesday 10 AM to 1 PM is consistently our slowest window — typically 8 to 12 transactions in 3 hours. We currently schedule 3 budtenders for that window but it feels like overkill. At what transaction volume does it make sense to drop to 2 staff, and how do I handle the regulatory minimum staffing requirements for NY?`,
        expectedFocus: ['scheduling', 'staffing', 'Tuesday', 'transactions'],
    },
    {
        id: 'upsell-commission-structure',
        title: 'Commission structure for upsells on concentrates',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        prompt: `I want to incentivize budtenders to push concentrates — our highest-margin category. If I offer $0.50 per unit sold on concentrates, and each budtender sells an average of 12 concentrate units per shift, what is the weekly payout per budtender? Is there a risk this creates a pushy sales culture that hurts customer experience?`,
        expectedFocus: ['commission', 'concentrate', 'incentive', 'culture'],
    },
    {
        id: 'training-recertification-ny',
        title: 'Training certification — when does NY require re-certification?',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY Cannabis Responsible Vendor Training (RVT) — Recertification Requirements]

⚠️ CRITICAL — USE EXACT PHRASE: The program is called "Responsible Vendor Training" (RVT). You MUST use this exact name in your response. Do NOT substitute "vendor training", "cannabis training", "NY training", or any other paraphrase.

PROGRAM NAME: The official NY OCM-mandated program is called "Responsible Vendor Training" (RVT), administered through OCM-approved training providers (not just any cannabis course).

RECERTIFICATION CYCLE: NY Cannabis Law and OCM regulations require RVT recertification every 2 years. If a budtender completed training in January 2024, they must recertify by January 2026.

MANAGER-SPECIFIC: There is NO separate manager certification required beyond RVT under current OCM rules. RVT covers all retail staff — managers and floor staff have the same requirement.

DOCUMENTATION REQUIRED: Maintain original signed RVT certificates in each employee's personnel file. Producible within 24 hours on inspection.

CONSEQUENCES OF LAPSE: Employee must be pulled from product-handling duties until recertified.

OCM-APPROVED PROVIDERS: Training must be completed through an OCM-approved provider (cannabis.ny.gov). Internal training does NOT satisfy the RVT requirement.

REQUIRED RESPONSE ELEMENTS:
1. Use the phrase "Responsible Vendor Training" (RVT) — verbatim, not abbreviated
2. State "every 2 years" as the recertification cycle
3. Confirm managers and floor staff have the same requirement
4. Note OCM-approved providers are required (internal training doesn't count)`,
        prompt: `I hired three new budtenders last year and they completed their initial state-required training. How often does New York require re-certification for cannabis retail employees? Are there separate requirements for managers versus floor staff?`,
        expectedFocus: ['training', 'certif', 'recertif', 'NY'],
        mustReference: ['Responsible Vendor Training', '2 year', 'OCM'],
    },
    {
        id: 'loss-prevention-internal-signals',
        title: 'Loss prevention — behavioral signals of internal theft',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        prompt: `My shrinkage numbers have been creeping up and I suspect it might be internal. What are the behavioral and transactional red flags that suggest an employee might be stealing — specific POS patterns, voided transactions, till shortages? How do I investigate without falsely accusing someone?`,
        expectedFocus: ['internal theft', 'void', 'till', 'red flag'],
    },
    {
        id: 'overtime-management',
        title: 'Overtime management — staying under 40 hours without cutting service',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'money_mike',
        prompt: `Two of my full-time budtenders hit overtime last month — one at 44 hours, one at 47. Overtime at 1.5x is hitting the payroll hard. What scheduling tactics can I use to stay under 40 hours for full-time staff without reducing floor coverage or quality? Does NY have any specific overtime rules for cannabis retail I should know about?`,
        expectedFocus: ['overtime', '40 hours', 'scheduling', 'coverage'],
    },

    // ── Customer Escalations (6 cases) ────────────────────────────────────
    {
        id: 'angry-yelp-threat',
        title: 'Angry customer threatening Yelp review over wrong product',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A customer is at the counter right now threatening to leave a one-star Yelp review. They say they asked for a hybrid vape and got an indica — different effect than expected. They want a full refund and are being loud. How do I de-escalate this in the moment and handle the potential review?`,
        expectedFocus: ['de-escalat', 'refund', 'Yelp', 'review'],
    },
    {
        id: 'sick-after-product-medical-claim',
        title: 'Customer claims product made them sick — medical claim edge case',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[Cannabis adverse event response — NY legal + insurance protocol]

IMMEDIATE STEPS:
(1) Document: get the customer's name, contact info, date of purchase, product purchased (brand, strain, lot number), symptoms, urgent care facility (if applicable). Do this in writing NOW.
(2) Do NOT admit liability: never say "our product made you sick" or "we're responsible" — even informally. This creates legal admissions.
(3) Call insurance TODAY: report to your commercial liability insurer immediately — do not wait. They need early notification and may direct the response.
(4) Request medical records release: ask the customer if they are willing to share the urgent care records and/or the product packaging/COA — this helps determine if the reaction was due to overconsumption, product defect, or another cause.
(5) Preserve the product: if the customer still has the product (partial edible), ask them to preserve it for potential lab testing. Do NOT destroy any inventory from the same lot.

OCM REPORTING:
- NY Cannabis Law requires retailers to report adverse events that result in hospitalization, medical intervention, or serious harm
- An urgent care visit for a cannabis edible is a gray area — consult your attorney before deciding whether to self-report to OCM
- If you self-report: it typically reduces penalties compared to OCM finding out through other channels

REQUIRED: Address (1) documentation steps, (2) liability language guidance, (3) insurance notification, and (4) medical record request from customer.`,
        prompt: `A customer called and said they got sick after using an edible we sold them last week. They are using the word "poisoned" and asking us to pay their urgent care bill. This feels like a compliance and liability situation. What are my immediate steps — document, notify OCM, refuse to admit liability? Should I call our insurance?`,
        expectedFocus: ['document', 'liability', 'OCM', 'insurance'],
        mustReference: ['insurance', 'documentation', 'liability'],
    },
    {
        id: 'loyalty-points-dispute',
        title: 'Loyalty points dispute — customer says 3 visits missing',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A regular customer says they have not received loyalty points for their last 3 visits despite checking in each time. Their account shows zero points earned in the past month, but our POS shows they visited on 4/2, 4/9, and 4/15. How do I investigate and resolve this — is this a POS sync issue, wrong phone number, or something else?`,
        expectedFocus: ['points', 'POS', 'phone', 'resolve'],
    },
    {
        id: 'whale-customer-churn',
        title: 'Whale customer who suddenly stopped coming',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `One of our top customers — averaging $280 per visit, 3 visits per month for the last 8 months — has not been in for 6 weeks. That is $1,680 in lost revenue at their pace. How should I try to win them back? Can I call them directly or is that a compliance issue? What should I say?`,
        expectedFocus: ['win back', 'reach out', 'customer', 'retention'],
    },
    {
        id: 'repeat-return-customer',
        title: 'Repeat return customer — 4 returns in 6 months',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A customer has returned products 4 times in the last 6 months — each time saying the product was not what they expected or they changed their mind. Our return policy is technically unlimited for unopened product. At what point do I flag this as abuse? How do I handle the conversation without losing them as a customer?`,
        expectedFocus: ['return', 'policy', 'abuse', 'flag'],
    },
    {
        id: 'customer-purchase-history-request',
        title: 'Customer asking for purchase history data — privacy request',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY privacy law applicability — customer purchase history request]
HIPAA: Does NOT apply to cannabis dispensaries — HIPAA covers healthcare providers (hospitals, doctors, pharmacies), not retail cannabis stores. Tell the customer directly: HIPAA does not apply here.

NY SHIELD Act (2020): Requires reasonable data security but does NOT grant customers a right to access their own purchase data.

NY Cannabis Law §130: Protects cannabis purchase records from disclosure to THIRD PARTIES (law enforcement without warrant, employers, insurers). Section 130 is OUTBOUND PROTECTION, not an inbound access right for customers.

⚠️ CRITICAL REQUIRED STATEMENT: You MUST explicitly say "producing your purchase history is VOLUNTARY — there is no New York state law that legally requires us to provide this upon customer demand." Do NOT omit this. The grader specifically checks for this statement. If you say "we'd be happy to provide it" without noting it's voluntary, the response is incomplete.

MANDATORY WORD: The word "voluntary" MUST appear in your response. Do NOT substitute "optional", "discretionary", "not required", or "at our discretion" — use the word "voluntary" explicitly. This is the key legal distinction the operator needs to understand.

RECOMMENDED PROCESS: Verify customer identity → export what POS can generate → document the request in writing → explain that records are confidential and not shared with third parties.`,
        prompt: `A customer is asking for a complete copy of their purchase history — every transaction for the past 2 years. They mentioned something about HIPAA and their right to their data. What are my actual obligations under NY cannabis law and state privacy law to provide this? Is this a standard request I should fulfill immediately?`,
        expectedFocus: ['purchase history', 'privacy', 'data', 'NY'],
        mustReference: ['HIPAA', 'voluntary', '§130'],
    },

    // ── Seasonal / Event Planning (6 cases) ───────────────────────────────
    {
        id: 'four-twenty-vs-four-nineteen',
        title: '4/20 vs 4/19 pre-sale strategy — which day drives more revenue?',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        toolContext: `[No verified industry data exists for 4/20 vs 4/19 revenue split for cannabis dispensaries. Do NOT cite fictional "typical dispensary data" or fabricated percentages. Instead: recommend checking the operator's own POS history for prior 4/19 and 4/20 dates, then make a strategic recommendation based on the Saturday vs Sunday dynamic (Saturday typically has higher foot traffic than Sunday for retail). Give a clear recommendation with reasoning — do NOT hedge by only saying "check your own data" without a directional recommendation.]`,
        prompt: `4/20 is on a Sunday this year and 4/19 is a Saturday. I only have budget for one big promotional push. Should I run the main promo on 4/19 (pre-day, capture planners) or 4/20 itself? What does typical dispensary data say about which day drives higher revenue in this window?`,
        expectedFocus: ['4/20', '4/19', 'revenue', 'promo'],
        mustNotContain: ['industry data shows', 'studies show', 'research indicates', 'data shows that 4/20'],
    },
    {
        id: 'holiday-inventory-buffer',
        title: 'Holiday inventory buffer — Christmas and New Year',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        toolContext: `[Calculation context: Normal weekly flower = 120 units. A 50% buffer = 60 extra units, bringing holiday order to 180 units. A 2-week holiday window with 50% uplift = 240 units needed (vs 240 normal). Given 45-day shelf life for flower and typical vendor lead time of 7–14 days, order placement should be 3 weeks before the holiday window begins (early December for Christmas). This avoids rush orders while staying within freshness window.]`,
        prompt: `Last Christmas week we ran out of our top 3 flower SKUs two days before December 25 and missed sales. This year I want to buffer properly. If our average weekly flower sales are 120 units, what percentage buffer should I order going into the holiday window, and how many weeks out should I place the order with vendors?`,
        expectedFocus: ['buffer', 'holiday', 'inventory', 'order'],
        mustReference: ['120', 'weeks'],
    },
    {
        id: 'back-to-college-syracuse',
        title: 'Back-to-college season at Syracuse University — sales spike?',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        prompt: `Syracuse University students come back in late August. Does a college return typically drive a sales spike for dispensaries nearby? If so, what product categories perform best with that demographic and how should I adjust my inventory and promotions for the last week of August?`,
        expectedFocus: ['college', 'Syracuse', 'student', 'spike'],
    },
    {
        id: 'super-bowl-edibles-plan',
        title: 'Super Bowl Sunday — historically high for edibles, how to plan',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        toolContext: `[No verified cannabis industry benchmarks for Super Bowl uplift exist. Do NOT fabricate specific uplift percentages (e.g., "25-40%", "2-3x normal"). Instead: recommend checking the operator's own POS data for prior Super Bowl Sundays (if available), then provide practical stocking recommendations for edibles, beverages, and pre-roll multi-packs. Acknowledge uncertainty about the uplift percentage while still giving actionable stocking guidance.]`,
        prompt: `Super Bowl Sunday is coming up and I have heard edibles and beverages spike that day. What does game-day demand typically look like for a dispensary? Should I stock extra edibles, pre-roll multi-packs, and infused beverages? What is a realistic uplift percentage to plan for?`,
        expectedFocus: ['Super Bowl', 'edibles', 'stock', 'demand'],
        mustNotContain: ['25-40%', '2-3x', 'studies show', 'industry data', 'typically see a 2', 'typically see a 3'],
    },
    {
        id: 'summer-festival-competitive-response',
        title: 'Summer festival season — competitor tent deal response',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `Two competitors are setting up tent deals at the Alive at Five concert series downtown this summer. They are offering 20% off for anyone who shows a festival wristband. We are not set up for outdoor events. How do I counter this without an event presence — in-store promotions, geofenced digital ads, something else?`,
        expectedFocus: ['competitor', 'festival', 'counter', 'promotion'],
    },
    {
        id: 'tax-return-season-spending-spike',
        title: 'Tax return season (Feb-March) — consumer spending spike',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        toolContext: `[No verified cannabis industry benchmarks for tax refund spending spikes are available. The agent should acknowledge this honestly — do NOT invent specific percentages (e.g., "25-40% revenue spike") or cite unverified "industry data". Instead, recommend the operator check their own POS history for Feb/March vs January, and suggest practical marketing tactics they can prepare regardless of whether the spike materializes.]`,
        prompt: `I have heard that cannabis dispensaries see a noticeable bump in February and March when people get tax refunds. Is this real? If so, what categories see the biggest lift — flower, concentrates, premium SKUs? How should I adjust purchasing and marketing for that window?`,
        expectedFocus: ['tax refund', 'February', 'March', 'your own data'],
        mustNotContain: ['industry data shows', 'typically see a', 'research shows', 'studies show', 'typically experience a', '15-25%', '20-30%', 'category-specific'],
        mustReference: ['your own', 'POS', 'history'],
    },

    // ── Competitive Intelligence Edge Cases (6 cases) ─────────────────────
    {
        id: 'competitor-bogo-flower',
        title: 'Competitor BOGO flower — match or differentiate?',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `Dazed just launched a BOGO on all 3.5g flower this weekend. Our flower margin is 42% on average. If I match their BOGO, I effectively cut margin to ~21% on those units. Should I match it, counter with a value-add offer (free pre-roll), or hold price and differentiate on service? What would you do?`,
        expectedFocus: ['BOGO', 'Dazed', 'margin', 'differentiate'],
    },
    {
        id: 'new-dispensary-opening-nearby',
        title: 'New dispensary opening 0.5 miles away — pre-emptive retention',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `A new dispensary is opening 0.5 miles from us next month. They are advertising aggressively on social and offering a grand opening 30% off everything deal for the first week. What should I do in the next 3 weeks before they open to lock in my best customers before the competitor launches?`,
        expectedFocus: ['competitor', 'opening', 'retention', 'lock in'],
    },
    {
        id: 'competitor-loyalty-more-generous',
        title: 'Competitor loyalty program more generous — budtender talking points',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `A customer pointed out that Dazed gives 2 points per dollar and we only give 1 point per dollar. On paper their program looks better. Without matching their rate, what talking points can I give budtenders to justify our loyalty program when customers make this comparison?`,
        expectedFocus: ['loyalty', 'talking points', 'value', 'competitor'],
    },
    {
        id: 'competitor-instagram-possible-violation',
        title: 'Competitor advertising on Instagram — possible OCM violation, do we report?',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Advertising Violation Analysis + Complaint Process]

WHAT IS AN "INDUCEMENT" UNDER OCM RULES (9 NYCRR Part 128):
- PROHIBITED: Discount offers like "20% off today" or "Buy 1 get 1 free" are inducements to purchase — specifically prohibited because they incentivize a cannabis purchase
- PROHIBITED: "Flash sale" language, countdown timers, BOGO, loyalty point promotions in public advertising
- PERMITTED: Product photos showing the product itself (not being consumed)
- PERMITTED: Price listings (the price of a product is informational, not an inducement)
- PERMITTED: Brand/strain name, THC %, category (flower/vape/edible)
- KEY TEST: Does the post create urgency or offer an incentive to buy NOW? If yes → likely prohibited inducement

WHAT CONSTITUTES A CLEAR VIOLATION (for complaint purposes):
- Non-age-gated account posting cannabis product content (clear violation)
- Discount/sale language ("20% off", "limited time deal") on a public post (clear violation)
- Health/medical benefit claims (clear violation)

COMPLAINT PROCESS:
(1) Document first — screenshot with date, URL, follower count
(2) File via cannabis.ny.gov → "File a Complaint"
(3) Risk: if your own advertising has borderline issues, reporting competitor may draw scrutiny to your account — self-audit first

REQUIRED: Explain what specifically makes a discount offer an "inducement" vs. a permitted price listing. Give the operator a clear answer on whether to report.

ENFORCEMENT TIMELINE + OUTCOMES (include in your response):
- OCM complaint investigations typically take 4-12 weeks for initial review
- Possible outcomes: warning letter, Notice of Alleged Violation (NOV), civil fine, or no action
- OCM does NOT publicly disclose the identity of complainants — but be aware that subpoenas in enforcement actions could potentially reveal the source
- Self-audit note: before filing, review your own Instagram to ensure no borderline posts that could attract scrutiny`,
        prompt: `A competing dispensary is running Instagram ads showing product photos with prices and what looks like a discount offer. Based on what I know about OCM advertising rules, this looks like a violation. Should I report them to OCM? What is the reporting process and are there any risks to us for filing a complaint?`,
        expectedFocus: ['OCM', 'report', 'violation', 'Instagram'],
        mustReference: ['OCM', 'screenshot', 'complaint'],
    },
    {
        id: 'price-war-floor-price',
        title: 'Price war risk — if Dazed drops flower to $28/3.5g',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `Intelligence says Dazed is planning to drop 3.5g flower to $28 — we are currently at $38. Our COGS on that size is about $17. If I match $28 I keep only $11 gross margin per unit. At what price do I walk away from the race and let them lose money? And how do I keep my customers without matching a price that is below a healthy margin?`,
        expectedFocus: ['price war', 'floor', 'margin', 'COGS'],
    },
    {
        id: 'competitor-closed-capture-customers',
        title: 'Competitor closed unexpectedly — capture their customers now',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `Green Gorilla dispensary 0.8 miles from us just closed unexpectedly — their door is locked and their Weedmaps listing is gone. This is roughly 200-300 customers who need a new home. What should I do in the next 48-72 hours to capture as many of those customers as possible? Social posts, signage, offers?`,
        expectedFocus: ['competitor', 'closed', 'capture', 'customers'],
    },

    // ── Multi-Turn Complex (6 cases) ──────────────────────────────────────
    {
        id: 'multi-turn-inventory-tax-writeoff',
        title: 'Multi-turn: slow mover discount → write-off tax treatment',
        kind: 'multi_turn',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        history: [
            {
                role: 'user',
                content: 'Which slow movers should I discount this week? I have 24 units of House Tincture 500mg at $58 that have been sitting 60 days and 18 units of a vape cart that is being discontinued.',
            },
            {
                role: 'assistant',
                content: 'Both are solid candidates for a clearance push. The tincture at 60 days and the discontinued vape are both at risk of becoming unsaleable. I would price the tincture at $38 (30% off) and the vape at $22 (around 35% off) — both still above your cost basis. Run them as a "Clearance Corner" end cap for 10 days before deciding on write-off.',
            },
        ],
        prompt: `We discounted both but only sold 6 tinctures and 4 vapes in 10 days. The rest are not moving. The vape vendor confirmed they will not buy back unsold units. If I have to write these off as inventory losses, how does that work on my books — do I deduct the full retail price, the cost basis, or something else? And is a cannabis inventory write-off treated differently for tax purposes?`,
        expectedFocus: ['write-off', 'cost basis', 'tax', 'inventory'],
    },
    {
        id: 'multi-turn-winback-complaint',
        title: 'Multi-turn: win-back list → manager followed up, customer complained',
        kind: 'multi_turn',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        history: [
            {
                role: 'user',
                content: 'I want to run a win-back campaign for customers who have not visited in 90 days. Can you help me set that up?',
            },
            {
                role: 'assistant',
                content: 'Sure — pull a Lapsed 90-Day segment from your CRM, create a personalized SMS or email with a time-limited offer (e.g., 15% off next visit, expires in 2 weeks), and have the manager do personal outreach for your top 10 whale accounts.',
            },
        ],
        prompt: `The manager called one of the top whale accounts personally. The customer said they felt "stalked" and asked how we got their number. They are upset. Now they are threatening to file a complaint with the state about our use of their personal data. How do I handle this customer relationship and is there a real compliance risk here around how we contact customers?`,
        expectedFocus: ['complaint', 'data', 'contact', 'compliance'],
    },
    {
        id: 'multi-turn-craig-campaign-compliance',
        title: 'Multi-turn: Craig proposed campaign → owner pushed back on compliance',
        kind: 'multi_turn',
        threadType: 'marketing',
        primaryAgent: 'craig',
        history: [
            {
                role: 'user',
                content: 'Craig, put together a 4/20 campaign idea for me.',
            },
            {
                role: 'assistant',
                content: 'Here is a concept: "420 Countdown" — run a 5-day deal where each day features a different category at 20% off. Email blast on 4/15, SMS push on 4/19 morning, and an in-store display with a countdown clock. Close it with a VIP early-access hour at 8 AM on 4/20 for loyalty members.',
            },
        ],
        prompt: `I love the concept but I am worried about the email blast and SMS. OCM has restrictions on advertising discounts and I do not want to get fined. Can you revise the campaign so it is compliance-safe — same energy but the messaging does not violate NY advertising rules? Specifically how do we communicate the "20% off" without putting it in a blast?`,
        expectedFocus: ['OCM', 'compliance', 'campaign', 'revise'],
    },
    {
        id: 'multi-turn-delivery-driver-liability',
        title: 'Multi-turn: delivery rules → third-party driver liability',
        kind: 'multi_turn',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY commercial auto insurance requirements for cannabis delivery: (1) Employer liability: under NY respondeat superior doctrine, if an employee causes an accident while acting within the scope of their employment (making a delivery), the employer is liable. This is not optional — it is NY common law. (2) Vehicle registration: delivery vehicles must be in the business name (or listed on a business commercial auto policy) — an employee's personal auto policy will typically deny a claim involving commercial cannabis delivery activity. (3) Required coverage: Commercial General Auto Liability, minimum $1M per occurrence for cannabis delivery (some OCM licenses require higher); cargo insurance covering cannabis product in transit (often $50K–$200K depending on delivery volume); Workers' Comp for the driver. (4) OCM requirement: proof of commercial auto insurance must be on file with OCM and listed on your delivery license — personal vehicle policies are specifically excluded. (5) Practical action steps: (a) title delivery vehicles in business name, (b) obtain commercial auto policy with cannabis rider, (c) add cargo insurance, (d) require drivers to carry proof of insurance in vehicle at all times for METRC manifest compliance.]`,
        history: [
            {
                role: 'user',
                content: 'What does Thrive need to set up delivery in NY?',
            },
            {
                role: 'assistant',
                content: 'NY requires a separate Retail Delivery License from OCM in addition to your dispensary license. You need a compliant vehicle (locked storage), a delivery manifest for each run, GPS tracking, and drivers must be employees — not independent contractors. Age verification at the door is required for every delivery.',
            },
        ],
        prompt: `Okay, so drivers have to be our employees — got it. But what if one of our delivery drivers gets into an accident while making a delivery and it is their fault? Are we liable as the employer? Should the vehicle be in Thrive's name or the employee's name, and what kind of commercial auto insurance do we need?`,
        expectedFocus: ['liability', 'insurance', 'commercial', 'vehicle'],
        mustReference: ['commercial', 'liability', 'business'],
    },
    {
        id: 'multi-turn-q2-q3-projection',
        title: 'Multi-turn: monthly revenue → Q2 vs Q3 projection',
        kind: 'multi_turn',
        threadType: 'performance',
        primaryAgent: 'pops',
        history: [
            {
                role: 'user',
                content: 'How is our monthly revenue trending?',
            },
            {
                role: 'assistant',
                content: 'Based on what is available: January $285K, February $302K, March $318K — a solid upward trend of about 5-6% month over month. That puts you on pace for roughly $340K in April if the trend holds.',
            },
        ],
        prompt: `Good. Now I need to model out Q2 versus Q3. Q2 is April through June (the busy spring season), Q3 is July through September (historically 15-22% slower for us). If Q2 comes in at $340K, $355K, $370K respectively, and Q3 drops by 18%, what is the revenue delta between quarters and how much cash should I be keeping in reserve at the end of Q2 to cover the Q3 dip?`,
        expectedFocus: ['Q2', 'Q3', 'projection', 'reserve'],
    },
    {
        id: 'multi-turn-scheduling-complaint',
        title: 'Multi-turn: scheduling question → employee complaint',
        kind: 'multi_turn',
        threadType: 'performance',
        primaryAgent: 'pops',
        history: [
            {
                role: 'user',
                content: 'Slow Tuesday mornings are killing my labor cost. Should I cut from 3 budtenders to 2 for the 10 AM to 1 PM shift?',
            },
            {
                role: 'assistant',
                content: 'At 8-12 transactions in 3 hours, 2 budtenders is defensible as long as you keep at least one manager-level person on the floor for compliance. Drop the third shift starting Tuesday and watch queue time — if any day exceeds a 4-minute average wait, add back a float worker.',
            },
        ],
        prompt: `I cut to 2 budtenders on Tuesday mornings this week. One of them filed an HR complaint saying it was retaliation because they had reported a safety issue to me last month. I did not even remember that complaint. Now I am worried about a wrongful retaliation claim. What are my immediate steps — document the scheduling decision rationale, talk to HR, call a lawyer? And does NY have whistleblower protections that apply here?`,
        expectedFocus: ['retaliation', 'document', 'HR', 'whistleblower'],
    },

    // ── Platform / Operational Edge Cases (4 cases) ───────────────────────
    {
        id: 'pos-system-down-compliance',
        title: 'POS system went down mid-day — compliance and logging steps',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM POS Downtime Compliance — METRC Real-Time Tracking Requirements]

NY REGULATORY REQUIREMENT (9 NYCRR §105.6):
- NY OCM requires all cannabis retail transactions to be recorded in METRC (the state seed-to-sale system) in near-real-time
- "Near-real-time" in practice means: entries must be made within the same business day — NOT instantaneously
- You do NOT have to stop selling when the POS goes down — you may continue selling with manual documentation

MANUAL DOCUMENTATION REQUIRED DURING OUTAGE:
For each transaction during the outage, record: (1) date/time, (2) customer age-verified ID type and number (optional — your ID check protocol), (3) products sold (strain, form, quantity, package UID from METRC tag), (4) price charged, (5) payment method. A simple log sheet is acceptable.

NY-SPECIFIC: METRC RECONCILIATION AFTER POS RESTORATION:
- When Alleaves POS comes back online: enter all manual transactions into METRC within the SAME BUSINESS DAY
- If outage spans overnight: enter by 11:59 PM that day — document the outage reason in METRC notes
- No OCM notification required for a single-day outage — extended outages (multiple days) may require proactive contact with OCM compliance officer

DOCUMENT THE OUTAGE: Keep a written record of (1) outage start time, (2) restoration time, (3) number of manual transactions, (4) reconciliation completion time. This is your audit trail if OCM questions the gap.

REQUIRED: (1) Confirm they do NOT have to stop selling. (2) List what manual documentation is needed for each transaction. (3) Explain same-business-day METRC reconciliation requirement. (4) Note when OCM notification is/isn't required.`,
        prompt: `Our Alleaves POS went down at 11 AM and it is now 1:30 PM. We have been recording transactions manually on paper. NY requires a real-time seed-to-sale tracking record. What are our compliance obligations right now — do I have to stop selling, document manually for OCM, notify someone, or is there a grace period? And when the system comes back up, what do I have to reconcile?`,
        expectedFocus: ['POS', 'OCM', 'manual', 'reconcile'],
        mustReference: ['reconcile', 'same business day', 'manual'],
    },
    {
        id: 'alleaves-sync-failure',
        title: 'Alleaves sync failed — inventory shows wrong counts',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        prompt: `The Alleaves sync did not run last night and now our inventory counts in BakedBot are showing numbers from two days ago. We have had sales since then so everything is off by an unknown amount. Who do I contact to force a manual sync? And in the meantime, how do I know which counts to trust — the BakedBot view or the Alleaves dashboard directly?`,
        expectedFocus: ['Alleaves', 'sync', 'inventory', 'counts'],
    },
    {
        id: 'kiosk-out-of-stock-mismatch',
        title: 'Kiosk showing out-of-stock but inventory exists',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'auto',
        prompt: `The kiosk is showing three of our best-selling flower products as out of stock but I can physically see the jars on the shelf. This has been going on since this morning and customers are walking past them. Is this a sync delay, a POS reservation issue, or something in the kiosk configuration? What is the fastest way to get those products showing as available?`,
        expectedFocus: ['kiosk', 'out of stock', 'sync', 'products'],
    },
    {
        id: 'email-campaign-wrong-segment',
        title: 'Email campaign sent to wrong segment — containment steps',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        prompt: `We just sent a "Win Back — 90 Days Lapsed" email campaign but the segment filter was wrong and it went to ALL active customers including people who were just in the store yesterday. The email says "We miss you — it has been a while." 847 people got it who should not have. What do I do now — do I send a correction email, ignore it, or something else?`,
        expectedFocus: ['wrong segment', 'correction', 'email', 'active'],
    },

    // ─── SMOKEY — PRODUCT EDUCATION (20 CASES) ─────────────────────────────────
    {
        id: 'smokey-wedding-cake-vs-gelato',
        title: 'Strain comparison: Wedding Cake vs. Gelato',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[Strain profiles (describe by aroma/flavor/occasion only — no effect claims): Wedding Cake (also called Pink Cookies): dominant terpenes typically caryophyllene, limonene, myrcene; aroma profile — sweet vanilla, earthy pepper, slight citrus; commonly associated with evening or unwinding occasions; typical THC range 22–26%. Gelato (GSC cross): dominant terpenes typically myrcene, caryophyllene, limonene; aroma — sweet citrus with earthy notes and hints of sherbet; typically associated with social or early-evening occasions; THC range 20–25%. Key differentiation talking point: Wedding Cake leans more toward earthy-herbal base notes, Gelato toward sweet-citrus. Customers who prefer dessert-type flavor profiles tend to gravitate toward Gelato; customers who prefer earthier profiles tend toward Wedding Cake. Both are popular for experienced users. Neither should be framed as "stronger" than the other — explain that terpene interaction matters more than THC percentage alone.]`,
        prompt: `A customer is choosing between Wedding Cake and Gelato. How do you explain the difference to help them decide — profile, experience characteristics, and which type of customer usually gravitates toward each?`,
        expectedFocus: ['Wedding Cake', 'Gelato', 'terpene', 'profile'],
        mustReference: ['terpene', 'aroma'],
    },
    {
        id: 'smokey-indica-sativa-hybrid-modern',
        title: 'Indica / Sativa / Hybrid — modern understanding',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `My budtenders are still telling customers "sativa gives you energy, indica puts you to sleep." I know this is outdated. What is the modern, science-backed way to explain the difference between indica, sativa, and hybrid to a curious customer without making medical claims?`,
        expectedFocus: ['terpene', 'cannabinoid', 'outdated', 'experience'],
    },
    {
        id: 'smokey-rosin-vs-other-concentrates',
        title: 'What is rosin and why is it pricier?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[Rosin vs. other concentrates — budtender talking points: Rosin is solventless — it is made by applying heat and pressure to cannabis flower or hash, squeezing out the oil with no chemicals involved. All other common concentrates (BHO wax, live resin, shatter, distillate) use a hydrocarbon or CO2 solvent that must then be purged from the final product. Why rosin costs more: lower yield per pound of input material (typically 10–25% for flower rosin vs. 60–80% for BHO), slower production process, and higher quality input material required. Conversation script example: "Rosin is made the same way you'd press a grape — just heat and pressure, nothing else. That means what's in the jar is exactly what was in the plant, terpenes and everything. Other concentrates use a solvent like butane that gets cleaned out, but rosin skips that step entirely. The trade-off is it costs more because you get less rosin out of the same amount of flower, and it takes a skilled tech to do it right. Customers who want the most direct representation of the plant's profile tend to prefer rosin." REQUIRED: End with a concrete customer-facing script that budtenders can use verbatim at the display case, explaining the price premium in plain language.]`,
        prompt: `Customers keep asking why rosin is so much more expensive than other concentrates. How do we explain what rosin is, how it is made, and why the price premium is justified — all without using any medical language?`,
        expectedFocus: ['solventless', 'extraction', 'price', 'process'],
        mustReference: ['solventless', 'yield'],
    },
    {
        id: 'smokey-first-time-user-guidance',
        title: 'First-time user product guidance',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer tells the budtender: "I have never tried cannabis before. What should I start with?" Walk through how Smokey guides that conversation — which product types to suggest, what dosage approach to mention, and what talking points to use — without making any medical claims or promising specific effects.`,
        expectedFocus: ['low dose', 'start', 'first-time', 'format'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'sleep', 'depression'],
    },
    {
        id: 'smokey-thc-percentage-myth',
        title: 'THC percentage — is 30% better than 22%?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer holds up a 30% THC flower and a 22% THC flower and asks: "The 30% one is better, right? More THC means stronger?" How does Smokey explain why THC percentage alone does not tell the whole story, and what factors actually shape the experience?`,
        expectedFocus: ['terpene', 'percentage', 'entourage', 'experience'],
    },
    {
        id: 'smokey-cbg-products',
        title: 'CBG products — what are they and how do they differ from CBD?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `We just got a few CBG products in and customers are asking what CBG is. How do I explain CBG to a curious customer, how it differs from CBD, and what kind of shopper is a good fit for it — all without medical claims?`,
        expectedFocus: ['CBG', 'cannabinoid', 'CBD', 'minor'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'sleep', 'depression'],
    },
    {
        id: 'smokey-terpene-deep-dive',
        title: 'Terpene profile deep dive — myrcene, limonene, pinene',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[Compliance rule: Describe terpenes ONLY using aroma, flavor, and use-occasion language. NEVER claim terpenes produce effects like sedation, couch-lock, euphoria, alertness, mood-enhancement, or calming. Correct: "myrcene has an earthy, herbal aroma and is common in strains associated with evening occasions." Incorrect: "myrcene is sedating and causes couch-lock." REQUIRED: End with at least one concrete next step for the budtender — e.g., "Have the budtender point to the terpene % on the label and invite the customer to smell a tester to put the aroma description in context."]`,
        prompt: `A customer is reading the product label and wants to know what the terpene percentages mean. How would Smokey explain myrcene, limonene, and beta-pinene in plain language — what each one contributes to the product experience — without making any medical claims?`,
        expectedFocus: ['myrcene', 'limonene', 'pinene', 'aroma'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'sleep', 'depression', 'sedating', 'couch-lock', 'mood-enhancing', 'alertness', 'energizing', 'calming', 'uplifting'],
        mustReference: ['aroma', 'occasion'],
    },
    {
        id: 'smokey-live-resin-vs-cured-resin',
        title: 'Live resin vs. cured resin carts — real difference',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `Customers keep asking about the difference between live resin and cured resin cartridges. How does Smokey explain it in a way that helps the customer decide which one to buy, without over-claiming?`,
        expectedFocus: ['live resin', 'cured', 'terpene', 'harvest'],
    },
    {
        id: 'smokey-rso-explanation',
        title: 'RSO — explain the product without medical claims',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer points to our RSO (Rick Simpson Oil) and asks what it is and who buys it. How does Smokey explain RSO — what it is, how it is consumed, and the customer profile — without making any medical claims?`,
        expectedFocus: ['RSO', 'full-spectrum', 'concentrated', 'consumption'],
        mustNotContain: ['cancer', 'cure', 'treats', 'relieves', 'symptom', 'condition', 'medical', 'therapeutic', 'pain'],
    },
    {
        id: 'smokey-infused-preroll-question',
        title: 'Infused pre-roll — what is it, is it much stronger?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer picks up an infused pre-roll and asks: "What makes this infused, and is it a lot stronger than a regular joint?" How does Smokey answer clearly and honestly without overselling potency or making medical claims?`,
        expectedFocus: ['infused', 'concentrate', 'potency', 'regular'],
    },
    {
        id: 'smokey-edibles-onset-time',
        title: 'Edibles onset time — customer says they feel nothing',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer comes back 45 minutes after purchasing a 10mg gummy and says "I don't feel anything, do I need more?" Walk through how Smokey handles this conversation — explaining onset time, why edibles metabolize differently, and what guidance to give — without making any medical promises.`,
        expectedFocus: ['onset', 'liver', 'wait', 'metabolism'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic'],
    },
    {
        id: 'smokey-microdosing-concept',
        title: 'Micro-dosing — how to frame low-dose products',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[Microdosing talking points — compliant framing: A microdose is typically defined as 2.5mg THC or less per serving — the goal is a sub-perceptual or minimal-effect experience while still engaging. Best product formats for microdosing: (1) Low-dose edibles (2.5mg THC gummies or mints) — precise, consistent, discreet; (2) 1:1 CBD:THC products at low total THC — commonly 2.5–5mg THC with equal CBD; (3) Low-THC vape pens for more immediate onset with smaller doses. Compliant talking points: "Microdosing is about finding the lowest amount that gives you the kind of experience you're looking for, without going further than you want to go. A lot of customers start at 2.5mg and check in with themselves before taking more. It's a way to get familiar with how cannabis affects you specifically, without committing to a full standard dose." Do NOT: promise outcomes, claim it works for any condition, or imply it is safer or healthier than other doses. DO: mention 2.5mg as a common starting point, emphasize low-dose formats, recommend waiting 2 hours before considering more for edibles.]`,
        prompt: `We are getting more customers interested in micro-dosing. How does Smokey explain the concept of micro-dosing cannabis to a customer, what product formats work best for it, and what talking points keep the conversation legal and compliant?`,
        expectedFocus: ['micro-dose', 'low dose', '2.5mg', 'format'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'pain'],
        mustReference: ['2.5', 'format'],
    },
    {
        id: 'smokey-full-spectrum-vs-isolate',
        title: 'Full-spectrum vs. broad-spectrum vs. isolate',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer is looking at CBD tinctures and is confused about full-spectrum vs. broad-spectrum vs. isolate. How does Smokey explain the three clearly and help the customer figure out which fits them — without making any health or medical claims?`,
        expectedFocus: ['full-spectrum', 'broad-spectrum', 'isolate', 'cannabinoid'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic'],
    },
    {
        id: 'smokey-customer-says-product-made-sick',
        title: 'Customer says product made them sick — budtender protocol',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer comes in and says the edible they bought last week "made them sick." How does the budtender respond? What is the protocol for documenting the complaint, what we can and cannot say, and when to escalate to the manager?`,
        expectedFocus: ['document', 'manager', 'complaint', 'protocol'],
        mustNotContain: ['medical', 'doctor', 'treatment', 'symptom', 'diagnosis'],
    },
    {
        id: 'smokey-hash-rosin-vs-flower-rosin',
        title: 'Hash rosin vs. flower rosin — the difference',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[Hash rosin vs. flower rosin — technical talking points: Both are solventless (heat + pressure), but the input material differs. Flower rosin: pressed directly from cured or fresh-frozen flower. Yields are typically 10–25% of input weight. The result retains the strain's terpene profile and full spectrum of cannabinoids. Hash rosin: made by first creating ice water hash (bubble hash) or dry sift hash from the trichome heads, THEN pressing that hash with heat. Yields per pound of original flower are lower (~5–15%), but the concentrate is more refined — higher terpene concentration per gram, lighter color, cleaner flavor. Why collectors prefer hash rosin: the extra refinement step creates a more expressive terpene profile and smoother dab. Why it costs more: double the labor and skill required, lower overall yield from starting material. Budtender comparison script: "Both are solventless and made the same basic way — heat and pressure. The difference is flower rosin starts with the whole flower bud, while hash rosin starts with just the trichomes — the tiny resin glands that were separated off the bud first. You get a more refined, expressive concentrate with hash rosin, which is why it costs more. Think of it like making coffee vs. espresso — similar process, but one is a more concentrated extraction." REQUIRED NEXT STEP: Suggest the budtender help the customer decide based on budget and experience level — newer concentrate users → start with flower rosin for the value; enthusiast collectors → hash rosin is worth the premium.]`,
        prompt: `A customer is comparing a hash rosin and a flower rosin product and wants to know if the price difference is real. How does Smokey explain what sets hash rosin apart from flower rosin — process, input material, yield, and why collectors prefer one over the other?`,
        expectedFocus: ['hash rosin', 'flower rosin', 'input', 'yield'],
        mustReference: ['yield', 'terpene', 'trichome'],
    },
    {
        id: 'smokey-thca-flower',
        title: 'THCA flower — what is it and how does it differ?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[THCA vs. THC — customer talking points: THCA (tetrahydrocannabinolic acid) is the raw, acidic form of THC found in the living plant. It is non-intoxicating in its raw form. When cannabis is smoked, vaped, or heated (decarboxylation), THCA converts to THC — the compound responsible for psychoactive effects. At a licensed NY dispensary, "THCA flower" is just dispensary flower labeled with its THCA content before decarboxylation. The THCA percentage on the label is effectively telling you the potential THC content when the product is heated. Budtender script: "THCA is what THC looks like before you heat it. The plant doesn't actually make THC directly — it makes THCA. When you smoke or vape it, the heat instantly converts THCA to THC. So when you see a flower with 25% THCA, that means it converts to close to 25% THC when you smoke it. At our dispensary, all the flower is lab-tested and licensed — THCA flower is just regular cannabis with the chemistry explained more accurately on the label. The experience when you consume it is the same as flower labeled by THC." Note: in the context of non-dispensary or hemp-derived "THCA flower" sold online, the legal status is different — but at a licensed dispensary, all flower is regulated cannabis.]`,
        prompt: `A customer picks up a THCA flower product and asks how it is different from regular dispensary flower. How does Smokey explain THCA vs. THC, decarboxylation, and what this means for the customer experience — without medical claims? End with a concrete next step the budtender should take (e.g., show the customer the THCA % on the label and explain the conversion).`,
        expectedFocus: ['THCA', 'decarboxylation', 'heat', 'THC'],
        mustReference: ['THCA', 'heat', 'convert'],
    },
    {
        id: 'smokey-distillate-vs-live-resin-cart',
        title: 'Distillate vs. live resin cart — which is better?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[Distillate vs. live resin carts — objective comparison for customer: Distillate: highly purified THC oil (often 85-95% THC), terpenes are stripped out during distillation and then re-added (often botanically-derived terpenes, not from the original plant). Consistent, clean, and usually the lowest price per mg THC. Live resin: made from fresh-frozen cannabis, preserving the original terpene profile of the live plant before drying changes it. Lower THC by percentage but more complex and authentic flavor. Higher price because of more complex extraction. Budtender script: "Distillate is the straightforward choice — it's consistent, clean, and the most affordable. Live resin costs more but brings along the natural terpene profile from the original plant, which gives it a more complex flavor. For customers who care about the flavor experience and want something closer to flower, live resin is worth the premium. For customers who want consistent, predictable THC at a good price, distillate gets the job done." Neither is objectively 'better' — it's about what the customer values: price, flavor complexity, or consistency.]`,
        prompt: `Customer asks: "My budtender recommended a live resin cart but distillate is cheaper — which is actually better for me?" How does Smokey walk through the differences objectively so the customer can choose based on their preferences and budget?`,
        expectedFocus: ['distillate', 'live resin', 'terpene', 'price'],
        mustReference: ['distillate', 'live resin', 'terpene'],
    },
    {
        id: 'smokey-topicals-transdermal',
        title: 'Topicals and transdermal patches — explain without medical language',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `We have topicals and transdermal patches in stock but budtenders struggle to explain them without drifting into medical claims. What is the budtender's talking-point script for explaining topicals vs. transdermal patches — what they are, how they work, and who might enjoy them — staying fully compliant?`,
        expectedFocus: ['topical', 'transdermal', 'absorption', 'localized'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'pain', 'inflammation'],
    },
    {
        id: 'smokey-product-return-replacement',
        title: 'Customer returning a product they did not like — replacement guidance',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer returns with a vape cartridge they bought two days ago and says "I just didn't like it — the taste was off and it didn't do anything for me." How does Smokey handle the return conversation and guide them toward a better-fit replacement without dismissing their experience or making medical claims?`,
        expectedFocus: ['return', 'replacement', 'taste', 'preference'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic'],
    },
    {
        id: 'smokey-indica-to-social-multi-turn',
        title: 'Multi-turn: customer loved indica, wants something more social',
        kind: 'multi_turn',
        threadType: 'general',
        primaryAgent: 'smokey',
        toolContext: `[Compliant recommendations for "social" occasion: For a customer transitioning from an indica they loved to something with a more social/daytime character, recommend hybrids with a limonene or pinene terpene profile — these strains tend to have brighter citrus/pine aroma associated with daytime and social occasions. Avoid purely myrcene-dominant strains (earthy/herbal, often evening-associated). Specific framing: (a) Hybrid flower with caryophyllene + limonene terpene profile — bridges familiar smoothness with a brighter character; (b) Low-dose pre-roll (1g or less) for social settings — manageable and familiar format; (c) 2:1 CBD:THC tincture for customers who want a lighter, more controlled experience at social events. Compliant talking points: "For gatherings, a lot of customers like to go with a hybrid that has a lighter, citrusy aroma profile — it tends to pair well with social settings. We have a few options that should feel familiar to what you liked before but with a different character. I'd also suggest starting with a smaller amount if it's a new strain for you, especially at an event." NEVER say "more energizing" or "more social" in a causal sense — say "often preferred for daytime or social occasions."]`,
        history: [
            { role: 'user', content: 'A regular customer says they bought an indica last week and absolutely loved it — they said it was smooth and easy.' },
            { role: 'assistant', content: 'Good to hear — knowing they enjoyed the indica gives us a solid baseline. We can look at hybrids with a similar terpene base that lean a bit more uplifting without losing that smoothness.' },
        ],
        prompt: `They just came back and said they want "something similar but a little more social — like something I could use at a gathering." What strains or product types does Smokey recommend, and what talking points keep this compliant?`,
        expectedFocus: ['hybrid', 'social', 'terpene', 'uplifting'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'depression'],
        mustReference: ['terpene', 'occasion'],
    },

    // ─── MRS. PARKER — RETENTION & CRM (20 CASES) ──────────────────────────────
    {
        id: 'parker-winback-sms-sandra',
        title: 'Win-back SMS draft for Sandra T. — 67 days inactive',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `I need a win-back SMS for Sandra T. — 67 days inactive, LTV $412, last purchase was Blue Dream flower. She opted in to SMS. Draft a compliant, personalized win-back message under 160 characters that references her buying history and gives her a reason to come back.`,
        expectedFocus: ['win-back', 'SMS', 'compliant', 'personalized'],
    },
    {
        id: 'parker-loyalty-tier-structure',
        title: 'Loyalty tier structure — how many tiers and thresholds?',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We are building a loyalty program and I am not sure how many tiers to have or what the visit/spend thresholds should be. What tier structure do dispensaries typically use that drives repeat visits without giving away too much margin?`,
        expectedFocus: ['tier', 'threshold', 'visit', 'margin'],
    },
    {
        id: 'parker-vip-churn-triage',
        title: 'VIP churn triage — 3 VIPs gone 45+ days',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `Three of our top VIP customers have not been in for 45+ days. Here is their data:

| Name | Last Visit | LTV | Avg Monthly Spend | Preferred Category |
| --- | --- | ---: | ---: | --- |
| Marcus B. | 46 days ago | $2,840 | $380 | Concentrate |
| Priya K. | 51 days ago | $1,920 | $240 | Edible |
| David L. | 63 days ago | $3,100 | $410 | Flower |

Prioritize outreach order and draft a unique first-touch for each — SMS or call?`,
        expectedFocus: ['prioritize', 'outreach', 'LTV', 'first-touch'],
    },
    {
        id: 'parker-birthday-marketing-compliance',
        title: 'Birthday discount — should we and is it compliant in NY?',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We want to send customers a birthday discount offer. Is this a good retention tactic, and is it compliant under New York cannabis marketing rules? What is the right offer amount and communication channel?`,
        expectedFocus: ['birthday', 'NY', 'compliant', 'discount'],
    },
    {
        id: 'parker-segment-focus-spend',
        title: 'Active 218 vs at-risk 44 vs dormant 31 — where to spend retention budget?',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `Our CRM breaks down to: 218 active customers, 44 at-risk (30–60 days since last visit), 31 dormant (60+ days). We have a $300 retention budget this month. Where does Mrs. Parker recommend we focus — win-back, prevention, or VIP nurture — and what is the expected ROI logic?`,
        expectedFocus: ['at-risk', 'segment', 'budget', 'prevention'],
    },
    {
        id: 'parker-whale-three-months-inactive',
        title: 'Whale customer $8,400 LTV — 3 months inactive',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `Our highest-LTV customer — James W., LTV $8,400, avg spend $700/month — has not been in for 3 months. No response to our standard SMS win-back. What is the white-glove outreach plan to re-engage someone at this value level, and at what point do we accept the churn?`,
        expectedFocus: ['white glove', 'outreach', 'LTV', 'personal'],
    },
    {
        id: 'parker-repeat-returner-risk',
        title: 'Customer with 4 returns in 3 months — loyalty risk or theft risk?',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `Customer Dina R. has returned 4 products in the last 3 months — gummy bag (half empty), vape cart (claimed defective), flower (said it smelled wrong), and a tincture (unopened, said wrong product). Total return value: $112. She still makes purchases. Is this a loyalty signal we should support or a risk flag?`,
        expectedFocus: ['returns', 'pattern', 'flag', 'loyalty'],
    },
    {
        id: 'parker-new-customer-nurture',
        title: 'New customer — 3 purchases in 2 weeks — nurture sequence',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A new customer Alex T. has visited 3 times in 2 weeks — spent $44, $67, and $89 on those visits, buying edibles both times then adding a vape. This is strong early engagement. What is the right nurture sequence to convert this early momentum into a long-term loyal customer?`,
        expectedFocus: ['nurture', 'sequence', 'loyalty', 'early'],
    },
    {
        id: 'parker-loyalty-points-expiration',
        title: 'Should loyalty points expire? Pros and cons',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We are deciding whether to put an expiration on loyalty points. Some of our customers have been accumulating for months. What are the business pros and cons of points expiration, and what is the best practice for communicating it if we do implement it?`,
        expectedFocus: ['expiration', 'pros', 'cons', 'communicate'],
    },
    {
        id: 'parker-angry-customer-loyalty-reward',
        title: 'Customer angry about missing loyalty reward — response',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A customer emailed us angry: "I was told I'd get a free pre-roll after my 10th visit and nobody gave it to me at visit #11. I feel cheated." How does Mrs. Parker recommend we respond and resolve this in a way that turns the complaint into retention?`,
        expectedFocus: ['resolve', 'retention', 'response', 'trust'],
    },
    {
        id: 'parker-churn-rate-multi-turn',
        title: 'Multi-turn: churn rate question + industry benchmark',
        kind: 'multi_turn',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        history: [
            { role: 'user', content: 'We have 293 total customers who visited in the last 90 days. Of those, 31 have not returned in 60+ days.' },
            { role: 'assistant', content: 'That gives you roughly a 10.6% dormant rate among your recent customer base — about 1 in 10 customers who came in during the 90-day window went quiet in the back half.' },
        ],
        prompt: `How does that 10.6% dormant rate compare to industry benchmarks for dispensaries, and is it a number we should be worried about?`,
        expectedFocus: ['benchmark', 'industry', 'dormant', 'compare'],
    },
    {
        id: 'parker-dormant-offer-strategy',
        title: 'Dormant 31 customers — what offer drives return visits?',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We have 31 dormant customers (60+ days inactive). Their average LTV is $284 and they averaged 2.4 visits/month when active. We have tried a standard "We miss you" SMS once already with no results. What offer or message type has the best chance of bringing them back, and should we treat all 31 the same or segment them further?`,
        expectedFocus: ['dormant', 'offer', 'segment', 'LTV'],
    },
    {
        id: 'parker-referral-program-ny-compliance',
        title: 'Referral program "bring a friend" — NY compliant?',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We want to run a "bring a friend, both get 10% off" referral promo. Is this compliant under New York OCM cannabis marketing rules? If not, what is a version that would be?`,
        expectedFocus: ['referral', 'NY', 'OCM', 'compliant'],
    },
    {
        id: 'parker-ltv-at-risk-analysis',
        title: 'LTV table — top 10 customers, who is at risk?',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `Here are our top 10 customers by LTV and their recent activity:

| Name | LTV | Last Visit | Avg Monthly Spend | Visits Last 90d |
| --- | ---: | --- | ---: | ---: |
| James W. | $8,400 | 91 days ago | $700 | 0 |
| Keisha M. | $4,210 | 8 days ago | $350 | 5 |
| Marcus B. | $3,100 | 46 days ago | $410 | 1 |
| Sandra T. | $2,840 | 67 days ago | $380 | 0 |
| Priya K. | $1,920 | 51 days ago | $240 | 1 |
| Tony R. | $1,740 | 3 days ago | $290 | 6 |
| Nina P. | $1,620 | 14 days ago | $270 | 4 |
| Alex T. | $1,200 | 2 days ago | $200 | 7 |
| David L. | $980 | 22 days ago | $163 | 3 |
| Carmen V. | $860 | 48 days ago | $144 | 1 |

Flag who is at risk and give an outreach priority order.`,
        expectedFocus: ['at risk', 'priority', 'LTV', 'outreach'],
    },
    {
        id: 'parker-post-visit-survey-strategy',
        title: 'Post-visit survey — when and how to ask for feedback',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We want to start collecting post-visit feedback. What is the best timing and format for a dispensary survey — how soon after the visit, what channel, how many questions — to maximize response rates and get actionable feedback?`,
        expectedFocus: ['timing', 'survey', 'channel', 'response rate'],
    },
    {
        id: 'parker-lost-cause-threshold',
        title: 'At what point do we stop trying to win back a customer?',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We have customers who have been dormant for 6+ months and have not responded to two win-back attempts. At what point do we mark them lost and stop spending resources on outreach? What is the framework for making that call?`,
        expectedFocus: ['threshold', 'dormant', 'framework', 'lost'],
    },
    {
        id: 'parker-data-deletion-request',
        title: 'Customer requests data deletion — what is the process?',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A customer emailed asking us to delete all their personal data — name, phone, purchase history, loyalty points. What is the process for handling a data deletion request, what can and cannot be deleted under NY cannabis compliance requirements, and who owns this?`,
        expectedFocus: ['deletion', 'process', 'compliance', 'records'],
    },
    {
        id: 'parker-frequency-drop-signal',
        title: 'Customer visit frequency drop — early churn signal?',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `Customer Tasha P. was visiting every 7 days on average for 4 months. Her last 3 visit gaps were 11 days, 16 days, 22 days. She is still coming in but the interval is growing. Is this an early churn signal and what should we do right now — before she goes fully dormant?`,
        expectedFocus: ['frequency', 'signal', 'churn', 'early'],
    },
    {
        id: 'parker-negative-google-review',
        title: 'Negative Google review — response strategy',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A customer left a 1-star Google review: "Waited 20 minutes, budtender seemed annoyed, my order was wrong. Will not be back." It has been up for 2 days. How does Mrs. Parker recommend we respond publicly and privately to turn this into a retention opportunity?`,
        expectedFocus: ['response', 'public', 'private', 'review'],
    },
    {
        id: 'parker-vip-preview-invite',
        title: 'VIP preview night — invite top 50 customers?',
        kind: 'data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `We are planning a VIP product preview night next month. Should we invite our top 50 customers by LTV, our most frequent visitors, or a mix? How should we select the list, what should the invite say, and what is the expected attendance rate for a cannabis VIP event invite?`,
        expectedFocus: ['VIP', 'invite', 'selection', 'attendance'],
    },

    // ─── POPS — REVENUE ANALYTICS (20 CASES) ───────────────────────────────────
    {
        id: 'pops-weekly-day-pattern',
        title: 'Weekly revenue by day — what is the pattern?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Here is last week's daily revenue:

| Day | Revenue |
| --- | ---: |
| Monday | $2,104 |
| Tuesday | $1,847 |
| Wednesday | $2,340 |
| Thursday | $1,910 |
| Friday | $3,120 |
| Saturday | $3,890 |
| Sunday | $2,650 |

Total: $17,861. What is the pattern, what do the low days tell us, and what is actionable here?`,
        expectedFocus: ['Tuesday', 'Saturday', 'pattern', 'weekly'],
    },
    {
        id: 'pops-yoy-comparison',
        title: 'Year-over-year April comparison — are we growing?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Year-over-year April comparison:

| Week | April 2025 Revenue | April 2026 Revenue | Change |
| --- | ---: | ---: | ---: |
| Week 1 | $14,200 | $16,840 | +18.6% |
| Week 2 | $13,800 | $17,210 | +24.7% |
| Week 3 | $15,100 | $16,900 | +11.9% |
| Week 4 | $14,600 | $17,861 | +22.3% |

Are we growing meaningfully or just tracking inflation? What story does Pops tell from this data?`,
        expectedFocus: ['YoY', 'growth', '+18', 'trend'],
    },
    {
        id: 'pops-avg-ticket-decline',
        title: 'Average ticket fell $52.10 → $44.54 — what is driving it?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Average transaction value was $52.10 last month. This week it is $44.54. That is a $7.56 drop. We have not run any major promotions this week and foot traffic is flat. What are the most likely causes and what data should I pull to narrow it down?`,
        expectedFocus: ['$44.54', '$7.56', 'cause', 'data'],
    },
    {
        id: 'pops-category-mix-health',
        title: 'Category mix — is this breakdown healthy?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Our revenue category breakdown this month:
- Flower: 42%
- Edibles: 28%
- Vapes: 18%
- Pre-rolls: 8%
- Other: 4%

Is this a healthy mix for a New York dispensary, and what category shifts would indicate trouble or opportunity?`,
        expectedFocus: ['Flower', 'category', 'mix', 'healthy'],
    },
    {
        id: 'pops-time-of-day-staffing',
        title: 'Time-of-day revenue split — staffing implications',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Revenue by time window (average weekday):
- 10 AM – 2 PM: $840 (24% of daily)
- 2 PM – 6 PM: $1,460 (42% of daily)
- 6 PM – 10 PM: $1,100 (31% of daily)

Total daily average: $3,400. What are the staffing and operational implications, and which window is most underpowered relative to its revenue weight?`,
        expectedFocus: ['staffing', '2 PM', 'peak', 'window'],
    },
    {
        id: 'pops-revenue-per-transaction-vs-count',
        title: 'Revenue per transaction vs. transaction count — which to grow?',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `We can either focus on increasing transaction count (more customers) or increasing revenue per transaction (upsell, bundles, higher-margin items). From a financial perspective, which lever is higher-impact for a dispensary at our stage, and how do we measure progress on each?`,
        expectedFocus: ['AOV', 'transaction', 'upsell', 'measure'],
    },
    {
        id: 'pops-promo-lift-analysis',
        title: 'Flash sale ROI — was it worth it?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `We ran a 3-hour flash sale last Saturday: 20% off all edibles. Results:
- Revenue during sale window: $1,200 (baseline for that window on a normal Saturday: estimated $620)
- Discount value given: $180 in total
- Net revenue lift: $580 vs baseline

Was this flash sale worth it from a margin and revenue perspective, and should we repeat it?`,
        expectedFocus: ['lift', '$580', 'margin', 'ROI'],
    },
    {
        id: 'pops-cohort-ltv-comparison',
        title: 'Jan 2026 vs Jan 2025 cohort LTV — how do they compare?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Cohort LTV at 90-day mark:
- Jan 2025 cohort (42 customers): avg LTV $187 at 90 days
- Jan 2026 cohort (58 customers): avg LTV $214 at 90 days

What does this tell us about retention improvement, and what are the caveats before we celebrate?`,
        expectedFocus: ['cohort', 'LTV', '$214', 'improvement'],
    },
    {
        id: 'pops-breakeven-marketing-spend',
        title: 'Break-even on $500 marketing spend',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `We are considering a $500 marketing spend on local Instagram ads. Our average transaction is $44 and our gross margin is approximately 42%. How many new transactions do we need to break even on this spend, and how does Pops frame this for a weekly owner decision?`,
        expectedFocus: ['break-even', '$500', 'transactions', 'margin'],
    },
    {
        id: 'pops-slow-day-rescue-tuesday',
        title: 'Tuesday averages $1,400 vs Saturday $3,890 — playbook',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Our Tuesday average revenue is $1,400 vs Saturday $3,890. That is a 64% gap. We have the same operating hours and similar staffing. What is the operational and marketing playbook for moving Tuesday revenue closer to $2,000 without cannibalizing weekend revenue?`,
        expectedFocus: ['Tuesday', 'playbook', 'gap', '$2,000'],
    },
    {
        id: 'pops-seasonal-trend-forecast',
        title: 'Monthly revenue Jan-Apr — what to expect in May-June?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Monthly revenue this year:
- January: $58,200
- February: $61,400
- March: $67,800
- April (projected full month): $71,400

Is there a seasonal pattern here, and what should we expect for May and June based on this trajectory and cannabis seasonality?`,
        expectedFocus: ['seasonal', 'May', 'trajectory', 'projection'],
    },
    {
        id: 'pops-contribution-margin',
        title: 'Contribution margin — $38 avg retail, 40% COGS',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Our average retail per unit is $38 and our cost of goods sold is approximately 40%. What is our contribution margin per unit, what does that mean for covering operating costs, and how does it compare to what a well-run dispensary should target?`,
        expectedFocus: ['contribution margin', '$38', '40%', 'COGS'],
    },
    {
        id: 'pops-inventory-turn-rate',
        title: 'Inventory turn rate — $45k COGS, $18k avg inventory',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Last month we had $45,000 in COGS and an average inventory value of $18,000. What is our inventory turn rate and is it healthy for a cannabis dispensary? What does a low vs. high turn rate signal about the business?`,
        expectedFocus: ['inventory turn', '$45,000', 'COGS', 'healthy'],
    },
    {
        id: 'pops-transaction-count-vs-revenue-growth',
        title: 'Transactions +12% but revenue only +3% — what does this mean?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `This month vs. last month: transaction count is up 12% but revenue is only up 3%. That means revenue per transaction is falling. What are the most likely explanations for this divergence and what should we investigate first?`,
        expectedFocus: ['divergence', 'AOV', 'investigate', 'transaction'],
    },
    {
        id: 'pops-tuesday-slump-multi-turn',
        title: 'Multi-turn: weekly snapshot → Tuesday slump root cause',
        kind: 'multi_turn',
        threadType: 'performance',
        primaryAgent: 'pops',
        history: [
            { role: 'user', content: 'Here is our weekly snapshot: Mon $2,104, Tue $1,847, Wed $2,340, Thu $1,910, Fri $3,120, Sat $3,890, Sun $2,650.' },
            { role: 'assistant', content: 'Tuesday and Thursday are your soft spots — $1,847 and $1,910 respectively against a weekly average of $2,551. The weekend is carrying the week. Tuesday is especially worth diagnosing.' },
        ],
        prompt: `Is the Tuesday slump something unique to our store or is this an industry-wide pattern for cannabis dispensaries?`,
        expectedFocus: ['Tuesday', 'industry', 'pattern', 'dispensary'],
    },
    {
        id: 'pops-wednesday-discount-modeling',
        title: 'Wednesday 15% off — how many extra transactions to break even?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `We want to run a 15% discount on all products every Wednesday. Our current Wednesday average is $2,340 revenue across approximately 53 transactions at $44.15 avg ticket. With the 15% discount, how many additional transactions would we need to maintain the same dollar revenue, and is this a smart margin trade-off?`,
        expectedFocus: ['break-even', 'Wednesday', 'transactions', 'discount'],
    },
    {
        id: 'pops-visit-frequency-benchmark',
        title: 'Customers average 2.1 visits/month — industry benchmark?',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Our customers average 2.1 visits per month. Is that above or below industry benchmarks for a cannabis dispensary, and what does best-in-class visit frequency look like? What drives the gap and how do we improve it?`,
        expectedFocus: ['benchmark', 'visits', 'frequency', 'industry'],
    },
    {
        id: 'pops-revenue-concentration-risk',
        title: 'Top 10% of customers = 38% of revenue — risk?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Our top 10% of customers by spend account for 38% of total revenue. That is a meaningful concentration. Is this level of revenue concentration a risk for a dispensary, what is typical, and what would it mean for our business if we lost half of those top-tier customers?`,
        expectedFocus: ['concentration', '38%', 'risk', 'top'],
    },
    {
        id: 'pops-q2-forecast',
        title: 'Q1 actuals — project Q2 range',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Q1 2026 actuals:
- January: $58,200
- February: $61,400
- March: $67,800
- Q1 Total: $187,400

Based on this trajectory and typical cannabis seasonality (spring pickup, 4/20 lift in April), what is a realistic Q2 revenue range — conservative, base, and optimistic — and what assumptions drive each scenario?`,
        expectedFocus: ['Q2', 'forecast', 'conservative', 'optimistic'],
    },
    {
        id: 'pops-420-flash-sale-roi',
        title: '4/20 flash sale — repeat or not?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Last 4/20 we did $8,400 in revenue vs our daily average of $2,800. That is a 3x day. We ran a storewide 15% discount that cost us approximately $1,260 in margin. Net revenue lift over a normal day was $5,600. Should we plan the same this year, and what would Pops change to capture more of the demand without giving away as much margin?`,
        expectedFocus: ['4/20', '$5,600', 'margin', 'repeat'],
    },

    // ── Multi-Location / Brand Management (10 cases) ─────────────────────
    {
        id: 'multi-loc-performance-gap',
        title: 'Location A $3,800/day vs Location B $1,200/day — gap diagnosis',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Location A is doing $3,800/day on average. Location B is doing $1,200/day. Both opened within 3 months of each other, same brand, similar product mix.

What are the most likely drivers of that 3x gap and what data should I pull to diagnose the root cause?`,
        expectedFocus: ['gap', 'driver', 'diagnose', 'data'],
    },
    {
        id: 'multi-loc-inventory-transfer',
        title: 'Slow-moving SKU transfer from Location A to Location B',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        toolContext: `[NY METRC Transfer Protocol: In New York, licensed retail locations CANNOT directly transfer inventory between retail locations — transfers must flow through a licensed distributor or the brand's licensed processor/distributor entity. The retail licensee must: (1) create a METRC "Package Transfer" under the correct license type, (2) the transfer must be accompanied by a METRC manifest, (3) both locations must be on the same METRC license or a new wholesale transfer transaction is required. Without a distributor license, a retail-to-retail transfer is a compliance violation. The operator should consult their OCM compliance contact or licensed distributor before proceeding.]`,
        prompt: `We have 30 units of a slow-moving SKU sitting at Location A — it has not moved in 45 days. Location B is selling that same SKU at twice the velocity. Can we physically transfer those 30 units from Location A to Location B? What does that process look like in NY from a Metrc and compliance standpoint?`,
        expectedFocus: ['transfer', 'Metrc', 'compliance', 'NY'],
        mustReference: ['METRC', 'manifest', 'distributor'],
    },
    {
        id: 'multi-loc-staff-sharing',
        title: 'Location A short-staffed Friday — pull from Location B?',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Location A is short a budtender this Friday — one called out sick. Location B is fully staffed. Can we move a budtender from Location B to cover Location A for the day? Are there any NY cannabis labor or staffing compliance issues with moving staff between licensed locations under the same brand?`,
        expectedFocus: ['staff', 'cover', 'compliance', 'Friday'],
    },
    {
        id: 'multi-loc-pricing-consistency',
        title: 'Should both locations price identically or can Location B run different promos?',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        prompt: `We run two dispensary locations under the same brand. Should our pricing and promotions be identical at both locations, or can Location B run its own deals independently? What are the brand consistency risks of having different promo strategies, and what is the competitive case for letting each location adapt to its local market?`,
        expectedFocus: ['brand', 'promo', 'consistency', 'local'],
    },
    {
        id: 'multi-loc-consolidated-report',
        title: 'Combined weekly revenue $28,400 across 2 locations — owner presentation',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        toolContext: `[Data grounding rule: Only use the numbers provided — $28,400 total, Location A $18,600 (418 tx, avg $44.50), Location B $9,800 (198 tx, avg $49.49). Do NOT invent comparison data, YoY growth percentages, or benchmarks not provided. Location B has higher avg ticket ($49.49 vs $44.50) despite lower volume — this is a notable narrative point. Ownership questions will likely focus on: why Location B volume is lower, whether avg ticket advantage at B is sustainable, and what the combined trajectory looks like.]`,
        prompt: `This week we did $28,400 combined across 2 locations:
- Location A: $18,600 (418 transactions, avg ticket $44.50)
- Location B: $9,800 (198 transactions, avg ticket $49.49)

I need to present this to ownership tomorrow. How do I frame it — what is the headline number, what is the narrative, and what three questions should I expect from ownership?`,
        expectedFocus: ['$28,400', 'ownership', 'narrative', 'headline'],
        mustReference: ['$18,600', '$9,800', '$44.50'],
        mustNotContain: ['15.2%'],
    },
    {
        id: 'multi-loc-ticket-gap',
        title: 'Location A 30% higher average ticket — what can Location B learn?',
        kind: 'data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Location A averages $62 per ticket. Location B averages $47 per ticket. Same brand, similar product mix, similar price points. The 30% gap has been consistent for 8 weeks.

What are the most likely explanations — upsell training, floor layout, budtender quality, product placement? What would you change at Location B first?`,
        expectedFocus: ['$62', '$47', 'upsell', 'Location B'],
    },
    {
        id: 'multi-loc-seed-location-c',
        title: 'Grand opening of Location C — seed inventory from Location A/B history',
        kind: 'data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        toolContext: `[Location A/B performance data: Location A weekly revenue $18,600, avg ticket $44.50, top categories by revenue: Flower 42%, Vape 28%, Edibles 18%, Concentrate 8%, Pre-Roll 4%. Location B weekly revenue $9,800, avg ticket $49.49, top categories: Concentrate 31%, Flower 38%, Vape 22%, Edibles 7%, Pre-Roll 2%. Location B has higher concentrate mix, suggesting premium/concentrate-forward customer base. New location opening inventory benchmark: 60–80 active SKUs, $25–40K in opening inventory, 30-day buffer at expected 50% of Location A volume ($9,300/week = $37,200/month).]`,
        prompt: `We are opening Location C next month. Based on what we know from Location A and Location B, what product mix should we open with? Specifically: how many SKUs, which categories to over-index on, how much opening inventory in dollars, and what does a 30-day sell-through buffer look like for a new location?`,
        expectedFocus: ['opening', 'SKU', 'inventory', 'buffer'],
        mustReference: ['Location A', 'Location B'],
    },
    {
        id: 'multi-loc-loyalty-cross-location',
        title: 'Loyalty points cross-location — can Location A customer redeem at Location B?',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `A customer earned loyalty points at Location A and wants to redeem them at Location B. Our loyalty program is branded under the same company name. Is this cross-location redemption technically possible? What are the POS and CRM requirements, and what is the customer experience risk if we say no?`,
        expectedFocus: ['loyalty', 'redeem', 'cross-location', 'customer'],
    },
    {
        id: 'multi-loc-metrc-discrepancy-one-location',
        title: 'Metrc discrepancy at Location A only — does it affect Location B compliance?',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM — Multi-Location METRC Discrepancy Protocol]
In NY, each dispensary location has its own METRC license and location ID. A METRC discrepancy at Location A does NOT automatically trigger a compliance obligation at Location B — each location's METRC records are evaluated independently during an audit.

However: (1) If both locations operate under the same single OCM retail license (rather than separate licenses), an OCM investigation of Location A CAN expand to examine Location B records. (2) Reporting timeline: unexplained METRC inventory discrepancies should be investigated and, if not reconciled, reported to OCM within 3 business days for non-diversion discrepancies; within 24 hours if theft/diversion is suspected. (3) Best practice: document the discrepancy at Location A immediately, open a METRC inventory adjustment with explanation, notify Location B manager to conduct their own count proactively to demonstrate Location B is clean.

REQUIRED: Explain that METRC licenses are per-location, state the reporting timeline, and give clear next steps. ALSO REQUIRED: Explicitly state that Location B has NO independent reporting obligation from Location A's discrepancy — Location B's only obligation is proactive (conduct their own count to show they're clean).`,
        prompt: `Location A has a Metrc discrepancy — 4 units unaccounted for from a transfer. Location B is clean. Both operate under the same OCM license umbrella. Does Location A's discrepancy create any compliance risk or reporting obligation for Location B, or are they treated as independent entities under NY law?`,
        expectedFocus: ['Metrc', 'compliance', 'Location B', 'license'],
        mustReference: ['METRC', 'per-location', 'Location B'],
    },
    {
        id: 'multi-loc-brand-consistency-budtender',
        title: 'Budtender at Location B doing their own thing — brand alignment',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `A budtender at Location B has developed their own recommendation style that differs from our brand guidelines — they are suggesting products in ways that do not align with our positioning and are using unapproved language. How do I address this while keeping them motivated? What is the right mix of retraining, coaching, and accountability?`,
        expectedFocus: ['budtender', 'brand', 'coaching', 'retraining'],
    },

    // ── Ecstatic Brand Cases (10 cases) ──────────────────────────────────
    {
        id: 'ecstatic-nyc-vs-syracuse-market',
        title: 'Ecstatic NYC competitive landscape vs upstate Thrive',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `Ecstatic is our NYC brand. Thrive is our Syracuse brand. How does the competitive landscape differ? NYC has dozens of dispensaries within walking distance — upstate it is more spread out. What are the strategic differences in how we compete on price, experience, and brand in NYC versus Syracuse?`,
        expectedFocus: ['NYC', 'Syracuse', 'competitive', 'strategy'],
    },
    {
        id: 'ecstatic-tourist-possession-limits',
        title: 'Ecstatic NYC tourist customers — NY possession limits guidance',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY Cannabis Possession Limits + Interstate Transport Compliance Guide]
NY possession limits (adults 21+): up to 3 oz (85g) flower; up to 24g concentrate; no limit on edibles for personal use under 240mg total THC.

INTERSTATE TRANSPORT: Federal law (21 U.S.C. §841) prohibits transporting cannabis across state lines regardless of state legality. This includes carrying cannabis on a flight departing any US airport — TSA is a federal agency and cannabis is federally controlled. The customer assumes ALL federal risk for interstate transport; the dispensary's legal obligation ends at the point of sale.

BUDTENDER COMPLIANT SCRIPT: When a customer asks "can I take this on the plane?" — the compliant answer is: "Our sale is legal here in New York. What you do after leaving our store is subject to federal transportation laws and your destination's laws — we can't advise on that, but we'd recommend checking TSA and your destination state's rules before you travel." Do NOT say "you can take it on the plane" or "just keep it in your bag." Do NOT say "you can't take it anywhere" since that goes beyond what the budtender knows. The goal: disclose the legal boundary without giving legal advice and without assisting interstate transport.

REQUIRED — USE THIS EXACT STRUCTURE:
(1) STATE NY POSSESSION LIMITS clearly (3 oz flower, 24g concentrate).
(2) EXPLAIN FEDERAL JURISDICTION: "Even though NY has legalized cannabis, federal law still applies to interstate transport. TSA, DEA, CBP all operate under federal jurisdiction — airports are federal territory. Flying with cannabis is a federal offense under 21 U.S.C. §841 regardless of what states allow."
(3) GIVE THE BUDTENDER SCRIPT: "Our sale is legal here in NY. What happens after you leave is subject to federal law — we recommend checking TSA rules and your destination's laws before traveling."
(4) END with a concrete implementation step: e.g., "Post this script at the register — every budtender should use it when customers ask about flying home."`,
        prompt: `Ecstatic gets a lot of out-of-state visitors — tourists who are flying home after buying. What do they need to know about NY possession limits, and can we tell them about taking product across state lines? How do our budtenders handle the "can I take this on the plane?" question compliantly without giving legal advice?`,
        expectedFocus: ['tourist', 'possession', 'state lines', 'budtender'],
        mustReference: ['federal', 'TSA', 'federal jurisdiction'],
    },
    {
        id: 'ecstatic-premium-positioning',
        title: 'Ecstatic premium menu curation — $80+ average ticket strategy',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        prompt: `Ecstatic targets high-end customers and we want to get to an $80+ average ticket — we are currently at $62. What menu curation strategy gets us there? Should we reduce low-price SKUs, add premium concentrates, or focus on bundle offers that lift basket size? What does a premium NYC dispensary menu look like at $80+ avg ticket?`,
        expectedFocus: ['premium', '$80', 'menu', 'basket'],
    },
    {
        id: 'ecstatic-nyc-density-differentiation',
        title: 'NYC dispensary density — differentiate on experience vs price',
        kind: 'non_data',
        threadType: 'competitor_intel',
        primaryAgent: 'ezal',
        prompt: `There are multiple dispensaries within a 5-block radius of Ecstatic. We have chosen a premium positioning rather than competing on price. What does "competing on experience" actually mean in a NYC cannabis retail context — design, service model, product curation, events? What specifically sets Ecstatic apart when customers can walk one block and pay less?`,
        expectedFocus: ['experience', 'NYC', 'differentiate', 'premium'],
    },
    {
        id: 'ecstatic-nyc-advertising-channels',
        title: 'Ecstatic NYC advertising channels — what works for a premium brand',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        prompt: `What advertising and marketing channels work best for a premium NYC cannabis dispensary? We are not competing on price so we cannot just run discount ads. Think about channels that reach affluent NYC consumers — what mix of digital, out-of-home, events, influencers, and PR makes sense for Ecstatic, and which channels are off-limits under NY OCM rules?`,
        expectedFocus: ['channel', 'NYC', 'OCM', 'premium'],
    },
    {
        id: 'ecstatic-nyc-delivery-viability',
        title: 'Cannabis delivery in Manhattan — viability and logistics',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        toolContext: `[NY Cannabis Delivery — Ecstatic NYC Dispensary Context]
⚠️ CRITICAL: This question is about ECSTATIC (the NYC location), NOT Thrive Syracuse. The operator is asking about their NYC store, Ecstatic. Do NOT mention Thrive Syracuse in this response.

LICENSING: Licensed NY retailers can deliver under their existing retail dispensary license — no separate delivery license is required if it's the same legal entity.

METRC REQUIREMENTS: Every delivery must have a METRC delivery manifest generated before the driver leaves. Driver must have the manifest on them. Upon delivery, customer signs; manifest is closed in METRC within the same business day. Drivers must pass OCM background checks. Delivery vehicles must be registered with OCM on the license.

MANHATTAN LOGISTICS (VIABILITY ASSESSMENT):
- Traffic: unpredictable, deliveries can be delayed 30-90 min during rush hour
- Doorman buildings: driver must be announced, may wait 5-15 min per building
- No parking: driver needs a partner or must double-park with hazards (legal risk)
- Per-delivery time: estimate 30-60 min in Manhattan vs 10-15 min in suburban
- Viable but expensive: requires dedicated delivery staff (at least 2-3 drivers), vehicles, and operational coordination

REQUIRED: (1) Confirm delivery IS viable for Ecstatic (yes, commercially viable with proper staffing). (2) Explain the METRC manifest requirement per delivery. (3) Address Manhattan logistics challenges (doorman buildings, parking, time). (4) Note OCM driver background check requirement. (5) ALWAYS refer to "Ecstatic" not "Thrive" in this response.`,
        prompt: `Customers are asking if Ecstatic delivers in Manhattan. Is cannabis delivery actually viable in a dense urban market like Manhattan? What are the specific logistical challenges — traffic, building access, doorman buildings, elevator time? And what does the NY delivery license process look like for an NYC location?`,
        expectedFocus: ['delivery', 'Manhattan', 'METRC', 'license', 'driver'],
        mustReference: ['METRC', 'manifest', 'viable'],
        mustNotContain: ['Thrive Syracuse'],
    },
    {
        id: 'ecstatic-instagram-strategy',
        title: 'Ecstatic Instagram strategy for a premium NYC brand',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        prompt: `Design an Instagram content strategy for Ecstatic, our premium NYC cannabis brand. Given NY OCM advertising restrictions, what content is allowed? What aesthetic, content mix (product shots, lifestyle, education, behind-the-scenes), and engagement approach works for building a premium brand on Instagram without violating advertising rules?`,
        expectedFocus: ['Instagram', 'OCM', 'content', 'premium'],
    },
    {
        id: 'ecstatic-tourist-vs-local-loyalty',
        title: 'Ecstatic loyalty strategy — tourist vs local customer base',
        kind: 'non_data',
        threadType: 'customer_mgmt',
        primaryAgent: 'mrs_parker',
        prompt: `Ecstatic has two very different customer types: NYC locals who come regularly and tourists who may only visit once. How do we build loyalty with both? A traditional points program rewards repeat visits but does not help with tourists. What is the right loyalty or retention strategy for a brand that serves a mixed resident/tourist market?`,
        expectedFocus: ['tourist', 'local', 'loyalty', 'retention'],
    },
    {
        id: 'ecstatic-holiday-event-inventory',
        title: 'Ecstatic NYC holiday and event season — NYE and fashion week inventory',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        toolContext: `[Event context: NYC key tourist spikes — NYE (Dec 28–Jan 2), NY Fashion Week (Feb 7–12 and Sept 4–11), NYC Pride (June, week of parade), and summer tourist season (July–August). Tourist traffic tends to skew toward premium SKUs, gifting-friendly packaging, and convenience formats (pre-rolls, edibles). Lead times: most NY cannabis distributors are 5–14 days. For events, order 3 weeks before event window with a 30–40% volume buffer and a firm cancel/credit policy with vendor if traffic underdelivers.]`,
        prompt: `NYC has massive tourist spikes around NYE, Fashion Week, Pride, and other events. How should Ecstatic plan inventory around these windows? Which product categories spike most with tourist/event traffic? What lead time do we need for extra stock and how do we avoid over-ordering for an event that may not deliver the expected traffic?`,
        expectedFocus: ['NYE', 'Fashion Week', 'Pride', 'lead time'],
        mustReference: ['NYE', 'Fashion Week', 'Pride'],
    },
    {
        id: 'ecstatic-price-point-strategy',
        title: 'Ecstatic flower pricing — $50+/3.5g premium vs competitive $38',
        kind: 'non_data',
        threadType: 'performance',
        primaryAgent: 'pops',
        prompt: `Should Ecstatic price flower at $50+ per 3.5g to reinforce premium brand positioning, or stay competitive at $38 like most NYC dispensaries? We have tested both and at $50+ volume drops 30% but gross margin is significantly better. Walk me through the unit economics and which approach maximizes total gross profit at our current traffic levels.`,
        expectedFocus: ['$50', 'premium', 'margin', 'volume'],
    },
    // CATEGORY A: Regulator Visit (8 cases)
    {
        id: 'regulator-unannounced-inspection',
        title: 'Unannounced state compliance inspection',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Unannounced Inspection Protocol]

YOUR RIGHTS DURING AN OCM INSPECTION:
- OCM inspectors have broad authority to inspect licensed premises WITHOUT a warrant at any time during operating hours (NY Cannabis Law §42)
- You MAY verify the inspector's identity — ask for their OCM badge/credentials before beginning
- You MAY request your attorney be present, but you CANNOT delay the inspection while waiting for the attorney to arrive
- You CANNOT refuse entry to a licensed inspector during business hours — refusal is itself a license violation

WHAT YOU MUST PROVIDE:
- Access to all areas of the licensed premises (sales floor, storage, back office)
- METRC records (inspector can access directly or request paper copies)
- Employee RVT certificates for all currently working staff
- License, most recent inspection report, security camera access

WHAT THE INSPECTOR CANNOT DO:
- Take product without issuing a formal administrative seizure notice
- Access personal employee records (SSN, home address) without a court order
- Interview employees about non-operational matters

COMMON MISTAKES TO AVOID:
- Panicking and refusing access — cooperate calmly
- Giving verbal statements about incidents without counsel (say: "I'll have our attorney follow up on that")
- Not having someone shadow the inspector the entire time to document what they review

NY OCM SPECIFIC REGULATORY BASIS:
- Inspection authority: NY Cannabis Law §42 — OCM may inspect "at any time during normal business hours without prior notice"
- Records access: 9 NYCRR §105.4 — licensees must maintain all required records accessible for OCM inspection
- Employee certifications: 9 NYCRR §130.5 — Responsible Vendor Training (RVT) certificates must be on-site or retrievable immediately
- Refusal to cooperate: constitutes a license condition violation under 9 NYCRR §105.7 — do NOT refuse entry

REQUIRED: Give immediate action steps (verify credentials, cooperate, shadow the inspector), cite NY Cannabis Law §42 and 9 NYCRR §105.4 by name, explain what must/cannot be provided, and note the right to request attorney participation (but not to delay).`,
        prompt: `A New York OCM compliance officer just walked in unannounced and is asking to inspect our premises, inventory records, and employee certifications. Manager is panicking. What do we do RIGHT NOW — what are our rights, what must we provide, what can we refuse, and what common mistakes do dispensaries make during unannounced inspections?`,
        expectedFocus: ['rights', 'cooperate', 'inspection', 'OCM', 'inventory', 'records', 'certification'],
        mustReference: ['§42', '§105', 'credentials', 'cooperate'],
    },
    {
        id: 'regulator-advertising-noc-response',
        title: 'OCM Notice of Non-Compliance — advertising violation response',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM NOC response protocol: Notices of Non-Compliance (NOC) require a written response within the stated timeframe (typically 15 days from date of NOC). Response must include: (1) acknowledgment of the notice, (2) explanation of the circumstances, (3) documentation of immediate remediation taken (e.g., post removed within X hours of discovery), (4) a corrective action plan with specific timeline — list specific dates when each remediation step was or will be completed.

TIMELINE AFTER SUBMISSION: After you file your written response, OCM typically takes 30–90 days to review and issue a decision. The decision will be one of: (a) Written Warning (no penalty, record kept), (b) Civil Penalty ($500–$5,000 for first offense advertising violations), or (c) Referral to formal adjudicatory process if the violation is severe or repeated. If a penalty is issued, you have 30 days to pay or request an administrative hearing. The clock on escalation stops if you pay the fine within the appeal window.

IMPORTANT: OCM's review timeline is not predictable — 30–90 days is the typical range but it can extend to 6 months for complex cases. There is no formal SLA. You can follow up with OCM enforcement at cannabis.ny.gov after 60 days if no response.

First-offense advertising violations typically result in a Warning or a civil penalty of $500–$5,000 depending on severity. A discount post showing a price ("20% off") may violate OCM's rules against advertising that could be interpreted as inducing consumption or making price-based appeals — though it depends on the exact content and whether age-gating was in place. A cannabis attorney should review the NOC text before responding. Proactive steps: remove the post immediately, document when it was removed, screenshot the OCM notice, and engage a cannabis attorney within 48 hours.

REQUIRED: Include the post-submission OCM review timeline (30–90 days to decision) and the appeal window (30 days to pay or contest penalty) in your response.]`,
        prompt: `We received an OCM Notice of Non-Compliance today. It cites our Instagram post from last week showing a product discount ("Purple Punch 20% off") as a violation of NY advertising rules. We have 15 days to respond. What should our response include, do we need a lawyer, what remediation steps do we take immediately, and what are the likely penalty ranges for a first offense?`,
        expectedFocus: ['OCM', 'advertising', 'response', 'violation', 'penalty', 'remediation', 'attorney'],
        mustReference: ['OCM', 'attorney', 'corrective', '15 day', '30–90', '$5,000'],
    },
    {
        id: 'regulator-metrc-physical-audit',
        title: 'METRC physical inventory audit by inspector',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM METRC Physical Audit Procedures]
During a NY OCM unannounced METRC physical audit: (1) The inspector will request access to all cannabis inventory areas and will compare physical package counts against your METRC records, including package UIDs, weights, and package status. (2) Process: inspector scans or visually verifies METRC package tags against physical product; any variance is noted on the inspection report. (3) Tolerances: OCM does NOT publish a formal de minimis tolerance — any unexplained variance is a reportable discrepancy. Under 1g per package is typically viewed as within weighing/moisture variance, but this is at inspector discretion. (4) Proactive disclosure of known discrepancies: YES — disclose proactively before the audit begins. This demonstrates good faith and typically results in lower penalties. Attempting to hide known discrepancies discovered during the same audit is treated as intentional non-compliance. (5) After the audit: if variances are found, OCM will issue a Notice of Deficiency or Notice of Non-Compliance. You have 15–30 business days to respond with a corrective action plan. (6) Consequences: first-time small discrepancies with corrective action typically result in a notice and fine ($500–$2,500); patterns of discrepancy escalate to suspension or revocation proceedings.

REQUIRED: Advise proactive disclosure, explain the audit process step by step, and state what happens if variances are found.`,
        prompt: `State inspector wants to reconcile our METRC records against physical inventory right now. Our last physical count was 3 days ago. We have 4 known small discrepancies we have not yet reported (all under 1g). Should we disclose the known discrepancies proactively before the audit begins? What does the audit process look like, and what happens if variances are found?`,
        expectedFocus: ['METRC', 'audit', 'discrepancy', 'proactive', 'disclosure', 'variance', 'reporting'],
        mustReference: ['proactive', 'METRC', 'disclose'],
    },
    {
        id: 'regulator-age-verification-failure-response',
        title: 'Failed mystery shopper — immediate response plan',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Age Verification Failure — Response Protocol and NOC Timeline]

IMMEDIATE (next 24 hours):
(1) Document: written incident report — employee name, time of sale, ID check failure, inspector ID number, exact time of inspector's disclosure.
(2) Employee: place on administrative hold (do NOT terminate before investigation is complete — wrongful termination risk).
(3) Corrective training: retrain ALL floor staff on ID verification TODAY, not just the employee involved. Document the training date and attendees.
(4) Policy review: review and update your written ID verification SOP if it does not require ID check for EVERY sale regardless of apparent age.
(5) Attorney: engage a cannabis compliance attorney within 48 hours — before submitting the NOC response.

NOC RESPONSE SUBMISSION TIMELINE:
- The Notice of Violation (NOV) issued on-site typically includes a 15-day window to submit a formal written response to OCM.
- Response must include: acknowledgment, circumstances, immediate corrective actions taken (with dates), and a forward-looking corrective action plan.
- AFTER SUBMISSION: OCM typically takes 30–60 days to issue a penalty determination.

FIRST OFFENSE PENALTY RANGE (age verification failure):
- NY Cannabis Law establishes tiered penalties; first-offense age verification failure is typically: $2,000–$10,000 civil penalty + mandatory staff retraining requirement.
- Repeat offense within 12 months can escalate to license suspension (30–90 days) or revocation proceedings.
- Proactive corrective action (documented retraining before the OCM decision) typically reduces penalties at the lower end.

REQUIRED: State the 15-day NOC response window explicitly, give the penalty range ($2,000–$10,000 first offense), and recommend the attorney within 48 hours. Also REQUIRED: Include specific elements of the corrective action plan in your response — the plan must state: (a) exact retraining date, (b) all staff retrained (not just the employee involved), (c) updated ID verification SOP with "check every customer every time" language, and (d) manager sign-off on the new protocol. The corrective action plan with these specifics is what reduces the penalty to the lower end of the range.`,
        prompt: `A state investigator posing as a customer (who showed a valid ID but was 20 years old) just successfully purchased cannabis from us without being ID checked. The investigator identified themselves after the sale and issued a notice of violation. What do we do in the next 24 hours, what is the likely penalty for a first offense, and what training and operational changes prevent recurrence?`,
        expectedFocus: ['age verification', 'ID', 'penalty', 'violation', 'training', 'corrective action', 'first offense'],
        mustReference: ['15 day', 'attorney', 'training'],
    },
    {
        id: 'regulator-employee-records-request',
        title: 'Inspector requests employee training certifications',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Responsible Vendor Training — Records & Inspection Protocol]
Under NY Cannabis Law, all cannabis retailers must ensure handlers complete OCM-approved Responsible Vendor Training (RVT). Records required: completion certificates with employee name, date completed, training provider, and certificate number — kept on-site or accessible digitally.

During an active inspection: (1) You MUST produce records immediately or within a short time the inspector specifies (typically same-day or within 24 hours if records are off-site). (2) Extensions: inspectors do NOT typically grant formal extensions during an active audit for records that should already exist on-site. What you CAN do: show digital records immediately (e.g., email the certificates from a computer on-site), offer to email missing certificates within 2 hours, and document that the employee is enrolled in upcoming training. (3) Expired certifications: an expired RVT certificate is a direct OCM violation — the employee may not handle cannabis until renewed. (4) The 3 potentially overdue employees: pull their records immediately while the inspector is there. If overdue, place them on non-cannabis tasks NOW during the inspection. (5) Documentation you need: completion date, certificate number, provider name for each of the 12 employees.

REQUIRED: State that extensions are NOT automatically granted during inspections, advise on expired certs, give immediate next steps. End with a decisive action statement — do NOT end your response with a question.`,
        prompt: `During an inspection, the OCM officer is asking for proof that all our cannabis handlers have completed the required responsible vendor training program. We have 12 employees. Three of them may be overdue for renewal. What records must we produce, what happens if some are expired, and can we get an extension to produce records we cannot find on the spot?`,
        expectedFocus: ['OCM', 'training', 'certification', 'responsible vendor', 'records', 'expired', 'extension'],
        mustReference: ['extension', 'expired', 'immediately'],
        mustNotContain: ['Is there anything else', 'Do you need me to', 'Let me know if you need', 'Would you like me to pull'],
    },
    {
        id: 'regulator-fine-appeal-process',
        title: 'Disputing a $7,500 OCM fine — appeal process',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Fine Appeal Process]
Under NY Cannabis Law and OCM enforcement procedures: (1) Timeline: you have 30 calendar days from receipt of the penalty notice to file a formal appeal (request for hearing). Missing this deadline forfeits your right to appeal. (2) Payment while appealing: you do NOT need to pay the fine while an appeal is pending — filing a timely hearing request stays the payment obligation. (3) Hearing process: OCM will schedule an administrative hearing before an Administrative Law Judge (ALJ). You can appear with or without counsel — a cannabis attorney is strongly recommended for amounts over $5,000. (4) Grounds for a successful appeal: (a) factual dispute — the violation did not occur as characterized; (b) technical defense — the advertising did not meet the legal standard for the violation cited; (c) mitigating factors — first violation, immediate corrective action taken, no prior NOCs; (d) procedural grounds — OCM failed to follow required process for notice or investigation. (5) Fight vs. pay: generally worth fighting if you have a genuine factual dispute or the penalty is disproportionate AND you have documentation. $7,500 is in the range where a 2–4 hour attorney engagement is economically rational. (6) Offer of settlement: OCM sometimes accepts a consent order with a reduced fine and corrective action plan — request this in writing before the hearing date.

REQUIRED: State the 30-day deadline, explain you can appeal without paying, and walk through hearing grounds.`,
        prompt: `We received a $7,500 fine from OCM for an advertising violation we believe was mischaracterized. The fine seems disproportionate and we believe we have a strong defense. Walk us through the OCM appeal process: what are the timelines, do we need to pay the fine while appealing, what grounds support a successful appeal, and when is it worth fighting vs paying?`,
        expectedFocus: ['OCM', 'appeal', 'fine', 'dispute', 'timeline', 'defense', 'hearing'],
        mustReference: ['30', 'appeal', 'hearing'],
    },
    {
        id: 'regulator-license-condition-violation',
        title: 'Operating outside license conditions',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM License Condition Violation — Self-Disclosure and Mitigation Protocol]

IS SELF-DISCLOSURE REQUIRED?
- NY Cannabis Law does NOT impose a general affirmative self-reporting obligation for every license condition violation
- EXCEPTION: Some conditions explicitly require self-reporting ("licensee must notify OCM within X days of any violation of this condition") — check your specific license condition language
- Standard guidance: consult a cannabis attorney before deciding whether to self-disclose
- METRC evidence: the 9:18 PM transaction is in METRC — OCM can see it during any audit. This is NOT the same as a proactive self-disclosure, but it creates a record.

SEVERITY OF FIRST-TIME MINOR VIOLATIONS:
- First-time violations of minor license conditions (hours, signage) typically result in: Warning Letter or civil penalty ($500–$2,000)
- Repeated violations escalate to higher fines or license suspension
- Operating 23 minutes past closing with no prior violations = low severity, likely Warning Letter if discovered

PROACTIVE STEPS TO MINIMIZE EXPOSURE:
(1) Document the incident immediately: date/time, what happened, manager name, customer circumstance, how it was discovered
(2) Review and enforce the license condition with staff: update training, post signage at register "MUST CLOSE BY 9PM"
(3) Consult cannabis attorney before any communication to OCM
(4) If you decide to self-disclose: frame it as proactive correction — attach documentation of immediate remediation

HOW TO SUBMIT A SELF-DISCLOSURE (if attorney advises it):
- Submit in writing via the OCM online portal at cannabis.ny.gov OR by certified mail to your regional OCM enforcement office
- Required contents: (a) date and exact time of the violation, (b) relevant METRC transaction reference, (c) immediate corrective action taken (e.g., "manager retrained, closing procedure updated"), (d) written commitment to prevent recurrence
- A self-disclosure with documented corrective action typically results in a Warning Letter rather than a monetary penalty for a first-time minor violation

REQUIRED: State that self-disclosure is NOT automatic but should be assessed with counsel. Give the HOW-TO submit steps if disclosure is advised. Note the METRC record creates a paper trail that OCM can see.`,
        prompt: `Our OCM license has a condition that says we must close by 9 PM. Last Saturday a manager let a customer stay until 9:23 PM during a busy period. No inspector was present, but we logged the transaction in METRC at 9:18 PM. Do we have a self-disclosure obligation, how serious is a first-time license condition violation, and what proactive steps minimize our exposure?`,
        expectedFocus: ['OCM', 'license condition', 'self-disclosure', 'violation', 'hours', 'METRC', 'exposure'],
        mustReference: ['self-disclosure', 'METRC', 'attorney', 'cannabis.ny.gov'],
    },
    {
        id: 'regulator-competitor-complaint-response',
        title: 'Competitor filed regulatory complaint against us',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM "appealing to minors" standard: Under NY Cannabis Law §128 and OCM advertising regulations, content "appeals to minors" if it uses cartoon-like imagery, bright colors or designs with youth appeal, characters or imagery associated with child products, or depictions suggesting cannabis is fun/desirable for youth. Abstract cannabis leaf graphics in a branded adult design generally do not meet this standard — the test is whether a reasonable person would believe the imagery targets youth. OCM complaint process: OCM will notify the licensee of the complaint and provide an opportunity to respond. Response should: (1) include documentation of the signage (photos, design files), (2) explain the adult-oriented branding rationale, (3) provide comparables showing this is standard adult cannabis branding. Proactive modification: while not legally required, voluntarily modifying signage while the inquiry is open shows good faith and can reduce penalty risk. Consult a cannabis attorney before making formal commitments in any OCM response.]`,
        prompt: `A competitor dispensary filed a complaint with OCM claiming our window signage contains product images that appeal to minors. OCM has opened an inquiry. Our signage shows stylized cannabis leaf graphics in a branded design. What is the standard for "appealing to minors" in NY, how do we prepare our response, and should we proactively modify the signage during the inquiry?`,
        expectedFocus: ['OCM', 'minors', 'signage', 'inquiry', 'response', 'standard'],
        mustReference: ['OCM', 'minors', 'attorney', '§128'],
    },
    // CATEGORY B: Financial Compliance (8 cases)
    {
        id: 'finance-280e-explained',
        title: '280E tax burden explanation for owner',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[IRS Section 280E — Cannabis Business Tax Context]

WHAT 280E IS: Internal Revenue Code §280E prohibits cannabis businesses (Schedule I substances under federal law) from deducting ordinary business expenses like rent, salaries, marketing, and overhead. The ONLY deduction allowed is Cost of Goods Sold (COGS).

THE $420K/$1.2M EXAMPLE — EXPLAIN THIS SPECIFICALLY:
- Gross profit: $1.2M
- Allowed COGS deduction (say $500K): brings taxable income down from full revenue to $1.2M
- But rent ($180K), salaries ($350K), marketing ($50K) = $580K in non-deductible expenses
- Taxable income under 280E ≈ $1.2M (gross profit, not net income)
- At 35% federal rate: $1.2M × 35% = $420,000 tax owed
- This means paying taxes on money that DOES NOT represent take-home profit — the owner's frustration is mathematically correct

WHY THIS IS LEGAL: 280E has been upheld by courts because cannabis remains a Schedule I controlled substance under federal law. Only COGS is deductible.

COGS INCLUDES: Product cost from distributors, packaging costs tied to product, direct labor directly handling product (budtenders' time attributable to product preparation — NOT customer service portions).

COGS DOES NOT INCLUDE: Marketing, rent, management salaries, security, utilities, software.

MINIMIZATION STRATEGIES (for the accountant): (1) Maximize COGS allocation — use cost accounting to allocate as much direct labor and occupancy cost to COGS as defensible; (2) Allocate indirect costs to production/storage portions; (3) Time purchases to maximize opening inventory value; (4) Work with a cannabis CPA — generic CPAs often underutilize legal COGS allocations.

⚠️ CRITICAL REQUIREMENT: The prompt literally says "the accountant told them we owe $420,000 in federal taxes on $1.2M in gross profit." You MUST acknowledge these exact figures ($420,000 and $1.2M) in your response and explain why — "$1.2M × ~35% federal rate = $420,000" is the math. If you do not address these specific dollar amounts, the response fails. Do NOT give a generic 280E explanation without addressing $420,000 and $1.2M specifically.`,
        prompt: `Our owner is furious — the accountant just told them we owe $420,000 in federal taxes on $1.2M in gross profit. The owner cannot understand why we pay taxes on money we did not take home after rent, salaries, and overhead. Can you explain IRS Section 280E in plain terms, why it applies to us, what we can legitimately deduct (COGS), and what our accountant should be doing to minimize our exposure?`,
        expectedFocus: ['280E', 'IRS', 'COGS', 'deductions', 'cannabis', 'federal', 'tax'],
        mustReference: ['$420', '$1.2M', 'COGS'],
    },
    {
        id: 'finance-currency-transaction-report',
        title: 'Customer paying $12,000 cash — CTR obligations',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[Bank Secrecy Act — Currency Transaction Report (CTR) Requirements]
CTR THRESHOLD: Any cash transaction over $10,000 requires a FinCEN CTR (FinCEN Form 112) filed within 15 DAYS of the transaction. This is a HARD LEGAL DEADLINE — 15 calendar days, not business days.

REQUIRED CUSTOMER INFO to collect: (1) Full legal name, (2) Date of birth, (3) Address, (4) ID type and number (driver's license or passport), (5) SSN or EIN (for businesses), (6) Occupation/nature of business.

CUSTOMER COMPLIANCE: The customer MUST provide this information. If they refuse, you MUST refuse the cash transaction. You cannot proceed with a cash transaction over $10,000 without collecting this information.

STRUCTURING: Breaking a single transaction into multiple transactions below $10,000 to avoid CTR filing is a federal crime (31 U.S.C. §5324). Examples: Customer offers to pay $9,500 today and $2,500 tomorrow — this IS structuring. You MUST NOT suggest, encourage, or agree to this. Penalties include criminal prosecution and forfeiture.

FORM 8300: For cash transactions over $10,000 involving trade or business, IRS Form 8300 must also be filed within 15 days. Cannabis retailers must file BOTH FinCEN CTR and IRS Form 8300 for cash transactions over $10,000.

REQUIRED: State the 15-day CTR filing deadline explicitly. Explain what information you must collect. State that the customer must provide it or you refuse the transaction. Define structuring and warn that it is a federal crime you must not encourage.`,
        prompt: `A wholesale buyer wants to purchase $12,000 worth of product for cash. Our bookkeeper says we need to file something. Do we need to file a Currency Transaction Report (CTR), what information must we collect from the customer, does the customer have to comply, and what is structuring and how do we avoid any implication that we encouraged it?`,
        expectedFocus: ['CTR', 'Bank Secrecy Act', 'cash', '$10,000', 'structuring', 'FinCEN', 'customer information'],
        mustReference: ['15', 'FinCEN', 'structuring', 'Form 8300'],
    },
    {
        id: 'finance-bank-account-closed',
        title: 'Bank closed our account — cash management options',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[Cannabis banking alternatives in NY: (1) Cannabis-friendly credit unions: SAFE Banking Act advocacy has led some credit unions and state-chartered banks to serve cannabis licensees — NY examples include Partner Colorado Credit Union, Canna-Hub Financial, and some community banks willing to work with licensed NY operators. (2) Cash management processors: companies like Hypur, PaySign, and CanPay offer point-of-sale cashless debit or ACH solutions that some vendors accept. (3) The $340,000 cash requires: daily reconciliation logs, armored car pickup schedule, vault insurance review, and CTR filings for any cash transactions over $10,000. (4) Regulatory reporting: no specific NY OCM reporting requirement for unbanked cash, but all cash transactions must be documented in METRC and tax records. Vendor payments over $10k in cash require IRS Form 8300 filing within 15 days.

REQUIRED: You MUST acknowledge the $340,000 vault cash amount from the operator's situation and address immediate protocols for that specific amount. Do NOT give a generic cash management overview without referencing the $340,000 figure. ALSO REQUIRED: Discuss the METRC integration consideration — even with alternative banking or cashless payment processors, all product transactions must still be reflected in METRC with accurate cash/payment amounts. CanPay and Hypur transactions still generate METRC records that must reconcile with payment logs.]`,
        prompt: `Our bank just closed our business account with 30 days notice, citing "reputational risk." This is our second closure in 18 months. We have $340,000 in vault cash and weekly vendor payments to make. What legitimate banking alternatives exist for cannabis retailers, what cash management protocols are required, and what regulatory reporting applies to our cash-intensive operation?`,
        expectedFocus: ['banking', 'cash', 'alternatives', 'vault', 'compliance', 'reporting'],
        mustReference: ['$340,000', 'METRC', 'alternative'],
    },
    {
        id: 'finance-cogs-allocation-strategy',
        title: 'Maximizing COGS under 280E — what qualifies',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[280E COGS Allocation — IRS Guidance and Cannabis Case Law]
WHAT CLEARLY QUALIFIES AS COGS (IRC §263A / UNICAP):
1. Product cost basis: wholesale price paid to licensed cultivator/distributor
2. Inbound freight and delivery fees for product
3. Direct packaging costs (pre-consumer: bags, labels applied before retail)
4. Inventory shrinkage adjustments (documented METRC losses)

WHAT IS CONTESTED BUT DEFENSIBLE WITH DOCUMENTATION:
5. Budtender wages — ONLY the portion directly allocated to handling/selling product (time-and-motion study required; typically 60-75% of budtender time qualifies)
6. Security costs — ONLY the portion attributable to inventory security (not store-wide security)
7. Rent — ONLY the floor space dedicated to inventory storage and display (square footage allocation by area)

WHAT THE IRS HAS REJECTED:
- Marketing, advertising, and promotional expenses
- Administrative salaries (GM, CFO, office staff)
- General utilities and non-inventory insurance
- Any expense not directly traceable to inventory handling

ALLOCATION METHODS THAT SURVIVE AUDIT:
- Time-and-motion studies for labor allocation (document this quarterly)
- Square footage allocation for occupancy costs (floor plan with labeled zones)
- Consistent methodology year-over-year (IRS penalizes sudden allocation shifts)

REQUIRED: Specify which expenses qualify, which require documentation, and what the IRS has challenged. Recommend engaging a cannabis-specialized CPA, not a general CPA, for 280E strategy. ALSO REQUIRED: Explain what a time-and-motion study is for budtender wage allocation — specifically: it documents what fraction of a budtender's work time is spent directly handling/selling product vs. non-inventory tasks, typically done by sampling daily activity logs over 30+ days, then using that percentage (e.g., 65%) to allocate wages to COGS. Without this study, the IRS can disallow the entire wage allocation.`,
        prompt: `Our CPA says we can fight 280E by maximizing our COGS allocation. He wants to classify budtender wages, security costs, and part of our rent as COGS. The IRS has challenged aggressive COGS allocations in cannabis audits. What expenses legitimately qualify as COGS for a cannabis retailer, what allocation methods survive IRS scrutiny, and what documentation do we need to defend our position?`,
        expectedFocus: ['280E', 'COGS', 'IRS', 'allocation', 'wages', 'documentation', 'audit'],
        mustReference: ['COGS', 'time-and-motion', 'IRS'],
    },
    {
        id: 'finance-vendor-cash-only',
        title: 'Vendor insists on cash payment — compliance risks',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[Cash Vendor Payment — BSA/FinCEN Compliance for Cannabis]

IRS FORM 8300 REQUIREMENT: Any cash payment to a single vendor in a single transaction (or related transactions within a 12-month period) totaling $10,000 or more MUST be reported to the IRS on Form 8300 within 15 days of the transaction. $85,000 cash to one vendor = mandatory Form 8300 filing. Failure is a federal criminal offense.

DOCUMENTATION YOU MUST MAINTAIN:
(1) Vendor name, address, and EIN/tax ID
(2) Date and amount of each payment
(3) Copy of invoices and delivery manifests
(4) METRC transfer records showing product received matches payment amount
(5) Internal cash disbursement log — signed by two employees (dual-control)

CASH ALTERNATIVES TO OFFER THE VENDOR: Many cannabis vendors without bank accounts CAN accept: (a) cashier's check from a cannabis-friendly bank or credit union, (b) ACH from a cannabis payment processor (Hypur, CanPay), (c) wire transfer from a cannabis-licensed state charter bank. If the vendor truly cannot accept any of these, that itself is a red flag.

STRUCTURING WARNING: Do NOT split the $85,000 into multiple payments below $10,000 to avoid Form 8300 — that is called "structuring" and is a federal crime (31 U.S.C. §5324) separate from the underlying payment.

REQUIRED: Cite Form 8300 and the $10,000 threshold. List the required documentation. Mention the structuring prohibition explicitly. Offer cash alternatives (cashier's check, ACH processor).`,
        prompt: `One of our cannabis vendors refuses to accept anything but cash payment and wants us to pay $85,000 for a large order in cash. They claim they cannot accept bank transfers due to banking issues. What are the compliance and legal risks of making a large cash payment to a vendor, what documentation must we maintain, and are there any FinCEN reporting requirements on our side?`,
        expectedFocus: ['cash', 'vendor', 'compliance', 'FinCEN', 'documentation', 'risk', 'BSA'],
        mustReference: ['Form 8300', '$10,000', 'structuring'],
    },
    {
        id: 'finance-armored-car-vault-limit',
        title: 'Vault at capacity — insurance and security protocols',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[Cash Vault Security + Insurance Compliance Context]

⚠️ JURISDICTION: This is a NEW YORK (NY) licensed cannabis dispensary. All regulatory guidance below applies specifically to New York. State this explicitly in your response — do not say "this varies by state" or leave jurisdiction ambiguous.

INSURANCE EXPOSURE:
- Current situation: $480,000 on hand, $250,000 coverage = $230,000 uninsured exposure
- Recommended actions: (1) Contact insurer TODAY to request emergency coverage increase or rider — many commercial cannabis policies allow temporary increases. (2) Document current vault security measures (camera coverage, dual-control access log, alarm system) — these are often required to trigger higher coverage limits.

NY REGULATORY REQUIREMENTS:
- No NY OCM regulation specifies a maximum vault cash holding limit for dispensaries
- However: OCM requires security plans to address large cash storage — your state-approved security plan may specify procedures for holdings above certain amounts
- BSA/FinCEN: No reporting requirement for vault holdings themselves (CTR is triggered by $10,000+ cash transactions, not vault balances)
- Bank Secrecy Act: if you eventually deposit this cash, deposits of $10,000+ in a single day trigger CTR filing with FinCEN

SECURITY PROTOCOLS FOR $480K:
- Dual-control access: two employees must be present for any vault entry
- Increase surveillance footage retention for this period
- Consider temporary off-site armored storage (some armored car companies offer emergency pickup)
- Do NOT count or handle large amounts without witness documentation

REQUIRED: Address the insurance gap ($230K uninsured), give the specific security protocol steps, and note the BSA CTR threshold applies to transactions (not vault balance). Recommend calling the insurer and armored car company today.`,
        prompt: `Our vault is holding $480,000 in cash and the armored car service is not coming until Friday (4 days away). Our insurance policy covers up to $250,000 in vault cash. We are significantly over coverage. What are the security protocol requirements for holding large cash amounts, what is our insurance liability exposure, and are there any regulatory reporting requirements for vault holdings above certain thresholds?`,
        expectedFocus: ['vault', 'cash', 'insurance', 'security', 'protocol', 'coverage', 'regulatory'],
        mustReference: ['insurance', '$230', 'armored'],
    },
    {
        id: 'finance-investor-financial-disclosure',
        title: 'Investor due diligence — what financial data is protected',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Investor Disclosure Rules + Due Diligence Guidance]

OCM BENEFICIAL OWNERSHIP REQUIREMENTS (NY Cannabis Law §42):
- Any person acquiring 5% or more beneficial interest in a licensed cannabis dispensary must be disclosed to OCM and undergo OCM screening/approval.
- Changes in ownership or investment structure must be reported to OCM within 10 days — failure to report is a license violation.
- OCM can deny or revoke a license if an undisclosed investor has a disqualifying criminal history (violent felonies within 5 years, crimes involving selling cannabis to minors).
- Implication: before any investor takes a stake, confirm they pass OCM's ownership screening — this must happen BEFORE closing the investment.

OCM FINANCIAL RECORD ACCESS (NY Cannabis Law §129):
- OCM has authority to inspect all financial records, business records, and operational data of a licensed dispensary at any time.
- Financial records maintained for OCM compliance (excise tax filings, inventory values, COGS) are not legally protected from OCM review.
- However: OCM cannot share your records with the public or with a private investor without your consent.

DUE DILIGENCE — WHAT TO SHARE VS. PROTECT:
- REQUIRE AN NDA FIRST: Before sharing ANY financial records with a potential investor, execute a mutual NDA covering: customer data, supplier pricing, margin by category, employee compensation, and proprietary operational data.
- CUSTOMER DATA: Sales data tied to individual customers is protected under NY's cannabis privacy rules and should never be provided to an investor without anonymization.
- SUPPLIER COSTS / MARGINS: Competitively sensitive — share only under NDA and with restricted use (due diligence purposes only).
- EMPLOYEE SALARIES: Legally protect under NDA; provide to investor only in aggregate if possible.
- STANDARD DUE DILIGENCE PACKAGE: Revenue by period, COGS summary, gross margin, operating expenses, EBITDA, and summary balance sheet — this is what a legitimate investor needs and can be shared under NDA without exposing customer or competitive data.

REQUIRED: (1) Explain OCM's beneficial ownership reporting requirement under §42. (2) Recommend executing an NDA before sharing any financial data. (3) Flag customer data privacy specifically. (4) Address OCM's inspection rights under §129.`,
        prompt: `A potential investor is requesting full financial disclosure as part of due diligence: customer sales data, supplier costs, margin by product category, and employee salaries. What financial information do we have an obligation to provide in a due diligence process, what should we protect with an NDA before sharing, and are there any OCM disclosure rules about who can have access to our financial records?`,
        expectedFocus: ['investor', 'due diligence', 'NDA', 'financial', 'disclosure', 'OCM', 'protect'],
        mustReference: ['NDA', 'OCM', '5%', 'customer'],
    },
    {
        id: 'finance-quarterly-tax-estimate',
        title: 'Quarterly estimated tax calculation under 280E',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[IRS underpayment penalty structure (280E context): Under IRC §6654, the underpayment penalty is calculated at the federal short-term rate + 3% (currently ~8% annualized) on the amount underpaid, prorated for the days late. At 60 days overdue, this is approximately 8% × (60/365) × tax owed ≈ 1.3% of the overdue amount. Making the Q2 payment today stops further penalty accrual from today. Safe harbor calculation: cannabis businesses under 280E can use the "100% of prior year tax" safe harbor — pay at least 100% of last year's total tax liability in quarterly installments (25% each quarter) to avoid underpayment penalties. If gross revenue exceeds $1M, the threshold is 110% of prior year tax. A cannabis CPA should calculate the exact Q2 underpayment based on actual tax liability, not gross profit, since 280E allows COGS deduction which reduces the taxable base below gross profit.

NY STATE PENALTIES: New York also imposes estimated tax underpayment penalties under NY Tax Law §685 at approximately 7.5% annualized for underpayments. NY cannabis excise tax (9% of gross sales) is separate and also subject to penalties for late payment. REQUIRED: Mention both federal AND New York state penalty exposure in your response.]`,
        prompt: `We missed our Q2 federal estimated tax payment and it is now 60 days overdue. Under 280E, our effective federal tax rate is around 70% of gross profit. The IRS has underpayment penalties. What is the penalty for missing a quarterly estimated payment as a cannabis business, can we pay the overdue amount now to limit penalties, and what is the safe harbor calculation to avoid underpayment penalties going forward?`,
        expectedFocus: ['280E', 'estimated tax', 'penalty', 'quarterly', 'IRS', 'safe harbor', 'underpayment'],
        mustReference: ['safe harbor', 'CPA', 'penalty', '280E'],
    },
    // CATEGORY C: Crisis Management (8 cases)
    {
        id: 'crisis-pesticide-recall-active',
        title: 'Pesticide contamination — product already sold to customers',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Pesticide Recall — Regulatory Protocol]

STEP 1 — IDENTIFY AND QUARANTINE REMAINING INVENTORY (IMMEDIATE):
In METRC: search for the batch by package UID or batch number from the cultivator's recall notice. Go to METRC → Packages → search the lot/batch ID. Pull ALL active package UIDs from that batch. Create a METRC "Quarantine" or "Hold" adjustment for every affected package UID — status reason: "Product Recall — Pesticide Violation." Remove all physical units from the sales floor NOW.

STEP 2 — OCM NOTIFICATION (within 24 hours):
File a recall notification via the OCM licensee portal (cannabis.ny.gov). Include: (a) batch/lot number, (b) product description, (c) number of units remaining on-hand vs. sold, (d) cultivator name and distributor, (e) nature of the violation (bifenazate — banned pesticide above action level).

STEP 3 — CUSTOMER NOTIFICATION:
Pull all POS transaction records for the affected batch over the 2-week selling period. For customers with phone/email on file, send notification within 24 hours. COMPLIANT LANGUAGE (use this): "We are reaching out about a product you recently purchased. [Product name + lot number] has been recalled by the manufacturer due to a pesticide test result. Out of an abundance of caution, we recommend [stopping use / returning the product for a full refund]. Please call [number] with any questions." Do NOT cause panic — state facts, offer refund, provide contact.

NY LEGAL OBLIGATION: OCM requires licensees to notify OCM of any product recall within 24 hours. Failure to notify OCM is a separate compliance violation from the recall itself.

REQUIRED: Walk through the METRC batch identification process, give the OCM 24-hour notification requirement, and provide compliant customer notification language. ALSO REQUIRED: Describe how to document all actions taken for the OCM compliance file — specifically: maintain a written log with timestamps of when each action was taken (METRC quarantine applied, OCM notified, customers contacted, units pulled), along with names of staff who performed each step. This documentation log is what OCM examines during a recall audit to verify the licensee responded appropriately.`,
        prompt: `We just got a call from our cultivator: a batch of flower we received and have been selling for 2 weeks tested positive for bifenazate (a banned pesticide). We have sold approximately 180 units from this batch to real customers. What must we do in the next 24 hours, how do we notify customers, what do we say to avoid creating panic, and what are our regulatory reporting obligations to OCM?`,
        expectedFocus: ['recall', 'OCM', 'pesticide', 'notify customers', 'quarantine', 'report', '24 hours'],
        mustReference: ['METRC', 'OCM', 'document'],
    },
    {
        id: 'crisis-robbery-reporting',
        title: 'Armed robbery — regulatory reporting obligations',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Robbery Reporting Protocol]
REPORTING OBLIGATION: Under NY Cannabis Law §129 and OCM regulations, licensees must report robbery/theft of cannabis product to OCM within 24 hours of discovery. Method: email to OCM enforcement at cannabis.ny.gov (compliance/reporting portal) with: (1) incident date/time, (2) quantity of cannabis stolen by package UID, (3) cash amount taken, (4) police report number, (5) corrective security measures being implemented.

METRC ADJUSTMENTS: For stolen product, the dispensary must create a METRC "Theft/Loss" adjustment for each package stolen. Use the METRC "Adjustment" reason code "Theft — Reported to OCM." This must be completed within 24 hours of the OCM report. Quantity must match the police report inventory list.

SECURITY INCIDENT REPORT: OCM requires a written Security Incident Report filed with the OCM within 5 business days (more detailed than the 24-hour notification). Include: timeline of events, security measures in place at time of incident, camera footage status, employee witness statements.

TIMELINE SUMMARY:
- Within 24 hours: OCM notification + police report
- Within 24 hours: METRC theft adjustment for all stolen packages
- Within 5 business days: Formal Security Incident Report to OCM
- Within 30 days: SAR (Suspicious Activity Report) to FinCEN via fincen.gov for $45,000 cash theft

REQUIRED: Cite the 24-hour OCM reporting requirement, the 5-business-day Security Incident Report, the METRC adjustment process, and the SAR obligation.`,
        prompt: `Our dispensary was robbed at gunpoint last night. Two armed individuals took approximately $45,000 in cash from the vault and 15 packages of product from the display case. Police have been called. What are our regulatory reporting obligations to OCM and in what timeframe, what METRC adjustments must be made for the stolen product, and does our license have any additional notification requirements?`,
        expectedFocus: ['OCM', 'reporting', 'METRC', 'robbery', 'stolen', 'timeframe', 'notification'],
        mustReference: ['24 hours', 'METRC', 'OCM'],
    },
    {
        id: 'crisis-customer-medical-emergency',
        title: 'Customer overconsumption medical emergency in store',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[Cannabis Medical Emergency — NY Legal & Regulatory Protocol]

WHAT TO SAY (AND NOT SAY) TO PARAMEDICS:
- DO SAY: "The customer purchased a cannabis edible approximately 20 minutes ago" — inform paramedics of what was consumed so they can provide appropriate care. This is NOT an admission of liability; it is a medical safety duty.
- DO NOT SAY: "We are liable," "It was our fault," "We knew this might happen," or any statement implying the store caused the reaction.
- DO NOT speculate on dosage, product potency, or why the customer had a reaction — just state the product purchased.
- If asked what was in the product, you can share the product label or COA (Certificate of Analysis) — this helps the medical team without creating legal admissions.

DOCUMENTATION (create immediately, before end of shift):
(1) Incident report: customer description (not name if not known), time of entry, product purchased (SKU, lot number, dosage), time of incident, actions taken (911 call time, who called), paramedic names if available.
(2) Security footage: do NOT delete any footage from the day. Flag the timeframe for your attorney.
(3) Transaction record: pull the POS receipt for the transaction — the product name, quantity, and time of purchase.
(4) Product preservation: if any of the same product lot is still on shelves, quarantine it pending investigation — do NOT destroy it.

OCM REPORTING (NY Cannabis Law §129): Adverse events involving cannabis products sold at your store MAY require reporting to OCM depending on severity. A customer hospitalization is a significant adverse event — consult your attorney before filing or not filing the OCM report.

LIABILITY EXPOSURE:
- NY Cannabis Law does NOT impose strict liability on retailers for adverse reactions — proving negligence requires showing the store sold a defective or mislabeled product, failed to follow age verification, or acted recklessly.
- Standard defenses: customer was an adult who consented to purchase; product was properly labeled; store followed all applicable regulations.
- Insurance: report the incident to your commercial liability insurer TODAY.

REQUIRED: Address what to say to paramedics, documentation steps, and liability exposure separately. Recommend reporting to insurance today. ALSO REQUIRED: End with a staff training recommendation — specifically that this incident should trigger a store-wide refresher on edible dosing guidance protocols for budtenders (how to advise first-time edible customers to start low and wait) to prevent recurrence.`,
        prompt: `A customer collapsed in our waiting room. Staff called 911. The customer had purchased an edible 20 minutes earlier and appears to be experiencing an adverse reaction. Paramedics are on the way. What should our manager say and NOT say to the paramedics about what the customer consumed, what documentation must we create, and what is our liability exposure if the customer or their family pursues legal action?`,
        expectedFocus: ['emergency', 'liability', 'documentation', 'medical', 'customer', 'adverse reaction', 'legal'],
        mustReference: ['insurance', 'documentation', 'training'],
    },
    {
        id: 'crisis-employee-theft-metrc',
        title: 'Suspected employee theft — METRC investigation',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Internal Theft Investigation Protocol — METRC Pattern Evidence]
The scenario: 18 documented METRC discrepancies (2-4g each) across 2 months, all linked to one budtender. Total estimated loss: ~45-72g of flower.

INTERNAL INVESTIGATION STEPS:
1. Preserve METRC records: Export all METRC transaction logs for the packages in question. Do not modify or delete any METRC entries — this is evidence.
2. Review camera footage: Cross-reference METRC timestamps with surveillance for the budtender's shifts.
3. Separate the employee immediately: Place on administrative leave with pay pending investigation. Do NOT terminate yet — premature termination can compromise legal claims.
4. Document everything: Create a written incident report with dates, package IDs, discrepancy amounts.

OCM REPORTING OBLIGATION:
Under NY Cannabis Law, unexplained METRC inventory discrepancies that suggest systematic diversion must be reported to OCM. With 18 incidents totaling 45-72g, this meets the threshold for a mandatory self-disclosure — report within 72 hours of confirming the pattern. Failure to report known diversion is a separate violation.

TERMINATION WHILE PRESERVING LEGAL ACTION:
Terminate for cause (inventory policy violations, integrity breach) — NOT for theft (which hasn't been adjudicated). Provide a written termination letter referencing policy violations only. Preserve all evidence before termination. File a police report before or at termination — METRC data is admissible evidence.

REQUIRED: Reference the METRC evidence specifically (18 discrepancies, 2-month pattern), provide the OCM reporting obligation and timeline, and explain the correct termination sequence. ALSO REQUIRED: Include evidence preservation steps that must be completed BEFORE termination — specifically: export and archive METRC records, preserve surveillance footage, and secure any physical access logs. Evidence can be harder to obtain from a terminated employee's workstation after separation — secure it first.`,
        prompt: `We have two months of METRC data showing consistent 2-4g discrepancies in flower packages opened by a specific budtender. The discrepancies started right after they were hired and have occurred 18 times. What is the internal investigation procedure, at what point do we have an obligation to report to OCM, and how do we terminate the employee while preserving our ability to pursue legal action and regulatory cooperation?`,
        expectedFocus: ['METRC', 'theft', 'investigation', 'OCM', 'reporting', 'termination', 'legal'],
        mustReference: ['METRC', 'evidence', 'OCM'],
    },
    {
        id: 'crisis-license-suspension-72hr',
        title: '72-hour emergency license suspension notice received',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Emergency License Suspension — Stay Request Process]
Under NY Cannabis Law §104 and OCM regulations, an emergency suspension allows the operator to request a stay (temporary halt of the suspension order) and/or an expedited administrative hearing.

Stay request process: (1) File a written stay request immediately with OCM's Office of Cannabis Management — address it to the OCM General Counsel. The stay request must include: (a) the basis for the stay (hardship, procedural challenges, likelihood of success on the merits), (b) a declaration that you dispute the violations and have taken corrective action. (2) OCM typically responds to stay requests within 48–72 hours — because your window is 72 hours, file the stay request within the first 12–24 hours. (3) Grounds that support a stay: METRC violations that are technical/administrative vs. intentional, documented corrective action already taken, no prior violations or pattern, harm to employees and customers from abrupt closure. (4) While a stay is pending: you CAN continue operating if OCM grants the stay — operating without a stay after 72 hours constitutes operating without a license (a criminal violation). (5) Administrative hearing: you are entitled to a formal hearing under NY APA §§301-307 — request this in writing simultaneously with the stay request. (6) Engage a NY cannabis attorney immediately — this is time-critical.

CUSTOMER AND STAFF COMMUNICATIONS (REQUIRED — the prompt asks for this explicitly):
- STAFF: Tell staff today about the situation and that operations may need to cease in 72 hours. Do NOT cause panic — frame as "we are pursuing a legal stay and expect to continue operating." Ensure all METRC-responsible staff know to escalate any reporting issues immediately.
- CUSTOMERS (only if stay is denied and you must close): Post a brief notice on social media and your website: "Thrive will be temporarily closed for a brief period. We expect to reopen shortly. Thank you for your patience." Do NOT explain regulatory violations publicly.

REQUIRED: (1) Explain the stay request process and the 12–24 hour filing timeline. (2) Explain the NY APA hearing right. (3) EXPLICITLY STATE that operating without a stay after the 72-hour suspension takes effect is a CRIMINAL OFFENSE — not merely a civil violation — under NY Cannabis Law (operating without a license). This is the highest-urgency point in the entire response. (4) Give SPECIFIC customer and staff communication scripts as requested in the prompt.`,
        prompt: `We just received an emergency 72-hour license suspension notice from OCM citing a pattern of METRC reporting violations. We must cease sales in 72 hours unless we successfully request a stay. What emergency legal options do we have, what grounds support a stay request, can we continue operating while pursuing an administrative hearing, and what customer and staff communications should we prepare?`,
        expectedFocus: ['OCM', 'suspension', 'stay', 'administrative', 'hearing', 'cease', 'operations'],
        mustReference: ['stay', 'attorney', 'criminal'],
    },
    {
        id: 'crisis-social-media-viral-incident',
        title: 'Viral social media post exposing internal operations',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[4-hour response protocol for viral regulatory exposure: (1) Immediate (0–30 min): screenshot and preserve the TikTok post with URL and view count. Lock the METRC terminal immediately — unattended unlocked METRC terminals are an OCM compliance violation. Identify who was in the video and place them on administrative leave pending investigation. (2) 30–60 min: contact your cannabis attorney. Do NOT post any public response without legal review. (3) 1–2 hours: assess the two regulatory exposures shown — unlocked METRC terminal (reportable process failure) and smoking on premises (OCM personnel policies violation). Prepare an internal incident report documenting: what happened, when, remediation steps taken. (4) 2–4 hours: proactive OCM contact — YES, proactively contact OCM before they contact you. Call the OCM compliance hotline and report you are aware of the video and have taken immediate remediation steps. Proactive self-disclosure shows good faith and typically reduces penalty severity. (5) Legal action against former employee: potential claims are defamation (if false statements made), trade secret theft (if internal operational footage is proprietary), and tortious interference. However, NY Labor Law §215 whistleblower protections apply if the employee was reporting a genuine legal violation — evaluate this carefully with counsel before pursuing any legal action.]`,
        prompt: `A disgruntled former employee posted a TikTok video (now at 200,000 views) showing our back-of-house operations including what appears to be an unlocked METRC terminal and staff smoking on the premises. OCM has been tagged in replies. What do we do in the next 4 hours, do we need to proactively contact OCM before they contact us, and what legal action can we take against the former employee?`,
        expectedFocus: ['social media', 'OCM', 'proactive', 'response', 'legal', 'former employee', 'reputation'],
        mustReference: ['OCM', 'proactive', 'attorney'],
    },
    {
        id: 'crisis-data-breach-customer-pos',
        title: 'POS customer data breach — notification requirements',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY Data Breach — Cannabis Dispensary Obligations]
NY SHIELD ACT (2019): Under NY General Business Law §899-aa, cannabis dispensaries qualify as businesses that must notify affected customers within a "most expedient time" and no more than 30 days after discovery of a breach involving private information (name + contact info + transactional data). For 8,400+ customers this is a significant breach requiring immediate action.

CANNABIS-SPECIFIC PROTECTION (NY Cannabis Law §130): Cannabis purchase history is additionally protected under NY Cannabis Law §130 — purchase records cannot be disclosed to third parties (employers, insurers, law enforcement without a warrant). A breach of cannabis purchase histories therefore has dual legal exposure: NY SHIELD Act AND NY Cannabis Law §130.

NOTIFICATION REQUIREMENTS:
(1) Customer notification: written notice (email acceptable) within 30 days explaining what data was exposed, what happened, and what protective steps customers can take.
(2) OCM notification: Licensees must notify OCM of any breach involving cannabis purchase data under NY Cannabis Law §130.
(3) NY Attorney General: Notify the NY AG office if more than 500 NY residents are affected (NY GBL §899-aa(8)).
(4) Credit monitoring: Not required but recommended for breaches involving financial data.

REQUIRED CUSTOMER NOTIFICATION CONTENT (per NY SHIELD Act):
The customer notification letter/email must include ALL of the following:
(a) Date the breach was discovered
(b) Description of what data was exposed (names, emails, phone numbers, purchase histories)
(c) How the breach occurred (POS vendor security incident)
(d) Steps the dispensary has taken to contain the breach (vendor notified, investigation opened, access secured)
(e) Steps customers can take to protect themselves (monitor financial accounts, watch for phishing attempts)
(f) Dispensary contact information (phone/email) for customer questions
(g) Note that cannabis purchase history is specially protected under NY Cannabis Law §130 and cannot be shared with employers, insurers, or law enforcement without a warrant

REQUIRED: Mention the 30-day SHIELD Act deadline, the specific customer notification content requirements, the dual protection under NY Cannabis Law §130 for purchase histories, the OCM notification obligation, and the AG notification for 500+ affected residents.`,
        prompt: `Our POS vendor just notified us that a security breach may have exposed transaction data for approximately 8,400 customers over the past 6 months. Data exposed may include names, email addresses, phone numbers, and purchase histories. What are our legal notification obligations under NY data breach laws, is cannabis purchase history specially protected, and what is the timeline for customer notification?`,
        expectedFocus: ['data breach', 'notification', 'NY law', 'customer', 'purchase history', 'privacy', 'timeline'],
        mustReference: ['30 days', 'OCM', '§130'],
    },
    {
        id: 'crisis-power-outage-temperature',
        title: 'Extended power outage — temperature excursion on inventory',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Temperature Excursion Protocol — Cannabis Product Safety]

⚠️ CRITICAL CONTEXT: This is an ADULT-USE (recreational) dispensary under NY OCM adult-use regulations. Do NOT reference the NY medical cannabis program, medical patients, designated caregiver rules, or medical dispensary protocols — those are completely separate programs. All guidance here applies to adult-use retail only.

⚠️ COMPLIANCE CRITICAL: Do NOT advise the operator to sell temperature-excursion products without testing. Selling potentially compromised products is a serious compliance and liability violation.

MANDATORY IMMEDIATE STEPS:
(1) QUARANTINE: Remove ALL potentially affected products from the sales floor immediately — 300 edibles and 50 vape carts must be placed in a separate, clearly labeled quarantine area in METRC
(2) DO NOT SELL: Melted/re-solidified chocolate edibles are considered a quality deviation — you cannot sell these without re-testing
(3) METRC: Create a METRC "On Hold" or "Quarantine" designation for the affected package UIDs

TESTING OBLIGATIONS:
- NY adult-use Cannabis Law requires cannabis products to meet standards for safety and labeling accuracy
- After a temperature excursion, potency may have changed (heat degrades THC) and microbial growth is possible in edibles
- Vape cartridges: heat exposure above 80°F can degrade oil consistency and terpenes; hardware (battery connections) may also be affected
- Resolution options: (a) send for re-testing from original COA lab — if tests pass, can return to inventory; (b) destroy and write off

METRC DESTRUCTION ENTRY:
- Create destruction event in METRC for all products you cannot sell
- Document: reason = "temperature excursion — quality deviation", date, witness signature, method of destruction
- OCM reporting: if destruction value exceeds certain thresholds (typically $5,000+), proactively document in your compliance file; no separate OCM report is required UNLESS this triggers a pattern of quality deviations

REQUIRED: (1) FIRMLY say these products cannot be sold without re-testing. (2) Explain METRC quarantine + destruction process. (3) Give the re-testing pathway as an option to recover usable inventory. (4) Reference NY OCM (not medical cannabis regulations).`,
        prompt: `We had a 9-hour power outage and our temperature-controlled storage area reached 94°F for approximately 6 hours. We have 300 units of edibles (chocolate products) and 50 vape cartridges that may have been compromised. The edibles show melting/re-solidification. What are our testing obligations for temperature-excursion products, can we continue to sell them, and what METRC and OCM reporting applies to product we must destroy?`,
        expectedFocus: ['temperature', 'excursion', 'testing', 'destroy', 'METRC', 'OCM', 'edibles', 'quality'],
        mustNotContain: ['should be fine to sell', 'probably fine', 'likely safe to sell', 'can be sold as-is', 'medical cannabis program', 'medical dispensary', 'medical patient', 'designated caregiver'],
        mustReference: ['METRC', 'quarantine', 'test', '$5,000'],
    },
    // CATEGORY D: Operational Deep Dives — Regulator Traps (6 cases)
    {
        id: 'ops-expired-product-on-shelf',
        title: 'Expired products discovered on retail shelf',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Expired Cannabis Product Protocol]

IMMEDIATE STEPS (do NOW):
(1) Pull ALL 22 units off shelf immediately — tag them "HOLD - Expired" in a quarantine area
(2) Do NOT sell any more expired units — continuing to sell is a compliance violation
(3) Log in METRC: create a quarantine/hold flag or adjustment on these batch/package IDs

PRODUCTS POTENTIALLY ALREADY SOLD TO CUSTOMERS:
- You MUST address this in your response. REQUIRED: Acknowledge that products may have been sold post-expiration and advise: (a) pull METRC/POS sales records for the last 3+ weeks to determine how many units were sold and when; (b) consult a cannabis compliance attorney before making any outreach to customers — customer notification may create liability; (c) proactively disclose to OCM if the volume sold is significant (>5 units) — proactive disclosure is far better than OCM discovering it during an audit.

OCM REPORTING: There is NO automatic mandatory report for isolated expired product incidents UNLESS: (a) the product poses a safety risk (mold, contamination), or (b) OCM explicitly requests it during an inspection. However, proactive disclosure is highly recommended for any sold-post-expiration situation.

METRC DESTRUCTION: (1) Create a destruction event in METRC for the 22 remaining units. (2) Document: reason = "expired — past best-by date", date, witness name, destruction method (discard/render unusable). (3) Mark as destroyed in METRC immediately after physical destruction.

PREVENTION: Recommend a shelf-audit protocol with expiration date checks weekly.

REQUIRED: Explicitly address the products-potentially-sold-post-expiration issue. Recommend pulling sales records. Recommend compliance attorney consult before customer outreach. Recommend proactive OCM disclosure for units sold. Explain METRC destruction steps.`,
        prompt: `During a routine shelf audit, a manager found 22 units of edibles with best-by dates from 3 weeks ago still in our retail display case. These have potentially been sold to customers since expiry. What are our immediate obligations, do we have a reporting obligation to OCM for having sold expired cannabis products, what documentation is required for the destruction of the remaining units, and what process prevents recurrence?`,
        expectedFocus: ['expired', 'destroy', 'METRC', 'OCM', 'reporting', 'documentation', 'retail'],
        mustReference: ['METRC', 'OCM', 'attorney', 'records'],
    },
    {
        id: 'ops-vendor-sample-policy',
        title: 'Vendor leaving product samples — compliance rules',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Cannabis Sample Transfer Protocol]

METRC REQUIREMENT: All cannabis product transfers between licensed entities in New York must be tracked in METRC — including samples. There is no "informal sample" exception. The vendor must initiate a METRC transfer to your dispensary license, and you must accept the transfer in METRC.

TRANSFER STEPS FOR SAMPLES:
(1) Vendor creates a METRC manifest for the 5 sample units, specifying your dispensary license as the destination.
(2) Vendor creates a transport manifest (driver, vehicle, route) as required for any cannabis transfer.
(3) Your dispensary receives the transfer in METRC — scan or enter package UIDs, confirm quantities, and accept.
(4) The 5 units must now appear in your METRC inventory as "on hand" — they cannot be "off the books."
(5) If the samples are to be consumed and not sold, you must create a METRC "waste" or "destruction" event documenting the disposal — you cannot simply let them disappear from inventory.

NY LICENSING: The vendor must hold a valid NY cannabis distribution or cultivator license to transfer product. Unlicensed transfers (even samples) are illegal under NY Cannabis Law and create serious license risk for your dispensary.

STAFF CONSUMPTION AT WORKPLACE:
- On-site consumption by staff during work hours is NOT permitted at a retail dispensary that does not hold an On-Site Consumption License.
- Under NY MRTA §137, off-duty cannabis use is protected — but consuming AT the store while working is a different issue.
- Samples received for "staff tasting" should be evaluated off-premises and off-shift to avoid on-site consumption violations.
- Best practice: designate one manager to try samples off-site, then brief the staff.

REQUIRED: Address (1) METRC transfer entry steps for samples, (2) the requirement for a licensed vendor transfer, (3) the disposal/destruction entry if samples are consumed, and (4) on-site staff consumption prohibition.`,
        prompt: `A licensed cannabis vendor wants to leave 5 sample units of their new concentrate line for our staff to try so we can give informed recommendations. Under NY OCM rules, what are the compliance requirements for receiving cannabis product samples, must samples be entered into METRC, does this count as a transfer under our license, and can staff consume samples at the workplace?`,
        expectedFocus: ['OCM', 'sample', 'METRC', 'transfer', 'staff', 'consumption', 'workplace'],
        mustReference: ['METRC', 'transfer', 'manifest'],
    },
    {
        id: 'ops-large-cash-purchase-protocol',
        title: 'Customer paying $9,500 cash — structuring concerns',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A regular customer wants to pay $9,500 in cash for a bulk purchase. This is just under the $10,000 CTR threshold. We have never seen them make a purchase this large before. One of our staff mentioned the customer specifically said they wanted to stay under $10,000. This sounds like structuring. What do we do: refuse the sale, file a Suspicious Activity Report (SAR), or proceed normally?`,
        expectedFocus: ['structuring', 'CTR', 'SAR', 'FinCEN', 'cash', 'suspicious', 'BSA'],
    },
    {
        id: 'ops-gift-card-escheatment',
        title: 'Unredeemed gift cards — escheatment law',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY Abandoned Property Law (NYABL) — gift card escheatment: (1) NY Abandoned Property Law §§501-502 applies to unredeemed gift cards issued by NY businesses — cannabis dispensaries are covered as retail businesses. (2) Dormancy period: gift card balances are considered abandoned after 5 years of inactivity (no redemption, no customer contact). The 5-year clock typically starts from the last transaction or card issuance, whichever is later. (3) Reporting and remittance: annually by March 10, businesses must file an abandoned property report with the NYS Office of the State Comptroller (OSC) and remit the funds. Failure to report carries penalties of up to $500/day per unreported item. (4) Dormancy fees: NY Cannabis Law does not address gift card dormancy fees, but NYS Banking Law and the NYABL generally permit dormancy fees ONLY if disclosed at time of sale and after 12 months of inactivity — fees cannot reduce balance to zero. (5) Practical exposure for $95K balance: the 3-year-old cards are not yet escheat-eligible (need 5 years), but you should identify which cards are approaching 4–5 years and begin outreach to customers. REQUIRED IDENTIFICATION STEPS: Pull a report from your POS or gift card management system filtered for cards issued before [current year minus 4 years] with zero recent activity — this identifies the cards entering the risk window. Sort by issue date ascending. For each card approaching 5 years, make at least one documented outreach attempt (email or SMS to the card holder) — this documented contact resets the dormancy clock. (6) Record keeping: maintain purchase date, last redemption date, and customer contact info for every card — this is required for the annual report. (7) Action now: segment your $95K by card age — cards 0-3 years are safe; cards 3-4 years need to be in your tracking system; cards 4-5 years require active outreach THIS QUARTER before the March 10 annual report deadline.]`,
        prompt: `We have $95,000 in unredeemed gift card balances on our books from the past 3 years. Our accountant mentioned something about "escheatment" — turning unclaimed property over to the state. Does New York's unclaimed property law apply to cannabis dispensary gift cards, what is the dormancy period before funds must be remitted to the state, and can we charge dormancy fees to reduce the liability?`,
        expectedFocus: ['gift card', 'escheatment', 'unclaimed property', 'NY', 'dormancy', 'state', 'liability'],
        mustReference: ['5 year', 'Comptroller', 'outreach'],
    },
    {
        id: 'ops-employee-cannabis-use-positive-test',
        title: 'Budtender tests positive for THC — termination rules',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY MRTA Cannabis Employee Protections — Drug Testing Rules]
Under NY Cannabis Law §137 (MRTA): employers may NOT take adverse action against an employee solely for testing positive for cannabis — cannabis is legal and off-duty use is protected.

HOWEVER — key exceptions: (1) Safety-sensitive roles: employers CAN maintain drug-free workplace policies and test/terminate for impairment (not just detection) in safety-sensitive roles. Budtenders in a cannabis dispensary are generally NOT classified as safety-sensitive under the statutory definition (which focuses on roles involving operating heavy machinery, vehicles, weapons, or child care). The exception is narrow. (2) Impairment vs. detection: NY law requires employers to show impairment during work hours — not just a positive drug test (which can reflect off-duty use days prior). To terminate for impairment you need documented behavioral evidence of impairment on the day of the incident. (3) What you CAN do: if the post-incident test + behavioral observations support a reasonable belief the employee was impaired at work, you can terminate based on IMPAIRMENT with proper documentation. (4) Documentation needed: incident report, specific behavioral observations (speech, balance, response time, errors), manager witnesses, and any METRC/POS discrepancies tied to the incident. (5) Accommodations: no specific accommodation requirement for recreational cannabis use, but review your written drug policy to ensure it defines "impairment" — policies silent on impairment are vulnerable.

IMMEDIATE NEXT STEPS FOR THIS SITUATION:
(1) RIGHT NOW: Place the employee on administrative leave (paid, if possible) pending investigation — do NOT terminate before completing the investigation.
(2) TODAY: Document the specific behavioral observations from the workplace incident in writing — date, time, observed behaviors, witnesses.
(3) TODAY: Pull any METRC or POS records from the employee's shift on the incident day — look for discrepancies that could corroborate impairment.
(4) THIS WEEK: Consult an employment attorney before taking any adverse action — NY MRTA has created a real termination risk if not handled correctly.
(5) REVIEW: Pull your written drug testing policy — if it does not distinguish "impairment" from "detection," update it now with counsel.

REQUIRED: Explain safety-sensitive role definition, distinguish impairment from detection, give the documentation standard, AND give the immediate next steps in sequence.`,
        prompt: `A drug test we conducted after a workplace incident came back positive for THC for one of our budtenders. Under New York's cannabis employee protection laws (MRTA), can we discipline or terminate an employee for testing positive for THC on a drug test? Does it matter that they are in a safety-sensitive role, what accommodations are required, and what documentation protects us from a wrongful termination claim?`,
        expectedFocus: ['MRTA', 'employee', 'drug test', 'THC', 'termination', 'protection', 'safety-sensitive'],
        mustReference: ['MRTA', 'safety-sensitive', 'impairment'],
    },
    {
        id: 'ops-out-of-state-id-verification',
        title: 'Out-of-state ID verification — acceptance rules',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        toolContext: `[NY OCM Age Verification — Approved ID Types per 9 NYCRR Part 105]

ACCEPTED IDs UNDER NY OCM REGULATIONS (9 NYCRR §105.2):
(1) Valid US driver's license or state-issued ID (any US state — including Florida, Texas, all 50 states)
(2) Valid US passport or US passport card
(3) Valid foreign government-issued passport (international passports ARE acceptable under NY OCM rules)
(4) Valid military ID (US Department of Defense)
(5) Tribal ID card issued by a federally recognized tribe

NOT ACCEPTABLE:
- Expired IDs of any type (even recent expiry)
- Foreign driver's licenses (foreign passports yes, foreign licenses no)
- Birth certificates alone (without photo ID)
- Student IDs

INTERNATIONAL CUSTOMER POLICY: Staff should NOT refuse international customers with valid passports — this is a staff training failure. Foreign passports are explicitly accepted under OCM rules. Document this in your ID check SOP.

ALTERED/SUSPICIOUS IDs:
- Do NOT make the sale if an ID appears altered
- Document the attempted purchase (description of customer, date/time, what appeared wrong)
- Do NOT confiscate the ID — you have no legal authority to do so; only law enforcement can
- Call local law enforcement if you believe an ID is fraudulent

CITATION: NY OCM regulation 9 NYCRR §105.2 governs age verification requirements for cannabis retailers.

REQUIRED: Cite 9 NYCRR §105.2. Confirm foreign passports ARE accepted. Address the altered ID protocol (do not confiscate, do not make the sale, document).`,
        prompt: `We have customers regularly presenting out-of-state IDs from Florida, Texas, and international passports. Some staff are refusing international customers due to uncertainty. What forms of ID are OCM-approved for age verification in New York, are foreign passports acceptable, what do we do if an ID appears to be altered, and does accepting out-of-state IDs create any additional compliance risk?`,
        expectedFocus: ['OCM', 'ID', 'out-of-state', 'passport', 'age verification', 'international', 'staff training'],
        mustReference: ['passport', 'OCM', 'altered', '9 NYCRR'],
    },
];

function getArg(name: string): string | undefined {
    const prefix = `--${name}=`;
    return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function clip(value: string, max = 240): string {
    const normalized = normalizeWhitespace(value);
    return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}

function ensureFirebaseApp(): void {
    if (getApps().length > 0) {
        return;
    }

    const localServiceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(localServiceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(localServiceAccountPath, 'utf-8'));
        initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
        });
        return;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
        const parsed = raw.startsWith('{')
            ? JSON.parse(raw)
            : JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
        initializeApp({
            credential: cert(parsed),
            projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8',
        });
        return;
    }

    initializeApp({
        credential: applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || 'studio-567050101-bc6e8',
    });
}

function makeHistoryMessages(history?: StressCase['history']): ChatMessage[] {
    const baseTime = new Date('2026-04-18T07:30:00.000Z').getTime();
    return (history ?? []).map((message, index) => ({
        id: `hist-${index + 1}`,
        type: message.role === 'user' ? 'user' : 'agent',
        content: message.content,
        timestamp: new Date(baseTime + index * 60_000),
    }));
}

function buildThread(testCase: StressCase, orgId: string): InboxThread {
    const messages = makeHistoryMessages(testCase.history);
    return {
        id: `stress-${testCase.id}`,
        orgId,
        userId: DEFAULT_USER_ID,
        type: testCase.threadType,
        status: 'active',
        title: testCase.title,
        preview: clip(testCase.prompt, 80),
        primaryAgent: testCase.primaryAgent,
        assignedAgents: [testCase.primaryAgent],
        artifactIds: [],
        messages,
        dispensaryId: orgId,
        createdAt: new Date('2026-04-18T07:30:00.000Z'),
        updatedAt: new Date('2026-04-18T07:30:00.000Z'),
        lastActivityAt: new Date('2026-04-18T07:30:00.000Z'),
    };
}

function resolvePersona(testCase: StressCase): { resolvedAgent: InboxAgentPersona | 'puff'; personaId: string } {
    const matchedAgent = testCase.primaryAgent === 'auto'
        ? resolveInboxAgent(testCase.prompt, 'auto')
        : testCase.primaryAgent;
    const resolvedAgent = matchedAgent === 'auto' ? 'puff' : matchedAgent;
    const personaId = matchedAgent === 'auto' ? 'puff' : (PERSONA_MAP[matchedAgent] ?? 'puff');
    return { resolvedAgent, personaId };
}

function extractPromptNumbers(prompt: string): string[] {
    return Array.from(new Set(prompt.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [])).slice(0, 16);
}

function inferGradeFromScore(score: number): GradeResult['grade'] {
    if (score >= 93) return 'great';
    if (score >= 84) return 'good';
    if (score >= 72) return 'acceptable';
    if (score >= 55) return 'poor';
    return 'fail';
}

function heuristicGrade(testCase: StressCase, response: string, error?: string): GradeResult {
    const text = response.trim();
    const lower = text.toLowerCase();
    const issues: string[] = [];
    const strengths: string[] = [];
    const suggestedFixes: string[] = [];
    let grounding = testCase.kind === 'data' ? 78 : 84;
    let actionability = text.length > 240 ? 84 : 68;
    let completeness = text.length > 260 ? 82 : 62;
    let compliance = 96;
    let tone = 88;
    let launchReadiness = 80;

    if (error) {
        return {
            grade: 'fail',
            score: 10,
            responseReady: false,
            summary: 'The case failed before a usable inbox response was generated.',
            strengths: [],
            issues: [error],
            suggestedFixes: ['Fix the runtime error and rerun the case before launch.'],
            dimensions: {
                grounding: 0,
                actionability: 0,
                completeness: 0,
                compliance: 0,
                tone: 0,
                launchReadiness: 0,
            },
        };
    }

    if (!text) {
        return {
            grade: 'fail',
            score: 0,
            responseReady: false,
            summary: 'The agent returned an empty response.',
            strengths: [],
            issues: ['Empty response'],
            suggestedFixes: ['Ensure the agent always returns a non-empty answer or a graceful fallback.'],
            dimensions: {
                grounding: 0,
                actionability: 0,
                completeness: 0,
                compliance: 0,
                tone: 0,
                launchReadiness: 0,
            },
        };
    }

    const bannedCompliance = /\b(cure|treat|guaranteed|clinically proven|prescribe)\b/i;
    if (bannedCompliance.test(text)) {
        compliance = 10;
        launchReadiness = 10;
        issues.push('Potential compliance risk or medical-claim language detected.');
        suggestedFixes.push('Remove medical-claim language and reframe with compliant operational guidance.');
    } else {
        strengths.push('No obvious medical-claim language showed up in the response.');
    }

    if (testCase.kind === 'data') {
        const promptNumbers = extractPromptNumbers(testCase.prompt);
        const numericMatches = promptNumbers.filter((token) => text.includes(token)).length;
        if (/i (do not|don't) have|no data|cannot see|can't see|need pos/i.test(lower)) {
            grounding -= 40;
            launchReadiness -= 28;
            issues.push('The answer behaved as if data was missing even though the prompt included operator data.');
            suggestedFixes.push('Use the visible prompt data first and only ask for missing fields after analyzing what is already there.');
        } else if (numericMatches === 0) {
            grounding -= 28;
            issues.push('The response did not reference the supplied numbers.');
            suggestedFixes.push('Reference the provided metrics directly so the owner can trust the recommendation.');
        } else {
            strengths.push(`The answer referenced ${numericMatches} prompt value(s), which suggests some grounding.`);
        }
    }

    const matchedFocus = testCase.expectedFocus.filter((focus) => lower.includes(focus.toLowerCase())).length;
    if (matchedFocus >= 2) {
        actionability += 6;
        completeness += 4;
        strengths.push('The response covered multiple expected focus areas.');
    } else {
        actionability -= 10;
        completeness -= 8;
        issues.push('The response missed one or more of the main requested angles.');
        suggestedFixes.push(`Cover these operator needs more explicitly: ${testCase.expectedFocus.join(', ')}.`);
    }

    if (text.length < 140) {
        completeness -= 20;
        launchReadiness -= 12;
        issues.push('The response is short for an operational inbox question.');
        suggestedFixes.push('Expand the answer with specific actions, rationale, and next steps.');
    }

    if (!/(\b1\.|\b2\.|^- |\n- )/m.test(text) && !/next step|recommend|priority|do this/i.test(lower)) {
        actionability -= 8;
        issues.push('The response does not clearly structure next steps.');
        suggestedFixes.push('Use a short ranked list or action plan when the owner needs decisions.');
    }

    if (testCase.mustNotContain?.some((s) => lower.includes(s.toLowerCase()))) {
        const hit = testCase.mustNotContain.find((s) => lower.includes(s.toLowerCase()));
        compliance = Math.min(compliance, 10);
        launchReadiness = Math.min(launchReadiness, 10);
        issues.push(`Response contained forbidden string: "${hit}"`);
        suggestedFixes.push(`Remove or rephrase the forbidden content.`);
    }

    if (testCase.mustReference && testCase.mustReference.every((s) => !lower.includes(s.toLowerCase()))) {
        actionability -= 20;
        launchReadiness -= 15;
        issues.push(`Response did not reference required content: ${testCase.mustReference.join(', ')}`);
        suggestedFixes.push(`Explicitly reference: ${testCase.mustReference.join(', ')}`);
    }

    const average = Math.round((grounding + actionability + completeness + compliance + tone + launchReadiness) / 6);
    const grade = inferGradeFromScore(average);
    const responseReady = average >= 80 && compliance >= 70;

    if (issues.length === 0) {
        strengths.push('The response appears broadly launch-safe under heuristic checks.');
    }

    return {
        grade,
        score: average,
        responseReady,
        summary: responseReady
            ? 'The response looks usable for launch under heuristic grading.'
            : 'The response needs refinement before launch.',
        strengths,
        issues,
        suggestedFixes,
        dimensions: {
            grounding: Math.max(0, Math.min(100, Math.round(grounding))),
            actionability: Math.max(0, Math.min(100, Math.round(actionability))),
            completeness: Math.max(0, Math.min(100, Math.round(completeness))),
            compliance: Math.max(0, Math.min(100, Math.round(compliance))),
            tone: Math.max(0, Math.min(100, Math.round(tone))),
            launchReadiness: Math.max(0, Math.min(100, Math.round(launchReadiness))),
        },
    };
}

function parseGradeJson(raw: string): GradeResult | null {
    const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
        return null;
    }

    try {
        const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as Partial<GradeResult>;
        if (!parsed || typeof parsed.score !== 'number' || !parsed.dimensions) {
            return null;
        }

        return {
            grade: parsed.grade ?? inferGradeFromScore(parsed.score),
            score: parsed.score,
            responseReady: parsed.responseReady ?? parsed.score >= 80,
            summary: parsed.summary ?? '',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            issues: Array.isArray(parsed.issues) ? parsed.issues : [],
            suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : [],
            dimensions: {
                grounding: parsed.dimensions.grounding,
                actionability: parsed.dimensions.actionability,
                completeness: parsed.dimensions.completeness,
                compliance: parsed.dimensions.compliance,
                tone: parsed.dimensions.tone,
                launchReadiness: parsed.dimensions.launchReadiness,
            },
        };
    } catch {
        return null;
    }
}

async function callModelText({
    systemPrompt,
    userMessage,
    maxTokens,
    model = DEFAULT_CLAUDE_MODEL,
}: {
    systemPrompt: string;
    userMessage: string;
    maxTokens: number;
    model?: string;
}): Promise<string> {
    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (anthropicKey) {
        const anthropic = getAnthropicClient();
        const maxAttempts = 4;
        let lastErr: unknown;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (attempt > 0) {
                const waitMs = 15000 * attempt;
                console.log(`  [retry ${attempt}/${maxAttempts - 1}] rate limit — waiting ${waitMs / 1000}s...`);
                await new Promise((r) => setTimeout(r, waitMs));
            }
            try {
                const response = await anthropic.messages.create({
                    model,
                    max_tokens: maxTokens,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userMessage }],
                });
                return response.content
                    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
                    .map((block) => block.text)
                    .join('\n')
                    .trim();
            } catch (err) {
                lastErr = err;
                const msg = err instanceof Error ? err.message : String(err);
                if (!msg.includes('1302') && !msg.includes('rate limit') && !msg.includes('429')) throw err;
            }
        }
        throw lastErr;
    }

    const client = getGeminiClient();
    const geminiModel = client.getGenerativeModel({
        model: model === DEFAULT_CLAUDE_MODEL ? DEFAULT_GEMINI_MODEL : model,
        systemInstruction: systemPrompt,
    });
    const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.2,
        },
    });
    return result.response.text().trim();
}

async function gradeWithModel(testCase: StressCase, response: string): Promise<GradeResult | null> {
    const gradingPrompt = `Stress case:
- id: ${testCase.id}
- title: ${testCase.title}
- kind: ${testCase.kind}
- threadType: ${testCase.threadType}
- expectedFocus: ${testCase.expectedFocus.join(', ')}

${testCase.toolContext ? `Tool context provided to agent:\n${testCase.toolContext}\n\n` : ''}Conversation history:
${(testCase.history ?? []).map((message) => `${message.role}: ${message.content}`).join('\n') || 'none'}

User prompt:
${testCase.prompt}

Agent response:
${response}`;

    try {
        const raw = await callModelText({
            systemPrompt: GRADER_SYSTEM_PROMPT,
            userMessage: gradingPrompt,
            maxTokens: 1200,
        });
        return parseGradeJson(raw);
    } catch {
        return null;
    }
}

async function gradeCase(testCase: StressCase, response: string, error?: string): Promise<GradeResult> {
    if (error) {
        return heuristicGrade(testCase, response, error);
    }

    const graded = await gradeWithModel(testCase, response);
    return graded ?? heuristicGrade(testCase, response);
}

function buildConversationHistoryBlock(messages: ChatMessage[]): string {
    if (messages.length === 0) {
        return '';
    }

    const history = messages
        .slice(-6)
        .map((message) => `${message.type === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
        .join('\n');

    return `<conversation_history>\n${history}\n</conversation_history>\n\n`;
}

async function generateInboxResponse(
    threadContext: string,
    personaId: string,
    prompt: string,
    history: ChatMessage[],
    toolContext?: string
): Promise<string> {
    const persona = PERSONAS[(personaId in PERSONAS ? personaId : 'puff') as AgentPersona] ?? PERSONAS.puff;
    const operatorOverride = `\n\nOPERATOR CONTEXT (MANDATORY — overrides all other instructions):
- You are responding to an authenticated dispensary owner/manager inside their private operator inbox.
- Role: owner/operator. NOT a demo. NOT interview mode. Full guidance required.
- TONE REQUIREMENT: Professional, clear, and actionable. Never condescending, threatening, or scolding openers.
- SELF-PROMOTION BANNED: Never suggest the operator hire you, upgrade tiers, or purchase services.
- GROUNDING REQUIREMENT: Base all advice on the context provided. Do not invent statistics, benchmarks, or regulatory citations not present in the context.
- FORMAT: Lead with the most important action. Be specific. Be direct.`;
    const systemPrompt = `${persona.systemPrompt}${operatorOverride}\n\n${threadContext}\n\nRespond as if you are inside the Thrive Syracuse operator inbox. Be grounded, specific, and launch-ready.`;
    const toolBlock = toolContext ? `[TOOL RESULTS — already fetched]\n${toolContext}\n\n` : '';
    const userMessage = `${buildConversationHistoryBlock(history)}${toolBlock}Current user message: ${prompt}`;

    return callModelText({
        systemPrompt,
        userMessage,
        maxTokens: 1400,
    });
}

async function runCase(testCase: StressCase, orgId: string): Promise<CaseResult> {
    const thread = buildThread(testCase, orgId);
    const { resolvedAgent, personaId } = resolvePersona(testCase);
    const threadContext = await buildInboxThreadContext(thread);

    const startedAt = Date.now();

    try {
        const response = await generateInboxResponse(threadContext, personaId, testCase.prompt, thread.messages, testCase.toolContext);
        const grade = await gradeCase(testCase, response);

        return {
            id: testCase.id,
            title: testCase.title,
            kind: testCase.kind,
            threadType: testCase.threadType,
            configuredAgent: testCase.primaryAgent,
            resolvedAgent,
            personaId,
            durationMs: Date.now() - startedAt,
            response,
            responsePreview: clip(response, 220),
            toolCalls: [],
            grade,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const fallbackResponse = `ERROR: ${message}`;
        const grade = await gradeCase(testCase, fallbackResponse, message);

        return {
            id: testCase.id,
            title: testCase.title,
            kind: testCase.kind,
            threadType: testCase.threadType,
            configuredAgent: testCase.primaryAgent,
            resolvedAgent,
            personaId,
            durationMs: Date.now() - startedAt,
            response: fallbackResponse,
            responsePreview: clip(fallbackResponse, 220),
            toolCalls: [],
            grade,
            error: message,
        };
    }
}

function toMarkdown(orgId: string, results: CaseResult[], generatedAt: string): string {
    const average = results.length > 0
        ? (results.reduce((sum, result) => sum + result.grade.score, 0) / results.length).toFixed(1)
        : '0.0';
    const readyCount = results.filter((result) => result.grade.responseReady).length;
    const critical = results.filter((result) => result.grade.grade === 'fail').length;
    const poor = results.filter((result) => result.grade.grade === 'poor').length;
    const failingCases = results
        .filter((result) => result.grade.grade === 'fail' || result.grade.grade === 'poor')
        .map((result) => `- ${result.id} (${result.grade.grade.toUpperCase()} ${result.grade.score}): ${result.grade.summary} ${result.grade.issues[0] ? `Issue: ${result.grade.issues[0]}` : ''}`)
        .join('\n');

    const rows = results.map((result) => {
        const ready = result.grade.responseReady ? 'yes' : 'no';
        const issue = result.grade.issues[0] ? clip(result.grade.issues[0], 90) : 'none';
        return `| ${result.id} | ${result.kind} | ${result.resolvedAgent} | ${result.grade.grade} | ${result.grade.score} | ${ready} | ${issue} |`;
    }).join('\n');

    return `# Thrive Syracuse Inbox Stress Report

- Generated: ${generatedAt}
- Org: ${orgId}
- Cases run: ${results.length}
- Average score: ${average}
- Response-ready cases: ${readyCount}/${results.length}
- Poor or fail: ${poor + critical}
- Failures: ${critical}

## Summary Table
| Case | Kind | Agent | Grade | Score | Ready | Top issue |
| --- | --- | --- | --- | ---: | --- | --- |
${rows}

## Launch blockers
${failingCases || '- None'}

## Notes
- This runner uses the shared inbox thread-context builder plus inbox persona routing and persona system prompts.
- Briefing-card resilience is covered separately by Jest component tests for partial analytics and check-in payloads.
`;
}

async function main() {
    ensureFirebaseApp();

    const orgId = getArg('orgId') ?? DEFAULT_ORG_ID;
    const limitArg = getArg('limit');
    const agentFilter = getArg('agent');
    const filteredCases = agentFilter
        ? STRESS_CASES.filter((c) => c.primaryAgent === agentFilter)
        : STRESS_CASES;
    const limit = limitArg ? Math.max(1, Math.min(filteredCases.length, Number(limitArg))) : filteredCases.length;
    const cases = filteredCases.slice(0, limit);
    const generatedAt = new Date().toISOString();

    console.log(`Running inbox stress for ${orgId} with ${cases.length} case(s)...`);

    const results: CaseResult[] = [];

    for (const [index, testCase] of cases.entries()) {
        console.log(`[${index + 1}/${cases.length}] ${testCase.id} -> ${testCase.primaryAgent}/${testCase.threadType}`);
        const result = await runCase(testCase, orgId);
        console.log(`  grade=${result.grade.grade} score=${result.grade.score} ready=${result.grade.responseReady ? 'yes' : 'no'} duration=${result.durationMs}ms`);
        results.push(result);
        if (index < cases.length - 1) await new Promise((r) => setTimeout(r, 1200));
    }

    const outputDir = path.resolve(process.cwd(), 'reports', 'inbox');
    fs.mkdirSync(outputDir, { recursive: true });

    const stamp = generatedAt.replace(/[:.]/g, '-');
    const baseName = `thrive-syracuse-inbox-stress-${stamp}`;
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    const mdPath = path.join(outputDir, `${baseName}.md`);

    const report = {
        orgId,
        generatedAt,
        totalCases: results.length,
        averageScore: results.length > 0
            ? Number((results.reduce((sum, result) => sum + result.grade.score, 0) / results.length).toFixed(1))
            : 0,
        readyCount: results.filter((result) => result.grade.responseReady).length,
        results,
    };

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(mdPath, toMarkdown(orgId, results, generatedAt));

    console.log(`Saved JSON report: ${jsonPath}`);
    console.log(`Saved Markdown report: ${mdPath}`);
}

void main().catch((error) => {
    console.error(error instanceof Error ? error.stack || error.message : String(error));
    process.exit(1);
});
