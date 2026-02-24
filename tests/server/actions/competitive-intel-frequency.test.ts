/**
 * Unit tests for setCompetitiveIntelFrequency + getCompetitiveIntelFrequency
 * (src/app/dashboard/ceo/actions/system-actions.ts)
 *
 * Tests: preset mapping, batch updates, error handling, auth gate
 * Approach: mock getAdminFirestore + requireUser; no real Firestore calls.
 */

import { setCompetitiveIntelFrequency, getCompetitiveIntelFrequency } from '@/app/dashboard/ceo/actions/system-actions';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

// These are imported but not used in the new actions — mock to prevent import errors
jest.mock('@/lib/plans', () => ({
    PLANS: {},
    COVERAGE_PACKS: {},
}));

jest.mock('@/lib/mrr-ladder', () => ({
    calculateMrrLadder: jest.fn(),
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

// ---------------------------------------------------------------------------
// Helpers to build Firestore mock chain
// ---------------------------------------------------------------------------

function buildFirestoreMock(sourcesDocs: Array<{ id: string; data: Record<string, unknown> }>) {
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockBatch = {
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
    };

    const mockSourcesRef = {
        update: mockUpdate,
        ref: null as unknown,
    };

    // Each doc has its own ref with update()
    const mockDocs = sourcesDocs.map(({ id, data }) => ({
        id,
        data: () => data,
        ref: { update: mockUpdate },
    }));

    const mockSnapshot = {
        empty: sourcesDocs.length === 0,
        size: sourcesDocs.length,
        docs: mockDocs,
    };

    const mockSourcesCollection = {
        get: jest.fn().mockResolvedValue(mockSnapshot),
    };

    const mockTenantDoc = {
        collection: jest.fn().mockReturnValue(mockSourcesCollection),
    };

    const mockTenantsCollection = {
        doc: jest.fn().mockReturnValue(mockTenantDoc),
    };

    const mockFirestore = {
        collection: jest.fn((name: string) => {
            if (name === 'tenants') return mockTenantsCollection;
            return { doc: jest.fn(), get: jest.fn() };
        }),
        batch: jest.fn().mockReturnValue(mockBatch),
    };

    return { mockFirestore, mockBatch, mockUpdate, mockSnapshot };
}

// ---------------------------------------------------------------------------
// setCompetitiveIntelFrequency
// ---------------------------------------------------------------------------

describe('setCompetitiveIntelFrequency', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'super_user_123', role: 'super_user' });
    });

    const sampleSources = [
        { id: 'source_1', data: { sourceType: 'cann_menus', frequencyMinutes: 10080, competitorId: 'comp_a' } },
        { id: 'source_2', data: { sourceType: 'cann_menus', frequencyMinutes: 10080, competitorId: 'comp_b' } },
        { id: 'source_3', data: { sourceType: 'jina',       frequencyMinutes: 10080, competitorId: 'comp_c' } },
    ];

    it('updates all data sources to empire frequency (15 min)', async () => {
        const { mockFirestore, mockBatch } = buildFirestoreMock(sampleSources);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        const result = await setCompetitiveIntelFrequency('org_thrive_syracuse', 'empire');

        expect(result.error).toBeFalsy();
        expect(result.updatedCount).toBe(3);
        // Batch should have 3 update calls
        expect(mockBatch.update).toHaveBeenCalledTimes(3);
        // Each update should include frequencyMinutes: 15
        expect(mockBatch.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ frequencyMinutes: 15 })
        );
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('updates all data sources to daily frequency (1440 min)', async () => {
        const { mockFirestore, mockBatch } = buildFirestoreMock(sampleSources);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        await setCompetitiveIntelFrequency('org_thrive_syracuse', 'daily');

        expect(mockBatch.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ frequencyMinutes: 1440 })
        );
    });

    it('updates all data sources to weekly frequency (10080 min)', async () => {
        const { mockFirestore, mockBatch } = buildFirestoreMock(sampleSources);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        await setCompetitiveIntelFrequency('org_thrive_syracuse', 'weekly');

        expect(mockBatch.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ frequencyMinutes: 10080 })
        );
    });

    it('updates all data sources to monthly frequency (43200 min)', async () => {
        const { mockFirestore, mockBatch } = buildFirestoreMock(sampleSources);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        await setCompetitiveIntelFrequency('org_thrive_syracuse', 'monthly');

        expect(mockBatch.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ frequencyMinutes: 43200 })
        );
    });

    it('returns error when org has no data sources', async () => {
        const { mockFirestore } = buildFirestoreMock([]);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        const result = await setCompetitiveIntelFrequency('org_no_sources', 'empire');

        expect(result.error).toBe(true);
        expect(result.message).toContain('No data sources found');
    });

    it('queries the correct org data_sources subcollection', async () => {
        const { mockFirestore, mockBatch } = buildFirestoreMock(sampleSources);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        await setCompetitiveIntelFrequency('org_thrive_syracuse', 'empire');

        expect(mockFirestore.collection).toHaveBeenCalledWith('tenants');
        const tenantsCollection = mockFirestore.collection.mock.results[0].value;
        expect(tenantsCollection.doc).toHaveBeenCalledWith('org_thrive_syracuse');
        const tenantDoc = tenantsCollection.doc.mock.results[0].value;
        expect(tenantDoc.collection).toHaveBeenCalledWith('data_sources');
    });

    it('returns correct updatedCount in success message', async () => {
        const { mockFirestore } = buildFirestoreMock(sampleSources);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        const result = await setCompetitiveIntelFrequency('org_thrive_syracuse', 'empire');

        expect(result.updatedCount).toBe(3);
        expect(result.message).toContain('3');
    });

    it('returns error result when requireUser throws (auth gate)', async () => {
        (requireUser as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
        const { mockFirestore } = buildFirestoreMock(sampleSources);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        const result = await setCompetitiveIntelFrequency('org_thrive_syracuse', 'empire');

        expect(result.error).toBe(true);
        expect(result.message).toContain('Unauthorized');
    });

    it('includes updatedAt in each batch update', async () => {
        const { mockFirestore, mockBatch } = buildFirestoreMock([sampleSources[0]]);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        await setCompetitiveIntelFrequency('org_thrive_syracuse', 'daily');

        expect(mockBatch.update).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ updatedAt: expect.any(Date) })
        );
    });
});

// ---------------------------------------------------------------------------
// getCompetitiveIntelFrequency
// ---------------------------------------------------------------------------

describe('getCompetitiveIntelFrequency', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'super_user_123', role: 'super_user' });
    });

    function mockWithFrequency(frequencyMinutes: number) {
        const { mockFirestore } = buildFirestoreMock([
            { id: 'src_1', data: { frequencyMinutes, sourceType: 'cann_menus' } },
            { id: 'src_2', data: { frequencyMinutes, sourceType: 'jina' } },
        ]);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    }

    it('returns empire preset for 15-minute frequency', async () => {
        mockWithFrequency(15);

        const result = await getCompetitiveIntelFrequency('org_thrive_syracuse');

        expect(result.preset).toBe('empire');
        expect(result.frequencyMinutes).toBe(15);
        expect(result.sourceCount).toBe(2);
    });

    it('returns daily preset for 1440-minute frequency', async () => {
        mockWithFrequency(1440);
        const result = await getCompetitiveIntelFrequency('org_thrive_syracuse');
        expect(result.preset).toBe('daily');
    });

    it('returns weekly preset for 10080-minute frequency', async () => {
        mockWithFrequency(10080);
        const result = await getCompetitiveIntelFrequency('org_thrive_syracuse');
        expect(result.preset).toBe('weekly');
    });

    it('returns monthly preset for 43200-minute frequency', async () => {
        mockWithFrequency(43200);
        const result = await getCompetitiveIntelFrequency('org_thrive_syracuse');
        expect(result.preset).toBe('monthly');
    });

    it('returns custom preset for non-standard frequency', async () => {
        mockWithFrequency(720); // 12 hours — not a preset
        const result = await getCompetitiveIntelFrequency('org_thrive_syracuse');
        expect(result.preset).toBe('custom');
        expect(result.frequencyMinutes).toBe(720);
    });

    it('returns null preset and 0 sourceCount when no data sources', async () => {
        const { mockFirestore } = buildFirestoreMock([]);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        const result = await getCompetitiveIntelFrequency('org_no_sources');

        expect(result.preset).toBeNull();
        expect(result.frequencyMinutes).toBeNull();
        expect(result.sourceCount).toBe(0);
    });

    it('returns correct sourceCount', async () => {
        const { mockFirestore } = buildFirestoreMock([
            { id: 's1', data: { frequencyMinutes: 43200 } },
            { id: 's2', data: { frequencyMinutes: 43200 } },
            { id: 's3', data: { frequencyMinutes: 43200 } },
            { id: 's4', data: { frequencyMinutes: 43200 } },
            { id: 's5', data: { frequencyMinutes: 43200 } },
        ]);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        const result = await getCompetitiveIntelFrequency('org_thrive_syracuse');
        expect(result.sourceCount).toBe(5);
    });

    it('uses frequencyMinutes from first source as representative', async () => {
        // Two sources with different frequencies (shouldn't happen, but defensive)
        const { mockFirestore } = buildFirestoreMock([
            { id: 's1', data: { frequencyMinutes: 15 } },
            { id: 's2', data: { frequencyMinutes: 43200 } },
        ]);
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        const result = await getCompetitiveIntelFrequency('org_mixed');
        expect(result.frequencyMinutes).toBe(15); // First source wins
        expect(result.preset).toBe('empire');
    });

    it('returns null values on auth error', async () => {
        (requireUser as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));

        const result = await getCompetitiveIntelFrequency('org_thrive_syracuse');

        expect(result.frequencyMinutes).toBeNull();
        expect(result.preset).toBeNull();
        expect(result.sourceCount).toBe(0);
    });
});
