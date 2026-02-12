/**
 * Tests for Campaign Heartbeat Checks
 *
 * Covers: CAMPAIGN_CHECKS registry, checkCampaignPerformance,
 * checkStalledCampaigns, and checkCompliancePending.
 */

import type { HeartbeatCheckContext } from '../../types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnValue({ get: mockGet });

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            where: mockWhere,
            orderBy: mockOrderBy,
            limit: mockLimit,
        })),
    })),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

jest.mock('../../types', () => ({
    createCheckResult: jest.fn(
        (checkId: string, agent: string, result: Record<string, unknown>) => ({
            checkId,
            agent,
            ...result,
        }),
    ),
    createOkResult: jest.fn(
        (checkId: string, agent: string, message: string) => ({
            checkId,
            agent,
            status: 'ok',
            message,
        }),
    ),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { CAMPAIGN_CHECKS } from '../campaign-checks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<HeartbeatCheckContext> = {}): HeartbeatCheckContext {
    return {
        tenantId: 'org_test',
        userId: 'user_1',
        timezone: 'America/New_York',
        sharedData: {},
        ...overrides,
    };
}

/** Helper to build a Firestore-doc-like object */
function makeDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    };
}

/** Builds a Firestore Timestamp-like value `days` days ago */
function daysAgo(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return { toDate: () => d };
}

/** Builds a Firestore Timestamp-like value `hours` hours ago */
function hoursAgo(hours: number) {
    const d = new Date();
    d.setHours(d.getHours() - hours);
    return { toDate: () => d };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CAMPAIGN_CHECKS registry', () => {
    it('has exactly 3 entries', () => {
        expect(CAMPAIGN_CHECKS).toHaveLength(3);
    });

    it('contains the correct checkIds', () => {
        const ids = CAMPAIGN_CHECKS.map(c => c.checkId);
        expect(ids).toEqual([
            'campaign_performance_alert',
            'campaign_stalled',
            'campaign_compliance_pending',
        ]);
    });

    it('assigns correct agents', () => {
        const agents = CAMPAIGN_CHECKS.map(c => c.agent);
        expect(agents).toEqual(['craig', 'craig', 'deebo']);
    });
});

describe('checkCampaignPerformance', () => {
    const execute = CAMPAIGN_CHECKS.find(
        c => c.checkId === 'campaign_performance_alert',
    )!.execute;

    beforeEach(() => jest.clearAllMocks());

    it('returns ok when there are no campaigns', async () => {
        mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

        const result = await execute(makeContext());

        expect(result).toEqual(
            expect.objectContaining({
                checkId: 'campaign_performance_alert',
                agent: 'craig',
                status: 'ok',
            }),
        );
    });

    it('returns warning for a campaign with low open rate (<10%)', async () => {
        const doc = makeDoc('c1', {
            name: 'Summer Promo',
            sentAt: daysAgo(2),
            performance: { sent: 100, openRate: 5, bounceRate: 2 },
        });

        mockGet.mockResolvedValueOnce({ empty: false, docs: [doc] });

        const result = await execute(makeContext());

        expect(result).toEqual(
            expect.objectContaining({
                checkId: 'campaign_performance_alert',
                agent: 'craig',
                status: 'warning',
                priority: 'medium',
            }),
        );
        expect((result as Record<string, unknown>).title).toContain('Underperforming');
    });
});

describe('checkStalledCampaigns', () => {
    const execute = CAMPAIGN_CHECKS.find(
        c => c.checkId === 'campaign_stalled',
    )!.execute;

    beforeEach(() => jest.clearAllMocks());

    it('returns ok when there are no stalled campaigns', async () => {
        mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

        const result = await execute(makeContext());

        expect(result).toEqual(
            expect.objectContaining({
                checkId: 'campaign_stalled',
                agent: 'craig',
                status: 'ok',
            }),
        );
    });

    it('returns alert for overdue scheduled campaigns', async () => {
        const doc = makeDoc('c2', {
            name: 'Flash Sale',
            scheduledAt: hoursAgo(2),
        });

        mockGet.mockResolvedValueOnce({ empty: false, docs: [doc] });

        const result = await execute(makeContext());

        expect(result).toEqual(
            expect.objectContaining({
                checkId: 'campaign_stalled',
                agent: 'craig',
                status: 'alert',
                priority: 'high',
            }),
        );
        expect((result as Record<string, unknown>).title).toContain('Stalled');
    });
});

describe('checkCompliancePending', () => {
    const execute = CAMPAIGN_CHECKS.find(
        c => c.checkId === 'campaign_compliance_pending',
    )!.execute;

    beforeEach(() => jest.clearAllMocks());

    it('returns ok when no campaigns are stuck in compliance review', async () => {
        mockGet.mockResolvedValueOnce({ empty: false, docs: [] });

        const result = await execute(makeContext());

        expect(result).toEqual(
            expect.objectContaining({
                checkId: 'campaign_compliance_pending',
                agent: 'deebo',
                status: 'ok',
            }),
        );
    });

    it('returns warning for campaigns stuck in compliance review >24 hours', async () => {
        const doc = makeDoc('c3', {
            name: 'Holiday Blast',
            updatedAt: hoursAgo(30),
        });

        mockGet.mockResolvedValueOnce({ empty: false, docs: [doc] });

        const result = await execute(makeContext());

        expect(result).toEqual(
            expect.objectContaining({
                checkId: 'campaign_compliance_pending',
                agent: 'deebo',
                status: 'warning',
                priority: 'medium',
            }),
        );
        expect((result as Record<string, unknown>).title).toContain('Awaiting Compliance');
    });
});
