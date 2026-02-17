/**
 * Competitive Intelligence Alert System
 *
 * Monitors competitor changes and sends real-time alerts for:
 * - Major price drops (>30% discount)
 * - New competitors in market
 * - Pricing strategy changes
 * - Product stockouts
 */

import { createServerClient } from '@/firebase/server-client';
import { logger } from '@/lib/logger';
import { FieldValue } from 'firebase-admin/firestore';

// ============================================================================
// TYPES
// ============================================================================

export type CompetitorAlertType =
    | 'price_drop_major'        // >30% discount
    | 'price_drop_moderate'     // 15-30% discount
    | 'new_competitor'          // New competitor detected
    | 'pricing_strategy_change' // Change from discount to premium or vice versa
    | 'product_stockout'        // Popular product sold out
    | 'new_product_launch';     // New product added to competitor menu

export interface CompetitorAlert {
    id: string;
    orgId: string;
    competitorId: string;
    competitorName: string;
    type: CompetitorAlertType;
    priority: 'critical' | 'high' | 'medium' | 'low';
    title: string;
    message: string;
    metadata: Record<string, any>;
    createdAt: Date;
    read: boolean;
    notified: boolean;
}

export interface CompetitorSnapshot {
    id: string;
    competitorId: string;
    deals: Array<{
        dealName: string;
        price: number;
        discount?: string;
        category?: string;
    }>;
    priceStrategy: 'discount' | 'premium' | 'competitive' | 'unknown';
    avgPrice: number;
    dealCount: number;
    capturedAt: Date;
}

// ============================================================================
// ALERT DETECTION
// ============================================================================

/**
 * Analyze new competitor snapshot and detect alert conditions
 */
export async function analyzeCompetitorChanges(
    orgId: string,
    competitorId: string,
    currentSnapshot: CompetitorSnapshot
): Promise<CompetitorAlert[]> {
    const { firestore } = await createServerClient();
    const alerts: CompetitorAlert[] = [];

    try {
        // Get previous snapshot
        const previousSnapshotDoc = await firestore
            .collection('tenants')
            .doc(orgId)
            .collection('competitors')
            .doc(competitorId)
            .collection('snapshots')
            .orderBy('capturedAt', 'desc')
            .limit(2)
            .get();

        if (previousSnapshotDoc.docs.length < 2) {
            logger.info('[CompetitorAlerts] Not enough snapshots for comparison', {
                orgId,
                competitorId
            });
            return alerts;
        }

        const previousSnapshot = previousSnapshotDoc.docs[1].data() as CompetitorSnapshot;

        // 1. Check for major price drops (>30% discount)
        const majorDiscounts = currentSnapshot.deals.filter(deal => {
            if (!deal.discount) return false;
            const discountMatch = deal.discount.match(/(\d+)%/);
            if (!discountMatch) return false;
            const discountPercent = parseInt(discountMatch[1]);
            return discountPercent >= 30;
        });

        if (majorDiscounts.length > 0) {
            for (const deal of majorDiscounts.slice(0, 3)) { // Top 3
                alerts.push({
                    id: `alert_${Date.now()}_${competitorId}_price_drop`,
                    orgId,
                    competitorId,
                    competitorName: currentSnapshot.competitorId,
                    type: 'price_drop_major',
                    priority: 'critical',
                    title: `🚨 Major Discount Alert: ${deal.dealName}`,
                    message: `${currentSnapshot.competitorId} is offering ${deal.dealName} at $${deal.price.toFixed(2)} with ${deal.discount} discount. This may impact your sales.`,
                    metadata: {
                        dealName: deal.dealName,
                        price: deal.price,
                        discount: deal.discount,
                        category: deal.category
                    },
                    createdAt: new Date(),
                    read: false,
                    notified: false
                });
            }
        }

        // 2. Check for pricing strategy change
        if (previousSnapshot.priceStrategy !== currentSnapshot.priceStrategy &&
            currentSnapshot.priceStrategy !== 'unknown') {
            alerts.push({
                id: `alert_${Date.now()}_${competitorId}_strategy`,
                orgId,
                competitorId,
                competitorName: currentSnapshot.competitorId,
                type: 'pricing_strategy_change',
                priority: 'high',
                title: `📊 Pricing Strategy Shift: ${currentSnapshot.competitorId}`,
                message: `${currentSnapshot.competitorId} changed from ${previousSnapshot.priceStrategy} to ${currentSnapshot.priceStrategy} pricing. Average price: $${currentSnapshot.avgPrice.toFixed(2)}.`,
                metadata: {
                    oldStrategy: previousSnapshot.priceStrategy,
                    newStrategy: currentSnapshot.priceStrategy,
                    oldAvgPrice: previousSnapshot.avgPrice,
                    newAvgPrice: currentSnapshot.avgPrice
                },
                createdAt: new Date(),
                read: false,
                notified: false
            });
        }

        // 3. Check for significant deal count increase (>50%)
        const dealCountIncrease = (currentSnapshot.dealCount - previousSnapshot.dealCount) / previousSnapshot.dealCount;
        if (dealCountIncrease > 0.5 && previousSnapshot.dealCount > 0) {
            alerts.push({
                id: `alert_${Date.now()}_${competitorId}_deals`,
                orgId,
                competitorId,
                competitorName: currentSnapshot.competitorId,
                type: 'new_product_launch',
                priority: 'medium',
                title: `🆕 Increased Promotions: ${currentSnapshot.competitorId}`,
                message: `${currentSnapshot.competitorId} increased active deals from ${previousSnapshot.dealCount} to ${currentSnapshot.dealCount} (+${Math.round(dealCountIncrease * 100)}%).`,
                metadata: {
                    oldDealCount: previousSnapshot.dealCount,
                    newDealCount: currentSnapshot.dealCount,
                    increasePercent: Math.round(dealCountIncrease * 100)
                },
                createdAt: new Date(),
                read: false,
                notified: false
            });
        }

        logger.info('[CompetitorAlerts] Generated alerts', {
            orgId,
            competitorId,
            alertCount: alerts.length
        });

    } catch (error) {
        logger.error('[CompetitorAlerts] Failed to analyze changes', {
            error,
            orgId,
            competitorId
        });
    }

    return alerts;
}

/**
 * Save alerts to Firestore and trigger notifications
 */
export async function saveAndNotifyAlerts(alerts: CompetitorAlert[]): Promise<void> {
    if (alerts.length === 0) return;

    const { firestore } = await createServerClient();

    for (const alert of alerts) {
        try {
            // Save to Firestore
            await firestore
                .collection('tenants')
                .doc(alert.orgId)
                .collection('competitor_alerts')
                .doc(alert.id)
                .set({
                    ...alert,
                    createdAt: FieldValue.serverTimestamp()
                });

            // Create inbox notification
            await createInboxAlertNotification(alert);

            logger.info('[CompetitorAlerts] Alert saved and notified', {
                orgId: alert.orgId,
                alertId: alert.id,
                type: alert.type
            });

        } catch (error) {
            logger.error('[CompetitorAlerts] Failed to save alert', {
                error,
                alertId: alert.id
            });
        }
    }
}

/**
 * Create inbox notification for competitor alert
 */
async function createInboxAlertNotification(alert: CompetitorAlert): Promise<void> {
    try {
        const { createInboxThread } = await import('@/server/actions/inbox');

        const content = formatAlertMessage(alert);

        await createInboxThread({
            type: 'market_intel',
            title: alert.title,
            primaryAgent: 'ezal',
            brandId: alert.orgId,
            tags: ['competitor-alert', 'real-time', alert.type],
            initialMessage: {
                id: `msg_${Date.now()}`,
                userId: 'agent_ezal',
                userName: 'Ezal',
                userAvatar: '/agents/ezal-avatar.png',
                message: content,
                timestamp: Date.now(),
            } as any, // TODO: Fix type mismatch between ChatMessage (collaboration) and inbox message
        });

    } catch (error) {
        logger.error('[CompetitorAlerts] Failed to create inbox notification', {
            error,
            alertId: alert.id
        });
    }
}

/**
 * Format alert message for inbox notification
 */
function formatAlertMessage(alert: CompetitorAlert): string {
    let message = `${alert.message}\n\n`;

    switch (alert.type) {
        case 'price_drop_major':
            message += `**Action Required:**\n`;
            message += `• Review your pricing for similar products\n`;
            message += `• Consider launching a counter-promotion\n`;
            message += `• Alert Craig to create a matching campaign\n\n`;
            message += `**Deal Details:**\n`;
            message += `• Product: ${alert.metadata.dealName}\n`;
            message += `• Price: $${alert.metadata.price.toFixed(2)}\n`;
            message += `• Discount: ${alert.metadata.discount}\n`;
            if (alert.metadata.category) {
                message += `• Category: ${alert.metadata.category}\n`;
            }
            break;

        case 'pricing_strategy_change':
            message += `**Strategic Shift Detected:**\n`;
            message += `• Old Strategy: ${alert.metadata.oldStrategy}\n`;
            message += `• New Strategy: ${alert.metadata.newStrategy}\n`;
            message += `• Old Avg Price: $${alert.metadata.oldAvgPrice.toFixed(2)}\n`;
            message += `• New Avg Price: $${alert.metadata.newAvgPrice.toFixed(2)}\n\n`;
            message += `**Recommended Response:**\n`;
            if (alert.metadata.newStrategy === 'discount') {
                message += `• Monitor market share impact\n`;
                message += `• Consider selective price matching\n`;
                message += `• Focus on value differentiation\n`;
            } else {
                message += `• This creates opportunity for competitive pricing\n`;
                message += `• Consider capturing price-sensitive customers\n`;
                message += `• Maintain quality positioning\n`;
            }
            break;

        case 'new_product_launch':
            message += `**Market Activity:**\n`;
            message += `• Previous Deals: ${alert.metadata.oldDealCount}\n`;
            message += `• Current Deals: ${alert.metadata.newDealCount}\n`;
            message += `• Increase: +${alert.metadata.increasePercent}%\n\n`;
            message += `**Suggested Actions:**\n`;
            message += `• Review new competitor products\n`;
            message += `• Identify gaps in your catalog\n`;
            message += `• Consider expanding promotions\n`;
            break;
    }

    message += `\n---\n`;
    message += `*Real-time alert from Ezal's competitor monitoring system*`;

    return message;
}

/**
 * Get unread alerts for a tenant
 */
export async function getUnreadAlerts(
    orgId: string,
    limit: number = 10
): Promise<CompetitorAlert[]> {
    const { firestore } = await createServerClient();

    const alertsSnapshot = await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('competitor_alerts')
        .where('read', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    return alertsSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
    } as CompetitorAlert));
}

/**
 * Mark alert as read
 */
export async function markAlertAsRead(orgId: string, alertId: string): Promise<void> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('tenants')
        .doc(orgId)
        .collection('competitor_alerts')
        .doc(alertId)
        .update({
            read: true,
            readAt: FieldValue.serverTimestamp()
        });
}
