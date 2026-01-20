/**
 * Memory Bridge Service
 *
 * Bridges the gap between Letta (agent memory) and Firestore (product/semantic data).
 * Solves the "multiple brains" problem Richmond Alake warns about.
 *
 * Problem:
 * - Letta stores: agent state, conversations, facts about customers
 * - Firestore stores: products, RAG chunks, business data
 * - These don't cross-reference, so Smokey's product recommendations
 *   aren't informed by Leo's strategic priorities in Letta.
 *
 * Solution:
 * - Sync strategic context from Letta → Firestore RAG
 * - Sync business insights from Firestore → Letta blocks
 * - Create unified query interface
 */

import { logger } from '@/lib/logger';
import { lettaClient } from './client';
import { lettaBlockManager, BLOCK_LABELS } from './block-manager';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// =============================================================================
// BRIDGE CONFIGURATION
// =============================================================================

const BRIDGE_COLLECTION = 'memory_bridge_sync';
const STRATEGIC_CONTEXT_COLLECTION = 'rag_strategic_context';

export interface SyncRecord {
    id: string;
    tenantId: string;
    direction: 'letta_to_firestore' | 'firestore_to_letta';
    sourceType: string;
    targetType: string;
    lastSyncAt: Date;
    itemsSynced: number;
    status: 'success' | 'partial' | 'failed';
    error?: string;
}

// =============================================================================
// MEMORY BRIDGE SERVICE
// =============================================================================

export class MemoryBridgeService {
    /**
     * Sync strategic context from Letta executive_workspace to Firestore RAG.
     * This allows product agents (Smokey) to access strategic priorities.
     */
    async syncStrategicContextToFirestore(tenantId: string): Promise<SyncRecord> {
        const syncId = `sync-${Date.now()}`;
        const record: SyncRecord = {
            id: syncId,
            tenantId,
            direction: 'letta_to_firestore',
            sourceType: 'executive_workspace',
            targetType: 'rag_strategic_context',
            lastSyncAt: new Date(),
            itemsSynced: 0,
            status: 'success',
        };

        try {
            // Read strategic context from Letta
            const executiveWorkspace = await lettaBlockManager.readBlock(
                tenantId,
                BLOCK_LABELS.EXECUTIVE_WORKSPACE as any
            );

            const brandContext = await lettaBlockManager.readBlock(
                tenantId,
                BLOCK_LABELS.BRAND_CONTEXT as any
            );

            // Parse and structure for RAG indexing
            const strategicChunks = this.parseStrategicContext(executiveWorkspace, brandContext);

            // Store in Firestore for RAG access
            const db = getAdminFirestore();
            const batch = db.batch();

            for (const chunk of strategicChunks) {
                const docRef = db.collection(STRATEGIC_CONTEXT_COLLECTION).doc();
                batch.set(docRef, {
                    tenantId,
                    content: chunk.content,
                    category: chunk.category,
                    source: 'letta_sync',
                    syncedAt: FieldValue.serverTimestamp(),
                    // Would add embedding here in production
                });
                record.itemsSynced++;
            }

            await batch.commit();

            logger.info(
                `[MemoryBridge] Synced ${record.itemsSynced} strategic chunks to Firestore for ${tenantId}`
            );
        } catch (error: any) {
            record.status = 'failed';
            record.error = error.message;
            logger.error('[MemoryBridge] Strategic sync failed:', error);
        }

        // Record sync
        await getAdminFirestore().collection(BRIDGE_COLLECTION).doc(record.id).set(record);

        return record;
    }

    /**
     * Sync business metrics from Firestore to Letta blocks.
     * This allows executive agents to access real-time business data.
     */
    async syncBusinessMetricsToLetta(tenantId: string): Promise<SyncRecord> {
        const syncId = `sync-${Date.now()}`;
        const record: SyncRecord = {
            id: syncId,
            tenantId,
            direction: 'firestore_to_letta',
            sourceType: 'business_metrics',
            targetType: 'executive_workspace',
            lastSyncAt: new Date(),
            itemsSynced: 0,
            status: 'success',
        };

        try {
            // Gather business metrics from various Firestore collections
            const metrics = await this.gatherBusinessMetrics(tenantId);

            // Format for Letta block
            const metricsContent = this.formatMetricsForBlock(metrics);

            // Update executive workspace block
            await lettaBlockManager.appendToBlock(
                tenantId,
                BLOCK_LABELS.EXECUTIVE_WORKSPACE as any,
                `\n\n📊 Business Metrics Update (${new Date().toISOString().split('T')[0]}):\n${metricsContent}`,
                'MemoryBridge'
            );

            record.itemsSynced = Object.keys(metrics).length;

            logger.info(
                `[MemoryBridge] Synced ${record.itemsSynced} metrics to Letta for ${tenantId}`
            );
        } catch (error: any) {
            record.status = 'failed';
            record.error = error.message;
            logger.error('[MemoryBridge] Metrics sync failed:', error);
        }

        await getAdminFirestore().collection(BRIDGE_COLLECTION).doc(record.id).set(record);

        return record;
    }

    /**
     * Sync customer insights from Letta conversations to Firestore.
     * Enables product search to be personalized based on customer history.
     */
    async syncCustomerInsightsToFirestore(
        tenantId: string,
        customerId: string,
        agentId: string
    ): Promise<SyncRecord> {
        const syncId = `sync-${Date.now()}`;
        const record: SyncRecord = {
            id: syncId,
            tenantId,
            direction: 'letta_to_firestore',
            sourceType: 'customer_conversations',
            targetType: 'customer_profile',
            lastSyncAt: new Date(),
            itemsSynced: 0,
            status: 'success',
        };

        try {
            // Get recent messages from Letta
            const messages = await lettaClient.getMessages(agentId, 50);

            // Extract customer preferences using simple heuristics
            const preferences = this.extractCustomerPreferences(messages);

            // Store in Firestore customer profile
            await db
                .collection('customers')
                .doc(customerId)
                .set(
                    {
                        preferences: preferences,
                        lastSyncedFromLetta: FieldValue.serverTimestamp(),
                    },
                    { merge: true }
                );

            record.itemsSynced = Object.keys(preferences).length;

            logger.info(
                `[MemoryBridge] Synced ${record.itemsSynced} preferences for customer ${customerId}`
            );
        } catch (error: any) {
            record.status = 'failed';
            record.error = error.message;
            logger.error('[MemoryBridge] Customer sync failed:', error);
        }

        await getAdminFirestore().collection(BRIDGE_COLLECTION).doc(record.id).set(record);

        return record;
    }

    /**
     * Unified query across both Letta and Firestore.
     * Use this when you need context from both systems.
     */
    async unifiedSearch(
        tenantId: string,
        query: string,
        options?: {
            agentId?: string;
            includeFirestore?: boolean;
            includeLetta?: boolean;
            limit?: number;
        }
    ): Promise<{
        lettaResults: string[];
        firestoreResults: Array<{ content: string; source: string }>;
    }> {
        const result = {
            lettaResults: [] as string[],
            firestoreResults: [] as Array<{ content: string; source: string }>,
        };

        const limit = options?.limit || 5;

        // Search Letta (if agent ID provided)
        if (options?.includeLetta !== false && options?.agentId) {
            try {
                result.lettaResults = await lettaClient.searchPassages(
                    options.agentId,
                    query,
                    limit
                );
            } catch (e) {
                logger.warn('[MemoryBridge] Letta search failed:', e);
            }
        }

        // Search Firestore strategic context
        if (options?.includeFirestore !== false) {
            try {
                // Simple text search (would use vector search in production)
                const snap = await db
                    .collection(STRATEGIC_CONTEXT_COLLECTION)
                    .where('tenantId', '==', tenantId)
                    .limit(limit)
                    .get();

                for (const doc of snap.docs) {
                    const data = doc.data();
                    // Basic relevance check
                    if (
                        data.content &&
                        data.content.toLowerCase().includes(query.toLowerCase().split(' ')[0])
                    ) {
                        result.firestoreResults.push({
                            content: data.content,
                            source: data.category || 'strategic_context',
                        });
                    }
                }
            } catch (e) {
                logger.warn('[MemoryBridge] Firestore search failed:', e);
            }
        }

        return result;
    }

    /**
     * Get sync history for a tenant.
     */
    async getSyncHistory(
        tenantId: string,
        limit: number = 10
    ): Promise<SyncRecord[]> {
        const snap = await db
            .collection(BRIDGE_COLLECTION)
            .where('tenantId', '==', tenantId)
            .orderBy('lastSyncAt', 'desc')
            .limit(limit)
            .get();

        return snap.docs.map(doc => ({
            ...doc.data(),
            lastSyncAt: doc.data().lastSyncAt?.toDate() || new Date(),
        })) as SyncRecord[];
    }

    /**
     * Run full bi-directional sync for a tenant.
     * Call this on a schedule (e.g., daily) or after major events.
     */
    async runFullSync(tenantId: string): Promise<{
        strategicSync: SyncRecord;
        metricsSync: SyncRecord;
    }> {
        logger.info(`[MemoryBridge] Running full sync for tenant ${tenantId}`);

        const [strategicSync, metricsSync] = await Promise.all([
            this.syncStrategicContextToFirestore(tenantId),
            this.syncBusinessMetricsToLetta(tenantId),
        ]);

        return { strategicSync, metricsSync };
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private parseStrategicContext(
        executiveWorkspace: string,
        brandContext: string
    ): Array<{ content: string; category: string }> {
        const chunks: Array<{ content: string; category: string }> = [];

        // Split by sections (assuming markdown-like structure)
        const sections = [
            { text: executiveWorkspace, prefix: 'executive' },
            { text: brandContext, prefix: 'brand' },
        ];

        for (const section of sections) {
            if (!section.text) continue;

            // Split by headers or double newlines
            const parts = section.text.split(/\n{2,}|(?=###)/);

            for (const part of parts) {
                const trimmed = part.trim();
                if (trimmed.length > 20) {
                    // Skip very short chunks
                    chunks.push({
                        content: trimmed,
                        category: section.prefix,
                    });
                }
            }
        }

        return chunks;
    }

    private async gatherBusinessMetrics(tenantId: string): Promise<Record<string, any>> {
        const metrics: Record<string, any> = {};

        try {
            // Example: Get order count
            const ordersSnap = await db
                .collection('orders')
                .where('tenantId', '==', tenantId)
                .where('createdAt', '>=', this.daysAgo(30))
                .count()
                .get();
            metrics.orders_last_30d = ordersSnap.data().count;
        } catch {
            metrics.orders_last_30d = 'unavailable';
        }

        try {
            // Example: Get customer count
            const customersSnap = await db
                .collection('customers')
                .where('tenantId', '==', tenantId)
                .count()
                .get();
            metrics.total_customers = customersSnap.data().count;
        } catch {
            metrics.total_customers = 'unavailable';
        }

        try {
            // Example: Get active playbooks
            const playbooksSnap = await db
                .collection('playbooks')
                .where('tenantId', '==', tenantId)
                .where('status', '==', 'active')
                .count()
                .get();
            metrics.active_playbooks = playbooksSnap.data().count;
        } catch {
            metrics.active_playbooks = 'unavailable';
        }

        return metrics;
    }

    private formatMetricsForBlock(metrics: Record<string, any>): string {
        return Object.entries(metrics)
            .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${value}`)
            .join('\n');
    }

    private extractCustomerPreferences(
        messages: Array<{ role: string; content: string }>
    ): Record<string, any> {
        const preferences: Record<string, any> = {};

        // Simple keyword extraction (would use NLP in production)
        const text = messages.map(m => m.content).join(' ').toLowerCase();

        // Product type preferences
        if (text.includes('indica')) preferences.preferred_type = 'indica';
        else if (text.includes('sativa')) preferences.preferred_type = 'sativa';
        else if (text.includes('hybrid')) preferences.preferred_type = 'hybrid';

        // Effect preferences
        const effects = ['relaxing', 'energizing', 'sleep', 'pain', 'anxiety', 'focus'];
        preferences.desired_effects = effects.filter(e => text.includes(e));

        // Price sensitivity
        if (text.includes('budget') || text.includes('cheap')) {
            preferences.price_sensitivity = 'high';
        } else if (text.includes('premium') || text.includes('best')) {
            preferences.price_sensitivity = 'low';
        }

        return preferences;
    }

    private daysAgo(days: number): Date {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date;
    }
}

export const memoryBridgeService = new MemoryBridgeService();

// =============================================================================
// SCHEDULED SYNC HELPER
// =============================================================================

/**
 * Call from /api/cron/tick to run memory bridge sync.
 */
export async function runScheduledMemoryBridgeSync(tenantId: string): Promise<void> {
    logger.info(`[MemoryBridge] Running scheduled sync for tenant ${tenantId}`);

    try {
        const result = await memoryBridgeService.runFullSync(tenantId);

        logger.info(
            `[MemoryBridge] Sync complete: strategic=${result.strategicSync.status}, metrics=${result.metricsSync.status}`
        );
    } catch (error) {
        logger.error('[MemoryBridge] Scheduled sync failed:', error);
    }
}
