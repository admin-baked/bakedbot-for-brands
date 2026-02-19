/**
 * Internal SMS Router
 *
 * Routes BakedBot-to-staff SMS through Blackleaf (NOT to customers).
 * Internal SMS is unlimited on all paid tiers (separate bucket from customer SMS).
 *
 * Use cases:
 *   - Ezal: competitor price drop alerts
 *   - Deebo: compliance flag requiring immediate attention
 *   - System: usage at 90%+, critical playbook failure
 *   - Heartbeat: system outage alerts
 *
 * Target recipients: staffPhoneNumbers stored in the org's Firestore doc.
 * Falls back to super_users if no org staff phones configured.
 */

import { logger } from '@/lib/logger';
import { BlackleafService } from '@/lib/notifications/blackleaf-service';

export type InternalAlertType =
    | 'competitor_price_drop'
    | 'competitor_new_product'
    | 'compliance_flag'
    | 'usage_at_90_percent'
    | 'critical_playbook_failure'
    | 'system_outage'
    | 'new_order_alert'
    | 'inventory_low';

export interface InternalSMSParams {
    orgId: string;
    to: string | string[];  // phone number(s)
    type: InternalAlertType;
    data: Record<string, string | number | undefined>;
}

// Pre-built templates for each alert type
function buildMessage(type: InternalAlertType, data: Record<string, string | number | undefined>): string {
    switch (type) {
        case 'competitor_price_drop':
            return `🔻 [BakedBot] Price drop alert: ${data.competitor} dropped ${data.product} from $${data.oldPrice} → $${data.newPrice}. You're at $${data.yourPrice}. Review your pricing.`;

        case 'competitor_new_product':
            return `🆕 [BakedBot] New product spotted: ${data.competitor} added "${data.product}" (${data.category}) at $${data.price}. You have ${data.yourCount ?? 0} similar products.`;

        case 'compliance_flag':
            return `⚠️ [BakedBot/Deebo] Compliance flag: "${data.content}" violates ${data.rule}. Action needed before sending. Review at ${data.link ?? 'dashboard'}.`;

        case 'usage_at_90_percent':
            return `📊 [BakedBot] ${data.metric} usage at ${data.pct}% (${data.used}/${data.limit}). Upgrade to avoid overages at bakedbot.ai/settings/usage.`;

        case 'critical_playbook_failure':
            return `🚨 [BakedBot] Playbook "${data.playbookName}" failed after 3 attempts. Customers may not have received ${data.channel} delivery. Check alerts dashboard.`;

        case 'system_outage':
            return `🚨 [BakedBot] System alert: ${data.message}. BakedBot team has been notified and is investigating.`;

        case 'new_order_alert':
            return `🛒 [BakedBot] New order #${data.orderId} from ${data.customer} — $${data.total}. ${data.fulfillmentType === 'delivery' ? 'Delivery requested.' : 'Pickup order.'}`;

        case 'inventory_low':
            return `⚡ [BakedBot] Low inventory: "${data.product}" is down to ${data.quantity} units. Consider restocking or hiding from menu.`;

        default:
            return `[BakedBot] Alert: ${JSON.stringify(data)}`;
    }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

const blackleaf = new BlackleafService();

/**
 * Send an internal staff SMS alert via Blackleaf.
 * Does not count against customer SMS allocation.
 */
export async function sendInternalAlert(params: InternalSMSParams): Promise<void> {
    const { orgId, to, type, data } = params;
    const message = buildMessage(type, data);
    const phones = Array.isArray(to) ? to : [to];

    const results = await Promise.allSettled(
        phones.map((phone) => blackleaf.sendCustomMessage(phone, message))
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
        logger.warn('[InternalRouter] Some internal SMS failed', {
            orgId,
            type,
            attempted: phones.length,
            failed: failed.length,
        });
    } else {
        logger.info('[InternalRouter] Internal alerts sent', {
            orgId,
            type,
            count: phones.length,
        });
    }
}

/**
 * Convenience: send Ezal price-drop alert.
 */
export async function sendEzalPriceDropAlert(
    orgId: string,
    phones: string[],
    competitor: string,
    product: string,
    oldPrice: number,
    newPrice: number,
    yourPrice: number
): Promise<void> {
    await sendInternalAlert({
        orgId,
        to: phones,
        type: 'competitor_price_drop',
        data: { competitor, product, oldPrice, newPrice, yourPrice },
    });
}

/**
 * Convenience: send usage threshold alert.
 */
export async function sendUsageAlert(
    orgId: string,
    phones: string[],
    metric: string,
    pct: number,
    used: number,
    limit: number
): Promise<void> {
    await sendInternalAlert({
        orgId,
        to: phones,
        type: 'usage_at_90_percent',
        data: { metric, pct, used, limit },
    });
}
