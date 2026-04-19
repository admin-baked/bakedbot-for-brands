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
        prompt: 'We want budtenders to pair our evening gummies with one more product, but we cannot drift into medical claims. What pairings and talking points would you use?',
        expectedFocus: ['pairings', 'talking points', 'no medical claims', 'budtenders'],
    },
    {
        id: 'exact-slowest-movers-no-data',
        title: 'Slow movers discussion — no POS data provided',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'auto',
        toolContext: `[Tool: get_slow_movers — ERROR: No slow-mover data available. Ask the manager to share their POS inventory report or run a pull from Alleaves.]`,
        prompt: 'Lets discuss our slowest movers',
        expectedFocus: ['slow movers', 'data', 'POS', 'share'],
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
        prompt: 'A customer is at the counter asking to return an edible they bought yesterday — says it was the wrong dosage and the package is still sealed. What is our policy and what do I tell them?',
        expectedFocus: ['policy', 'sealed', 'NY', 'customer'],
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
        prompt: 'A customer just asked the budtender: "What do you have that is good for my arthritis?" Give the budtender the exact response script that answers helpfully without making any medical claims.',
        expectedFocus: ['script', 'budtender', 'arthritis', 'no medical'],
        mustNotContain: ['arthritis', 'helps with pain', 'relieves', 'good for your'],
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
        toolContext: `[Historical: Average Tuesday 10 AM–1 PM = 35 transactions, $1,650 revenue. Today so far (10 AM + 11 AM + 1 PM, skipping missing 12 PM): 39 transactions, $1,772 revenue — 3 of 4 hours visible.]`,
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
        prompt: `I want to post on Instagram to promote our weekly specials. Before I do, what are the OCM rules I need to follow for social media advertising? Specifically: can I show product photos, name prices, mention THC percentages, or use influencers?`,
        expectedFocus: ['OCM', 'social media', 'advertis', 'restrict'],
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
        prompt: `I am hiring two new budtenders and a part-time cashier. What background check requirements does New York state impose on cannabis retail employees? Are there disqualifying offenses, and how do I document compliance?`,
        expectedFocus: ['background', 'employee', 'disqualif', 'NY'],
    },
    {
        id: 'ny-delivery-rules',
        title: 'Can Thrive offer delivery? NY delivery service rules',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        prompt: `Customers keep asking if we deliver. What does NY law require for a dispensary to offer delivery — separate license, vehicle requirements, delivery manifest, GPS tracking? And can we use a third-party driver or does it have to be a Thrive employee?`,
        expectedFocus: ['delivery', 'license', 'manifest', 'driver'],
    },
    {
        id: 'ny-consumption-lounge',
        title: 'Consumption lounge regulations in NY',
        kind: 'non_data',
        threadType: 'compliance',
        primaryAgent: 'deebo',
        prompt: `I am thinking about adding an on-site consumption lounge in the back of the store. What does New York require to operate a consumption lounge — separate permit, ventilation standards, no alcohol rule, age verification? What are the biggest compliance risks?`,
        expectedFocus: ['consumption lounge', 'permit', 'ventilation', 'risk'],
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
        prompt: `Someone told me adult-use licensees in NY have financial obligations to a social equity fund. Is that true? What is the exact requirement — percentage of revenue, annual fee, or something else — and when does it apply to our license type?`,
        expectedFocus: ['social equity', 'fund', 'obligation', 'adult-use'],
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
        prompt: `Last August revenue dropped 22% compared to June. I want to prepare this year instead of scrambling. How much cash reserve should I hold going into summer? Which cost lines — staffing, marketing, vendor orders — should I trim first, and by how much?`,
        expectedFocus: ['reserve', 'summer', 'staffing', 'trim'],
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
        prompt: `I hired three new budtenders last year and they completed their initial state-required training. How often does New York require re-certification for cannabis retail employees? Are there separate requirements for managers versus floor staff?`,
        expectedFocus: ['training', 'certif', 'recertif', 'NY'],
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
        prompt: `A customer called and said they got sick after using an edible we sold them last week. They are using the word "poisoned" and asking us to pay their urgent care bill. This feels like a compliance and liability situation. What are my immediate steps — document, notify OCM, refuse to admit liability? Should I call our insurance?`,
        expectedFocus: ['document', 'liability', 'OCM', 'insurance'],
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
        prompt: `A customer is asking for a complete copy of their purchase history — every transaction for the past 2 years. They mentioned something about HIPAA and their right to their data. What are my actual obligations under NY cannabis law and state privacy law to provide this? Is this a standard request I should fulfill immediately?`,
        expectedFocus: ['purchase history', 'privacy', 'data', 'NY'],
    },

    // ── Seasonal / Event Planning (6 cases) ───────────────────────────────
    {
        id: 'four-twenty-vs-four-nineteen',
        title: '4/20 vs 4/19 pre-sale strategy — which day drives more revenue?',
        kind: 'non_data',
        threadType: 'marketing',
        primaryAgent: 'craig',
        prompt: `4/20 is on a Sunday this year and 4/19 is a Saturday. I only have budget for one big promotional push. Should I run the main promo on 4/19 (pre-day, capture planners) or 4/20 itself? What does typical dispensary data say about which day drives higher revenue in this window?`,
        expectedFocus: ['4/20', '4/19', 'revenue', 'promo'],
    },
    {
        id: 'holiday-inventory-buffer',
        title: 'Holiday inventory buffer — Christmas and New Year',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        prompt: `Last Christmas week we ran out of our top 3 flower SKUs two days before December 25 and missed sales. This year I want to buffer properly. If our average weekly flower sales are 120 units, what percentage buffer should I order going into the holiday window, and how many weeks out should I place the order with vendors?`,
        expectedFocus: ['buffer', 'holiday', 'inventory', 'order'],
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
        prompt: `Super Bowl Sunday is coming up and I have heard edibles and beverages spike that day. What does game-day demand typically look like for a dispensary? Should I stock extra edibles, pre-roll multi-packs, and infused beverages? What is a realistic uplift percentage to plan for?`,
        expectedFocus: ['Super Bowl', 'edibles', 'stock', 'demand'],
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
        prompt: `I have heard that cannabis dispensaries see a noticeable bump in February and March when people get tax refunds. Is this real? If so, what categories see the biggest lift — flower, concentrates, premium SKUs? How should I adjust purchasing and marketing for that window?`,
        expectedFocus: ['tax refund', 'February', 'March', 'spending'],
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
        prompt: `A competing dispensary is running Instagram ads showing product photos with prices and what looks like a discount offer. Based on what I know about OCM advertising rules, this looks like a violation. Should I report them to OCM? What is the reporting process and are there any risks to us for filing a complaint?`,
        expectedFocus: ['OCM', 'report', 'violation', 'Instagram'],
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
        prompt: `Our Alleaves POS went down at 11 AM and it is now 1:30 PM. We have been recording transactions manually on paper. NY requires a real-time seed-to-sale tracking record. What are our compliance obligations right now — do I have to stop selling, document manually for OCM, notify someone, or is there a grace period? And when the system comes back up, what do I have to reconcile?`,
        expectedFocus: ['POS', 'OCM', 'manual', 'reconcile'],
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
        prompt: `A customer is choosing between Wedding Cake and Gelato. How do you explain the difference to help them decide — profile, experience characteristics, and which type of customer usually gravitates toward each?`,
        expectedFocus: ['Wedding Cake', 'Gelato', 'terpene', 'profile'],
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
        prompt: `Customers keep asking why rosin is so much more expensive than other concentrates. How do we explain what rosin is, how it is made, and why the price premium is justified — all without using any medical language?`,
        expectedFocus: ['solventless', 'extraction', 'price', 'process'],
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
        prompt: `A customer is reading the product label and wants to know what the terpene percentages mean. How would Smokey explain myrcene, limonene, and beta-pinene in plain language — what each one contributes to the product experience — without making any medical claims?`,
        expectedFocus: ['myrcene', 'limonene', 'pinene', 'aroma'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'sleep', 'depression'],
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
        prompt: `We are getting more customers interested in micro-dosing. How does Smokey explain the concept of micro-dosing cannabis to a customer, what product formats work best for it, and what talking points keep the conversation legal and compliant?`,
        expectedFocus: ['micro-dose', 'low dose', '2.5mg', 'format'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'pain'],
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
        prompt: `A customer is comparing a hash rosin and a flower rosin product and wants to know if the price difference is real. How does Smokey explain what sets hash rosin apart from flower rosin — process, input material, yield, and why collectors prefer one over the other?`,
        expectedFocus: ['hash rosin', 'flower rosin', 'input', 'yield'],
    },
    {
        id: 'smokey-thca-flower',
        title: 'THCA flower — what is it and how does it differ?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `A customer picks up a THCA flower product and asks how it is different from regular dispensary flower. How does Smokey explain THCA vs. THC, decarboxylation, and what this means for the customer experience — without medical claims?`,
        expectedFocus: ['THCA', 'decarboxylation', 'heat', 'THC'],
    },
    {
        id: 'smokey-distillate-vs-live-resin-cart',
        title: 'Distillate vs. live resin cart — which is better?',
        kind: 'non_data',
        threadType: 'general',
        primaryAgent: 'smokey',
        prompt: `Customer asks: "My budtender recommended a live resin cart but distillate is cheaper — which is actually better for me?" How does Smokey walk through the differences objectively so the customer can choose based on their preferences and budget?`,
        expectedFocus: ['distillate', 'live resin', 'terpene', 'price'],
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
        history: [
            { role: 'user', content: 'A regular customer says they bought an indica last week and absolutely loved it — they said it was smooth and easy.' },
            { role: 'assistant', content: 'Good to hear — knowing they enjoyed the indica gives us a solid baseline. We can look at hybrids with a similar terpene base that lean a bit more uplifting without losing that smoothness.' },
        ],
        prompt: `They just came back and said they want "something similar but a little more social — like something I could use at a gathering." What strains or product types does Smokey recommend, and what talking points keep this compliant?`,
        expectedFocus: ['hybrid', 'social', 'terpene', 'uplifting'],
        mustNotContain: ['helps with', 'relieves', 'treats', 'symptom', 'condition', 'medical', 'therapeutic', 'anxiety', 'depression'],
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
        prompt: `We have 30 units of a slow-moving SKU sitting at Location A — it has not moved in 45 days. Location B is selling that same SKU at twice the velocity. Can we physically transfer those 30 units from Location A to Location B? What does that process look like in NY from a Metrc and compliance standpoint?`,
        expectedFocus: ['transfer', 'Metrc', 'compliance', 'NY'],
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
        prompt: `This week we did $28,400 combined across 2 locations:
- Location A: $18,600 (418 transactions, avg ticket $44.50)
- Location B: $9,800 (198 transactions, avg ticket $49.49)

I need to present this to ownership tomorrow. How do I frame it — what is the headline number, what is the narrative, and what three questions should I expect from ownership?`,
        expectedFocus: ['$28,400', 'ownership', 'narrative', 'headline'],
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
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'money_mike',
        prompt: `We are opening Location C next month. Based on what we know from Location A and Location B, what product mix should we open with? Specifically: how many SKUs, which categories to over-index on, how much opening inventory in dollars, and what does a 30-day sell-through buffer look like for a new location?`,
        expectedFocus: ['opening', 'SKU', 'inventory', 'buffer'],
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
        prompt: `Location A has a Metrc discrepancy — 4 units unaccounted for from a transfer. Location B is clean. Both operate under the same OCM license umbrella. Does Location A's discrepancy create any compliance risk or reporting obligation for Location B, or are they treated as independent entities under NY law?`,
        expectedFocus: ['Metrc', 'compliance', 'Location B', 'license'],
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
        prompt: `Ecstatic gets a lot of out-of-state visitors — tourists who are flying home after buying. What do they need to know about NY possession limits, and can we tell them about taking product across state lines? How do our budtenders handle the "can I take this on the plane?" question compliantly without giving legal advice?`,
        expectedFocus: ['tourist', 'possession', 'state lines', 'budtender'],
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
        prompt: `Customers are asking if Ecstatic delivers in Manhattan. Is cannabis delivery actually viable in a dense urban market like Manhattan? What are the specific logistical challenges — traffic, building access, doorman buildings, elevator time? And what does the NY delivery license process look like for an NYC location?`,
        expectedFocus: ['delivery', 'Manhattan', 'logistics', 'license'],
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
        prompt: `NYC has massive tourist spikes around NYE, Fashion Week, Pride, and other events. How should Ecstatic plan inventory around these windows? Which product categories spike most with tourist/event traffic? What lead time do we need for extra stock and how do we avoid over-ordering for an event that may not deliver the expected traffic?`,
        expectedFocus: ['NYE', 'tourist', 'inventory', 'event'],
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
        prompt: `A New York OCM compliance officer just walked in unannounced and is asking to inspect our premises, inventory records, and employee certifications. Manager is panicking. What do we do RIGHT NOW — what are our rights, what must we provide, what can we refuse, and what common mistakes do dispensaries make during unannounced inspections?`,
        expectedFocus: ['rights', 'cooperate', 'inspection', 'OCM', 'inventory', 'records', 'certification'],
    },
    {
        id: 'regulator-advertising-noc-response',
        title: 'OCM Notice of Non-Compliance — advertising violation response',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We received an OCM Notice of Non-Compliance today. It cites our Instagram post from last week showing a product discount ("Purple Punch 20% off") as a violation of NY advertising rules. We have 15 days to respond. What should our response include, do we need a lawyer, what remediation steps do we take immediately, and what are the likely penalty ranges for a first offense?`,
        expectedFocus: ['OCM', 'advertising', 'response', 'violation', 'penalty', 'remediation', 'lawyer'],
    },
    {
        id: 'regulator-metrc-physical-audit',
        title: 'METRC physical inventory audit by inspector',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `State inspector wants to reconcile our METRC records against physical inventory right now. Our last physical count was 3 days ago. We have 4 known small discrepancies we have not yet reported (all under 1g). Should we disclose the known discrepancies proactively before the audit begins? What does the audit process look like, and what happens if variances are found?`,
        expectedFocus: ['METRC', 'audit', 'discrepancy', 'proactive', 'disclosure', 'variance', 'reporting'],
    },
    {
        id: 'regulator-age-verification-failure-response',
        title: 'Failed mystery shopper — immediate response plan',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A state investigator posing as a customer (who showed a valid ID but was 20 years old) just successfully purchased cannabis from us without being ID checked. The investigator identified themselves after the sale and issued a notice of violation. What do we do in the next 24 hours, what is the likely penalty for a first offense, and what training and operational changes prevent recurrence?`,
        expectedFocus: ['age verification', 'ID', 'penalty', 'violation', 'training', 'corrective action', 'first offense'],
    },
    {
        id: 'regulator-employee-records-request',
        title: 'Inspector requests employee training certifications',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `During an inspection, the OCM officer is asking for proof that all our cannabis handlers have completed the required responsible vendor training program. We have 12 employees. Three of them may be overdue for renewal. What records must we produce, what happens if some are expired, and can we get an extension to produce records we cannot find on the spot?`,
        expectedFocus: ['OCM', 'training', 'certification', 'responsible vendor', 'records', 'expired', 'extension'],
    },
    {
        id: 'regulator-fine-appeal-process',
        title: 'Disputing a $7,500 OCM fine — appeal process',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We received a $7,500 fine from OCM for an advertising violation we believe was mischaracterized. The fine seems disproportionate and we believe we have a strong defense. Walk us through the OCM appeal process: what are the timelines, do we need to pay the fine while appealing, what grounds support a successful appeal, and when is it worth fighting vs paying?`,
        expectedFocus: ['OCM', 'appeal', 'fine', 'dispute', 'timeline', 'defense', 'hearing'],
    },
    {
        id: 'regulator-license-condition-violation',
        title: 'Operating outside license conditions',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `Our OCM license has a condition that says we must close by 9 PM. Last Saturday a manager let a customer stay until 9:23 PM during a busy period. No inspector was present, but we logged the transaction in METRC at 9:18 PM. Do we have a self-disclosure obligation, how serious is a first-time license condition violation, and what proactive steps minimize our exposure?`,
        expectedFocus: ['OCM', 'license condition', 'self-disclosure', 'violation', 'hours', 'METRC', 'exposure'],
    },
    {
        id: 'regulator-competitor-complaint-response',
        title: 'Competitor filed regulatory complaint against us',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A competitor dispensary filed a complaint with OCM claiming our window signage contains product images that appeal to minors. OCM has opened an inquiry. Our signage shows stylized cannabis leaf graphics in a branded design. What is the standard for "appealing to minors" in NY, how do we prepare our response, and should we proactively modify the signage during the inquiry?`,
        expectedFocus: ['OCM', 'complaint', 'minors', 'signage', 'advertising', 'inquiry', 'response'],
    },
    // CATEGORY B: Financial Compliance (8 cases)
    {
        id: 'finance-280e-explained',
        title: '280E tax burden explanation for owner',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `Our owner is furious — the accountant just told them we owe $420,000 in federal taxes on $1.2M in gross profit. The owner cannot understand why we pay taxes on money we did not take home after rent, salaries, and overhead. Can you explain IRS Section 280E in plain terms, why it applies to us, what we can legitimately deduct (COGS), and what our accountant should be doing to minimize our exposure?`,
        expectedFocus: ['280E', 'IRS', 'COGS', 'deductions', 'cannabis', 'federal', 'tax'],
    },
    {
        id: 'finance-currency-transaction-report',
        title: 'Customer paying $12,000 cash — CTR obligations',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A wholesale buyer wants to purchase $12,000 worth of product for cash. Our bookkeeper says we need to file something. Do we need to file a Currency Transaction Report (CTR), what information must we collect from the customer, does the customer have to comply, and what is structuring and how do we avoid any implication that we encouraged it?`,
        expectedFocus: ['CTR', 'Bank Secrecy Act', 'cash', '$10,000', 'structuring', 'FinCEN', 'customer information'],
    },
    {
        id: 'finance-bank-account-closed',
        title: 'Bank closed our account — cash management options',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `Our bank just closed our business account with 30 days notice, citing "reputational risk." This is our second closure in 18 months. We have $340,000 in vault cash and weekly vendor payments to make. What legitimate banking alternatives exist for cannabis retailers, what cash management protocols are required, and what regulatory reporting applies to our cash-intensive operation?`,
        expectedFocus: ['banking', 'cash', 'account closure', 'cannabis', 'vault', 'alternatives', 'compliance'],
    },
    {
        id: 'finance-cogs-allocation-strategy',
        title: 'Maximizing COGS under 280E — what qualifies',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `Our CPA says we can fight 280E by maximizing our COGS allocation. He wants to classify budtender wages, security costs, and part of our rent as COGS. The IRS has challenged aggressive COGS allocations in cannabis audits. What expenses legitimately qualify as COGS for a cannabis retailer, what allocation methods survive IRS scrutiny, and what documentation do we need to defend our position?`,
        expectedFocus: ['280E', 'COGS', 'IRS', 'allocation', 'wages', 'documentation', 'audit'],
    },
    {
        id: 'finance-vendor-cash-only',
        title: 'Vendor insists on cash payment — compliance risks',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `One of our cannabis vendors refuses to accept anything but cash payment and wants us to pay $85,000 for a large order in cash. They claim they cannot accept bank transfers due to banking issues. What are the compliance and legal risks of making a large cash payment to a vendor, what documentation must we maintain, and are there any FinCEN reporting requirements on our side?`,
        expectedFocus: ['cash', 'vendor', 'compliance', 'FinCEN', 'documentation', 'risk', 'BSA'],
    },
    {
        id: 'finance-armored-car-vault-limit',
        title: 'Vault at capacity — insurance and security protocols',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `Our vault is holding $480,000 in cash and the armored car service is not coming until Friday (4 days away). Our insurance policy covers up to $250,000 in vault cash. We are significantly over coverage. What are the security protocol requirements for holding large cash amounts, what is our insurance liability exposure, and are there any regulatory reporting requirements for vault holdings above certain thresholds?`,
        expectedFocus: ['vault', 'cash', 'insurance', 'security', 'protocol', 'coverage', 'regulatory'],
    },
    {
        id: 'finance-investor-financial-disclosure',
        title: 'Investor due diligence — what financial data is protected',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A potential investor is requesting full financial disclosure as part of due diligence: customer sales data, supplier costs, margin by product category, and employee salaries. What financial information do we have an obligation to provide in a due diligence process, what should we protect with an NDA before sharing, and are there any OCM disclosure rules about who can have access to our financial records?`,
        expectedFocus: ['investor', 'due diligence', 'NDA', 'financial', 'disclosure', 'OCM', 'protect'],
    },
    {
        id: 'finance-quarterly-tax-estimate',
        title: 'Quarterly estimated tax calculation under 280E',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We missed our Q2 federal estimated tax payment and it is now 60 days overdue. Under 280E, our effective federal tax rate is around 70% of gross profit. The IRS has underpayment penalties. What is the penalty for missing a quarterly estimated payment as a cannabis business, can we pay the overdue amount now to limit penalties, and what is the safe harbor calculation to avoid underpayment penalties going forward?`,
        expectedFocus: ['280E', 'estimated tax', 'penalty', 'quarterly', 'IRS', 'safe harbor', 'underpayment'],
    },
    // CATEGORY C: Crisis Management (8 cases)
    {
        id: 'crisis-pesticide-recall-active',
        title: 'Pesticide contamination — product already sold to customers',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We just got a call from our cultivator: a batch of flower we received and have been selling for 2 weeks tested positive for bifenazate (a banned pesticide). We have sold approximately 180 units from this batch to real customers. What must we do in the next 24 hours, how do we notify customers, what do we say to avoid creating panic, and what are our regulatory reporting obligations to OCM?`,
        expectedFocus: ['recall', 'OCM', 'pesticide', 'notify customers', 'quarantine', 'report', '24 hours'],
    },
    {
        id: 'crisis-robbery-reporting',
        title: 'Armed robbery — regulatory reporting obligations',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `Our dispensary was robbed at gunpoint last night. Two armed individuals took approximately $45,000 in cash from the vault and 15 packages of product from the display case. Police have been called. What are our regulatory reporting obligations to OCM and in what timeframe, what METRC adjustments must be made for the stolen product, and does our license have any additional notification requirements?`,
        expectedFocus: ['OCM', 'reporting', 'METRC', 'robbery', 'stolen', 'timeframe', 'notification'],
    },
    {
        id: 'crisis-customer-medical-emergency',
        title: 'Customer overconsumption medical emergency in store',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A customer collapsed in our waiting room. Staff called 911. The customer had purchased an edible 20 minutes earlier and appears to be experiencing an adverse reaction. Paramedics are on the way. What should our manager say and NOT say to the paramedics about what the customer consumed, what documentation must we create, and what is our liability exposure if the customer or their family pursues legal action?`,
        expectedFocus: ['emergency', 'liability', 'documentation', 'medical', 'customer', 'adverse reaction', 'legal'],
    },
    {
        id: 'crisis-employee-theft-metrc',
        title: 'Suspected employee theft — METRC investigation',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We have two months of METRC data showing consistent 2-4g discrepancies in flower packages opened by a specific budtender. The discrepancies started right after they were hired and have occurred 18 times. What is the internal investigation procedure, at what point do we have an obligation to report to OCM, and how do we terminate the employee while preserving our ability to pursue legal action and regulatory cooperation?`,
        expectedFocus: ['METRC', 'theft', 'investigation', 'OCM', 'reporting', 'termination', 'legal'],
    },
    {
        id: 'crisis-license-suspension-72hr',
        title: '72-hour emergency license suspension notice received',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We just received an emergency 72-hour license suspension notice from OCM citing a pattern of METRC reporting violations. We must cease sales in 72 hours unless we successfully request a stay. What emergency legal options do we have, what grounds support a stay request, can we continue operating while pursuing an administrative hearing, and what customer and staff communications should we prepare?`,
        expectedFocus: ['OCM', 'suspension', 'stay', 'administrative', 'hearing', 'cease', 'operations'],
    },
    {
        id: 'crisis-social-media-viral-incident',
        title: 'Viral social media post exposing internal operations',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A disgruntled former employee posted a TikTok video (now at 200,000 views) showing our back-of-house operations including what appears to be an unlocked METRC terminal and staff smoking on the premises. OCM has been tagged in replies. What do we do in the next 4 hours, do we need to proactively contact OCM before they contact us, and what legal action can we take against the former employee?`,
        expectedFocus: ['social media', 'OCM', 'proactive', 'response', 'legal', 'former employee', 'reputation'],
    },
    {
        id: 'crisis-data-breach-customer-pos',
        title: 'POS customer data breach — notification requirements',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `Our POS vendor just notified us that a security breach may have exposed transaction data for approximately 8,400 customers over the past 6 months. Data exposed may include names, email addresses, phone numbers, and purchase histories. What are our legal notification obligations under NY data breach laws, is cannabis purchase history specially protected, and what is the timeline for customer notification?`,
        expectedFocus: ['data breach', 'notification', 'NY law', 'customer', 'purchase history', 'privacy', 'timeline'],
    },
    {
        id: 'crisis-power-outage-temperature',
        title: 'Extended power outage — temperature excursion on inventory',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We had a 9-hour power outage and our temperature-controlled storage area reached 94°F for approximately 6 hours. We have 300 units of edibles (chocolate products) and 50 vape cartridges that may have been compromised. The edibles show melting/re-solidification. What are our testing obligations for temperature-excursion products, can we continue to sell them, and what METRC and OCM reporting applies to product we must destroy?`,
        expectedFocus: ['temperature', 'excursion', 'testing', 'destroy', 'METRC', 'OCM', 'edibles', 'quality'],
    },
    // CATEGORY D: Operational Deep Dives — Regulator Traps (6 cases)
    {
        id: 'ops-expired-product-on-shelf',
        title: 'Expired products discovered on retail shelf',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `During a routine shelf audit, a manager found 22 units of edibles with best-by dates from 3 weeks ago still in our retail display case. These have potentially been sold to customers since expiry. What are our immediate obligations, do we have a reporting obligation to OCM for having sold expired cannabis products, what documentation is required for the destruction of the remaining units, and what process prevents recurrence?`,
        expectedFocus: ['expired', 'destroy', 'METRC', 'OCM', 'reporting', 'documentation', 'retail'],
    },
    {
        id: 'ops-vendor-sample-policy',
        title: 'Vendor leaving product samples — compliance rules',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A licensed cannabis vendor wants to leave 5 sample units of their new concentrate line for our staff to try so we can give informed recommendations. Under NY OCM rules, what are the compliance requirements for receiving cannabis product samples, must samples be entered into METRC, does this count as a transfer under our license, and can staff consume samples at the workplace?`,
        expectedFocus: ['OCM', 'sample', 'METRC', 'transfer', 'staff', 'consumption', 'workplace'],
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
        prompt: `We have $95,000 in unredeemed gift card balances on our books from the past 3 years. Our accountant mentioned something about "escheatment" — turning unclaimed property over to the state. Does New York's unclaimed property law apply to cannabis dispensary gift cards, what is the dormancy period before funds must be remitted to the state, and can we charge dormancy fees to reduce the liability?`,
        expectedFocus: ['gift card', 'escheatment', 'unclaimed property', 'NY', 'dormancy', 'state', 'liability'],
    },
    {
        id: 'ops-employee-cannabis-use-positive-test',
        title: 'Budtender tests positive for THC — termination rules',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `A drug test we conducted after a workplace incident came back positive for THC for one of our budtenders. Under New York's cannabis employee protection laws (MRTA), can we discipline or terminate an employee for testing positive for THC on a drug test? Does it matter that they are in a safety-sensitive role, what accommodations are required, and what documentation protects us from a wrongful termination claim?`,
        expectedFocus: ['MRTA', 'employee', 'drug test', 'THC', 'termination', 'protection', 'safety-sensitive'],
    },
    {
        id: 'ops-out-of-state-id-verification',
        title: 'Out-of-state ID verification — acceptance rules',
        kind: 'non_data',
        threadType: 'operator',
        primaryAgent: 'deebo',
        prompt: `We have customers regularly presenting out-of-state IDs from Florida, Texas, and international passports. Some staff are refusing international customers due to uncertainty. What forms of ID are OCM-approved for age verification in New York, are foreign passports acceptable, what do we do if an ID appears to be altered, and does accepting out-of-state IDs create any additional compliance risk?`,
        expectedFocus: ['OCM', 'ID', 'out-of-state', 'passport', 'age verification', 'international', 'staff training'],
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

Conversation history:
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
    history: ChatMessage[]
): Promise<string> {
    const persona = PERSONAS[(personaId in PERSONAS ? personaId : 'puff') as AgentPersona] ?? PERSONAS.puff;
    const operatorOverride = `\n\nOPERATOR CONTEXT (MANDATORY — overrides all other instructions):
- You are responding to an authenticated dispensary owner/manager inside their private operator inbox.
- Role: owner/operator. NOT a demo. NOT interview mode. Full guidance required.
- TONE REQUIREMENT: Professional, clear, and actionable. Never condescending, threatening, or sarcastic. No rhetorical questions. No scolding openers.
- SELF-PROMOTION BANNED: Never suggest the operator hire you, upgrade tiers, or purchase services.
- GROUNDING REQUIREMENT: Base all advice on the context provided. Do not invent statistics, benchmarks, or regulatory citations not present in the context.
- FORMAT: Lead with the most important action. Be specific. Be direct.`;
    const systemPrompt = `${persona.systemPrompt}${operatorOverride}\n\n${threadContext}\n\nRespond as if you are inside the Thrive Syracuse operator inbox. Be grounded, specific, and launch-ready.`;
    const userMessage = `${buildConversationHistoryBlock(history)}Current user message: ${prompt}`;

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
        const response = await generateInboxResponse(threadContext, personaId, testCase.prompt, thread.messages);
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
