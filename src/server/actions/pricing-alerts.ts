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
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

function isSuperRole(role: unknown): boolean {
  return role === 'super_user' || role === 'super_admin';
}

function isValidDocumentId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 3 &&
    value.length <= 128 &&
    !/[\/\\?#\[\]]/.test(value)
  );
}

function clampLimit(limit: number, fallback: number, max: number): number {
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(max, Math.max(1, Math.floor(limit)));
}

function clampDays(days: number, fallback: number): number {
  if (!Number.isFinite(days)) return fallback;
  return Math.min(365, Math.max(1, Math.floor(days)));
}

function getActorOrgId(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null;
  const token = user as {
    currentOrgId?: string;
    orgId?: string;
    brandId?: string;
    tenantId?: string;
    organizationId?: string;
  };
  return (
    token.currentOrgId ||
    token.orgId ||
    token.brandId ||
    token.tenantId ||
    token.organizationId ||
    null
  );
}

async function assertTenantAccess(tenantId: string): Promise<void> {
  const user = await requireUser();
  const role = typeof user === 'object' && user ? (user as { role?: string }).role : null;
  if (isSuperRole(role)) {
    return;
  }

  const actorOrgId = getActorOrgId(user);
  if (!actorOrgId || actorOrgId !== tenantId) {
    throw new Error('Unauthorized');
  }
}

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
    if (!isValidDocumentId(tenantId)) {
      return { success: false, error: 'Invalid tenant ID' };
    }
    await assertTenantAccess(tenantId);
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
    if (!isValidDocumentId(config.tenantId)) {
      return { success: false, error: 'Invalid tenant ID' };
    }
    await assertTenantAccess(config.tenantId);
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
    if (!isValidDocumentId(tenantId)) {
      return { success: false, error: 'Invalid tenant ID' };
    }
    const safeLimit = clampLimit(limit, 50, 500);
    await assertTenantAccess(tenantId);
    const db = getAdminFirestore();

    const alertsSnap = await db
      .collection('pricing_alerts')
      .where('tenantId', '==', tenantId)
      .orderBy('triggeredAt', 'desc')
      .limit(safeLimit)
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
    if (!isValidDocumentId(tenantId)) {
      return { success: false, error: 'Invalid tenant ID' };
    }
    if (!isValidDocumentId(productId)) {
      return { success: false, error: 'Invalid product ID' };
    }
    const safeDays = clampDays(days, 30);
    await assertTenantAccess(tenantId);
    const db = getAdminFirestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - safeDays);

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
    if (!isValidDocumentId(tenantId)) {
      return { success: false, error: 'Invalid tenant ID' };
    }
    await assertTenantAccess(tenantId);
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
