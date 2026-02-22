/**
 * Goal Progress Generator
 *
 * Proactive service that:
 * 1. Loads all active goals for an org
 * 2. Calculates current metric values from real data (orders, campaigns, customers)
 * 3. Updates goal progress and status in Firestore
 * 4. Returns updated goals for further processing
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { OrgGoal, GoalMetric } from '@/types/goals';
import { calculateGoalProgress, determineGoalStatus } from '@/types/goals';

export class GoalProgressGenerator {
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
  }

  /**
   * Update all active goals for the organization
   */
  async updateGoalProgress(): Promise<OrgGoal[]> {
    try {
      const db = getAdminFirestore();

      // Load all active goals
      const goalsSnapshot = await db
        .collection('orgs')
        .doc(this.orgId)
        .collection('goals')
        .where('status', '==', 'active')
        .get();

      const updatedGoals: OrgGoal[] = [];
      const now = new Date();

      // Process each goal
      for (const goalDoc of goalsSnapshot.docs) {
        try {
          const goalData = goalDoc.data() as Record<string, any>;
          const goal = {
            ...goalData,
            id: goalDoc.id,
            createdAt: goalData.createdAt?.toDate() || new Date(),
            updatedAt: goalData.updatedAt?.toDate() || new Date(),
            lastProgressUpdatedAt: goalData.lastProgressUpdatedAt?.toDate() || new Date(),
            startDate: goalData.startDate?.toDate() || new Date(),
            endDate: goalData.endDate?.toDate() || new Date(),
          } as OrgGoal;

          // Calculate current metric values from real data
          const updatedMetrics = await this.updateMetricsFromData(goal);

          // Recalculate progress and status
          const updatedProgress = calculateGoalProgress(updatedMetrics);
          const daysRemaining = Math.floor((goal.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const updatedStatus = determineGoalStatus(updatedProgress, daysRemaining);

          // Save updated progress to Firestore
          await db
            .collection('orgs')
            .doc(this.orgId)
            .collection('goals')
            .doc(goal.id)
            .update({
              metrics: updatedMetrics,
              progress: updatedProgress,
              status: updatedStatus,
              lastProgressUpdatedAt: now,
            });

          updatedGoals.push({
            ...goal,
            metrics: updatedMetrics,
            progress: updatedProgress,
            status: updatedStatus,
            lastProgressUpdatedAt: now,
          });

          logger.debug('[GoalProgressGenerator] Updated goal progress', {
            goalId: goal.id,
            progress: updatedProgress,
            status: updatedStatus,
          });
        } catch (error) {
          logger.error('[GoalProgressGenerator] Error processing goal', {
            goalId: goalDoc.id,
            error: error instanceof Error ? { message: error.message } : { error },
          });
        }
      }

      return updatedGoals;
    } catch (error) {
      logger.error('[GoalProgressGenerator] Error updating goal progress', {
        orgId: this.orgId,
        error: error instanceof Error ? { message: error.message } : { error },
      });
      return [];
    }
  }

  /**
   * Update goal metrics based on real data from orders, campaigns, customers
   */
  private async updateMetricsFromData(goal: OrgGoal): Promise<GoalMetric[]> {
    const db = getAdminFirestore();
    const now = new Date();

    const updatedMetrics = await Promise.all(
      goal.metrics.map(async metric => {
        let currentValue = metric.currentValue;

        try {
          // Load data based on goal category
          if (goal.category === 'foot_traffic') {
            // Count new customers since goal start
            const customersSnapshot = await db
              .collection('orgs')
              .doc(this.orgId)
              .collection('customers')
              .where('firstOrderDate', '>=', goal.startDate)
              .where('firstOrderDate', '<=', now)
              .count()
              .get();
            currentValue = customersSnapshot.data().count;
          } else if (goal.category === 'revenue') {
            // Sum revenue from orders since goal start
            const ordersSnapshot = await db
              .collection('orgs')
              .doc(this.orgId)
              .collection('orders')
              .where('createdAt', '>=', goal.startDate)
              .where('createdAt', '<=', now)
              .get();

            currentValue = ordersSnapshot.docs.reduce((sum, doc) => {
              const data = doc.data() as Record<string, any>;
              return sum + (data.total || 0);
            }, 0);
          } else if (goal.category === 'loyalty') {
            // Count loyalty members enrolled since goal start
            const customersSnapshot = await db
              .collection('orgs')
              .doc(this.orgId)
              .collection('customers')
              .where('loyaltyEnrolledAt', '>=', goal.startDate)
              .where('loyaltyEnrolledAt', '<=', now)
              .count()
              .get();
            currentValue = customersSnapshot.data().count;
          } else if (goal.category === 'retention') {
            // Calculate repeat purchase rate from customer data
            const customersSnapshot = await db
              .collection('orgs')
              .doc(this.orgId)
              .collection('customers')
              .limit(1000)
              .get();

            const customers = customersSnapshot.docs.map(doc => doc.data() as Record<string, any>);
            const repeatCount = customers.filter(c => (c.orderCount || 0) > 1).length;
            currentValue = customers.length > 0 ? Math.round((repeatCount / customers.length) * 100) : 0;
          } else if (goal.category === 'marketing') {
            // Calculate average campaign open rate since goal start
            const campaignsSnapshot = await db
              .collection('orgs')
              .doc(this.orgId)
              .collection('campaigns')
              .where('sentAt', '>=', goal.startDate)
              .where('sentAt', '<=', now)
              .limit(10)
              .get();

            const campaigns = campaignsSnapshot.docs.map(doc => doc.data() as Record<string, any>);
            if (campaigns.length > 0) {
              const totalOpenRate = campaigns.reduce((sum, c) => sum + (c.performance?.openRate || 0), 0);
              currentValue = Math.round((totalOpenRate / campaigns.length) * 100) / 100;
            }
          }
        } catch (error) {
          logger.warn('[GoalProgressGenerator] Failed to update metric, keeping current value', {
            metric: metric.key,
            error: error instanceof Error ? { message: error.message } : { error },
          });
        }

        return {
          ...metric,
          currentValue,
        };
      })
    );

    return updatedMetrics;
  }
}
