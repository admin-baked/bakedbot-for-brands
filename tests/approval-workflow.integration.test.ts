const mockNotifyNewApprovalRequest = jest.fn();
const mockNotifyApprovalApproved = jest.fn();
const mockNotifyApprovalRejected = jest.fn();
const mockNotifyApprovalExecuted = jest.fn();

type StoredApproval = Record<string, any>;

const requestStore = new Map<string, StoredApproval>();
let requestCounter = 0;

function getByPath(value: Record<string, any>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
        if (!acc || typeof acc !== 'object') return undefined;
        return (acc as Record<string, unknown>)[key];
    }, value);
}

function setByPath(target: Record<string, any>, path: string, value: unknown) {
    const parts = path.split('.');
    let cursor = target;

    for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i];
        if (!cursor[part] || typeof cursor[part] !== 'object') {
            cursor[part] = {};
        }
        cursor = cursor[part];
    }

    cursor[parts[parts.length - 1]] = value;
}

function normalizeForComparison(value: unknown): unknown {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate().getTime();
    }
    return value;
}

function matchesFilter(
    doc: StoredApproval,
    filter: { field: string; op: string; value: unknown },
): boolean {
    const left = normalizeForComparison(getByPath(doc, filter.field));
    const right = normalizeForComparison(filter.value);

    if (filter.op === '==') return left === right;
    if (filter.op === '<') return (left as number) < (right as number);
    if (filter.op === 'in' && Array.isArray(filter.value)) {
        return filter.value.includes(left);
    }
    return true;
}

function runQuery(
    filters: Array<{ field: string; op: string; value: unknown }>,
    limit?: number,
) {
    let docs = Array.from(requestStore.entries()).map(([id, data]) => ({ id, data }));
    docs = docs.filter(({ data }) => filters.every((filter) => matchesFilter(data, filter)));

    docs.sort((a, b) => {
        const aCreated = normalizeForComparison(a.data.createdAt) as number;
        const bCreated = normalizeForComparison(b.data.createdAt) as number;
        return bCreated - aCreated;
    });

    if (typeof limit === 'number') {
        docs = docs.slice(0, limit);
    }

    return {
        docs: docs.map(({ id, data }) => ({
            id,
            exists: true,
            data: () => data,
        })),
        empty: docs.length === 0,
    };
}

function applyUpdate(target: StoredApproval, updateData: Record<string, unknown>) {
    const updated = { ...target };

    for (const [key, value] of Object.entries(updateData)) {
        if (value && typeof value === 'object' && '__arrayUnion' in value) {
            const existing = getByPath(updated, key);
            const current = Array.isArray(existing) ? [...existing] : [];
            current.push((value as { __arrayUnion: unknown }).__arrayUnion);
            setByPath(updated, key, current);
            continue;
        }
        setByPath(updated, key, value);
    }

    return updated;
}

function createQuery(
    filters: Array<{ field: string; op: string; value: unknown }> = [],
    limit?: number,
) {
    return {
        where: (field: string, op: string, value: unknown) =>
            createQuery([...filters, { field, op, value }], limit),
        orderBy: () => createQuery(filters, limit),
        limit: (value: number) => createQuery(filters, value),
        get: async () => runQuery(filters, limit),
    };
}

const mockFirestore = {
    collection: jest.fn((name: string) => {
        if (name !== 'linus-approvals') {
            throw new Error(`Unexpected collection ${name}`);
        }

        return {
            add: jest.fn(async (data: StoredApproval) => {
                const id = `req-${++requestCounter}`;
                requestStore.set(id, { ...data });
                return { id };
            }),
            doc: jest.fn((id: string) => ({
                get: jest.fn(async () => {
                    const data = requestStore.get(id);
                    return {
                        id,
                        exists: Boolean(data),
                        data: () => data,
                    };
                }),
                update: jest.fn(async (updateData: Record<string, unknown>) => {
                    const existing = requestStore.get(id);
                    if (!existing) throw new Error('Missing request');
                    requestStore.set(id, applyUpdate(existing, updateData));
                }),
            })),
            where: (field: string, op: string, value: unknown) =>
                createQuery([{ field, op, value }]),
            orderBy: () => createQuery([]),
            get: async () => runQuery([]),
        };
    }),
};

jest.mock('firebase-admin/firestore', () => {
    class TimestampMock {
        private readonly value: Date;

        constructor(value: Date) {
            this.value = value;
        }

        static now() {
            return new TimestampMock(new Date());
        }

        static fromDate(value: Date) {
            return new TimestampMock(value);
        }

        toDate() {
            return this.value;
        }
    }

    return {
        Timestamp: TimestampMock,
        FieldValue: {
            arrayUnion: (value: unknown) => ({ __arrayUnion: value }),
        },
    };
});

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockFirestore,
}));

jest.mock('@/server/services/approval-notifications', () => ({
    notifyNewApprovalRequest: (...args: unknown[]) => mockNotifyNewApprovalRequest(...args),
    notifyApprovalApproved: (...args: unknown[]) => mockNotifyApprovalApproved(...args),
    notifyApprovalRejected: (...args: unknown[]) => mockNotifyApprovalRejected(...args),
    notifyApprovalExecuted: (...args: unknown[]) => mockNotifyApprovalExecuted(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

import {
    approveRequest,
    autoRejectExpiredRequests,
    createApprovalRequest,
    executeApprovedRequest,
    getApprovalRequest,
    getApprovalStats,
    listPendingApprovals,
    rejectRequest,
} from '@/server/services/approval-queue';

describe('Approval workflow integration', () => {
    beforeEach(() => {
        requestStore.clear();
        requestCounter = 0;
        jest.clearAllMocks();
        mockNotifyNewApprovalRequest.mockResolvedValue(undefined);
        mockNotifyApprovalApproved.mockResolvedValue(undefined);
        mockNotifyApprovalRejected.mockResolvedValue(undefined);
        mockNotifyApprovalExecuted.mockResolvedValue(undefined);
    });

    it('supports create -> approve -> execute flow', async () => {
        const created = await createApprovalRequest('cloud_scheduler_create', {
            targetResource: 'nightly-sync',
            action: 'create',
            reason: 'nightly import',
            riskLevel: 'medium',
        });

        expect(created.status).toBe('pending');

        await approveRequest(created.requestId, 'admin@example.com', 'approved');
        const execute = await executeApprovedRequest(created.requestId, 'system');
        expect(execute.status).toBe('executed');

        const final = await getApprovalRequest(created.requestId);
        expect(final?.status).toBe('executed');
        expect(final?.execution?.result).toBe('success');
    });

    it('supports rejection flow with persisted reason', async () => {
        const created = await createApprovalRequest('secret_rotate', {
            targetResource: 'prod-secret',
            action: 'rotate',
            reason: 'quarterly rotation',
            riskLevel: 'high',
        });

        await rejectRequest(created.requestId, 'reviewer@example.com', 'not approved');
        const rejected = await getApprovalRequest(created.requestId);

        expect(rejected?.status).toBe('rejected');
        expect(rejected?.rejectionReason).toBe('not approved');
    });

    it('returns pending filters and risk-level stats', async () => {
        await createApprovalRequest('cloud_scheduler_create', {
            targetResource: 'job-low',
            action: 'create',
            reason: 'low risk',
            riskLevel: 'low',
        });

        await createApprovalRequest('database_migration', {
            targetResource: 'analytics-db',
            action: 'update',
            reason: 'schema change',
            riskLevel: 'critical',
        });

        const criticalOnly = await listPendingApprovals({ riskLevel: 'critical' });
        expect(criticalOnly).toHaveLength(1);
        expect(criticalOnly[0].operationDetails.riskLevel).toBe('critical');

        const stats = await getApprovalStats();
        expect(stats.pending).toBe(2);
        expect(stats.totalByRiskLevel.low).toBe(1);
        expect(stats.totalByRiskLevel.critical).toBe(1);
    });

    it('auto-rejects pending requests older than seven days', async () => {
        const created = await createApprovalRequest('cloud_scheduler_delete', {
            targetResource: 'stale-job',
            action: 'delete',
            reason: 'cleanup',
            riskLevel: 'low',
        });

        const stale = requestStore.get(created.requestId);
        if (stale) {
            stale.createdAt = {
                toDate: () => new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            };
            requestStore.set(created.requestId, stale);
        }

        const count = await autoRejectExpiredRequests();
        const updated = await getApprovalRequest(created.requestId);

        expect(count).toBe(1);
        expect(updated?.status).toBe('rejected');
    });
});
