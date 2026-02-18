'use server';

/**
 * Playbook Revenue Attribution
 *
 * Track revenue impact of playbook executions
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export interface PlaybookRevenue {
  playbookId: string;
  playbookName: string;
  totalExecutions: number;
  attributedOrders: number;
  attributionRate: number; // orders / executions
  totalRevenue: number;
  avgOrderValue: number;
  attributionWindowDays: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface TemplateROI {
  templateId: string;
  templateName: string;
  totalExecutions: number;
  attributedOrders: number;
  attributedRevenue: number;
  roi: number; // revenue / (executions * cost per execution)
  costPerExecution: number;
  revenuePerExecution: number;
  tier: string;
}

/**
 * Record a playbook execution for attribution
 */
export async function recordPlaybookExecution(
  playbookId: string,
  orgId: string,
  templateId: string,
  customerId: string
) {
  try {
    const { firestore } = await createServerClient();

    await firestore.collection('playbook_attribution').add({
      playbookId,
      templateId,
      orgId,
      customerId,
      executedAt: new Date().toISOString(),
      attributionWindowEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      attributedRevenue: 0,
      attributedOrders: [],
      status: 'pending', // pending → attributed → completed
    });

    logger.info('[RevenueAttribution] Execution recorded', {
      playbookId,
      templateId,
      customerId,
    });
  } catch (err) {
    logger.warn('[RevenueAttribution] Failed to record execution', {
      playbookId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Process order and attribute to playbooks
 * Called when order is created
 */
export async function attributeOrderToPlaybooks(
  orderId: string,
  customerId: string,
  orderTotal: number,
  orgId: string
) {
  try {
    const { firestore } = await createServerClient();

    logger.info('[RevenueAttribution] Processing order attribution', {
      orderId,
      customerId,
      orderTotal,
    });

    // Find recent playbook executions for this customer
    const attributionSnap = await firestore
      .collection('playbook_attribution')
      .where('customerId', '==', customerId)
      .where('orgId', '==', orgId)
      .where('status', 'in', ['pending', 'attributed'])
      .where('attributionWindowEnd', '>=', new Date().toISOString())
      .orderBy('executedAt', 'desc')
      .limit(10)
      .get();

    if (attributionSnap.size === 0) {
      logger.info('[RevenueAttribution] No playbooks to attribute to');
      return;
    }

    // Distribute revenue across all playbooks within attribution window
    const revenuePerPlaybook = orderTotal / attributionSnap.size;

    for (const doc of attributionSnap.docs) {
      const attribution = doc.data();

      await doc.ref.update({
        attributedRevenue: (attribution.attributedRevenue || 0) + revenuePerPlaybook,
        attributedOrders: [...(attribution.attributedOrders || []), orderId],
        status: 'attributed',
        lastAttributedAt: new Date().toISOString(),
      });
    }

    logger.info('[RevenueAttribution] Order attributed', {
      orderId,
      playbookCount: attributionSnap.size,
      totalRevenue: orderTotal,
    });
  } catch (err) {
    logger.error('[RevenueAttribution] Error attributing order', {
      orderId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Get revenue metrics for a playbook
 */
export async function getPlaybookRevenue(
  playbookId: string,
  startDate: Date,
  endDate: Date
): Promise<PlaybookRevenue | null> {
  try {
    const { firestore } = await createServerClient();

    const attributionSnap = await firestore
      .collection('playbook_attribution')
      .where('playbookId', '==', playbookId)
      .where('executedAt', '>=', startDate.toISOString())
      .where('executedAt', '<=', endDate.toISOString())
      .get();

    if (attributionSnap.size === 0) {
      return null;
    }

    let totalRevenue = 0;
    let attributedOrders = 0;

    for (const doc of attributionSnap.docs) {
      const data = doc.data();
      totalRevenue += data.attributedRevenue || 0;
      attributedOrders += (data.attributedOrders || []).length;
    }

    return {
      playbookId,
      playbookName: playbookId,
      totalExecutions: attributionSnap.size,
      attributedOrders,
      attributionRate: attributionSnap.size > 0 ? attributedOrders / attributionSnap.size : 0,
      totalRevenue,
      avgOrderValue: attributedOrders > 0 ? totalRevenue / attributedOrders : 0,
      attributionWindowDays: 7,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  } catch (err) {
    logger.error('[RevenueAttribution] Error fetching revenue', {
      playbookId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Get ROI metrics for template across all orgs
 */
export async function getTemplateROI(
  templateId: string,
  days: number = 30
): Promise<TemplateROI | { error: string }> {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { firestore } = await createServerClient();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all playbook executions for this template
    const execSnap = await firestore
      .collectionGroup('playbook_executions')
      .where('playbookTemplateId', '==', templateId)
      .where('startedAt', '>=', startDate.toISOString())
      .get();

    // Get attributed revenue
    const attributionSnap = await firestore
      .collection('playbook_attribution')
      .where('templateId', '==', templateId)
      .where('executedAt', '>=', startDate.toISOString())
      .get();

    let totalRevenue = 0;
    let attributedOrderCount = 0;

    for (const doc of attributionSnap.docs) {
      const data = doc.data();
      totalRevenue += data.attributedRevenue || 0;
      attributedOrderCount += (data.attributedOrders || []).length;
    }

    const totalExecutions = execSnap.size;
    const costPerExecution = 0.05; // $0.05 per execution (estimated)
    const totalCost = totalExecutions * costPerExecution;
    const roi = totalCost > 0 ? (totalRevenue - totalCost) / totalCost : 0;

    logger.info('[RevenueAttribution] ROI calculated', {
      templateId,
      totalExecutions,
      attributedOrders: attributedOrderCount,
      totalRevenue,
      roi: (roi * 100).toFixed(1) + '%',
    });

    return {
      templateId,
      templateName: templateId,
      totalExecutions,
      attributedOrders: attributedOrderCount,
      attributedRevenue: totalRevenue,
      roi,
      costPerExecution,
      revenuePerExecution: totalExecutions > 0 ? totalRevenue / totalExecutions : 0,
      tier: 'unknown', // Would be fetched from template metadata
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[RevenueAttribution] Error calculating ROI', { error: errorMsg });
    return { error: errorMsg };
  }
}
