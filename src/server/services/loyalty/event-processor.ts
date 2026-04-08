/**
 * Club Event Processor — code-first trigger registry.
 *
 * Evaluates a ClubEvent against a set of trigger definitions and executes
 * matching actions. This is the reactive backbone of BakedBot Club.
 *
 * Design principles (from PRD):
 *   - Events are append-only facts
 *   - Triggers answer: what happened, who, should we react, what action, needs approval?
 *   - Code-first triggers, admin-visible results
 *   - Four layers: instant UX, staff assist, revenue/retention, compliance
 */

import { getAdminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import type { ClubEvent, EventType, Reward, Task } from '@/types/club';
import { PointsService } from './points-service';
import { RewardService } from './reward-service';

// ─────────────────────────────────────────────────────────────────────────────
// Trigger definition
// ─────────────────────────────────────────────────────────────────────────────

type TriggerAction =
    | { type: 'award_points'; points: number; reason: string }
    | { type: 'unlock_reward'; rewardType: Reward['rewardType']; title: string; description: string; value?: Reward['value'] }
    | { type: 'create_task'; taskType: Task['type']; title: string; description: string }
    | { type: 'log'; message: string };

interface TriggerRule {
    id: string;
    eventType: EventType;
    label: string;
    layer: 'instant' | 'staff_assist' | 'retention' | 'compliance';
    condition?: (event: ClubEvent) => boolean | Promise<boolean>;
    actions: TriggerAction[];
    requiresApproval: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger execution record (audit trail)
// ─────────────────────────────────────────────────────────────────────────────

interface TriggerExecution {
    id: string;
    eventId: string;
    triggerId: string;
    triggerLabel: string;
    organizationId: string;
    actionsExecuted: string[];
    status: 'executed' | 'skipped' | 'failed';
    error?: string;
    executedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MVP Trigger Pack
// ─────────────────────────────────────────────────────────────────────────────

const TRIGGER_REGISTRY: TriggerRule[] = [
    // ── Layer 1: Instant UX ──

    {
        id: 'trg_enrollment_welcome_bonus',
        eventType: 'member_enrollment_completed',
        label: 'Welcome bonus points on enrollment',
        layer: 'instant',
        actions: [
            { type: 'award_points', points: 50, reason: 'welcome_bonus' },
            { type: 'log', message: 'Welcome bonus awarded' },
        ],
        requiresApproval: false,
    },

    {
        id: 'trg_visit_5_perk',
        eventType: 'visit_opened',
        label: 'Unlock loyalty perk on 5th visit',
        layer: 'instant',
        condition: async (event) => {
            const db = getAdminFirestore();
            const snap = await db.collection('visit_sessions')
                .where('organizationId', '==', event.organizationId)
                .where('memberId', '==', event.actor.id)
                .where('status', 'in', ['completed', 'opened', 'recognized', 'attached_to_cart'])
                .count()
                .get();
            return snap.data().count === 5;
        },
        actions: [
            {
                type: 'unlock_reward',
                rewardType: 'tier_perk',
                title: '5-Visit Reward: $5 Off',
                description: 'Thanks for 5 visits! Enjoy $5 off your next purchase.',
                value: { amountOffCents: 500 },
            },
        ],
        requiresApproval: false,
    },

    // ── Layer 2: Staff Assist ──

    {
        id: 'trg_pass_lookup_failed_task',
        eventType: 'pass_lookup_failed',
        label: 'Create staff task on failed pass lookup',
        layer: 'staff_assist',
        actions: [
            {
                type: 'create_task',
                taskType: 'staff_followup',
                title: 'Pass lookup failed — assist customer',
                description: 'A customer could not find their pass. Help them recover or re-enroll.',
            },
        ],
        requiresApproval: false,
    },

    // ── Layer 3: Revenue & Retention ──

    {
        id: 'trg_transaction_points',
        eventType: 'transaction_completed',
        label: 'Award points on purchase (1pt per dollar)',
        layer: 'retention',
        actions: [
            { type: 'award_points', points: 0, reason: 'purchase' }, // points calculated from payload
            { type: 'log', message: 'Purchase points awarded' },
        ],
        requiresApproval: false,
    },

    {
        id: 'trg_first_purchase_milestone',
        eventType: 'transaction_completed',
        label: 'First purchase milestone reward',
        layer: 'retention',
        condition: async (event) => {
            const db = getAdminFirestore();
            const snap = await db.collection('club_events')
                .where('organizationId', '==', event.organizationId)
                .where('type', '==', 'transaction_completed')
                .where('actor.id', '==', event.actor.id)
                .count()
                .get();
            return snap.data().count === 1; // This IS the first one
        },
        actions: [
            {
                type: 'unlock_reward',
                rewardType: 'tier_perk',
                title: 'First Purchase: 15% Off Next Visit',
                description: 'Congrats on your first purchase! Come back for 15% off.',
                value: { percentOff: 15 },
            },
        ],
        requiresApproval: false,
    },

    // ── Layer 4: Compliance ──

    {
        id: 'trg_pos_sync_failed_task',
        eventType: 'pos_sync_failed',
        label: 'Create reconciliation task on POS sync failure',
        layer: 'compliance',
        actions: [
            {
                type: 'create_task',
                taskType: 'pos_reconciliation',
                title: 'POS sync failed — reconciliation needed',
                description: 'A POS transaction sync failed. Review and reconcile manually.',
            },
        ],
        requiresApproval: false,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Action executors
// ─────────────────────────────────────────────────────────────────────────────

async function executeAction(
    action: TriggerAction,
    event: ClubEvent,
): Promise<string> {
    const db = getAdminFirestore();
    const now = new Date().toISOString();

    switch (action.type) {
        case 'award_points': {
            let points = action.points;
            // For purchase points, calculate from payload
            if (action.reason === 'purchase' && event.payload?.totalCents) {
                points = Math.floor(Number(event.payload.totalCents) / 100);
            }
            if (points <= 0) return 'skipped:zero_points';

            // Resolve membershipId from event
            const memberSnap = await db.collection('memberships')
                .where('organizationId', '==', event.organizationId)
                .where('memberId', '==', event.actor.id)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (memberSnap.empty) return 'skipped:no_membership';

            await PointsService.award({
                organizationId: event.organizationId,
                memberId: event.actor.id,
                membershipId: memberSnap.docs[0].id,
                points,
                reason: action.reason as 'purchase' | 'welcome_bonus',
                visitSessionId: event.subject.type === 'visit_session' ? event.subject.id : undefined,
                transactionId: event.subject.type === 'transaction' ? event.subject.id : undefined,
            });
            return `awarded:${points}pts`;
        }

        case 'unlock_reward': {
            const memberSnap = await db.collection('memberships')
                .where('organizationId', '==', event.organizationId)
                .where('memberId', '==', event.actor.id)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            if (memberSnap.empty) return 'skipped:no_membership';

            const rewardId = `reward_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
            const reward: Reward = {
                id: rewardId,
                organizationId: event.organizationId,
                memberId: event.actor.id,
                membershipId: memberSnap.docs[0].id,
                rewardType: action.rewardType,
                title: action.title,
                description: action.description,
                status: 'available',
                value: action.value,
                issuedAt: now,
                availableAt: now,
                createdAt: now,
                updatedAt: now,
            };

            await db.collection('rewards').doc(rewardId).set(reward);
            return `unlocked:${rewardId}`;
        }

        case 'create_task': {
            const taskId = `task_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
            const task: Task = {
                id: taskId,
                organizationId: event.organizationId,
                storeId: event.storeId,
                memberId: event.actor.type === 'member' ? event.actor.id : undefined,
                visitSessionId: event.subject.type === 'visit_session' ? event.subject.id : undefined,
                type: action.taskType,
                title: action.title,
                description: action.description,
                state: 'ready',
                createdAt: now,
                updatedAt: now,
            };

            await db.collection('tasks').doc(taskId).set(task);
            return `task:${taskId}`;
        }

        case 'log': {
            logger.info(`[EventProcessor] ${action.message}`, {
                eventId: event.id,
                orgId: event.organizationId,
                actor: event.actor.id,
            });
            return 'logged';
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main processor — evaluates all triggers for a given event
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a ClubEvent through the trigger registry.
 * Returns the list of trigger executions for audit.
 */
export async function processClubEvent(event: ClubEvent): Promise<TriggerExecution[]> {
    const matching = TRIGGER_REGISTRY.filter(t => t.eventType === event.type);
    if (matching.length === 0) return [];

    const db = getAdminFirestore();
    const executions: TriggerExecution[] = [];

    for (const trigger of matching) {
        const execId = `texec_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
        const now = new Date().toISOString();

        try {
            // Evaluate condition
            if (trigger.condition) {
                const shouldFire = await trigger.condition(event);
                if (!shouldFire) {
                    executions.push({
                        id: execId,
                        eventId: event.id,
                        triggerId: trigger.id,
                        triggerLabel: trigger.label,
                        organizationId: event.organizationId,
                        actionsExecuted: [],
                        status: 'skipped',
                        executedAt: now,
                    });
                    continue;
                }
            }

            // Execute all actions
            const results: string[] = [];
            for (const action of trigger.actions) {
                const result = await executeAction(action, event);
                results.push(result);
            }

            const execution: TriggerExecution = {
                id: execId,
                eventId: event.id,
                triggerId: trigger.id,
                triggerLabel: trigger.label,
                organizationId: event.organizationId,
                actionsExecuted: results,
                status: 'executed',
                executedAt: now,
            };

            // Persist execution for audit trail
            await db.collection('trigger_executions').doc(execId).set(execution);
            executions.push(execution);

            logger.info('[EventProcessor] Trigger executed', {
                triggerId: trigger.id,
                eventId: event.id,
                actions: results,
            });
        } catch (err) {
            const execution: TriggerExecution = {
                id: execId,
                eventId: event.id,
                triggerId: trigger.id,
                triggerLabel: trigger.label,
                organizationId: event.organizationId,
                actionsExecuted: [],
                status: 'failed',
                error: err instanceof Error ? err.message : String(err),
                executedAt: now,
            };

            await db.collection('trigger_executions').doc(execId).set(execution).catch(() => {});
            executions.push(execution);

            logger.error('[EventProcessor] Trigger failed', {
                triggerId: trigger.id,
                eventId: event.id,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    return executions;
}

/**
 * Emit and process a ClubEvent in one call.
 * Writes the event to Firestore, then runs it through the trigger registry.
 */
export async function emitClubEvent(event: ClubEvent): Promise<TriggerExecution[]> {
    const db = getAdminFirestore();
    await db.collection('club_events').doc(event.id).set(event);
    return processClubEvent(event);
}

/**
 * Get the trigger registry for admin visibility.
 */
export function getTriggerRegistry(): Array<{
    id: string;
    eventType: EventType;
    label: string;
    layer: string;
    requiresApproval: boolean;
    actionTypes: string[];
}> {
    return TRIGGER_REGISTRY.map(t => ({
        id: t.id,
        eventType: t.eventType,
        label: t.label,
        layer: t.layer,
        requiresApproval: t.requiresApproval,
        actionTypes: t.actions.map(a => a.type),
    }));
}
