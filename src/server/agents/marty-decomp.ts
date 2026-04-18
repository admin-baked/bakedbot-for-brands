/**
 * Marty — Revenue Goal Decomposition
 *
 * Takes a high-level revenue goal and decomposes it into concrete agent tasks
 * using Claude. Returns structured tasks ready to be written to agent_tasks.
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/lib/logger';
import type { CreateRevenueGoalInput, MartyDecompResult, MartyDecompTask } from '@/types/revenue-goal';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const AGENT_CAPABILITIES = `
Available business agents and their playbooks:
- marty (CEO): linkedin_outreach, email_leads, partner_outreach, pricing_analysis
- craig (Marketer): winback_campaign, product_launch_campaign, vip_appreciation, sms_blast, email_campaign
- smokey (Budtender): product_spotlight, menu_optimization, upsell_recommendations
- mrs_parker (Retention): loyalty_program, churn_prevention, reactivation_sequence
- ezal (Lookout): competitive_analysis, pricing_intelligence, market_monitoring
- pops (Analyst): revenue_report, cohort_analysis, slow_mover_report
- linus (CTO): technical_debt, performance_fix, integration_setup
`;

export async function decomposeRevenueGoal(
    input: CreateRevenueGoalInput,
    existingTaskCount: number = 0
): Promise<MartyDecompResult> {
    const now = new Date();
    const deadline = new Date(input.deadline);
    const weeksLeft = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
    const gap = input.targetMRR - input.currentMRR;
    const weeklyTarget = Math.ceil(gap / weeksLeft);

    const prompt = `You are Marty, the AI CEO of BakedBot — a cannabis industry marketing and commerce platform.

REVENUE GOAL: ${input.title}
- Current MRR: $${input.currentMRR.toLocaleString()}
- Target MRR: $${input.targetMRR.toLocaleString()}
- Gap to close: $${gap.toLocaleString()}
- Deadline: ${input.deadline} (${weeksLeft} weeks away)
- Weekly target needed: $${weeklyTarget.toLocaleString()}/week
- Existing tasks already queued: ${existingTaskCount}

${AGENT_CAPABILITIES}

Decompose this goal into 5-8 concrete agent tasks that, when executed, would close the MRR gap.
Each task must:
1. Be owned by the most appropriate business agent
2. Reference a specific playbook where possible
3. Have a realistic estimated revenue impact in USD
4. Have a clear rationale tied directly to the MRR gap

Return ONLY valid JSON matching this exact schema:
{
  "reasoning": "2-3 sentence strategy summary",
  "weeklyTarget": ${weeklyTarget},
  "estimatedTotalImpactUSD": <sum of all task impacts>,
  "tasks": [
    {
      "title": "short action title",
      "body": "2-3 sentence description of what to do and why",
      "businessAgent": "agent_name",
      "playbookId": "playbook_name or null",
      "estimatedImpactUSD": <number>,
      "priority": "critical|high|normal|low",
      "category": "feature|bug|data|other",
      "rationale": "one sentence: why this moves the MRR needle"
    }
  ]
}`;

    try {
        const msg = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = msg.content.find(b => b.type === 'text')?.text ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in Marty response');

        const result = JSON.parse(jsonMatch[0]) as MartyDecompResult;
        logger.info('[MARTY_DECOMP] Goal decomposed', {
            goal: input.title,
            taskCount: result.tasks.length,
            estimatedImpact: result.estimatedTotalImpactUSD,
        });
        return result;
    } catch (err) {
        logger.error('[MARTY_DECOMP] Decomposition failed', { error: String(err) });
        // Fallback: return a minimal set of high-value tasks
        return fallbackDecomp(input, weeklyTarget, gap);
    }
}

function fallbackDecomp(input: CreateRevenueGoalInput, weeklyTarget: number, gap: number): MartyDecompResult {
    const tasks: MartyDecompTask[] = [
        {
            title: 'Launch win-back email campaign to churned customers',
            body: 'Target customers who haven\'t purchased in 30+ days. Use Craig\'s winback playbook with personalized offers.',
            businessAgent: 'craig',
            playbookId: 'winback_campaign',
            estimatedImpactUSD: Math.round(gap * 0.15),
            priority: 'high',
            category: 'feature',
            rationale: 'Re-engaging churned customers is fastest path to MRR recovery.',
        },
        {
            title: 'LinkedIn outreach to 50 dispensary decision-makers',
            body: 'Marty to message qualified leads on LinkedIn with personalized value prop tied to their market.',
            businessAgent: 'marty',
            playbookId: 'linkedin_outreach',
            estimatedImpactUSD: Math.round(gap * 0.25),
            priority: 'critical',
            category: 'feature',
            rationale: 'Direct outreach to decision-makers converts at highest rate.',
        },
        {
            title: 'Activate loyalty program for top dispensary customers',
            body: 'Mrs. Parker to enroll top 20% of customers in loyalty tier with automated re-engagement.',
            businessAgent: 'mrs_parker',
            playbookId: 'loyalty_program',
            estimatedImpactUSD: Math.round(gap * 0.1),
            priority: 'normal',
            category: 'feature',
            rationale: 'Loyalty programs increase LTV and reduce churn.',
        },
    ];

    return {
        reasoning: `To close a $${gap.toLocaleString()} MRR gap, focus on re-engagement, new outreach, and retention simultaneously. Weekly target: $${weeklyTarget.toLocaleString()}.`,
        weeklyTarget,
        estimatedTotalImpactUSD: tasks.reduce((s, t) => s + t.estimatedImpactUSD, 0),
        tasks,
    };
}
