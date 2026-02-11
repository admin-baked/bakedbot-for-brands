/**
 * Dynamic Pricing Alert Service
 *
 * Monitors competitor price changes and sends email alerts to dispensary managers.
 * Integrates with Ezal competitor pricing and Mailjet email service.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { getCompetitorPricing } from './ezal/competitor-pricing';
import type { CompetitorPriceData } from '@/types/dynamic-pricing';

export interface PricingAlert {
  id: string;
  tenantId: string;
  productId: string;
  productName: string;
  alertType: 'price_increase' | 'price_decrease' | 'new_competitor' | 'price_gap';
  threshold: number; // Percentage change to trigger alert
  oldPrice?: number;
  newPrice?: number;
  competitorCount: number;
  marketAvg: number;
  ourPrice: number;
  priceGapPercent: number;
  triggeredAt: Date;
  notifiedAt?: Date;
}

export interface PricingAlertConfig {
  tenantId: string;
  enabled: boolean;
  emailRecipients: string[];
  alertThreshold: number; // % change (e.g., 10 = 10% change triggers alert)
  checkFrequency: number; // minutes
  alertTypes: Array<PricingAlert['alertType']>;
  quietHours?: {
    start: number; // 0-23
    end: number; // 0-23
  };
}

// ============================================================================
// PRICE MONITORING
// ============================================================================

/**
 * Check for significant competitor price changes
 */
export async function checkCompetitorPriceChanges(
  tenantId: string,
  config: PricingAlertConfig
): Promise<PricingAlert[]> {
  const db = getAdminFirestore();
  const alerts: PricingAlert[] = [];

  try {
    // Get all products for this tenant
    const productsSnap = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('publicViews')
      .doc('products')
      .collection('items')
      .where('inStock', '==', true)
      .limit(100) // Monitor top 100 products
      .get();

    logger.info('[Pricing Alerts] Checking price changes', {
      tenantId,
      productCount: productsSnap.size,
    });

    // Check each product's competitor pricing
    for (const productDoc of productsSnap.docs) {
      const product = productDoc.data();
      const productId = productDoc.id;
      const productName = product.name || 'Unknown Product';
      const ourPrice = product.price || 0;

      // Get competitor pricing
      const competitorData = await getCompetitorPricing(productName, tenantId);

      if (competitorData.length === 0) {
        continue; // No competitor data available
      }

      // Calculate market average
      const marketAvg = competitorData.reduce((sum, c) => sum + c.price, 0) / competitorData.length;
      const priceGapPercent = ((ourPrice - marketAvg) / marketAvg) * 100;

      // Get previous competitor data from cache
      const previousDataSnap = await db
        .collection('competitor_price_history')
        .where('tenantId', '==', tenantId)
        .where('productId', '==', productId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      const previousData = previousDataSnap.empty ? null : previousDataSnap.docs[0].data();
      const previousAvg = previousData?.marketAvg || marketAvg;

      // Calculate change percentage
      const changePercent = previousAvg > 0 ? Math.abs(((marketAvg - previousAvg) / previousAvg) * 100) : 0;

      // Determine alert type
      let alertType: PricingAlert['alertType'] | null = null;

      if (changePercent >= config.alertThreshold && marketAvg > previousAvg) {
        alertType = 'price_increase';
      } else if (changePercent >= config.alertThreshold && marketAvg < previousAvg) {
        alertType = 'price_decrease';
      } else if (Math.abs(priceGapPercent) >= 15 && config.alertTypes.includes('price_gap')) {
        alertType = 'price_gap';
      }

      // Create alert if threshold exceeded
      if (alertType && config.alertTypes.includes(alertType)) {
        const alert: PricingAlert = {
          id: `alert_${Date.now()}_${productId}`,
          tenantId,
          productId,
          productName,
          alertType,
          threshold: config.alertThreshold,
          oldPrice: previousAvg,
          newPrice: marketAvg,
          competitorCount: competitorData.length,
          marketAvg,
          ourPrice,
          priceGapPercent,
          triggeredAt: new Date(),
        };

        alerts.push(alert);

        // Save alert to Firestore
        await db.collection('pricing_alerts').doc(alert.id).set({
          ...alert,
          triggeredAt: new Date(),
        });
      }

      // Update competitor price history
      await db.collection('competitor_price_history').add({
        tenantId,
        productId,
        productName,
        marketAvg,
        competitorCount: competitorData.length,
        ourPrice,
        priceGapPercent,
        timestamp: new Date(),
      });
    }

    logger.info('[Pricing Alerts] Price check complete', {
      tenantId,
      alertsTriggered: alerts.length,
    });

    return alerts;
  } catch (error) {
    logger.error('[Pricing Alerts] Price check failed', { error, tenantId });
    return [];
  }
}

// ============================================================================
// EMAIL NOTIFICATIONS
// ============================================================================

/**
 * Send email alerts for pricing changes
 */
export async function sendPricingAlertEmails(
  config: PricingAlertConfig,
  alerts: PricingAlert[]
): Promise<{ sent: number; failed: number }> {
  if (alerts.length === 0 || config.emailRecipients.length === 0) {
    return { sent: 0, failed: 0 };
  }

  // Check quiet hours
  if (config.quietHours && isInQuietHours(config.quietHours)) {
    logger.debug('[Pricing Alerts] Skipping emails during quiet hours', {
      tenantId: config.tenantId,
    });
    return { sent: 0, failed: 0 };
  }

  const db = getAdminFirestore();
  let sent = 0;
  let failed = 0;

  try {
    // Group alerts by type
    const priceIncreases = alerts.filter((a) => a.alertType === 'price_increase');
    const priceDecreases = alerts.filter((a) => a.alertType === 'price_decrease');
    const priceGaps = alerts.filter((a) => a.alertType === 'price_gap');

    // Build email content
    const emailHtml = buildAlertEmailHtml({
      priceIncreases,
      priceDecreases,
      priceGaps,
      tenantId: config.tenantId,
    });

    // Send email to all recipients
    for (const recipient of config.emailRecipients) {
      try {
        // Use Mailjet via scheduled_emails collection
        await db.collection('scheduled_emails').add({
          to: recipient,
          subject: `Pricing Alert: ${alerts.length} Market Changes Detected`,
          html: emailHtml,
          sendAt: new Date(),
          status: 'pending',
          type: 'pricing_alert',
          metadata: {
            tenantId: config.tenantId,
            alertCount: alerts.length,
          },
        });

        sent++;
      } catch (error) {
        logger.error('[Pricing Alerts] Email failed', { error, recipient });
        failed++;
      }
    }

    // Mark alerts as notified
    for (const alert of alerts) {
      await db
        .collection('pricing_alerts')
        .doc(alert.id)
        .update({ notifiedAt: new Date() });
    }

    logger.info('[Pricing Alerts] Emails queued', {
      tenantId: config.tenantId,
      sent,
      failed,
    });
  } catch (error) {
    logger.error('[Pricing Alerts] Email sending failed', { error });
  }

  return { sent, failed };
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function buildAlertEmailHtml(data: {
  priceIncreases: PricingAlert[];
  priceDecreases: PricingAlert[];
  priceGaps: PricingAlert[];
  tenantId: string;
}): string {
  const { priceIncreases, priceDecreases, priceGaps } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white; }
    .content { padding: 30px; }
    .alert-section { margin-bottom: 30px; }
    .alert-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #111827; }
    .alert-item { background-color: #f9fafb; border-left: 4px solid #10b981; padding: 15px; margin-bottom: 10px; border-radius: 4px; }
    .alert-item.increase { border-left-color: #ef4444; }
    .alert-item.gap { border-left-color: #f59e0b; }
    .product-name { font-weight: 600; color: #111827; margin-bottom: 5px; }
    .price-info { font-size: 14px; color: #6b7280; }
    .price-change { font-weight: 600; }
    .price-change.increase { color: #ef4444; }
    .price-change.decrease { color: #10b981; }
    .cta { text-align: center; margin-top: 30px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">💰 Pricing Alert</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Market changes detected - Review and adjust your pricing</p>
    </div>

    <div class="content">
      ${priceIncreases.length > 0 ? `
        <div class="alert-section">
          <div class="alert-title">🔴 Competitor Price Increases (${priceIncreases.length})</div>
          ${priceIncreases.map((alert) => `
            <div class="alert-item increase">
              <div class="product-name">${alert.productName}</div>
              <div class="price-info">
                Market avg: <span class="price-change increase">$${alert.oldPrice?.toFixed(2)} → $${alert.newPrice?.toFixed(2)}</span>
                (${alert.competitorCount} competitors)
              </div>
              <div class="price-info">
                Your price: $${alert.ourPrice.toFixed(2)}
                ${alert.priceGapPercent > 0 ? `(${alert.priceGapPercent.toFixed(1)}% above market)` : `(${Math.abs(alert.priceGapPercent).toFixed(1)}% below market)`}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${priceDecreases.length > 0 ? `
        <div class="alert-section">
          <div class="alert-title">🟢 Competitor Price Decreases (${priceDecreases.length})</div>
          ${priceDecreases.map((alert) => `
            <div class="alert-item">
              <div class="product-name">${alert.productName}</div>
              <div class="price-info">
                Market avg: <span class="price-change decrease">$${alert.oldPrice?.toFixed(2)} → $${alert.newPrice?.toFixed(2)}</span>
                (${alert.competitorCount} competitors)
              </div>
              <div class="price-info">
                Your price: $${alert.ourPrice.toFixed(2)}
                ${alert.priceGapPercent > 0 ? `(${alert.priceGapPercent.toFixed(1)}% above market)` : `(${Math.abs(alert.priceGapPercent).toFixed(1)}% below market)`}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${priceGaps.length > 0 ? `
        <div class="alert-section">
          <div class="alert-title">⚠️ Significant Price Gaps (${priceGaps.length})</div>
          ${priceGaps.map((alert) => `
            <div class="alert-item gap">
              <div class="product-name">${alert.productName}</div>
              <div class="price-info">
                Market avg: $${alert.marketAvg.toFixed(2)} (${alert.competitorCount} competitors)
              </div>
              <div class="price-info">
                Your price: $${alert.ourPrice.toFixed(2)}
                <span class="price-change ${alert.priceGapPercent > 0 ? 'increase' : 'decrease'}">
                  (${alert.priceGapPercent > 0 ? '+' : ''}${alert.priceGapPercent.toFixed(1)}% ${alert.priceGapPercent > 0 ? 'above' : 'below'} market)
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="cta">
        <a href="https://bakedbot.ai/dashboard/pricing" class="button">Review Pricing Dashboard</a>
      </div>
    </div>

    <div class="footer">
      <p>This is an automated alert from BakedBot Dynamic Pricing.</p>
      <p>To adjust alert settings, visit your <a href="https://bakedbot.ai/dashboard/settings">Settings</a>.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get pricing alert configuration for a tenant
 */
export async function getPricingAlertConfig(tenantId: string): Promise<PricingAlertConfig | null> {
  const db = getAdminFirestore();

  try {
    const configSnap = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('settings')
      .doc('pricing_alerts')
      .get();

    if (!configSnap.exists) {
      return null;
    }

    return configSnap.data() as PricingAlertConfig;
  } catch (error) {
    logger.error('[Pricing Alerts] Failed to get config', { error, tenantId });
    return null;
  }
}

/**
 * Save pricing alert configuration
 */
export async function savePricingAlertConfig(config: PricingAlertConfig): Promise<boolean> {
  const db = getAdminFirestore();

  try {
    await db
      .collection('tenants')
      .doc(config.tenantId)
      .collection('settings')
      .doc('pricing_alerts')
      .set(config, { merge: true });

    return true;
  } catch (error) {
    logger.error('[Pricing Alerts] Failed to save config', { error });
    return false;
  }
}

/**
 * Check if current time is in quiet hours
 */
function isInQuietHours(quietHours: { start: number; end: number }): boolean {
  const now = new Date();
  const currentHour = now.getHours();

  if (quietHours.start <= quietHours.end) {
    return currentHour >= quietHours.start && currentHour < quietHours.end;
  } else {
    // Overnight range (e.g., 22-7)
    return currentHour >= quietHours.start || currentHour < quietHours.end;
  }
}
