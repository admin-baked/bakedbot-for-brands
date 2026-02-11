/**
 * Heartbeat Hive Mind Integration
 *
 * Connects heartbeat system to:
 * 1. Agent Bus - Broadcast alerts to relevant agents
 * 2. Letta Memory - Persist insights to shared memory blocks
 * 3. Sleep-Time Agent - Trigger consolidation after significant events
 *
 * This makes heartbeat "alive" in the OpenClaw sense:
 * - Time produces events (cron heartbeat)
 * - Events trigger agent coordination (Agent Bus)
 * - State persists across interactions (Letta)
 */

import { logger } from '@/lib/logger';
import type { HeartbeatCheckResult, HeartbeatRole } from '@/types/heartbeat';
import { sendAgentMessage, broadcastComplianceRisk, sendInventoryAlert } from '@/server/intuition/agent-bus';
import { lettaBlockManager, BLOCK_LABELS } from '@/server/services/letta/block-manager';
import { sleepTimeService } from '@/server/services/letta/sleeptime-agent';
import type { AgentName, MessageTopic } from '@/server/intuition/schema';

// =============================================================================
// AGENT BUS INTEGRATION
// =============================================================================

/**
 * Map heartbeat check IDs to Agent Bus message topics
 */
const CHECK_TO_TOPIC: Record<string, MessageTopic> = {
    // Operations
    low_stock_alerts: 'inventory_alert',
    expiring_batches: 'inventory_alert',
    pos_sync_status: 'anomaly',
    order_anomalies: 'anomaly',

    // Revenue
    margin_alerts: 'price_change',
    pricing_opportunities: 'price_change',
    competitor_price_changes: 'price_change',
    sales_velocity: 'anomaly',

    // Customers
    at_risk_customers: 'customer_trend',
    birthday_today: 'customer_trend',
    churn_risk: 'customer_trend',

    // Compliance
    license_expiry: 'compliance_risk',
    content_pending_review: 'compliance_risk',

    // Marketing
    competitor_launches: 'demand_spike',
    competitor_stockouts: 'demand_spike',
    campaign_performance: 'anomaly',
};

/**
 * Map heartbeat check IDs to target agents
 */
const CHECK_TO_TARGET_AGENT: Record<string, AgentName | 'broadcast'> = {
    // Smokey handles inventory and products
    low_stock_alerts: 'smokey',
    expiring_batches: 'smokey',
    pos_sync_status: 'smokey',

    // Money Mike handles pricing
    margin_alerts: 'money_mike',
    pricing_opportunities: 'money_mike',
    competitor_price_changes: 'money_mike',

    // Pops handles analytics
    sales_velocity: 'pops',
    order_anomalies: 'pops',

    // Mrs. Parker handles customers (mapped to pops for now since schema doesn't include her)
    at_risk_customers: 'pops',
    birthday_today: 'pops',
    churn_risk: 'pops',

    // Deebo handles compliance
    license_expiry: 'deebo',
    content_pending_review: 'deebo',

    // Craig handles marketing
    campaign_performance: 'craig',
    competitor_launches: 'ezal',
    competitor_stockouts: 'ezal',
};

/**
 * Broadcast heartbeat results to the Agent Bus
 * This allows other agents to react to findings
 */
export async function broadcastToAgentBus(
    tenantId: string,
    results: HeartbeatCheckResult[]
): Promise<number> {
    let messagesSent = 0;

    // Only broadcast non-OK results
    const alertResults = results.filter(r => r.status !== 'ok');

    for (const result of alertResults) {
        const topic = CHECK_TO_TOPIC[result.checkId];
        const targetAgent = CHECK_TO_TARGET_AGENT[result.checkId];

        if (!topic) {
            logger.debug(`[Heartbeat] No topic mapping for check: ${result.checkId}`);
            continue;
        }

        try {
            // Use specific broadcast functions for known patterns
            if (result.checkId === 'license_expiry' || result.checkId === 'content_pending_review') {
                await broadcastComplianceRisk(
                    tenantId,
                    result.checkId,
                    result.priority === 'urgent' ? 'critical' : result.priority === 'high' ? 'medium' : 'info',
                    {
                        title: result.title,
                        message: result.message,
                        data: result.data,
                        source: 'heartbeat',
                    }
                );
                messagesSent++;
            } else if (result.checkId === 'low_stock_alerts' || result.checkId === 'expiring_batches') {
                // Send inventory alerts to Smokey
                const rawProducts = result.data?.products || result.data?.batches || [];
                const products = Array.isArray(rawProducts) ? rawProducts : [];
                for (const product of products.slice(0, 5)) {
                    await sendInventoryAlert(
                        tenantId,
                        product.id || 'unknown',
                        result.checkId === 'low_stock_alerts' ? 'low' : 'oos',
                        result.message
                    );
                    messagesSent++;
                }
            } else {
                // Generic message for other checks
                await sendAgentMessage(tenantId, {
                    fromAgent: result.agent as AgentName,
                    toAgent: targetAgent || 'broadcast',
                    topic,
                    payload: {
                        checkId: result.checkId,
                        title: result.title,
                        message: result.message,
                        priority: result.priority,
                        data: result.data,
                        source: 'heartbeat',
                        timestamp: result.timestamp.toISOString(),
                    },
                    requiredReactions: getRequiredReactions(result),
                    expiresInHours: result.priority === 'urgent' ? 6 : 24,
                });
                messagesSent++;
            }
        } catch (error) {
            logger.error(`[Heartbeat] Failed to broadcast to Agent Bus`, {
                checkId: result.checkId,
                error,
            });
        }
    }

    if (messagesSent > 0) {
        logger.info(`[Heartbeat] Broadcast ${messagesSent} messages to Agent Bus`);
    }

    return messagesSent;
}

/**
 * Determine which agents need to react to a heartbeat result
 */
function getRequiredReactions(result: HeartbeatCheckResult): AgentName[] {
    const reactions: AgentName[] = [];

    // High-priority inventory issues need Smokey's immediate attention
    if (result.checkId === 'low_stock_alerts' && result.priority === 'high') {
        reactions.push('smokey');
    }

    // Compliance issues need Deebo and possibly Craig
    if (result.checkId === 'license_expiry' || result.checkId === 'content_pending_review') {
        reactions.push('deebo');
        if (result.priority === 'urgent') {
            reactions.push('craig'); // Stop marketing if compliance is critical
        }
    }

    // At-risk customers need attention from analytics
    if (result.checkId === 'at_risk_customers' || result.checkId === 'churn_risk') {
        reactions.push('pops');
    }

    return reactions;
}

// =============================================================================
// LETTA MEMORY INTEGRATION
// =============================================================================

/**
 * Persist heartbeat insights to Letta memory blocks
 * This ensures the Hive Mind remembers what was detected
 */
export async function persistToHiveMind(
    tenantId: string,
    role: HeartbeatRole,
    results: HeartbeatCheckResult[]
): Promise<boolean> {
    const significantResults = results.filter(
        r => r.status === 'alert' || r.status === 'warning' || r.priority === 'high' || r.priority === 'urgent'
    );

    if (significantResults.length === 0) {
        return true; // Nothing significant to persist
    }

    try {
        // Format insights for memory block
        const insightsText = formatInsightsForMemory(significantResults);

        // Determine target block based on role
        let blockLabel: string;
        switch (role) {
            case 'super_user':
                blockLabel = BLOCK_LABELS.EXECUTIVE_WORKSPACE;
                break;
            case 'dispensary':
                blockLabel = BLOCK_LABELS.CUSTOMER_INSIGHTS;
                break;
            case 'brand':
                blockLabel = BLOCK_LABELS.BRAND_CONTEXT;
                break;
            default:
                blockLabel = BLOCK_LABELS.CUSTOMER_INSIGHTS;
        }

        // Append to memory block
        await lettaBlockManager.appendToBlock(
            tenantId,
            blockLabel as any,
            insightsText,
            'HeartbeatService'
        );

        logger.info(`[Heartbeat] Persisted ${significantResults.length} insights to Letta block: ${blockLabel}`);

        return true;
    } catch (error) {
        logger.error(`[Heartbeat] Failed to persist to Hive Mind`, { error, tenantId });
        return false;
    }
}

/**
 * Format heartbeat results for Letta memory block storage
 */
function formatInsightsForMemory(results: HeartbeatCheckResult[]): string {
    const timestamp = new Date().toISOString().split('T')[0];

    const lines = [
        `\n\n📊 Heartbeat Insights (${timestamp}):`,
    ];

    for (const result of results) {
        const icon = result.status === 'alert' ? '🚨' : result.status === 'warning' ? '⚠️' : '📌';
        lines.push(`${icon} [${result.agent}] ${result.title}: ${result.message}`);
    }

    return lines.join('\n');
}

// =============================================================================
// SLEEP-TIME TRIGGER
// =============================================================================

/**
 * Trigger sleep-time consolidation if heartbeat found significant issues
 * This helps the Hive Mind process and integrate new information
 */
export async function triggerSleepTimeIfNeeded(
    tenantId: string,
    results: HeartbeatCheckResult[]
): Promise<boolean> {
    const urgentCount = results.filter(r => r.priority === 'urgent' || r.status === 'alert').length;

    // Only trigger sleep-time for multiple urgent issues
    if (urgentCount < 3) {
        return false;
    }

    try {
        logger.info(`[Heartbeat] Triggering sleep-time consolidation due to ${urgentCount} urgent alerts`);

        // For now, just log - actual agent IDs would need to be retrieved
        // In production, we'd get the primary agent ID and run consolidation
        // await sleepTimeService.runConsolidation(primaryAgentId, tenantId);

        return true;
    } catch (error) {
        logger.error(`[Heartbeat] Failed to trigger sleep-time consolidation`, { error, tenantId });
        return false;
    }
}

// =============================================================================
// COMBINED INTEGRATION
// =============================================================================

/**
 * Run all Hive Mind integrations for heartbeat results
 */
export async function integrateWithHiveMind(
    tenantId: string,
    role: HeartbeatRole,
    results: HeartbeatCheckResult[]
): Promise<{
    agentBusMessages: number;
    persistedToMemory: boolean;
    triggeredSleepTime: boolean;
}> {
    const [agentBusMessages, persistedToMemory, triggeredSleepTime] = await Promise.all([
        broadcastToAgentBus(tenantId, results),
        persistToHiveMind(tenantId, role, results),
        triggerSleepTimeIfNeeded(tenantId, results),
    ]);

    return {
        agentBusMessages,
        persistedToMemory,
        triggeredSleepTime,
    };
}
