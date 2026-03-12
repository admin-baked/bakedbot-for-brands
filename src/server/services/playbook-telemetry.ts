/**
 * Playbook Telemetry Service
 *
 * Implements the telemetry requirements defined in the Build Package.
 * - Fire-and-forget TTL-managed metrics collection
 * - Run tracking, token usage, error rates
 *
 * Data goes to playbook_telemetry/{eventId} in Firestore.
 */

import { randomUUID } from 'crypto';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export interface TelemetryEvent {
    id: string;
    playbookId: string;
    runId: string;
    stageName?: string;
    metrics: {
        durationMs: number;
        tokenInput?: number;
        tokenOutput?: number;
        toolCalls?: number;
        attempt?: number;
    };
    success: boolean;
    errorCode?: string;
    createdAt: string;
}

export class PlaybookTelemetryService {
    private get db() {
        return getAdminFirestore();
    }

    /**
     * Fire and forget method to write telemetry data.
     */
    async recordEvent(event: Omit<TelemetryEvent, 'id' | 'createdAt'>): Promise<void> {
        const id = `tel_${randomUUID()}`;
        const createdAt = new Date().toISOString();

        const fullEvent: TelemetryEvent = {
            ...event,
            id,
            createdAt
        };

        try {
            // Write to TTL-managed top-level collection
            await this.db.collection('playbook_telemetry').doc(id).set(fullEvent);
            logger.debug('[Telemetry] Event recorded', { runId: event.runId, stageName: event.stageName });
        } catch (error) {
            logger.warn('[Telemetry] Failed to record event', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}

export const playbookTelemetry = new PlaybookTelemetryService();
