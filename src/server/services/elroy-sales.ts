import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { firestoreTimestampToDate } from '@/lib/firestore-utils';
import { logger } from '@/lib/logger';

const THRIVE_TIME_ZONE = 'America/New_York';

export type ElroySalesPeriod = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'lastMonth';
export type ElroyTopSellerRankBy = 'units' | 'revenue';

export interface ElroySalesWindowInput {
    period?: ElroySalesPeriod;
    startDate?: string;
    endDate?: string;
    year?: number;
    month?: number;
}

export interface ResolvedElroySalesWindow {
    label: string;
    start: Date;
    endExclusive: Date;
    startDate: string;
    endDate: string;
    cacheKey: string;
}

export interface ElroyOrderItemRecord {
    name?: string | null;
    productName?: string | null;
    category?: string | null;
    qty?: number | null;
    quantity?: number | null;
    price?: number | null;
    totalPrice?: number | null;
}

export interface ElroyOrderRecord {
    id: string;
    createdAt?: Timestamp | Date | string | null;
    totals?: { total?: number | null } | null;
    total?: number | null;
    totalAmount?: number | null;
    subtotal?: number | null;
    status?: string | null;
    items?: ElroyOrderItemRecord[] | null;
}

export interface ElroySalesPeriodSummary {
    grossSales: number;
    orderCount: number;
    averageTicket: number;
}

export interface ElroyTopSeller {
    name: string;
    category: string | null;
    unitsSold: number;
    revenue: number;
}

export interface ElroyRecentTransaction {
    id: string;
    total: number;
    itemCount: number;
    items: string;
    createdAt: string | null;
    status: string | null;
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

function formatYyyyMmDd(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseCalendarDate(value: string, label: string): Date {
    const trimmed = String(value || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (!match) {
        throw new Error(`${label} must use YYYY-MM-DD format.`);
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, monthIndex, day);
    date.setHours(0, 0, 0, 0);

    if (
        date.getFullYear() !== year
        || date.getMonth() !== monthIndex
        || date.getDate() !== day
    ) {
        throw new Error(`${label} is not a valid calendar date.`);
    }

    return date;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function getStoreNow(now: Date = new Date()): Date {
    return new Date(now.toLocaleString('en-US', { timeZone: THRIVE_TIME_ZONE }));
}

function getStoreTodayStart(now: Date = new Date()): Date {
    const storeNow = getStoreNow(now);
    return new Date(storeNow.getFullYear(), storeNow.getMonth(), storeNow.getDate());
}

function normalizeMonthWindow(year: number, month: number): ResolvedElroySalesWindow {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error('year must be a valid 4-digit year.');
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
        throw new Error('month must be between 1 and 12.');
    }

    const start = new Date(year, month - 1, 1);
    const endExclusive = new Date(year, month, 1);
    const endInclusive = addDays(endExclusive, -1);
    const label = start.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: THRIVE_TIME_ZONE,
    });

    return {
        label,
        start,
        endExclusive,
        startDate: formatYyyyMmDd(start),
        endDate: formatYyyyMmDd(endInclusive),
        cacheKey: `month:${year}-${`${month}`.padStart(2, '0')}`,
    };
}

function normalizeExplicitWindow(startDate: string, endDate: string): ResolvedElroySalesWindow {
    const start = parseCalendarDate(startDate, 'startDate');
    const endInclusive = parseCalendarDate(endDate, 'endDate');
    if (endInclusive < start) {
        throw new Error('endDate must be on or after startDate.');
    }

    return {
        label: `${formatYyyyMmDd(start)} to ${formatYyyyMmDd(endInclusive)}`,
        start,
        endExclusive: addDays(endInclusive, 1),
        startDate: formatYyyyMmDd(start),
        endDate: formatYyyyMmDd(endInclusive),
        cacheKey: `range:${formatYyyyMmDd(start)}:${formatYyyyMmDd(endInclusive)}`,
    };
}

export function resolveElroySalesWindow(
    input: ElroySalesWindowInput,
    options?: { defaultPeriod?: ElroySalesPeriod; now?: Date }
): ResolvedElroySalesWindow {
    const defaultPeriod = options?.defaultPeriod ?? 'last7days';
    const now = options?.now ?? new Date();

    if (input.startDate || input.endDate) {
        if (!input.startDate || !input.endDate) {
            throw new Error('Provide both startDate and endDate together.');
        }
        return normalizeExplicitWindow(input.startDate, input.endDate);
    }

    if (input.year != null || input.month != null) {
        if (input.year == null || input.month == null) {
            throw new Error('Provide both year and month together.');
        }
        return normalizeMonthWindow(input.year, input.month);
    }

    const period = input.period ?? defaultPeriod;
    const todayStart = getStoreTodayStart(now);

    switch (period) {
        case 'today': {
            const endExclusive = addDays(todayStart, 1);
            return {
                label: 'today',
                start: todayStart,
                endExclusive,
                startDate: formatYyyyMmDd(todayStart),
                endDate: formatYyyyMmDd(todayStart),
                cacheKey: `period:today:${formatYyyyMmDd(todayStart)}`,
            };
        }
        case 'yesterday': {
            const start = addDays(todayStart, -1);
            return {
                label: 'yesterday',
                start,
                endExclusive: todayStart,
                startDate: formatYyyyMmDd(start),
                endDate: formatYyyyMmDd(start),
                cacheKey: `period:yesterday:${formatYyyyMmDd(start)}`,
            };
        }
        case 'thisMonth': {
            return normalizeMonthWindow(todayStart.getFullYear(), todayStart.getMonth() + 1);
        }
        case 'lastMonth': {
            const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
            return normalizeMonthWindow(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1);
        }
        case 'last7days':
        default: {
            const start = addDays(todayStart, -6);
            const endExclusive = addDays(todayStart, 1);
            return {
                label: 'last 7 days',
                start,
                endExclusive,
                startDate: formatYyyyMmDd(start),
                endDate: formatYyyyMmDd(addDays(endExclusive, -1)),
                cacheKey: `period:last7days:${formatYyyyMmDd(start)}:${formatYyyyMmDd(addDays(endExclusive, -1))}`,
            };
        }
    }
}

export function getElroyOrderCreatedAt(order: Pick<ElroyOrderRecord, 'createdAt'>): Date | null {
    const value = order.createdAt;
    if (!value) return null;
    const converted = firestoreTimestampToDate(value as Timestamp | Date | undefined);
    if (converted instanceof Date && !Number.isNaN(converted.getTime())) {
        return converted;
    }

    const fallback = new Date(String(value));
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function getElroyOrderTotal(order: Pick<ElroyOrderRecord, 'totals' | 'total' | 'totalAmount' | 'subtotal'>): number {
    const raw = order.totals?.total ?? order.totalAmount ?? order.total ?? order.subtotal ?? 0;
    const total = Number(raw);
    return Number.isFinite(total) ? total : 0;
}

export function summarizeElroySalesPeriod(orders: ElroyOrderRecord[]): ElroySalesPeriodSummary {
    const grossSales = roundCurrency(orders.reduce((sum, order) => sum + getElroyOrderTotal(order), 0));
    const orderCount = orders.length;

    return {
        grossSales,
        orderCount,
        averageTicket: orderCount > 0 ? roundCurrency(grossSales / orderCount) : 0,
    };
}

export function aggregateElroyTopSellers(
    orders: ElroyOrderRecord[],
    options?: { limit?: number; rankBy?: ElroyTopSellerRankBy }
): ElroyTopSeller[] {
    const limit = Math.max(1, Math.min(options?.limit ?? 10, 20));
    const rankBy = options?.rankBy ?? 'units';
    const aggregated = new Map<string, ElroyTopSeller>();

    for (const order of orders) {
        for (const item of order.items ?? []) {
            const name = String(item.name ?? item.productName ?? 'Unknown').trim() || 'Unknown';
            const category = item.category ? String(item.category) : null;
            const quantityRaw = item.quantity ?? item.qty ?? 1;
            const quantity = Number(quantityRaw);
            const unitsSold = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
            const priceRaw = item.totalPrice ?? item.price ?? 0;
            const itemRevenue = Number(priceRaw);
            const revenueBase = Number.isFinite(itemRevenue) ? itemRevenue : 0;
            const revenue = item.totalPrice != null ? revenueBase : revenueBase * unitsSold;
            const existing = aggregated.get(name) ?? {
                name,
                category,
                unitsSold: 0,
                revenue: 0,
            };

            existing.unitsSold += unitsSold;
            existing.revenue += revenue;
            if (!existing.category && category) {
                existing.category = category;
            }

            aggregated.set(name, existing);
        }
    }

    return [...aggregated.values()]
        .map((item) => ({
            ...item,
            revenue: roundCurrency(item.revenue),
        }))
        .sort((left, right) => {
            const leftPrimary = rankBy === 'revenue' ? left.revenue : left.unitsSold;
            const rightPrimary = rankBy === 'revenue' ? right.revenue : right.unitsSold;
            if (rightPrimary !== leftPrimary) return rightPrimary - leftPrimary;

            const leftSecondary = rankBy === 'revenue' ? left.unitsSold : left.revenue;
            const rightSecondary = rankBy === 'revenue' ? right.unitsSold : right.revenue;
            return rightSecondary - leftSecondary;
        })
        .slice(0, limit);
}

export function formatElroyRecentTransactions(
    orders: ElroyOrderRecord[],
    options?: { limit?: number }
): ElroyRecentTransaction[] {
    const limit = Math.max(1, Math.min(options?.limit ?? 20, 50));

    return [...orders]
        .sort((left, right) => {
            const leftDate = getElroyOrderCreatedAt(left)?.getTime() ?? 0;
            const rightDate = getElroyOrderCreatedAt(right)?.getTime() ?? 0;
            return rightDate - leftDate;
        })
        .slice(0, limit)
        .map((order) => {
            const items = order.items ?? [];
            return {
                id: order.id,
                total: roundCurrency(getElroyOrderTotal(order)),
                itemCount: items.reduce((sum, item) => {
                    const quantity = Number(item.quantity ?? item.qty ?? 1);
                    return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
                }, 0),
                items: items
                    .slice(0, 3)
                    .map((item) => {
                        const name = String(item.name ?? item.productName ?? 'Unknown').trim() || 'Unknown';
                        const quantity = Number(item.quantity ?? item.qty ?? 1);
                        const safeQuantity = Number.isFinite(quantity) && quantity > 1 ? quantity : 1;
                        return safeQuantity > 1 ? `${name} x${safeQuantity}` : name;
                    })
                    .join(', '),
                createdAt: getElroyOrderCreatedAt(order)?.toISOString() ?? null,
                status: order.status ? String(order.status) : null,
            };
        });
}

export async function fetchElroyOrdersForWindow(
    orgId: string,
    window: Pick<ResolvedElroySalesWindow, 'start' | 'endExclusive'>
): Promise<ElroyOrderRecord[]> {
    const db = getAdminFirestore();

    try {
        const snap = await db.collection('orders')
            .where('brandId', '==', orgId)
            .where('createdAt', '>=', Timestamp.fromDate(window.start))
            .where('createdAt', '<', Timestamp.fromDate(window.endExclusive))
            .get();

        return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as ElroyOrderRecord));
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('index') && !message.includes('FAILED_PRECONDITION')) {
            throw error;
        }

        logger.warn('[ElroySales] Falling back to client-side date filtering', {
            orgId,
            error: message,
        });

        const fallbackSnap = await db.collection('orders')
            .where('brandId', '==', orgId)
            .orderBy('createdAt', 'desc')
            .limit(5000)
            .get();

        return fallbackSnap.docs
            .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as ElroyOrderRecord))
            .filter((order) => {
                const createdAt = getElroyOrderCreatedAt(order);
                return !!createdAt && createdAt >= window.start && createdAt < window.endExclusive;
            });
    }
}

export async function fetchElroyRecentOrders(orgId: string, limit: number): Promise<ElroyOrderRecord[]> {
    const safeLimit = Math.max(1, Math.min(limit, 50));
    const db = getAdminFirestore();
    const snap = await db.collection('orders')
        .where('brandId', '==', orgId)
        .orderBy('createdAt', 'desc')
        .limit(safeLimit)
        .get();

    return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as ElroyOrderRecord));
}
