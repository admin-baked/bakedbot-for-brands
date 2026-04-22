/**
 * Intent Router
 *
 * Maps free-text user input to the canonical agent that owns that domain.
 * Used to resolve 'auto' agent threads — routes the first message to the
 * right specialist instead of falling through to the generic puff agent.
 *
 * No LLM required. Pure keyword matching with priority-ordered rules.
 *
 * Usage:
 *   getAgentForIntent("spy on competitor pricing near me")  → 'ezal'
 *   getAgentForIntent("who churned this month?")            → 'mrs_parker'
 *   getAgentForIntent("write a campaign for 420")           → 'craig'
 *   getAgentForIntent("what is the margin on this SKU?")    → 'money_mike'
 */

import type { AgentId } from './registry';

/** Intent rule — ordered by priority (first match wins) */
interface IntentRule {
    agentId: AgentId;
    patterns: RegExp[];
}

/**
 * Rules are evaluated in order. Higher-specificity patterns should come first.
 * Add synonyms liberally — false positives are better than wrong routing.
 */
const INTENT_RULES: IntentRule[] = [
    // ── Compliance / Legal ──────────────────────────────────────────────────
    {
        agentId: 'deebo',
        patterns: [
            /\b(compli(ance|ant)|regulat(ion|ory|ed)|legal|law|audit|policy|policies|violation|banned|restricted|age.?gate|age.?verif|age.?check|health.?claim|disclaimer|flag)\b/i,
            /\b(deebo|scan.*risk|risk.*scan|review.*content|content.*review|out.of.compli)\b/i,
        ],
    },

    // ── Competitive Intelligence / Market Research ───────────────────────────
    {
        agentId: 'ezal',
        patterns: [
            /\b(compet(itor|itive|ition)|spy|rival|market.?(scan|research|intel)|pricing.*near|near.*pricing|who.*deal|deal.*who|dispens(ary|aries).*pric|pric.*dispens)\b/i,
            /\b(ezal|competitive.?intel|intelligence|market.?opportunit|external.*research|research.*external|distribution.*target|dispensar.*target|retail.*partner)\b/i,
            /\b(what.?s.*trending|trend.*cannabis|industry.*trend|market.*trend)\b/i,
        ],
    },

    // ── Analytics / Goals / Reporting ────────────────────────────────────────
    {
        agentId: 'pops',
        patterns: [
            /\b(analytic|report|goal|metric|dashb|funnel|retention.?(rate|report)|revenue|churn.?(rate|report|analytic)|performance|forecast|KPI|insight.*data|data.*insight)\b/i,
            /\b(pops|mrr|arr|ltv|cohort|conversion.?rate|click.?through|open.?rate|roi|roas)\b/i,
            /\b(last (month|quarter|week|year).*revenue|revenue.*(last|this) (month|quarter|week))\b/i,
            /\b(lifecycle|life.?cycle|customer.*journey|journey.*customer|visit|returning.*customer|customer.*return|drop.?off|dropout|fall.?off|where.*losing|losing.*customer)\b/i,
            /\b(first.*visit|second.*visit|third.*visit|\d+.?visit|visit.*frequen|visit.*count|repeat.*purchas|purchas.*repeat|purchase.*pattern|trend.*data|data.*trend)\b/i,
            /\b(last (3|6|12|two|three|six|twelve|nine).?(month|months|week|weeks|quarter|quarters))\b/i,
            /\b(pull.*data|data.*pull|show.*data|data.*show|breakdown|break.*down|by percent|percent.*breakdown|where.*customer|how.*customer)\b/i,
        ],
    },

    // ── Loyalty / CRM / Retention ────────────────────────────────────────────
    {
        agentId: 'mrs_parker',
        patterns: [
            /\b(loyalt|crm|vip|segment|retention|churn.*customer|customer.*churn|re.?engag|reactivat|dormant.*customer|customer.*dormant|laps|winback|win.?back|points|reward|referral)\b/i,
            /\b(mrs.?parker|parker|customer.?success|who (is|are|has) (at risk|churn)|at.?risk.*customer)\b/i,
        ],
    },

    // ── Pricing / Margin / Bundles / Profitability ───────────────────────────
    {
        agentId: 'money_mike',
        patterns: [
            /\b(pric(e|ing)|margin|gross.?margin|profit(abilit)?|bundle|upsell|up.?sell|cost|cost.?of.?goods|cogs|markup|discount|deal.*creat|creat.*deal|slow.?mov|highest.?margin|lowest.?margin|sku.*margin|margin.*sku|unit.?cost|cost.?\/.?unit|days.?on.?hand)\b/i,
            /\b(money.?mike|mike|financ|billing|revenue.?optim|optim.*revenue|monetiz)\b/i,
        ],
    },

    // ── Campaigns / Creative / Marketing ─────────────────────────────────────
    {
        agentId: 'craig',
        patterns: [
            /\b(campaign|creative|content|copy|email|sms|text.*messag|messag.*text|subject.?line|hero.?banner|banner|playbook|launch|promo|promotion|announce|blast|broadcast|draft.*message|message.*draft)\b/i,
            /\b(craig|marketer|vibe.*studio|studio.*vibe|brand.*voice|voice.*brand|write.*post|post.*write|generate.*caption|caption.*generat)\b/i,
        ],
    },

    // ── Menu / Products / Commerce ────────────────────────────────────────────
    {
        agentId: 'smokey',
        patterns: [
            /\b(menu|product|strain|flower|edible|vape|concentrate|tincture|topical|pre.?roll|cart|cartridge|recomm|budtend|inventory|stock|in.?stock|out.?of.?stock|what.*carry|carry.*what|find.*product|product.*find)\b/i,
            /\b(smokey|budtender|cannabis.*concierge|concierge.*cannabis|shop|order|add.*cart)\b/i,
        ],
    },
];

/**
 * Returns the best agent for a given user input string.
 * Returns null when no rule matches — let the caller decide the fallback.
 */
export function getAgentForIntent(input: string): AgentId | null {
    const text = input.trim();
    if (!text) return null;

    for (const rule of INTENT_RULES) {
        if (rule.patterns.some(p => p.test(text))) {
            return rule.agentId;
        }
    }

    return null;
}

/**
 * Returns the best inbox-compatible specialist for the input.
 * If nothing matches, preserve the caller's fallback (for example `auto`)
 * so the request can continue through the general assistant path.
 */
export function resolveInboxAgent<TFallback extends string = 'auto'>(
    input: string,
    fallback?: TFallback
): AgentId | TFallback {
    const fallbackValue = (fallback ?? 'auto') as TFallback;
    return getAgentForIntent(input) ?? fallbackValue;
}

const INBOX_HANDOFF_CUE_PATTERNS = [
    /\?$/,
    /^(what|who|which|where|when|why|how)\b/i,
    /\b(show|analy[sz]e|calculate|break\s*down|report|review|pull|find|list|compare)\b/i,
    /\b(avg|average|total|rate|count|revenue|ltv|customer|customers|sales|orders|cogs|margin|segment|segments|churn|retention|competitor|pricing)\b/i,
];

const CRM_CUSTOMER_DETAIL_PATTERNS = [
    /\b(this|that|the)\s+customer\b/i,
    /\bcustomer\s+(has|have|shopped|spent|ordered|bought)\b/i,
    /\b(has|have|did)\s+(this|that|the)\s+customer\b/i,
];

export interface InboxThreadAgentResolution<TFallback extends string = 'auto'> {
    agentId: AgentId | TFallback;
    matchedAgent: AgentId | null;
    didHandoff: boolean;
    reason: string;
}

/**
 * Resolves the best agent for a message inside an existing inbox thread.
 *
 * Existing threads often have a fixed primary agent. For direct questions with
 * a clear specialist owner, we allow a handoff so a revenue question in an Ezal
 * market thread can reach Pops instead of going through the wrong agent planner.
 */
export function resolveInboxThreadAgent<TFallback extends string = 'auto'>(
    input: string,
    currentAgent: string,
    fallback?: TFallback,
): InboxThreadAgentResolution<TFallback> {
    const fallbackValue = (fallback ?? 'auto') as TFallback;
    const matchedAgent = getAgentForIntent(input);

    if (!matchedAgent) {
        return {
            agentId: currentAgent === 'auto' ? fallbackValue : currentAgent as AgentId | TFallback,
            matchedAgent: null,
            didHandoff: false,
            reason: 'No deterministic specialist matched the message.',
        };
    }

    if (currentAgent === 'auto') {
        return {
            agentId: matchedAgent,
            matchedAgent,
            didHandoff: true,
            reason: 'Auto thread resolved from message intent.',
        };
    }

    if (matchedAgent === currentAgent) {
        return {
            agentId: matchedAgent,
            matchedAgent,
            didHandoff: false,
            reason: 'Current agent already owns the matched intent.',
        };
    }

    if (
        currentAgent === 'mrs_parker'
        && matchedAgent === 'pops'
        && CRM_CUSTOMER_DETAIL_PATTERNS.some(pattern => pattern.test(input.trim()))
    ) {
        return {
            agentId: currentAgent as AgentId | TFallback,
            matchedAgent,
            didHandoff: false,
            reason: 'Customer-detail question stays with the CRM relationship agent.',
        };
    }

    const hasHandoffCue = INBOX_HANDOFF_CUE_PATTERNS.some(pattern => pattern.test(input.trim()));
    if (!hasHandoffCue) {
        return {
            agentId: currentAgent as AgentId | TFallback,
            matchedAgent,
            didHandoff: false,
            reason: 'Matched intent lacked a strong handoff cue.',
        };
    }

    return {
        agentId: matchedAgent,
        matchedAgent,
        didHandoff: true,
        reason: `Message intent matched ${matchedAgent} instead of current ${currentAgent}.`,
    };
}
