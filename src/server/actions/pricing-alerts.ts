'use server';

/**
 * Pricing Alerts Server Actions
 *
 * CRUD operations for managing pricing alert configurations.
 */

import {
  getPricingAlertConfig,
  savePricingAlertConfig,
  checkCompetitorPriceChanges,
  sendPricingAlertEmails,
  type PricingAlertConfig,
  type PricingAlert,
} from '@/server/services/pricing-alerts';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

// ============================================================================
// CONFIGURATION ACTIONS
// ============================================================================

/**
 * Get pricing alert configuration for a tenant
 */
export async function getPricingAlerts(
  tenantId: string
): Promise<{ success: boolean; data?: PricingAlertConfig; error?: string }> {
  try {
    const config = await getPricingAlertConfig(tenantId);

    if (!config) {
      // Return default configuration
      return {
        success: true,
        data: {
          tenantId,
          enabled: false,
          emailRecipients: [],
          alertThreshold: 10, // 10% change
          checkFrequency: 360, // 6 hours
          alertTypes: ['price_increase', 'price_decrease', 'price_gap'],
          quietHours: {
            start: 22, // 10pm
            end: 7, // 7am
          },
        },
      };
    }

    return { success: true, data: config };
  } catch (error) {
    logger.error('[Pricing Alerts Action] Failed to get config', { error, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get configuration',
    };
  }
}

/**
 * Update pricing alert configuration
 */
export async function updatePricingAlerts(
  config: PricingAlertConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const success = await savePricingAlertConfig(config);

    if (!success) {
      throw new Error('Failed to save configuration');
    }

    return { success: true };
  } catch (error) {
    logger.error('[Pricing Alerts Action] Failed to update config', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update configuration',
    };
  }
}

// ============================================================================
// ALERT HISTORY
// ============================================================================

/**
 * Get recent pricing alerts for a tenant
 */
export async function getRecentPricingAlerts(
  tenantId: string,
  limit: number = 50
): Promise<{ success: boolean; data?: PricingAlert[]; error?: string }> {
  try {
    const db = getAdminFirestore();

    const alertsSnap = await db
      .collection('pricing_alerts')
      .where('tenantId', '==', tenantId)
      .orderBy('triggeredAt', 'desc')
      .limit(limit)
      .get();

    const alerts: PricingAlert[] = alertsSnap.docs.map((doc) => ({
      ...doc.data(),
      triggeredAt: doc.data().triggeredAt?.toDate?.() || new Date(),
      notifiedAt: doc.data().notifiedAt?.toDate?.() || undefined,
    })) as PricingAlert[];

    return { success: true, data: alerts };
  } catch (error) {
    logger.error('[Pricing Alerts Action] Failed to get alerts', { error, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get alerts',
    };
  }
}

/**
 * Get competitor price history for a product
 */
export async function getProductPriceHistory(
  tenantId: string,
  productId: string,
  days: number = 30
): Promise<{
  success: boolean;
  data?: Array<{
    timestamp: Date;
    marketAvg: number;
    ourPrice: number;
    competitorCount: number;
    priceGapPercent: number;
  }>;
  error?: string;
}> {
  try {
    const db = getAdminFirestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const historySnap = await db
      .collection('competitor_price_history')
      .where('tenantId', '==', tenantId)
      .where('productId', '==', productId)
      .where('timestamp', '>=', cutoffDate)
      .orderBy('timestamp', 'asc')
      .get();

    const history = historySnap.docs.map((doc) => ({
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      marketAvg: doc.data().marketAvg || 0,
      ourPrice: doc.data().ourPrice || 0,
      competitorCount: doc.data().competitorCount || 0,
      priceGapPercent: doc.data().priceGapPercent || 0,
    }));

    return { success: true, data: history };
  } catch (error) {
    logger.error('[Pricing Alerts Action] Failed to get price history', { error, tenantId, productId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get price history',
    };
  }
}

// ============================================================================
// MANUAL TRIGGERS
// ============================================================================

/**
 * Manually trigger a price check (for testing)
 */
export async function triggerPriceCheck(
  tenantId: string
): Promise<{
  success: boolean;
  data?: { alerts: PricingAlert[]; emailsSent: number };
  error?: string;
}> {
  try {
    // Get configuration
    const config = await getPricingAlertConfig(tenantId);

    if (!config) {
      return {
        success: false,
        error: 'Pricing alerts not configured. Please configure alerts first.',
      };
    }

    // Check for price changes
    const alerts = await checkCompetitorPriceChanges(tenantId, config);

    // Send emails if enabled
    let emailsSent = 0;
    if (config.enabled && alerts.length > 0) {
      const result = await sendPricingAlertEmails(config, alerts);
      emailsSent = result.sent;
    }

    return {
      success: true,
      data: { alerts, emailsSent },
    };
  } catch (error) {
    logger.error('[Pricing Alerts Action] Manual trigger failed', { error, tenantId });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to trigger price check',
    };
  }
}
