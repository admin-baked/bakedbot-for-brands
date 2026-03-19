'use server';

/**
 * Customer Visit Cohort Analytics
 *
 * Computes visit-frequency funnel: of customers active in a period,
 * what % made 1 visit, came back for 2nd, 3rd, 4th, 5+ visits.
 *
 * Used by:
 *   - Pops analytics tool (customer_visit_cohort)
 *   - CEO dashboard analytics panel (getCustomerVisitCohort server action)
 *   - Morning briefing cron (weekly proactive inbox card)
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { createInboxArtifactId, createInboxThreadId } from '@/types/inbox';

// ============ Types ============

export interface CohortBucket {
    visits: number;         // ordinal (1, 2, 3, 4, 5 = "5+")
    label: string;          // "1st Visit", "2nd Visit", etc.
    count: number;          // number of customers at this bucket
    pct: number;            // % of all customers in period (0-100)
    dropoffPct: number | null; // % lost vs prior bucket (null for 1st)
    retentionPct: number | null; // % retained from prior bucket (null for 1st)
}

export interface CustomerVisitCohortResult {
    orgId: string;
    daysBack: number;
    periodLabel: string;    // "Last 90 days"
    totalCustomers: number;
    buckets: CohortBucket[];
    topDropoffVisit: number; // visit # with highest dropoff (e.g. 1 = "1st→2nd has worst drop")
    topDropoffPct: number;   // dropout % at that step
    repeatCustomerRate: number; // % with 2+ visits
    summary: string;        // Pops AI text summary
    generatedAt: string;    // ISO timestamp
}

// ============ Core computation (no auth — callable from cron + server actions) ============

export async function computeCohortData(
    orgId: string,
    daysBack: 90 | 180 | 365
): Promise<CustomerVisitCohortResult> {
    const db = getAdminFirestore();
    const now = new Date();
    const cutoff = new Date(now.getTime() - daysBack * 86_400_000);

    logger.info('[CohortAnalytics] Computing visit cohort', { orgId, daysBack });

    // Query customers active in the period (lastOrderDate >= cutoff)
    // We use the pre-cached orderCount field on CustomerProfile.
    const snap = await db
        .collection('customers')
        .where('orgId', '==', orgId)
        .where('archived', '!=', true)
        .get();

    // Filter to customers active in the period
    const activeDocs = snap.docs.filter(doc => {
        const data = doc.data();
        if (data.archived === true) return false;
        // Include if lastOrderDate >= cutoff OR firstOrderDate >= cutoff
        const lastOrder = toDate(data.lastOrderDate);
        const firstOrder = toDate(data.firstOrderDate);
        if (lastOrder && lastOrder >= cutoff) return true;
        if (firstOrder && firstOrder >= cutoff) return true;
        return false;
    });

    const total = activeDocs.length;

    if (total === 0) {
        const empty: CohortBucket[] = [1, 2, 3, 4, 5].map(v => ({
            visits: v,
            label: visitLabel(v),
            count: 0,
            pct: 0,
            dropoffPct: null,
            retentionPct: null,
        }));
        return {
            orgId,
            daysBack,
            periodLabel: periodLabel(daysBack),
            totalCustomers: 0,
            buckets: empty,
            topDropoffVisit: 1,
            topDropoffPct: 0,
            repeatCustomerRate: 0,
            summary: 'No customer visit data available for this period. Connect your POS system to enable cohort analysis.',
            generatedAt: now.toISOString(),
        };
    }

    // Bucket by orderCount: 1, 2, 3, 4, 5+
    const counts = [0, 0, 0, 0, 0]; // index 0=1visit, 1=2visits, 2=3visits, 3=4visits, 4=5+
    for (const doc of activeDocs) {
        const orderCount = (doc.data().orderCount as number) || 1;
        const idx = Math.min(orderCount, 5) - 1;
        counts[idx]++;
    }

    // Cumulative counts at each threshold (customers who reached >= N visits)
    // reachedN[i] = customers who had at least (i+1) visits
    const reached = [
        counts[0] + counts[1] + counts[2] + counts[3] + counts[4], // >= 1
        counts[1] + counts[2] + counts[3] + counts[4],               // >= 2
        counts[2] + counts[3] + counts[4],                            // >= 3
        counts[3] + counts[4],                                         // >= 4
        counts[4],                                                     // >= 5
    ];

    const buckets: CohortBucket[] = reached.map((count, i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const prevCount = i === 0 ? total : reached[i - 1];
        const dropoffCount = prevCount - count;
        const dropoffPct = i === 0 ? null : (prevCount > 0 ? Math.round((dropoffCount / prevCount) * 100) : 0);
        const retentionPct = i === 0 ? null : (prevCount > 0 ? Math.round((count / prevCount) * 100) : 0);
        return {
            visits: i + 1,
            label: visitLabel(i + 1),
            count,
            pct,
            dropoffPct,
            retentionPct,
        };
    });

    // Find biggest dropoff step (1→2, 2→3, 3→4, 4→5+)
    let topDropoffVisit = 1;
    let topDropoffPct = 0;
    for (const b of buckets) {
        if (b.dropoffPct !== null && b.dropoffPct > topDropoffPct) {
            topDropoffPct = b.dropoffPct;
            topDropoffVisit = b.visits - 1; // drop happens between (visits-1) and visits
        }
    }

    const repeatCount = reached[1]; // customers with >= 2 visits
    const repeatCustomerRate = Math.round((repeatCount / total) * 100);

    const summary = buildSummary(buckets, topDropoffVisit, topDropoffPct, repeatCustomerRate, daysBack, total);

    return {
        orgId,
        daysBack,
        periodLabel: periodLabel(daysBack),
        totalCustomers: total,
        buckets,
        topDropoffVisit,
        topDropoffPct,
        repeatCustomerRate,
        summary,
        generatedAt: now.toISOString(),
    };
}

// ============ Server Action — authenticated, for CEO dashboard ============

export async function getCustomerVisitCohort(
    orgId: string,
    daysBack: 90 | 180 | 365 = 90
): Promise<CustomerVisitCohortResult> {
    await requireSuperUser();
    return computeCohortData(orgId, daysBack);
}

// ============ Inbox posting — for cron + manual trigger ============

/**
 * Check if a cohort_report artifact was posted for this org in the last N days.
 */
export async function getLastCohortReportDate(orgId: string): Promise<Date | null> {
    const db = getAdminFirestore();
    try {
        const snap = await db
            .collection('inbox_artifacts')
            .where('orgId', '==', orgId)
            .where('type', '==', 'cohort_report')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        if (snap.empty) return null;
        const data = snap.docs[0].data();
        return toDate(data.createdAt);
    } catch {
        return null;
    }
}

/**
 * Post a cohort_report artifact to the org's Daily Briefing inbox thread.
 * No auth — called from cron context.
 */
export async function postCohortReportToInbox(
    orgId: string,
    data: CustomerVisitCohortResult
): Promise<void> {
    const db = getAdminFirestore();
    const THREADS = 'inbox_threads';
    const ARTIFACTS = 'inbox_artifacts';

    // Find or create the Daily Briefing thread (singleton per org)
    let threadId: string;
    const existing = await db
        .collection(THREADS)
        .where('orgId', '==', orgId)
        .where('metadata.isBriefingThread', '==', true)
        .limit(1)
        .get();

    if (!existing.empty) {
        threadId = existing.docs[0].id;
    } else {
        threadId = createInboxThreadId();
        await db.collection(THREADS).doc(threadId).set({
            id: threadId,
            orgId,
            userId: 'system',
            type: 'analytics',
            status: 'active',
            title: '📊 Daily Briefing',
            preview: 'Proactive daily analytics briefing',
            primaryAgent: 'pops',
            assignedAgents: ['pops'],
            artifactIds: [],
            messages: [],
            metadata: { isBriefingThread: true },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            lastActivityAt: FieldValue.serverTimestamp(),
        });
    }

    const artifactId = createInboxArtifactId();
    await db.collection(ARTIFACTS).doc(artifactId).set({
        id: artifactId,
        threadId,
        orgId,
        type: 'cohort_report',
        status: 'approved',
        data,
        rationale: `Weekly customer visit cohort — ${data.periodLabel}`,
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection(THREADS).doc(threadId).update({
        artifactIds: FieldValue.arrayUnion(artifactId),
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        preview: `Visit cohort update — ${data.repeatCustomerRate}% repeat rate, biggest drop at visit ${data.topDropoffVisit}`,
    });

    logger.info('[CohortAnalytics] Posted cohort report to inbox', {
        orgId,
        threadId,
        artifactId,
        totalCustomers: data.totalCustomers,
        topDropoffVisit: data.topDropoffVisit,
    });
}

// ============ Helpers ============

function visitLabel(n: number): string {
    if (n === 1) return '1st Visit';
    if (n === 2) return '2nd Visit';
    if (n === 3) return '3rd Visit';
    if (n === 4) return '4th Visit';
    return '5th+ Visit';
}

function periodLabel(daysBack: number): string {
    if (daysBack === 90) return 'Last 90 days';
    if (daysBack === 180) return 'Last 180 days';
    return 'Last 365 days';
}

function buildSummary(
    buckets: CohortBucket[],
    topDropoffVisit: number,
    topDropoffPct: number,
    repeatRate: number,
    daysBack: number,
    total: number
): string {
    const b1 = buckets[0];
    const b2 = buckets[1];
    const oneTimers = b1.count - b2.count;

    if (total === 0) return 'No data available for this period.';

    const lines: string[] = [];
    lines.push(`Of ${total.toLocaleString()} customers active in the ${periodLabel(daysBack).toLowerCase()}:`);
    lines.push(`• ${repeatRate}% returned for a 2nd visit (${b2.count.toLocaleString()} customers)`);
    lines.push(`• Biggest dropout: visit ${topDropoffVisit}→${topDropoffVisit + 1} — ${topDropoffPct}% of customers who reached visit ${topDropoffVisit} did not return`);
    lines.push(`• ${oneTimers.toLocaleString()} customers (${100 - repeatRate}%) visited only once — prime win-back targets`);

    if (repeatRate < 30) {
        lines.push(`⚠️ Repeat rate below 30% — Mrs. Parker should run a first-purchase win-back sequence immediately.`);
    } else if (repeatRate >= 60) {
        lines.push(`✅ Strong repeat rate — focus on converting 3rd→4th visit loyals into VIP tier.`);
    }

    return lines.join('\n');
}

function toDate(val: unknown): Date | null {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'object' && '_seconds' in (val as Record<string, unknown>)) {
        return new Date((val as { _seconds: number })._seconds * 1000);
    }
    if (typeof (val as { toDate?: unknown }).toDate === 'function') {
        return (val as { toDate: () => Date }).toDate();
    }
    if (typeof val === 'string' || typeof val === 'number') return new Date(val);
    return null;
}
