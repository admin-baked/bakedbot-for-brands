/**
 * Marty Objectives Service
 *
 * Manages the weekly task board that Marty generates every Monday.
 * Short-term objectives (1-5 days) and long-term objectives (1-4 weeks)
 * are written to the `marty_objectives` Firestore collection.
 *
 * Flow:
 *   Monday 7AM   → writeWeeklyObjectives() called by weekly-monday-command
 *   Wednesday 2PM → getWeekObjectives() read in wednesday-check inspection
 *   Friday 4PM   → scoreWeeklyObjectives() marks hit/missed in friday-memo
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';

export type ObjectiveStatus = 'open' | 'in_progress' | 'hit' | 'missed' | 'carry_forward';
export type ObjectiveType = 'short_term' | 'long_term';

export interface MartyObjective {
    id: string;
    weekOf: string;          // YYYY-MM-DD (Monday of the week)
    type: ObjectiveType;
    agent: string;           // agent ID responsible
    task: string;            // human-readable description
    metric: string;          // what "done" looks like
    target: string;          // goal value (string to support numeric + boolean)
    current: string | null;  // current value, updated by crons
    status: ObjectiveStatus;
    createdAt: Date;
    updatedAt: Date;
    notes?: string;
}

/** Returns the ISO date string (YYYY-MM-DD) for the Monday of the given date. */
export function getMondayOfWeek(date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day; // days back to Monday
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
}

/**
 * Write a new batch of weekly objectives to Firestore.
 * Idempotent — if objectives for this weekOf already exist, skip (don't overwrite mid-week edits).
 */
export async function writeWeeklyObjectives(
    weekOf: string,
    objectives: Array<Omit<MartyObjective, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
    const db = getAdminFirestore();

    // Check if this week already has objectives
    const existing = await db.collection('marty_objectives')
        .where('weekOf', '==', weekOf)
        .limit(1)
        .get();

    if (!existing.empty) {
        logger.info('[MartyObjectives] Objectives already exist for week, skipping write', { weekOf });
        return;
    }

    const now = new Date();
    const batch = db.batch();

    for (const obj of objectives) {
        const ref = db.collection('marty_objectives').doc();
        batch.set(ref, {
            ...obj,
            id: ref.id,
            current: null,
            status: 'open',
            createdAt: now,
            updatedAt: now,
        });
    }

    await batch.commit();
    logger.info('[MartyObjectives] Wrote weekly objectives', { weekOf, count: objectives.length });
}

/** Read all objectives for a given weekOf date string. */
export async function getWeekObjectives(weekOf: string): Promise<MartyObjective[]> {
    const db = getAdminFirestore();
    const snap = await db.collection('marty_objectives')
        .where('weekOf', '==', weekOf)
        .orderBy('type', 'asc')
        .get();
    return snap.docs.map(d => d.data() as MartyObjective);
}

/** Update progress on a single objective. */
export async function updateObjectiveStatus(
    id: string,
    status: ObjectiveStatus,
    current?: string
): Promise<void> {
    const db = getAdminFirestore();
    const update: Record<string, unknown> = { status, updatedAt: new Date() };
    if (current !== undefined) update.current = current;
    await db.collection('marty_objectives').doc(id).update(update);
}

/**
 * Score all open objectives for a week based on Claude's end-of-week assessment.
 * Updates each objective status to hit/missed/carry_forward.
 */
export async function scoreWeeklyObjectives(
    weekOf: string,
    scores: Array<{ id: string; status: ObjectiveStatus; current?: string; notes?: string }>
): Promise<void> {
    const db = getAdminFirestore();
    const now = new Date();
    const batch = db.batch();

    for (const score of scores) {
        const ref = db.collection('marty_objectives').doc(score.id);
        const update: Record<string, unknown> = {
            status: score.status,
            updatedAt: now,
        };
        if (score.current !== undefined) update.current = score.current;
        if (score.notes) update.notes = score.notes;
        batch.update(ref, update);
    }

    await batch.commit();
    logger.info('[MartyObjectives] Scored weekly objectives', { weekOf, count: scores.length });
}

/** Build a markdown scoreboard string for posting in cron memos. */
export function buildObjectivesScoreboard(objectives: MartyObjective[]): string {
    if (objectives.length === 0) return 'No objectives set for this week.';

    const shortTerm = objectives.filter(o => o.type === 'short_term');
    const longTerm = objectives.filter(o => o.type === 'long_term');

    const statusEmoji: Record<ObjectiveStatus, string> = {
        open: '⬜',
        in_progress: '🔵',
        hit: '✅',
        missed: '❌',
        carry_forward: '➡️',
    };

    const formatRow = (o: MartyObjective) =>
        `${statusEmoji[o.status]} [${o.agent.toUpperCase()}] ${o.task} — ${o.metric}: ${o.current ?? '?'} / ${o.target}`;

    const lines: string[] = [];
    if (shortTerm.length > 0) {
        lines.push('**This Week (Short-Term):**');
        lines.push(...shortTerm.map(formatRow));
    }
    if (longTerm.length > 0) {
        lines.push('**Ongoing (Long-Term):**');
        lines.push(...longTerm.map(formatRow));
    }

    const hitCount = objectives.filter(o => o.status === 'hit').length;
    const totalClosed = objectives.filter(o => o.status === 'hit' || o.status === 'missed').length;
    if (totalClosed > 0) {
        lines.push(`\n_Score: ${hitCount}/${totalClosed} objectives hit this week._`);
    }

    return lines.join('\n');
}
