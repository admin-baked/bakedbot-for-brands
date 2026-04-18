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
        expectedFocus: ['visible rows', 'do right now', 'what data next', 'partial analysis'],
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
        title: 'Exact slow movers prompt with no data',
        kind: 'non_data',
        threadType: 'inventory_promo',
        primaryAgent: 'auto',
        prompt: 'Lets discuss our slowest movers',
        expectedFocus: ['slow movers', 'what data is needed', 'next step', 'no crash'],
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
    const systemPrompt = `${persona.systemPrompt}\n\n${threadContext}\n\nRespond as if you are inside the Thrive Syracuse operator inbox. Be grounded, specific, and launch-ready.`;
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
    const limit = limitArg ? Math.max(1, Math.min(STRESS_CASES.length, Number(limitArg))) : STRESS_CASES.length;
    const cases = STRESS_CASES.slice(0, limit);
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
