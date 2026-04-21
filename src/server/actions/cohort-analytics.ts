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
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { createInboxArtifactId, createInboxThreadId } from '@/types/inbox';
import { isBrandRole, isDispensaryRole } from '@/types/roles';

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
    topDropoffVisit: number; // visit # with highest dropoff (e.g. 1 = "1st->2nd has worst drop")
    topDropoffPct: number;   // dropout % at that step
    repeatCustomerRate: number; // % with 2+ visits
    summary: string;        // Pops AI text summary
    generatedAt: string;    // ISO timestamp
}

async function resolveAccessibleCohortOrgId(requestedOrgId: string): Promise<string> {
    const user = await requireUser([
        'brand',
        'brand_admin',
        'brand_member',
        'dispensary',
        'dispensary_admin',
        'dispensary_staff',
        'budtender',
        'super_user',
    ]);

    const role = String((user as { role?: string }).role || '');
    if (role === 'super_user' || role === 'super_admin') {
        return requestedOrgId;
    }

    if (isBrandRole(role)) {
        const userBrandId = (user as { brandId?: string }).brandId;
        if (!userBrandId || userBrandId !== requestedOrgId) {
            throw new Error('Forbidden: Cannot access another brand\'s cohort analytics');
        }
        return requestedOrgId;
    }

    if (isDispensaryRole(role)) {
        const dispensaryUser = user as { orgId?: string; currentOrgId?: string; locationId?: string };
        const userOrgId = dispensaryUser.orgId || dispensaryUser.currentOrgId || dispensaryUser.locationId;
        if (!userOrgId || userOrgId !== requestedOrgId) {
            throw new Error('Forbidden: Cannot access another dispensary\'s cohort analytics');
        }
        return requestedOrgId;
    }

    throw new Error('Forbidden: You do not have access to cohort analytics');
}

// ============ Core computation (no auth - callable from cron + server actions) ============

function isMissingIndexError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('requires an index') || message.includes('FAILED_PRECONDITION');
}

interface CustomerActivityRecord {
    key: string;
    orderCount: number;
    visitCount: number;
    firstActivityAt: Date | null;
    lastActivityAt: Date | null;
}

function coerceCount(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeCohortEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    return normalized ? normalized : null;
}

function isCohortPlaceholderEmail(email: string): boolean {
    return email.endsWith('@alleaves.local') || email.endsWith('@unknown.local');
}

function normalizeCohortAlleavesId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.startsWith('cid_')) return normalized;
    if (normalized.startsWith('alleaves_')) return `cid_${normalized.slice('alleaves_'.length)}`;
    return null;
}

function getActivityRecordKey(docId: string, data: FirebaseFirestore.DocumentData): string {
    const email = normalizeCohortEmail(data.email) ?? normalizeCohortEmail(docId);
    if (email && !isCohortPlaceholderEmail(email)) return email;

    const alleavesCustomerId = normalizeCohortAlleavesId(data.alleavesCustomerId)
        ?? normalizeCohortAlleavesId(docId);
    return alleavesCustomerId || email || docId;
}

function mergeActivityRecord(
    records: Map<string, CustomerActivityRecord>,
    next: CustomerActivityRecord,
): void {
    const existing = records.get(next.key);
    if (!existing) {
        records.set(next.key, next);
        return;
    }

    const firstActivityAt = [existing.firstActivityAt, next.firstActivityAt]
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => left.getTime() - right.getTime())[0] ?? null;
    const lastActivityAt = [existing.lastActivityAt, next.lastActivityAt]
        .filter((value): value is Date => Boolean(value))
        .sort((left, right) => right.getTime() - left.getTime())[0] ?? null;

    records.set(next.key, {
        key: next.key,
        orderCount: Math.max(existing.orderCount, next.orderCount),
        visitCount: Math.max(existing.visitCount, next.visitCount),
        firstActivityAt,
        lastActivityAt,
    });
}

async function loadCustomerActivityRecords(
    db: FirebaseFirestore.Firestore,
    orgId: string,
): Promise<CustomerActivityRecord[]> {
    const records = new Map<string, CustomerActivityRecord>();

    const spendingSnap = await db
        .collection('tenants').doc(orgId)
        .collection('customer_spending')
        .limit(5000)
        .get();

    spendingSnap.docs.forEach((doc) => {
        const data = doc.data();
        mergeActivityRecord(records, {
            key: getActivityRecordKey(doc.id, data),
            orderCount: coerceCount(data.orderCount),
            visitCount: 0,
            firstActivityAt: firestoreTimestampToDate(data.firstOrderDate),
            lastActivityAt: firestoreTimestampToDate(data.lastOrderDate),
        });
    });

    let customersSnap: FirebaseFirestore.QuerySnapshot;
    try {
        customersSnap = await db
            .collection('customers')
            .where('orgId', '==', orgId)
            .where('archived', '!=', true)
            .get();
    } catch (error) {
        if (!isMissingIndexError(error)) {
            throw error;
        }

        logger.warn('[CohortAnalytics] customers index missing, using org-scoped fallback', {
            orgId,
            error: error instanceof Error ? error.message : String(error),
        });

        customersSnap = await db
            .collection('customers')
            .where('orgId', '==', orgId)
            .get();
    }

    customersSnap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.archived === true) return;

        const firstOrder = firestoreTimestampToDate(data.firstOrderDate);
        const lastOrder = firestoreTimestampToDate(data.lastOrderDate);
        const lastCheckin = firestoreTimestampToDate(data.lastCheckinAt);
        const firstActivityAt = [firstOrder, lastCheckin]
            .filter((value): value is Date => Boolean(value))
            .sort((left, right) => left.getTime() - right.getTime())[0] ?? firstOrder ?? null;
        const lastActivityAt = [lastOrder, lastCheckin]
            .filter((value): value is Date => Boolean(value))
            .sort((left, right) => right.getTime() - left.getTime())[0] ?? lastOrder ?? null;

        mergeActivityRecord(records, {
            key: getActivityRecordKey(doc.id, data),
            orderCount: coerceCount(data.orderCount),
            visitCount: coerceCount(data.visitCount),
            firstActivityAt,
            lastActivityAt,
        });
    });

    return Array.from(records.values());
}

export async function computeCohortData(
    orgId: string,
    daysBack: 90 | 180 | 365
): Promise<CustomerVisitCohortResult> {
    const db = getAdminFirestore();
    const now = new Date();
    const cutoff = new Date(now.getTime() - daysBack * 86_400_000);

    logger.info('[CohortAnalytics] Computing visit cohort', { orgId, daysBack });

    const activeRecords = (await loadCustomerActivityRecords(db, orgId))
        .filter((record) => {
            if (record.lastActivityAt && record.lastActivityAt >= cutoff) return true;
            if (record.firstActivityAt && record.firstActivityAt >= cutoff) return true;
            return false;
        });

    const total = activeRecords.length;

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
            summary: 'No customer activity found in this period. Data will appear once customers check in or place orders.',
            generatedAt: now.toISOString(),
        };
    }

    // Bucket by activity count: POS orderCount OR check-in visitCount, whichever is higher.
    // This ensures tablet-only customers (no POS orders yet) still appear in the funnel.
    const counts = [0, 0, 0, 0, 0]; // index 0=1visit, 1=2visits, 2=3visits, 3=4visits, 4=5+
    for (const record of activeRecords) {
        const activityCount = Math.max(record.orderCount, record.visitCount) || 1;
        const idx = Math.min(activityCount, 5) - 1;
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

    // Find biggest dropoff step (1->2, 2->3, 3->4, 4->5+)
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

// ============ Server Action - authenticated, for CEO dashboard ============

export async function getCustomerVisitCohort(
    orgId: string,
    daysBack: 90 | 180 | 365 = 90
): Promise<CustomerVisitCohortResult> {
    const accessibleOrgId = await resolveAccessibleCohortOrgId(orgId);
    return computeCohortData(accessibleOrgId, daysBack);
}

// ============ Inbox posting - for cron + manual trigger ============

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
        return firestoreTimestampToDate(data.createdAt);
    } catch {
        return null;
    }
}

/**
 * Post a cohort_report artifact to the org's Daily Briefing inbox thread.
 * No auth - called from cron context.
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
        rationale: `Weekly customer visit cohort - ${data.periodLabel}`,
        createdBy: 'system',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection(THREADS).doc(threadId).update({
        artifactIds: FieldValue.arrayUnion(artifactId),
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        preview: `Visit cohort update - ${data.repeatCustomerRate}% repeat rate, biggest drop at visit ${data.topDropoffVisit}`,
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
    lines.push(`- ${repeatRate}% returned for a 2nd visit (${b2.count.toLocaleString()} customers)`);
    lines.push(`- Biggest dropout: visit ${topDropoffVisit}->${topDropoffVisit + 1} - ${topDropoffPct}% of customers who reached visit ${topDropoffVisit} did not return`);
    lines.push(`- ${oneTimers.toLocaleString()} customers (${100 - repeatRate}%) visited only once - prime win-back targets`);

    if (repeatRate < 30) {
        lines.push('Action: Repeat rate below 30% - Mrs. Parker should run a first-purchase win-back sequence immediately.');
    } else if (repeatRate >= 60) {
        lines.push('Signal: Strong repeat rate - focus on converting 3rd->4th visit loyals into VIP tier.');
    }

    return lines.join('\n');
}

