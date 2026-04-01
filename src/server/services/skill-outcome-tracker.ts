/**
 * Skill Outcome Tracker (Layer 5)
 *
 * Fire-and-forget outcome recording + daily aggregate rollup.
 * Mirrors the proactive-outcome-service.ts + ProactiveOutcomeRecord pattern.
 *
 * Two-phase approach:
 *   1. recordSkillOutcome() — called immediately on human resolution (fast path)
 *   2. rollupSkillMetrics() — called by daily cron to aggregate outcomes
 *
 * Collections:
 *   skill_outcomes/{outcomeId}             — per-resolution events
 *   skill_metrics_daily/{date}/{skillName} — daily aggregates
 */

import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import type { SkillOutcomeRecord, SkillAggregateMetrics, SkillOutcomeType } from '@/types/skill-outcome';

// ============ Record a single outcome ============

/**
 * Fire-and-forget: records one outcome event per artifact resolution.
 * Errors are logged and swallowed — never thrown.
 */
export async function recordSkillOutcome(
    input: Omit<SkillOutcomeRecord, 'id' | 'createdAt'>
): Promise<SkillOutcomeRecord> {
    const db = getAdminFirestore();
    const now = Timestamp.now();

    const record: Omit<SkillOutcomeRecord, 'id'> = { ...input, createdAt: now };

    try {
        const docRef = await db.collection('skill_outcomes').add(record);
        logger.info('[skill-outcome-tracker] outcome recorded', {
            outcomeId: docRef.id,
            skillName: input.skillName,
            outcomeType: input.outcomeType,
            wasEdited: input.wasEdited,
        });
        return { id: docRef.id, ...record };
    } catch (err) {
        logger.error('[skill-outcome-tracker] failed to record outcome', { err, skillName: input.skillName });
        // Return a stub so callers don't need to handle null
        return { id: 'error', ...record };
    }
}

// ============ Edit distance ============

/**
 * Compute a normalized edit distance score between two skill artifact payloads.
 * 0 = identical, 1 = completely different.
 * Uses JSON string length as a fast proxy for MVP; upgrade to Levenshtein in v2.
 */
export function computeEditDistanceScore(
    original: unknown,
    edited: unknown
): number {
    const origStr = JSON.stringify(original ?? {});
    const editStr = JSON.stringify(edited ?? {});
    if (origStr === editStr) return 0;

    const maxLen = Math.max(origStr.length, editStr.length);
    if (maxLen === 0) return 0;

    // Character-level diff approximation
    let differences = 0;
    const minLen = Math.min(origStr.length, editStr.length);
    for (let i = 0; i < minLen; i++) {
        if (origStr[i] !== editStr[i]) differences++;
    }
    differences += Math.abs(origStr.length - editStr.length);

    return Math.min(1, differences / maxLen);
}

// ============ Daily rollup ============

/**
 * Aggregate all outcome events for a given date into SkillAggregateMetrics.
 * Called by the cron endpoint. Can be scoped to a single skillName.
 */
export async function rollupSkillMetrics(
    date: string,
    skillName?: string
): Promise<SkillAggregateMetrics[]> {
    const db = getAdminFirestore();
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = db.collection('skill_outcomes')
        .where('createdAt', '>=', Timestamp.fromDate(dayStart))
        .where('createdAt', '<=', Timestamp.fromDate(dayEnd));

    if (skillName) {
        query = query.where('skillName', '==', skillName);
    }

    const ROLLUP_LIMIT = 5000;
    const snap = await query.limit(ROLLUP_LIMIT).get();
    if (snap.empty) return [];
    if (snap.size === ROLLUP_LIMIT) {
        logger.warn('[skill-outcome-tracker] rollup hit limit — some outcomes may be excluded', { date, skillName, limit: ROLLUP_LIMIT });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outcomes: SkillOutcomeRecord[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as SkillOutcomeRecord));

    // Group by skillName
    const bySkill = new Map<string, SkillOutcomeRecord[]>();
    for (const outcome of outcomes) {
        const group = bySkill.get(outcome.skillName) ?? [];
        group.push(outcome);
        bySkill.set(outcome.skillName, group);
    }

    const metrics: SkillAggregateMetrics[] = [];
    const batch = db.batch();

    for (const [name, records] of bySkill.entries()) {
        const metric = computeMetrics(name, records, date);
        metrics.push(metric);

        const ref = db.collection('skill_metrics_daily').doc(date).collection('metrics').doc(name);
        batch.set(ref, metric, { merge: true });
    }

    await batch.commit();
    logger.info('[skill-outcome-tracker] rollup complete', { date, skillCount: metrics.length });
    return metrics;
}

// ============ Query metrics ============

export async function getSkillMetrics(
    skillName: string,
    periodDays = 30
): Promise<SkillAggregateMetrics[]> {
    const db = getAdminFirestore();
    const dates: string[] = [];
    for (let i = 0; i < periodDays; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }

    const results = await Promise.all(
        dates.map(async date => {
            const doc = await db
                .collection('skill_metrics_daily')
                .doc(date)
                .collection('metrics')
                .doc(skillName)
                .get().catch(() => null);
            return doc?.exists ? (doc.data() as SkillAggregateMetrics) : null;
        })
    );

    return results.filter((r): r is SkillAggregateMetrics => r !== null);
}

// ============ Internal helpers ============

function computeMetrics(
    skillName: string,
    records: SkillOutcomeRecord[],
    date: string
): SkillAggregateMetrics {
    const approved = records.filter(r => r.outcomeType === 'approved' || r.outcomeType === 'approved_with_edits');
    const rejected = records.filter(r => r.outcomeType === 'rejected');
    const autoApproved = records.filter(r => r.outcomeType === 'auto_approved');
    const edited = records.filter(r => r.wasEdited);

    const editDistanceScores = edited
        .map(r => r.editDistanceScore)
        .filter((s): s is number => s !== undefined);

    const resolutionTimes = records
        .map(r => r.timeToResolutionMs)
        .filter((t): t is number => t !== undefined);

    const rejectionReasonBreakdown: Record<string, number> = {};
    for (const r of rejected) {
        if (r.rejectionReason) {
            rejectionReasonBreakdown[r.rejectionReason] = (rejectionReasonBreakdown[r.rejectionReason] ?? 0) + 1;
        }
    }

    return {
        skillName,
        periodStart: date,
        periodEnd: date,
        approvalCount: approved.length,
        rejectionCount: rejected.length,
        autoApprovalCount: autoApproved.length,
        editRate: records.length > 0 ? edited.length / records.length : 0,
        avgEditDistanceScore: editDistanceScores.length > 0
            ? editDistanceScores.reduce((a, b) => a + b, 0) / editDistanceScores.length
            : 0,
        avgTimeToResolutionMs: resolutionTimes.length > 0
            ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
            : 0,
        rejectionReasonBreakdown,
        sampleCount: records.length,
        computedAt: Timestamp.now(),
    };
}
