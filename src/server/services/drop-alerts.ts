// src/server/services/drop-alerts.ts
/**
 * Drop Alerts Service
 * Handles product restock alerts, price drops, and competitor stockout notifications
 */

'use server';

import { createServerClient } from '@/firebase/server-client';
import {
    DropAlertConfig,
    AlertSubscription,
    DropAlertEvent,
    DropAlertType,
    AlertChannel,
} from '@/types/foot-traffic';
import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { emailService } from '@/lib/notifications/email-service';
import { sendPushNotification } from '@/lib/notifications/push-service';
import { logger } from '@/lib/logger';

// =============================================================================
// ALERT CONFIGURATION (Super Admin)
// =============================================================================

/**
 * Get all drop alert configurations
 */
export async function getDropAlertConfigs(): Promise<DropAlertConfig[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('drop_alerts')
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as DropAlertConfig[];
}

/**
 * Create a new drop alert configuration
 */
export async function createDropAlertConfig(
    config: Omit<DropAlertConfig, 'id' | 'createdAt' | 'updatedAt' | 'metrics'>
): Promise<DropAlertConfig> {
    const { firestore } = await createServerClient();

    const now = new Date();
    const docRef = firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('drop_alerts')
        .doc();

    const newConfig: DropAlertConfig = {
        ...config,
        id: docRef.id,
        createdAt: now,
        updatedAt: now,
        metrics: {
            triggered: 0,
            sent: 0,
            clicked: 0,
            conversions: 0,
        },
    };

    await docRef.set(newConfig);

    logger.info('[DropAlerts] Config created:', { configId: newConfig.id, type: config.type });

    return newConfig;
}

/**
 * Update a drop alert configuration
 */
export async function updateDropAlertConfig(
    configId: string,
    updates: Partial<Omit<DropAlertConfig, 'id' | 'createdAt'>>
): Promise<DropAlertConfig | null> {
    const { firestore } = await createServerClient();

    const docRef = firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('drop_alerts')
        .doc(configId);

    const existing = await docRef.get();
    if (!existing.exists) {
        return null;
    }

    await docRef.update({
        ...updates,
        updatedAt: new Date(),
    });

    const updated = await docRef.get();
    return {
        id: updated.id,
        ...updated.data(),
        createdAt: updated.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updated.data()?.updatedAt?.toDate() || new Date(),
    } as DropAlertConfig;
}

/**
 * Delete a drop alert configuration
 */
export async function deleteDropAlertConfig(configId: string): Promise<boolean> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('foot_traffic')
        .doc('config')
        .collection('drop_alerts')
        .doc(configId)
        .delete();

    logger.info('[DropAlerts] Config deleted:', { configId });

    return true;
}

// =============================================================================
// USER SUBSCRIPTIONS
// =============================================================================

/**
 * Subscribe a user to product alerts
 */
export async function subscribeToProduct(
    userId: string,
    subscription: Omit<AlertSubscription, 'id' | 'userId' | 'createdAt' | 'active'>
): Promise<AlertSubscription> {
    const { firestore } = await createServerClient();

    const docRef = firestore
        .collection('users')
        .doc(userId)
        .collection('alert_subscriptions')
        .doc();

    const newSub: AlertSubscription = {
        ...subscription,
        id: docRef.id,
        userId,
        active: true,
        createdAt: new Date(),
    };

    await docRef.set(newSub);

    logger.info('[DropAlerts] User subscribed:', {
        userId,
        productId: subscription.productId,
    });

    return newSub;
}

/**
 * Get user's alert subscriptions
 */
export async function getUserSubscriptions(userId: string): Promise<AlertSubscription[]> {
    const { firestore } = await createServerClient();

    const snapshot = await firestore
        .collection('users')
        .doc(userId)
        .collection('alert_subscriptions')
        .where('active', '==', true)
        .get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
    })) as AlertSubscription[];
}

/**
 * Unsubscribe from a product alert
 */
export async function unsubscribeFromProduct(
    userId: string,
    subscriptionId: string
): Promise<boolean> {
    const { firestore } = await createServerClient();

    await firestore
        .collection('users')
        .doc(userId)
        .collection('alert_subscriptions')
        .doc(subscriptionId)
        .update({ active: false });

    return true;
}

// =============================================================================
// ALERT TRIGGERING
// =============================================================================

/**
 * Trigger an alert event
 */
export async function triggerAlert(
    event: Omit<DropAlertEvent, 'id' | 'status' | 'recipientCount' | 'detectedAt' | 'processedAt'>
): Promise<DropAlertEvent> {
    const { firestore } = await createServerClient();

    const docRef = firestore.collection('foot_traffic_events').doc();

    const alertEvent: DropAlertEvent = {
        ...event,
        id: docRef.id,
        status: 'pending',
        recipientCount: 0,
        detectedAt: new Date(),
    };

    await docRef.set(alertEvent);

    logger.info('[DropAlerts] Alert triggered:', {
        eventId: alertEvent.id,
        type: event.type,
        productId: event.productId,
    });

    // Process the alert asynchronously
    processAlert(alertEvent.id).catch(err => {
        logger.error('[DropAlerts] Failed to process alert:', err);
    });

    return alertEvent;
}

/**
 * Process an alert and send notifications
 */
async function processAlert(eventId: string): Promise<void> {
    const { firestore } = await createServerClient();

    // Get the event
    const eventDoc = await firestore.collection('foot_traffic_events').doc(eventId).get();
    if (!eventDoc.exists) {
        logger.error('[DropAlerts] Event not found:', { eventId });
        return;
    }

    const event = eventDoc.data() as DropAlertEvent;

    // Update status to processing
    await eventDoc.ref.update({ status: 'processing' });

    try {
        // Find matching configurations
        const configs = await getDropAlertConfigs();
        const matchingConfigs = configs.filter(config => {
            if (!config.enabled) return false;
            if (config.type !== event.type) return false;
            if (config.productIds?.length && !config.productIds.includes(event.productId)) return false;
            if (config.geoZoneId && config.geoZoneId !== event.geoZoneId) return false;
            return true;
        });

        // Find subscribers for this product
        const subscribersSnapshot = await firestore
            .collectionGroup('alert_subscriptions')
            .where('productId', '==', event.productId)
            .where('active', '==', true)
            .get();

        const subscribers = subscribersSnapshot.docs.map(doc => doc.data() as AlertSubscription);

        // Combine channels from configs and subscribers
        const channelsToUse = new Set<AlertChannel>();
        matchingConfigs.forEach(config => config.channels.forEach(ch => channelsToUse.add(ch)));
        subscribers.forEach(sub => sub.channels.forEach(ch => channelsToUse.add(ch)));

        // Build message
        const message = buildAlertMessage(event);

        // Send notifications
        let sentCount = 0;

        // Get user contact info for each subscriber
        for (const subscriber of subscribers) {
            const userDoc = await firestore.collection('users').doc(subscriber.userId).get();
            const userData = userDoc.data();

            if (!userData) continue;

            // Send via each channel the subscriber opted into
            for (const channel of subscriber.channels) {
                try {
                    switch (channel) {
                        case 'sms':
                            if (userData.phone) {
                                await blackleafService.sendCustomMessage(
                                    userData.phone,
                                    message.sms
                                );
                                sentCount++;
                            }
                            break;

                        case 'email':
                            if (userData.email) {
                                await emailService.sendCustomEmail({
                                    to: userData.email,
                                    subject: message.emailSubject,
                                    html: message.emailHtml,
                                });
                                sentCount++;
                            }
                            break;

                        case 'push':
                            await sendPushNotification(subscriber.userId, {
                                title: message.pushTitle,
                                body: message.pushBody,
                                url: message.url,
                            });
                            sentCount++;
                            break;
                    }
                } catch (err) {
                    logger.error('[DropAlerts] Failed to send notification:', {
                        channel,
                        userId: subscriber.userId,
                        error: err,
                    });
                }
            }
        }

        // Update event status
        await eventDoc.ref.update({
            status: 'sent',
            recipientCount: sentCount,
            processedAt: new Date(),
        });

        // Update config metrics
        for (const config of matchingConfigs) {
            await updateDropAlertConfig(config.id, {
                metrics: {
                    ...config.metrics,
                    triggered: config.metrics.triggered + 1,
                    sent: config.metrics.sent + sentCount,
                },
            });
        }

        logger.info('[DropAlerts] Alert processed:', {
            eventId,
            recipientCount: sentCount,
        });
    } catch (error) {
        await eventDoc.ref.update({ status: 'failed' });
        throw error;
    }
}

/**
 * Build notification messages for an alert
 */
function buildAlertMessage(event: DropAlertEvent): {
    sms: string;
    emailSubject: string;
    emailHtml: string;
    pushTitle: string;
    pushBody: string;
    url: string;
} {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bakedbot.ai';
    const productUrl = `${baseUrl}/products/${event.productId}`;

    switch (event.type) {
        case 'restock':
            return {
                sms: `🌿 ${event.productName} is BACK IN STOCK at ${event.retailerName}! Get it before it's gone. Reply STOP to opt out.`,
                emailSubject: `🌿 ${event.productName} is Back in Stock!`,
                emailHtml: `
          <h2>Good news! ${event.productName} is back in stock</h2>
          <p>The product you were waiting for is now available at <strong>${event.retailerName}</strong>.</p>
          <p><a href="${productUrl}">View Product</a></p>
        `,
                pushTitle: '🌿 Back in Stock!',
                pushBody: `${event.productName} is now available at ${event.retailerName}`,
                url: productUrl,
            };

        case 'price_drop':
            const savings = event.oldPrice && event.newPrice
                ? `$${(event.oldPrice - event.newPrice).toFixed(2)}`
                : 'great savings';
            return {
                sms: `💰 PRICE DROP! ${event.productName} is now $${event.newPrice} (was $${event.oldPrice}). Save ${savings}! Reply STOP to opt out.`,
                emailSubject: `💰 Price Drop on ${event.productName}!`,
                emailHtml: `
          <h2>${event.productName} Price Drop!</h2>
          <p>Now: <strong>$${event.newPrice}</strong> (was $${event.oldPrice})</p>
          <p>Save ${savings} at ${event.retailerName}!</p>
          <p><a href="${productUrl}">Shop Now</a></p>
        `,
                pushTitle: '💰 Price Drop!',
                pushBody: `${event.productName} now $${event.newPrice} (was $${event.oldPrice})`,
                url: productUrl,
            };

        case 'competitor_out':
            return {
                sms: `🏆 Competitors are OUT of ${event.productName} but we have it! Shop now. Reply STOP to opt out.`,
                emailSubject: `🏆 We Have What Others Don't - ${event.productName}`,
                emailHtml: `
          <h2>Stock Up While You Can!</h2>
          <p>${event.productName} is selling out everywhere, but ${event.retailerName} still has it.</p>
          <p><a href="${productUrl}">Get It Now</a></p>
        `,
                pushTitle: '🏆 In Stock Here!',
                pushBody: `${event.productName} - available now while others are sold out`,
                url: productUrl,
            };

        default:
            return {
                sms: `Update on ${event.productName} at ${event.retailerName}. Reply STOP to opt out.`,
                emailSubject: `Update: ${event.productName}`,
                emailHtml: `<p>There's an update on ${event.productName} at ${event.retailerName}.</p>`,
                pushTitle: 'Product Update',
                pushBody: `Update on ${event.productName}`,
                url: productUrl,
            };
    }
}

// =============================================================================
// SCHEDULED CHECKS
// =============================================================================

/**
 * Check for restock events (to be called by scheduled job)
 */
export async function checkForRestockEvents(): Promise<number> {
    // This would compare current inventory with previous snapshot
    // and trigger alerts for products that came back in stock
    logger.info('[DropAlerts] Checking for restock events...');

    // TODO: Implement inventory comparison logic
    // 1. Get previous inventory snapshot
    // 2. Get current inventory from CannMenus
    // 3. Find products that were out of stock and are now in stock
    // 4. Trigger alerts for each

    return 0;
}

/**
 * Check for price drops (to be called by scheduled job)
 */
export async function checkForPriceDrops(): Promise<number> {
    logger.info('[DropAlerts] Checking for price drops...');

    // TODO: Implement price comparison logic
    // 1. Get previous price snapshot
    // 2. Get current prices from CannMenus
    // 3. Find products with significant price drops
    // 4. Trigger alerts for each

    return 0;
}

/**
 * Check for competitor stockouts (to be called by scheduled job)
 */
export async function checkForCompetitorStockouts(): Promise<number> {
    logger.info('[DropAlerts] Checking for competitor stockouts...');

    // TODO: Implement competitor stockout detection
    // 1. Monitor competitor inventory
    // 2. Find products that are out of stock at competitors
    // 3. Check if we have them in stock
    // 4. Trigger opportunity alerts

    return 0;
}
