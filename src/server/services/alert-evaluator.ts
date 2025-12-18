/**
 * Alert Evaluation Service
 * Evaluates alerts against current inventory and sends notifications
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/monitoring';
import type { Alert } from '@/types/smokey-actions';

interface EvaluationResult {
    alertId: string;
    triggered: boolean;
    reason?: string;
    notificationSent: boolean;
}

/**
 * Evaluate a single alert against current conditions
 */
export async function evaluateAlert(alert: Alert): Promise<EvaluationResult> {
    const result: EvaluationResult = {
        alertId: alert.id,
        triggered: false,
        notificationSent: false,
    };

    // Check cooldown
    if (alert.lastTriggeredAt) {
        const lastTriggered = alert.lastTriggeredAt instanceof Date
            ? alert.lastTriggeredAt
            : new Date(alert.lastTriggeredAt);
        const cooldownMs = alert.cooldownMinutes * 60 * 1000;
        const now = Date.now();

        if (now - lastTriggered.getTime() < cooldownMs) {
            result.reason = 'Still in cooldown period';
            return result;
        }
    }

    const firestore = getAdminFirestore();

    // Evaluate based on alert type
    switch (alert.type) {
        case 'inStock':
            result.triggered = await checkInStock(firestore, alert);
            result.reason = result.triggered ? 'Product is now in stock' : undefined;
            break;

        case 'priceDrop':
            result.triggered = await checkPriceDrop(firestore, alert);
            result.reason = result.triggered ? 'Price has dropped' : undefined;
            break;

        case 'openNowWithin':
            result.triggered = await checkOpenNowWithin(firestore, alert);
            result.reason = result.triggered ? 'Store is open and nearby' : undefined;
            break;

        case 'restock':
            result.triggered = await checkRestock(firestore, alert);
            result.reason = result.triggered ? 'Item has been restocked' : undefined;
            break;

        default:
            result.reason = `Unknown alert type: ${alert.type}`;
    }

    // Send notification if triggered
    if (result.triggered) {
        result.notificationSent = await sendAlertNotification(firestore, alert, result.reason!);

        // Update lastTriggeredAt
        await firestore.collection('alerts').doc(alert.id).update({
            lastTriggeredAt: new Date(),
        });
    }

    return result;
}

/**
 * Evaluate all active alerts
 */
export async function evaluateAllAlerts(): Promise<{
    total: number;
    triggered: number;
    notificationsSent: number;
}> {
    const firestore = getAdminFirestore();

    const snapshot = await firestore.collection('alerts')
        .where('status', '==', 'active')
        .limit(100) // Process in batches
        .get();

    const stats = { total: snapshot.size, triggered: 0, notificationsSent: 0 };

    for (const doc of snapshot.docs) {
        const alert = doc.data() as Alert;
        try {
            const result = await evaluateAlert(alert);
            if (result.triggered) stats.triggered++;
            if (result.notificationSent) stats.notificationsSent++;
        } catch (error) {
            logger.error('Error evaluating alert', { alertId: alert.id, error });
        }
    }

    logger.info('Alert evaluation complete', stats);
    return stats;
}

// ============== Check Functions ==============

async function checkInStock(
    firestore: FirebaseFirestore.Firestore,
    alert: Alert
): Promise<boolean> {
    if (!alert.productKey || !alert.dispId) return false;

    const productDoc = await firestore
        .collection('dispensaries')
        .doc(alert.dispId)
        .collection('products')
        .doc(alert.productKey)
        .get();

    if (!productDoc.exists) return false;

    const product = productDoc.data();
    return product?.inStock === true || (product?.quantity ?? 0) > 0;
}

async function checkPriceDrop(
    firestore: FirebaseFirestore.Firestore,
    alert: Alert
): Promise<boolean> {
    if (!alert.productKey || !alert.dispId) return false;
    if (!alert.constraints.maxPrice) return false;

    const productDoc = await firestore
        .collection('dispensaries')
        .doc(alert.dispId)
        .collection('products')
        .doc(alert.productKey)
        .get();

    if (!productDoc.exists) return false;

    const product = productDoc.data();
    return (product?.price ?? Infinity) <= alert.constraints.maxPrice;
}

async function checkOpenNowWithin(
    firestore: FirebaseFirestore.Firestore,
    alert: Alert
): Promise<boolean> {
    if (!alert.dispId) return false;

    const dispDoc = await firestore.collection('dispensaries').doc(alert.dispId).get();
    if (!dispDoc.exists) return false;

    const dispensary = dispDoc.data();

    // Check if open now (from Google Places data)
    const isOpen = dispensary?.google?.currentOpeningHours?.openNow === true;

    // TODO: Check distance/travel time when we have user location and Routes API

    return isOpen;
}

async function checkRestock(
    firestore: FirebaseFirestore.Firestore,
    alert: Alert
): Promise<boolean> {
    // Similar to inStock but checks for quantity increase
    // Would need to track previous quantity
    return checkInStock(firestore, alert);
}

// ============== Notification ==============

async function sendAlertNotification(
    firestore: FirebaseFirestore.Firestore,
    alert: Alert,
    reason: string
): Promise<boolean> {
    try {
        // Get user
        const userDoc = await firestore.collection('users').doc(alert.userId).get();
        if (!userDoc.exists) return false;

        const user = userDoc.data();

        // Log notification event
        await firestore.collection('events').add({
            type: 'alertSent',
            userId: alert.userId,
            payload: {
                alertId: alert.id,
                type: alert.type,
                reason,
                channels: alert.channels,
            },
            createdAt: new Date(),
        });

        // TODO: Integrate with email/SMS/push services
        // For now, just log and return success

        if (alert.channels.email && user?.email) {
            logger.info('Would send email notification', {
                to: user.email,
                alertId: alert.id,
                reason
            });
        }

        if (alert.channels.sms && user?.phone) {
            logger.info('Would send SMS notification', {
                to: user.phone,
                alertId: alert.id,
                reason
            });
        }

        return true;
    } catch (error) {
        logger.error('Failed to send alert notification', { alertId: alert.id, error });
        return false;
    }
}
