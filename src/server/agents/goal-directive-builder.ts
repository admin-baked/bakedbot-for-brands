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
      ? `${primaryMetric.currentValue}${primaryMetric.unit} / ${primaryMetric.targetValue}${primaryMetric.unit}`
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
