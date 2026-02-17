/**
 * Real-time Audit Log Streaming Service
 *
 * Provides live Firestore audit log updates via Server-Sent Events (SSE).
 * Super User agents can stream audit logs to monitor system actions in real-time.
 *
 * Usage:
 *   const stream = streamAuditLogs({ limit: 100, filter: { action: 'user_approved' } });
 *   stream.onData((log) => {
 *       console.log('New audit log:', log);
 *   });
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

interface AuditLog {
    id: string;
    action: string;           // 'user_approved', 'campaign_scheduled', 'config_updated'
    actor: string;            // Email or system identity
    resource: string;         // What was affected (user_id, campaign_id, etc.)
    resourceType: string;     // Type: 'user', 'campaign', 'config', etc.
    status: 'success' | 'failed';
    timestamp: Date;
    details?: Record<string, any>;
    ipAddress?: string;
}

interface AuditLogFilter {
    action?: string | string[];     // Filter by action(s)
    actor?: string;                 // Filter by actor email
    status?: 'success' | 'failed';
    minDate?: Date;
    maxDate?: Date;
}

interface StreamOptions {
    limit?: number;            // Max initial logs to return (default: 50)
    filter?: AuditLogFilter;   // Optional filtering
    returnHistorical?: boolean; // Return existing logs first (default: true)
}

interface StreamCallback {
    onData: (log: AuditLog) => void;
    onError?: (error: Error) => void;
    onComplete?: () => void;
}

class AuditLogStreamingService {
    private listeners = new Map<string, any>();
    private streamCount = 0;

    /**
     * Create a stream listener for real-time audit logs
     * Returns unsubscribe function to stop listening
     */
    streamAuditLogs(
        callbacks: StreamCallback,
        options: StreamOptions = {}
    ): () => void {
        const streamId = `stream_${++this.streamCount}`;
        const {
            limit = 50,
            filter = {},
            returnHistorical = true,
        } = options;

        logger.info(`[Audit Log Stream] Starting stream ${streamId}`, { filter, limit });

        const db = getAdminFirestore();
        let query = db.collection('audit_logs').orderBy('timestamp', 'desc');

        // Apply filters
        if (filter.action) {
            const actions = Array.isArray(filter.action) ? filter.action : [filter.action];
            // Firestore doesn't support OR in where clauses, so we'll filter in memory
        }
        if (filter.actor) {
            query = query.where('actor', '==', filter.actor);
        }
        if (filter.status) {
            query = query.where('status', '==', filter.status);
        }

        // Return historical logs first
        if (returnHistorical) {
            query.limit(limit).get()
                .then(snapshot => {
                    const logs = snapshot.docs
                        .map(doc => this.docToAuditLog(doc))
                        .filter(log => this.matchesFilter(log, filter.action));

                    logs.forEach(log => callbacks.onData(log));
                    logger.debug(`[Audit Log Stream] Returned ${logs.length} historical logs for stream ${streamId}`);
                })
                .catch(error => {
                    logger.error(`[Audit Log Stream] Failed to fetch historical logs:`, error);
                    callbacks.onError?.(error);
                });
        }

        // Listen for new logs in real-time
        const unsubscribe = query.onSnapshot(
            (snapshot) => {
                // Skip if this is the initial snapshot (we already returned historical logs)
                if (returnHistorical && snapshot.metadata.hasPendingWrites === false) {
                    return;
                }

                snapshot.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const log = this.docToAuditLog(change.doc);
                        if (this.matchesFilter(log, filter.action)) {
                            callbacks.onData(log);
                        }
                    }
                });
            },
            (error) => {
                logger.error(`[Audit Log Stream] Firestore listener error:`, error);
                callbacks.onError?.(error);
            }
        );

        // Store listener for cleanup
        this.listeners.set(streamId, unsubscribe);

        // Return unsubscribe function
        return () => {
            unsubscribe();
            this.listeners.delete(streamId);
            logger.info(`[Audit Log Stream] Stopped stream ${streamId}`);
        };
    }

    /**
     * Create a log entry in Firestore (typically called after mutations)
     */
    async logAction(
        action: string,
        actor: string,
        resource: string,
        resourceType: string,
        status: 'success' | 'failed' = 'success',
        details?: Record<string, any>
    ): Promise<string> {
        try {
            const db = getAdminFirestore();
            const docRef = await db.collection('audit_logs').add({
                action,
                actor,
                resource,
                resourceType,
                status,
                timestamp: new Date(),
                details: details || {},
            });

            logger.debug(`[Audit Log] Logged action: ${action} by ${actor}`);
            return docRef.id;
        } catch (error) {
            logger.error(`[Audit Log] Failed to log action:`, error);
            throw error;
        }
    }

    /**
     * Bulk log multiple actions (e.g., batch approval)
     */
    async logActionBatch(
        actions: Array<{
            action: string;
            actor: string;
            resource: string;
            resourceType: string;
            status?: 'success' | 'failed';
            details?: Record<string, any>;
        }>
    ): Promise<string[]> {
        try {
            const db = getAdminFirestore();
            const batch = db.batch();

            const ids: string[] = [];
            actions.forEach(action => {
                const docRef = db.collection('audit_logs').doc();
                batch.set(docRef, {
                    action: action.action,
                    actor: action.actor,
                    resource: action.resource,
                    resourceType: action.resourceType,
                    status: action.status || 'success',
                    timestamp: new Date(),
                    details: action.details || {},
                });
                ids.push(docRef.id);
            });

            await batch.commit();
            logger.info(`[Audit Log] Batch logged ${actions.length} actions`);
            return ids;
        } catch (error) {
            logger.error(`[Audit Log] Failed to batch log actions:`, error);
            throw error;
        }
    }

    /**
     * Query audit logs with advanced filtering (for non-real-time access)
     */
    async queryAuditLogs(
        filter: AuditLogFilter = {},
        limit: number = 100
    ): Promise<AuditLog[]> {
        try {
            const db = getAdminFirestore();
            let query = db.collection('audit_logs').orderBy('timestamp', 'desc');

            if (filter.actor) {
                query = query.where('actor', '==', filter.actor);
            }
            if (filter.status) {
                query = query.where('status', '==', filter.status);
            }

            const snapshot = await query.limit(limit).get();

            const logs = snapshot.docs
                .map(doc => this.docToAuditLog(doc))
                .filter(log => this.matchesFilter(log, filter.action));

            return logs;
        } catch (error) {
            logger.error(`[Audit Log] Failed to query logs:`, error);
            throw error;
        }
    }

    /**
     * Get audit log statistics (actions by type, actor, etc.)
     */
    async getAuditStats(daysBack: number = 7): Promise<{
        totalActions: number;
        actionBreakdown: Record<string, number>;
        actorBreakdown: Record<string, number>;
        successRate: number;
    }> {
        try {
            const db = getAdminFirestore();
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - daysBack);

            const snapshot = await db
                .collection('audit_logs')
                .where('timestamp', '>=', sinceDate)
                .get();

            const logs = snapshot.docs.map(doc => this.docToAuditLog(doc));

            const stats = {
                totalActions: logs.length,
                actionBreakdown: {} as Record<string, number>,
                actorBreakdown: {} as Record<string, number>,
                successRate: 0,
            };

            let successCount = 0;
            logs.forEach(log => {
                // Count by action
                stats.actionBreakdown[log.action] = (stats.actionBreakdown[log.action] || 0) + 1;

                // Count by actor
                stats.actorBreakdown[log.actor] = (stats.actorBreakdown[log.actor] || 0) + 1;

                // Count successes
                if (log.status === 'success') successCount++;
            });

            stats.successRate = logs.length > 0 ? (successCount / logs.length) * 100 : 0;

            return stats;
        } catch (error) {
            logger.error(`[Audit Log] Failed to get stats:`, error);
            throw error;
        }
    }

    /**
     * Convert Firestore document to AuditLog
     */
    private docToAuditLog(doc: any): AuditLog {
        const data = doc.data();
        return {
            id: doc.id,
            action: data.action,
            actor: data.actor,
            resource: data.resource,
            resourceType: data.resourceType || 'unknown',
            status: data.status || 'success',
            timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
            details: data.details || {},
            ipAddress: data.ipAddress,
        };
    }

    /**
     * Check if log matches filter (handles action array)
     */
    private matchesFilter(log: AuditLog, actionFilter?: string | string[]): boolean {
        if (!actionFilter) return true;
        const actions = Array.isArray(actionFilter) ? actionFilter : [actionFilter];
        return actions.includes(log.action);
    }

    /**
     * Get stream statistics
     */
    getStats() {
        return {
            activeStreams: this.listeners.size,
            totalStreamsCreated: this.streamCount,
        };
    }

    /**
     * Stop all streams (cleanup)
     */
    stopAllStreams(): void {
        this.listeners.forEach((unsubscribe) => {
            unsubscribe();
        });
        this.listeners.clear();
        logger.info(`[Audit Log Stream] Stopped all ${this.streamCount} streams`);
    }
}

// Singleton instance
const auditLogStreaming = new AuditLogStreamingService();

export { AuditLogStreamingService, auditLogStreaming, AuditLog, AuditLogFilter, StreamOptions, StreamCallback };
