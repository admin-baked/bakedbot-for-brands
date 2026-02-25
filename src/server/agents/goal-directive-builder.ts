/**
 * Goal Directive Builder
 *
 * Loads active goals for an org and formats them as strategic directives
 * for injection into agent system prompts.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { OrgGoal } from '@/types/goals';
import { determineGoalStatus } from '@/types/goals';

/**
 * Load active goals for an organization
 */
export async function loadActiveGoals(orgId: string): Promise<OrgGoal[]> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('orgs')
      .doc(orgId)
      .collection('goals')
      .where('status', '==', 'active')
      .orderBy('endDate', 'asc')
      .limit(3) // Only fetch top 3 active goals
      .get();

    const goals = snapshot.docs.map(doc => {
      const data = doc.data() as Record<string, any>;
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        lastProgressUpdatedAt: data.lastProgressUpdatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate() || new Date(),
      } as OrgGoal;
    });

    return goals;
  } catch (error) {
    logger.warn('[GoalDirectiveBuilder] Failed to load active goals:', error instanceof Error ? { message: error.message } : { error });
    return [];
  }
}

/**
 * Format active goals as strategic directives for agent system prompts
 */
export function buildGoalDirectives(goals: OrgGoal[]): string {
  if (goals.length === 0) {
    return ''; // Return empty string if no goals (optional section)
  }

  const now = new Date();
  const directives = goals.map(goal => {
    const daysRemaining = Math.floor((goal.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const progressPercent = goal.progress || 0;
    const status = determineGoalStatus(progressPercent, daysRemaining);

    // Get primary metric for display
    const primaryMetric = goal.metrics[0];
    const metricDisplay = primaryMetric
      ? goal.category === 'margin'
        ? `${primaryMetric.currentValue?.toFixed?.(1) ?? primaryMetric.currentValue}% / target ${primaryMetric.targetValue}%`
        : `${primaryMetric.currentValue}${primaryMetric.unit} / ${primaryMetric.targetValue}${primaryMetric.unit}`
      : 'Not tracked';

    // Determine urgency
    const urgency = daysRemaining <= 3 ? '🔴 URGENT: ' : daysRemaining <= 7 ? '🟡 HIGH: ' : '🟢 ';

    // Build goal-specific guidance for each agent
    let agentGuidance = '';
    if (goal.category === 'foot_traffic' || goal.category === 'revenue') {
      agentGuidance = 'Focus on customer acquisition and retention campaigns. New customer promos and win-back strategies directly support this goal.';
    } else if (goal.category === 'loyalty') {
      agentGuidance = 'Prioritize loyalty program recommendations and tier advancement. Every product recommendation should consider loyalty value.';
    } else if (goal.category === 'retention') {
      agentGuidance = 'Focus on repeat purchase incentives and customer engagement. Target at-risk customers and encourage reorders.';
    } else if (goal.category === 'marketing') {
      agentGuidance = 'Optimize campaign performance metrics toward this goal. Track engagement and adjust copy/targeting for better results.';
    } else if (goal.category === 'margin') {
      const currentMargin = primaryMetric?.currentValue?.toFixed?.(1) ?? 'unknown';
      const targetMargin = primaryMetric?.targetValue ?? 20;
      const floor = Math.max(0, targetMargin - 5).toFixed(0);
      agentGuidance = `MARGIN CONSTRAINT: Current portfolio margin is ${currentMargin}%. Target is ${targetMargin}%. Do NOT recommend campaigns, discounts, or bundles that would reduce margin below ${floor}%. When suggesting promotions, prioritize high-margin products. Avoid heavily discounting products already at thin margins.`;
    }

    return `
${urgency}${goal.title} (${goal.timeframe.toUpperCase()})
   Category: ${goal.category.replace('_', ' ')}
   Progress: ${progressPercent}% (${metricDisplay})
   Days remaining: ${daysRemaining > 0 ? daysRemaining : 'DEADLINE PASSED'}
   Status: ${status}
   Guidance: ${agentGuidance}`;
  }).join('\n');

  return `
=== ACTIVE BUSINESS DIRECTIVES ===
These goals are the north star for all agent activity. Align recommendations and actions with these priorities:
${directives}
===`;
}

/**
 * Load active goals and build directive section for agent prompts
 */
export async function loadAndBuildGoalDirective(orgId: string): Promise<string> {
  const goals = await loadActiveGoals(orgId);
  return buildGoalDirectives(goals);
}

/**
 * Fetch product margin context for margin goals.
 * Returns a formatted block listing at-risk products (below target) and top-margin products.
 * Used by agents like Craig so they can enforce margin constraints in campaign recommendations.
 */
export async function fetchMarginProductContext(orgId: string, targetMarginPct: number): Promise<string> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('tenants')
      .doc(orgId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .where('cost', '>', 0)
      .limit(300)
      .get();

    if (snapshot.empty) return '';

    const products = snapshot.docs
      .map(doc => {
        const d = doc.data() as Record<string, any>;
        const price = d.price || 0;
        const cost = d.cost || 0;
        const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null;
        return { name: d.name || 'Unknown', price, cost, margin, category: d.category || '' };
      })
      .filter((p): p is typeof p & { margin: number } => p.margin !== null);

    if (products.length === 0) return '';

    const avgMargin = products.reduce((sum, p) => sum + p.margin, 0) / products.length;
    const belowTarget = products.filter(p => p.margin < targetMarginPct).sort((a, b) => a.margin - b.margin);
    const topMargin = [...products].sort((a, b) => b.margin - a.margin).slice(0, 5);
    const floor = Math.max(0, targetMarginPct - 5).toFixed(0);

    let context = `\n=== PRODUCT MARGIN INTELLIGENCE ===\n`;
    context += `Portfolio margin: ${avgMargin.toFixed(1)}% avg across ${products.length} products with COGS data\n`;
    context += `Margin target: ${targetMarginPct}% | Hard floor for promotions: ${floor}%\n`;

    if (belowTarget.length > 0) {
      context += `\nAt-risk products (margin below ${targetMarginPct}%) — avoid heavy discounting:\n`;
      belowTarget.slice(0, 8).forEach(p => {
        context += `  • ${p.name} (${p.category}): $${p.price.toFixed(2)} retail / $${p.cost.toFixed(2)} cost → ${p.margin.toFixed(0)}% margin\n`;
      });
    }

    if (topMargin.length > 0) {
      context += `\nHighest-margin products — prioritize in campaigns and upsells:\n`;
      topMargin.forEach(p => {
        context += `  • ${p.name} (${p.category}): ${p.margin.toFixed(0)}% margin\n`;
      });
    }

    context += `\nMARGIN RULE: Before recommending any discount or bundle, verify it keeps margin above ${floor}%. Flag deals that push below this floor.\n===`;
    return context;
  } catch (error) {
    logger.warn('[GoalDirectiveBuilder] Failed to fetch margin product context:', error instanceof Error ? { message: error.message } : { error });
    return '';
  }
}
