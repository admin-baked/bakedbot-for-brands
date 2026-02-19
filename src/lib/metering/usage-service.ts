'use server';

/**
 * Usage Metering Service
 *
 * Subscription-aware usage tracking against tier allocations.
 * Reads from `usage/{orgId}-{YYYY-MM}` documents written by createSubscription().
 *
 * Public API:
 *   incrementUsage(orgId, metric, n)        — increment a counter
 *   getMonthlyUsage(orgId, period?)         — read current period totals
 *   getUsageWithLimits(orgId, tierId)       — usage + limits + % consumed
 *   checkAndAlertAt80Percent(orgId)         — fire alert if any metric hits 80%
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import { TIERS, type TierId } from '@/config/tiers';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UsageMeteringMetric =
    | 'smsCustomerUsed'
    | 'smsInternalUsed'
    | 'emailsUsed'
    | 'aiSessionsUsed'
    | 'creativeAssetsUsed'
    | 'competitorsTracked'
    | 'zipCodesActive';

export interface MonthlyUsageDoc {
    id: string;
    subscriptionId?: string;
    period: string;
    smsCustomerUsed: number;
    smsInternalUsed: number;
    emailsUsed: number;
    aiSessionsUsed: number;
    creativeAssetsUsed: number;
    competitorsTracked: number;
    zipCodesActive: number;
    overageCharges: {
        sms: number;
        email: number;
        creativeAssets: number;
        zipCodes: number;
        competitors: number;
        total: number;
    };
    alertSentAt80Percent: boolean;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
}

export interface UsageWithLimits {
    period: string;
    tierId: TierId;
    metrics: {
        smsCustomer: { used: number; limit: number; pct: number; unlimited: boolean };
        smsInternal: { used: number; limit: number; pct: number; unlimited: boolean };
        emails: { used: number; limit: number; pct: number; unlimited: boolean };
        aiSessions: { used: number; limit: number; pct: number; unlimited: boolean };
        creativeAssets: { used: number; limit: number; pct: number; unlimited: boolean };
        competitors: { used: number; limit: number; pct: number; unlimited: boolean };
        zipCodes: { used: number; limit: number; pct: number; unlimited: boolean };
    };
    overageCharges: MonthlyUsageDoc['overageCharges'];
    alertSentAt80Percent: boolean;
    atRisk: string[]; // metric names that are at ≥80%
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function usageDocId(orgId: string, period: string): string {
    return `${orgId}-${period}`;
}

function pct(used: number, limit: number): number {
    if (limit <= 0) return 0; // unlimited
    return Math.round((used / limit) * 100);
}

// ---------------------------------------------------------------------------
// Core: increment
// ---------------------------------------------------------------------------

export async function incrementUsage(
    orgId: string,
    metric: UsageMeteringMetric,
    count = 1
): Promise<void> {
    if (!orgId) return;
    const firestore = getAdminFirestore();
    const period = currentPeriod();
    const docId = usageDocId(orgId, period);

    try {
        await firestore
            .collection('usage')
            .doc(docId)
            .set(
                {
                    id: docId,
                    period,
                    [metric]: FieldValue.increment(count),
                    updatedAt: Timestamp.now(),
                },
                { merge: true }
            );
    } catch (err) {
        logger.error('[Metering] Failed to increment usage', { orgId, metric, err });
        // Never block caller
    }
}

// ---------------------------------------------------------------------------
// Core: read
// ---------------------------------------------------------------------------

export async function getMonthlyUsage(
    orgId: string,
    period = currentPeriod()
): Promise<MonthlyUsageDoc | null> {
    const firestore = getAdminFirestore();
    const snap = await firestore.collection('usage').doc(usageDocId(orgId, period)).get();
    if (!snap.exists) return null;

    const d = snap.data() as Partial<MonthlyUsageDoc>;
    return {
        id: snap.id,
        subscriptionId: d.subscriptionId,
        period: d.period ?? period,
        smsCustomerUsed: d.smsCustomerUsed ?? 0,
        smsInternalUsed: d.smsInternalUsed ?? 0,
        emailsUsed: d.emailsUsed ?? 0,
        aiSessionsUsed: d.aiSessionsUsed ?? 0,
        creativeAssetsUsed: d.creativeAssetsUsed ?? 0,
        competitorsTracked: d.competitorsTracked ?? 0,
        zipCodesActive: d.zipCodesActive ?? 0,
        overageCharges: d.overageCharges ?? { sms: 0, email: 0, creativeAssets: 0, zipCodes: 0, competitors: 0, total: 0 },
        alertSentAt80Percent: d.alertSentAt80Percent ?? false,
        createdAt: d.createdAt ?? null,
        updatedAt: d.updatedAt ?? null,
    };
}

// ---------------------------------------------------------------------------
// Core: usage + limits
// ---------------------------------------------------------------------------

export async function getUsageWithLimits(
    orgId: string,
    tierId: TierId,
    period = currentPeriod()
): Promise<UsageWithLimits> {
    const tier = TIERS[tierId];
    const alloc = tier.allocations;
    const usage = await getMonthlyUsage(orgId, period);

    const u = {
        smsCustomer: usage?.smsCustomerUsed ?? 0,
        smsInternal: usage?.smsInternalUsed ?? 0,
        emails: usage?.emailsUsed ?? 0,
        aiSessions: usage?.aiSessionsUsed ?? 0,
        creativeAssets: usage?.creativeAssetsUsed ?? 0,
        competitors: usage?.competitorsTracked ?? 0,
        zipCodes: usage?.zipCodesActive ?? 0,
    };

    const limits = {
        smsCustomer: alloc.smsCustomer,
        smsInternal: alloc.smsInternal,
        emails: alloc.emails,
        aiSessions: alloc.aiSessions,
        competitors: alloc.competitors,
        zipCodes: alloc.zipCodes,
        creativeAssets: alloc.creativeAssets,
    };

    const buildMetric = (key: keyof typeof u) => {
        const limit = limits[key];
        const unlimited = limit === -1;
        return {
            used: u[key],
            limit: unlimited ? -1 : limit,
            pct: unlimited ? 0 : pct(u[key], limit),
            unlimited,
        };
    };

    const metrics = {
        smsCustomer: buildMetric('smsCustomer'),
        smsInternal: buildMetric('smsInternal'),
        emails: buildMetric('emails'),
        aiSessions: buildMetric('aiSessions'),
        creativeAssets: buildMetric('creativeAssets'),
        competitors: buildMetric('competitors'),
        zipCodes: buildMetric('zipCodes'),
    };

    const atRisk = Object.entries(metrics)
        .filter(([, m]) => !m.unlimited && m.pct >= 80)
        .map(([key]) => key);

    return {
        period,
        tierId,
        metrics,
        overageCharges: usage?.overageCharges ?? { sms: 0, email: 0, creativeAssets: 0, zipCodes: 0, competitors: 0, total: 0 },
        alertSentAt80Percent: usage?.alertSentAt80Percent ?? false,
        atRisk,
    };
}

// ---------------------------------------------------------------------------
// Alert: mark 80% alert sent
// ---------------------------------------------------------------------------

export async function markAlertSent(orgId: string, period = currentPeriod()): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore
        .collection('usage')
        .doc(usageDocId(orgId, period))
        .set({ alertSentAt80Percent: true, updatedAt: Timestamp.now() }, { merge: true });
}

// ---------------------------------------------------------------------------
// Overage: calculate and write charges for current period
// ---------------------------------------------------------------------------

export async function calculateAndRecordOverages(
    orgId: string,
    tierId: TierId,
    period = currentPeriod()
): Promise<MonthlyUsageDoc['overageCharges']> {
    const tier = TIERS[tierId];
    const alloc = tier.allocations;
    const overageRates = tier.overages;

    if (!overageRates) {
        return { sms: 0, email: 0, creativeAssets: 0, zipCodes: 0, competitors: 0, total: 0 };
    }

    const usage = await getMonthlyUsage(orgId, period);
    if (!usage) return { sms: 0, email: 0, creativeAssets: 0, zipCodes: 0, competitors: 0, total: 0 };

    const overage = {
        sms: 0,
        email: 0,
        creativeAssets: 0,
        zipCodes: 0,
        competitors: 0,
        total: 0,
    };

    if (alloc.smsCustomer > 0 && usage.smsCustomerUsed > alloc.smsCustomer) {
        const excess = usage.smsCustomerUsed - alloc.smsCustomer;
        overage.sms = Math.round(excess * (overageRates.sms ?? 0) * 100) / 100;
    }

    if (alloc.emails > 0 && usage.emailsUsed > alloc.emails) {
        const excess = usage.emailsUsed - alloc.emails;
        overage.email = Math.round(excess * (overageRates.email ?? 0) * 100) / 100;
    }

    if (alloc.creativeAssets > 0 && usage.creativeAssetsUsed > alloc.creativeAssets) {
        const excess = usage.creativeAssetsUsed - alloc.creativeAssets;
        overage.creativeAssets = Math.round(excess * (overageRates.creativeAssets ?? 0) * 100) / 100;
    }

    overage.total = overage.sms + overage.email + overage.creativeAssets + overage.zipCodes + overage.competitors;
    overage.total = Math.round(overage.total * 100) / 100;

    const firestore = getAdminFirestore();
    await firestore
        .collection('usage')
        .doc(usageDocId(orgId, period))
        .set({ overageCharges: overage, updatedAt: Timestamp.now() }, { merge: true });

    return overage;
}
