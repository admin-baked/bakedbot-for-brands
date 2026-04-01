/**
 * Playbook Handler Registry
 *
 * Maps handler keys (stored on playbook_assignments.handler) to async
 * functions. Each handler receives a ScheduledPlaybookContext and is
 * responsible for its own delivery (email / Slack / inbox notification).
 *
 * To add a new handler:
 *   1. Create src/server/playbooks/handlers/<name>.ts
 *   2. Import and register it below
 */

import type { Firestore } from 'firebase-admin/firestore';
import type { HandlerKey } from './scheduler';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledPlaybookContext {
    /** Firestore doc ID of the playbook_assignments document */
    assignmentId: string;
    orgId: string;
    playbookId: string;
    /** Handler-specific config stored on the assignment doc */
    config: Record<string, unknown>;
    firestore: Firestore;
}

export type PlaybookHandler = (ctx: ScheduledPlaybookContext) => Promise<void>;

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

type HandlerMap = Record<HandlerKey | string, PlaybookHandler>;

// Lazily populated on first access to avoid circular imports at module load
let _registry: HandlerMap | null = null;

async function getRegistry(): Promise<HandlerMap> {
    if (_registry) return _registry;

    const [
        { handleDailyRecap },
        { handleRevenuePaceAlert },
        { handleCheckinDigest },
        { handleCompetitiveSnapshot },
        { handleWeeklyLoyaltyHealth },
        { handleCustomReport },
    ] = await Promise.all([
        import('./handlers/daily-recap'),
        import('./handlers/revenue-pace-alert'),
        import('./handlers/checkin-digest'),
        import('./handlers/competitive-snapshot'),
        import('./handlers/weekly-loyalty-health'),
        import('./handlers/custom-report'),
    ]);

    _registry = {
        'daily-recap':           handleDailyRecap,
        'revenue-pace-alert':    handleRevenuePaceAlert,
        'checkin-digest':        handleCheckinDigest,
        'competitive-snapshot':  handleCompetitiveSnapshot,
        'weekly-loyalty-health': handleWeeklyLoyaltyHealth,
        'custom-report':         handleCustomReport,
    };

    return _registry;
}

/**
 * Look up and run a handler by key. Returns false if handler not found.
 */
export async function runHandler(
    handlerKey: string,
    ctx: ScheduledPlaybookContext
): Promise<boolean> {
    const registry = await getRegistry();
    const handler = registry[handlerKey];
    if (!handler) return false;
    await handler(ctx);
    return true;
}
