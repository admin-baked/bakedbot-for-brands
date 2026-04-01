/**
 * Skill Prompt Builder
 *
 * Produces a structured prompt string that an agent would execute to generate
 * the skill output. Returns the prompt + metadata — the actual LLM call is
 * the agent's job, keeping this service testable without hitting model APIs.
 */

import { logger } from '@/lib/logger';
import type { SkillSignal } from '@/types/skill-signal';
import type { SkillRegistryEntry } from '@/server/services/skill-registry';
import type { SkillContextBundle } from '@/server/services/skill-context-assembler';

// ============ Output ============

export interface SkillPromptResult {
    prompt: string;
    estimatedTokens: number;
    skillName: string;
    contextSummary: string;
}

// ============ Main builder ============

export function buildSkillPrompt(
    context: SkillContextBundle,
    skill: SkillRegistryEntry,
    signal: SkillSignal
): SkillPromptResult {
    const basePrompt = buildBasePrompt(context, skill, signal);
    const skillSpecific = buildSkillSpecificInstructions(skill.skillName, context);

    const prompt = [basePrompt, skillSpecific].filter(Boolean).join('\n\n');
    const estimatedTokens = Math.ceil(prompt.length / 4);

    logger.info('[skill-prompt-builder] built', {
        skillName: skill.skillName,
        estimatedTokens,
        orgId: context.orgId,
    });

    return {
        prompt,
        estimatedTokens,
        skillName: skill.skillName,
        contextSummary: buildContextSummary(context),
    };
}

// ============ Base prompt (all skills) ============

function buildBasePrompt(
    context: SkillContextBundle,
    skill: SkillRegistryEntry,
    signal: SkillSignal
): string {
    const userRequest = signal.kind === 'user_intent' ? signal.userMessage : null;
    const alertContext = signal.kind === 'proactive_alert'
        ? `\nAlert severity: ${signal.severity}. Alert data: ${JSON.stringify(signal.alertData ?? {})}`
        : '';

    return `You are ${skill.agentOwner}, executing the ${skill.skillName} skill.
Org ID: ${context.orgId}
Signal kind: ${signal.kind}
${userRequest ? `User request: ${userRequest}` : ''}${alertContext}
Approval posture: ${skill.approvalPosture} — this determines what you are authorized to do.
Risk level: ${skill.riskLevel}

Org profile:
${context.orgProfile ? JSON.stringify(context.orgProfile, null, 2) : '(not available)'}`;
}

// ============ Skill-specific prompt instructions ============

function buildSkillSpecificInstructions(skillName: string, context: SkillContextBundle): string {
    switch (skillName) {
        case 'daily-dispensary-ops-review':
            return buildDailyOpsPrompt(context);
        case 'competitive-intel':
            return buildCompetitiveIntelPrompt(context);
        case 'competitor-promo-watch':
            return buildCompetitorPromoPrompt(context);
        case 'loyalty-reengagement-opportunity-review':
            return buildLoyaltyReengagementPrompt(context);
        case 'menu-gap-analysis':
            return buildMenuGapPrompt(context);
        case 'inventory-aging-risk-review':
            return buildInventoryAgingPrompt(context);
        case 'retail-account-opportunity-review':
            return buildRetailAccountPrompt(context);
        case 'sell-through-partner-analysis':
            return buildPartnerVelocityPrompt(context);
        case 'low-performing-promo-diagnosis':
            return buildPromoDiagnosisPrompt(context);
        case 'craig-campaign':
            return buildCampaignPrompt(context);
        default:
            return `Analyze the provided context and produce a structured output following the ${skillName} skill methodology.`;
    }
}

function buildDailyOpsPrompt(context: SkillContextBundle): string {
    const orders = context.businessObjects.recentOrders ?? [];
    const promos = context.businessObjects.activePromos ?? [];
    return `Review yesterday's store performance across 5 dimensions: revenue/traffic, menu, promos, loyalty, anomalies.

Recent orders (${Array.isArray(orders) ? orders.length : 0} records):
${JSON.stringify(orders, null, 2)}

Active promotions (${Array.isArray(promos) ? promos.length : 0}):
${JSON.stringify(promos, null, 2)}

Produce an ops_memo artifact: 200–350 words, structured by dimension, ending with one suggested focus.`;
}

function buildCompetitiveIntelPrompt(context: SkillContextBundle): string {
    const snapshots = context.businessObjects.competitorSnapshots ?? [];
    return `Analyze competitor data and produce a ranked threat report.

Competitor snapshots (${Array.isArray(snapshots) ? snapshots.length : 0} records):
${JSON.stringify(snapshots, null, 2)}

Classify threats: P0 = >15% undercut on top SKU, P1 = 5–15% gap or new competitor <5 miles, P2 = <5% or new entrant.
Threat score = price_gap_pct × sku_revenue_rank (for ranking only — P0/P1/P2 thresholds are the hard gate).
Only report data actually retrieved. No fabricated prices.`;
}

function buildCompetitorPromoPrompt(context: SkillContextBundle): string {
    const snapshots = context.businessObjects.competitorSnapshots ?? [];
    return `Monitor competitor promotions and flag active threats.

Competitor data:
${JSON.stringify(snapshots, null, 2)}

Focus on promo-specific signals: BOGO, percentage discounts, loyalty double-points, flash sales.
Only include opportunities section if no P0 threat is active.`;
}

function buildLoyaltyReengagementPrompt(context: SkillContextBundle): string {
    const customers = context.businessObjects.loyaltyCustomers ?? [];
    return `Analyze loyalty customer tier velocity and identify reengagement opportunities.

Loyalty customers (${Array.isArray(customers) ? customers.length : 0} records):
${JSON.stringify(customers, null, 2)}

Produce a campaign_brief (not campaign copy — Craig writes copy). Include: goal, segment, suggested channels, audience size, rationale, suggested offer, urgency level.`;
}

function buildMenuGapPrompt(context: SkillContextBundle): string {
    const products = context.businessObjects.activeProducts ?? [];
    return `Identify product gaps in the current menu with local demand signals.

Current menu (${Array.isArray(products) ? products.length : 0} active products):
${JSON.stringify(products, null, 2)}

Use 3-signal demand validation: competitor velocity, customer requests, category trends.
Score gaps: Priority 1 = strong demand signal + competitor carry, Priority 2 = moderate signal, Priority 3 = trend-only.`;
}

function buildInventoryAgingPrompt(context: SkillContextBundle): string {
    const batches = context.businessObjects.inventoryBatches ?? [];
    return `Review inventory aging risk using the dual clock model.

Inventory batches (${Array.isArray(batches) ? batches.length : 0}):
${JSON.stringify(batches, null, 2)}

Quality clock: 🟢 <30 days, 🟡 31–60, 🟠 61–90, 🔴 90+ (flower). Track COA expiry independently.
Revenue at risk = uncommitted units × wholesale price.
Flag any batch requiring disposal for always_escalate — never recommend disposal autonomously.`;
}

function buildRetailAccountPrompt(context: SkillContextBundle): string {
    const accounts = context.businessObjects.retailAccounts ?? [];
    return `Score retail accounts using the 2×2 tier model.

Retail accounts (${Array.isArray(accounts) ? accounts.length : 0}):
${JSON.stringify(accounts, null, 2)}

Tiers: Scale (high current + high potential), Fix (low current + high potential), Maintain (high current + low potential), Deprioritize (low + low).
For each account: assign tier, current performance summary, untapped potential, recommended action.`;
}

function buildPartnerVelocityPrompt(context: SkillContextBundle): string {
    const partners = context.businessObjects.partners ?? [];
    return `Analyze distribution partner velocity and sell-through performance.

Partners (${Array.isArray(partners) ? partners.length : 0}):
${JSON.stringify(partners, null, 2)}

Tiers: Grow (high velocity + growth trend), Maintain (steady), Develop (underperforming + high potential), Review (low + declining).
Flag if aged stock routing should be suggested based on inventory aging data.`;
}

function buildPromoDiagnosisPrompt(context: SkillContextBundle): string {
    const promo = context.businessObjects.promo;
    return `Diagnose why this promotion is underperforming using 4-layer analysis.

Promotion data:
${JSON.stringify(promo, null, 2)}

Layers: Delivery (reach, timing), Audience (segment match), Offer (discount depth, product fit), Copy (message clarity, CTA).
Verdict: retest (fixable) or abandon (structural failure). Provide one concrete next step.`;
}

function buildCampaignPrompt(context: SkillContextBundle): string {
    const campaignContext = context.businessObjects.campaignContext ?? {};
    return `Design a marketing campaign using the Craig campaign skill methodology.

Campaign context:
${JSON.stringify(campaignContext, null, 2)}

GM elasticity rule: −0.4% gross margin per percentage point of discount. Hard stop at 8% impact.
Required: 3 copy variations (Professional, Hype, Educational). Compliance check required before draft creation.
Output: campaign_draft_bundle with margin check, compliance status, and reviewer note.`;
}

// ============ Context summary ============

function buildContextSummary(context: SkillContextBundle): string {
    const keys = Object.keys(context.businessObjects);
    const counts = keys.map(k => {
        const val = context.businessObjects[k];
        return `${k}: ${Array.isArray(val) ? val.length : (val ? 1 : 0)}`;
    });
    return `orgId=${context.orgId} | ${counts.join(', ')}`;
}
