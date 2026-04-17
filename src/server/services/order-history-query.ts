'use server';

import { logger } from '@/lib/logger';
import { toAnalyticsDate } from '@/server/services/catalog-analytics-source';
import type { CatalogAnalyticsScope } from '@/server/services/catalog-analytics-scope';

export type HistoricalOrderQueryField = 'brandId' | 'orgId' | 'retailerId' | 'dispensaryId';

export type HistoricalOrderRecord = {
    createdAt?: unknown;
    items?: Array<Record<string, unknown>>;
    userId?: unknown;
    customerId?: unknown;
    customerEmail?: unknown;
    orgId?: unknown;
    brandId?: unknown;
    retailerId?: unknown;
    dispensaryId?: unknown;
    amount?: unknown;
    totals?: {
        total?: unknown;
    };
};

export type HistoricalOrderDocument = {
    id: string;
    data: HistoricalOrderRecord;
};

export type HistoricalOrderQueryCandidates = Record<HistoricalOrderQueryField, string[]>;

type HistoricalOrderQueryWindow = {
    startDate: Date;
    endDate?: Date;
    maxPerQuery?: number;
};

export function buildHistoricalOrderQueryCandidates(
    orgId: string,
    scope: CatalogAnalyticsScope,
): HistoricalOrderQueryCandidates {
    const brandScopedIds = new Set<string>([orgId, ...scope.rootProductQueryIds.brandId]);
    const generalIds = new Set<string>([
        orgId,
        ...scope.tenantIds,
        ...scope.rootProductQueryIds.brandId,
    ]);

    return {
        brandId: Array.from(brandScopedIds),
        orgId: Array.from(generalIds),
        retailerId: Array.from(generalIds),
        dispensaryId: Array.from(generalIds),
    };
}

function filterOrdersInWindow(
    docs: FirebaseFirestore.QueryDocumentSnapshot[],
    startDate: Date,
    endDate?: Date,
): HistoricalOrderDocument[] {
    return docs
        .map((doc) => ({
            id: doc.id,
            data: doc.data() as HistoricalOrderRecord,
        }))
        .filter(({ data }) => {
            const createdAt = toAnalyticsDate(data.createdAt);
            if (!(createdAt instanceof Date) || createdAt < startDate) {
                return false;
            }

            if (endDate && createdAt >= endDate) {
                return false;
            }

            return true;
        });
}

export async function queryHistoricalOrdersByField(
    db: FirebaseFirestore.Firestore,
    field: HistoricalOrderQueryField,
    candidateId: string,
    window: HistoricalOrderQueryWindow,
): Promise<HistoricalOrderDocument[]> {
    const { startDate, endDate, maxPerQuery = 10_000 } = window;

    try {
        const snap = await db.collection('orders')
            .where(field, '==', candidateId)
            .where('createdAt', '>=', startDate)
            .limit(maxPerQuery)
            .get();

        return filterOrdersInWindow(snap.docs, startDate, endDate);
    } catch (error) {
        logger.warn('[OrderHistoryQuery] Historical order query failed, retrying without createdAt filter', {
            field,
            candidateId,
            error: error instanceof Error ? error.message : String(error),
        });

        const fallback = await db.collection('orders')
            .where(field, '==', candidateId)
            .limit(maxPerQuery)
            .get()
            .catch((fallbackError) => {
                logger.error('[OrderHistoryQuery] Historical order fallback query failed', {
                    field,
                    candidateId,
                    error: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
                });
                return null;
            });

        if (!fallback) {
            return [];
        }

        return filterOrdersInWindow(fallback.docs, startDate, endDate);
    }
}

export async function queryHistoricalOrdersByScope(
    db: FirebaseFirestore.Firestore,
    orgId: string,
    scope: CatalogAnalyticsScope,
    window: HistoricalOrderQueryWindow,
): Promise<{
    candidates: HistoricalOrderQueryCandidates;
    orders: HistoricalOrderDocument[];
    queryMatches: Array<{ field: HistoricalOrderQueryField; candidateId: string; count: number }>;
}> {
    const candidates = buildHistoricalOrderQueryCandidates(orgId, scope);
    const fields: HistoricalOrderQueryField[] = ['brandId', 'orgId', 'retailerId', 'dispensaryId'];
    const queryPlans = fields.flatMap((field) =>
        candidates[field].map((candidateId) => ({ field, candidateId })),
    );

    const queryResults = await Promise.all(
        queryPlans.map(({ field, candidateId }) =>
            queryHistoricalOrdersByField(db, field, candidateId, window).then((orders) => ({
                field,
                candidateId,
                orders,
            })),
        ),
    );

    const ordersById = new Map<string, HistoricalOrderDocument>();
    const queryMatches: Array<{ field: HistoricalOrderQueryField; candidateId: string; count: number }> = [];

    for (const { field, candidateId, orders } of queryResults) {
        if (orders.length === 0) {
            continue;
        }

        queryMatches.push({ field, candidateId, count: orders.length });
        for (const order of orders) {
            ordersById.set(order.id, order);
        }
    }

    return {
        candidates,
        orders: Array.from(ordersById.values()),
        queryMatches,
    };
}
