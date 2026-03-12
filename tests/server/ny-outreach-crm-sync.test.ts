import { getAdminFirestore } from '@/firebase/admin';
import { syncCRMDispensariesToOutreachQueue } from '@/server/services/ny-outreach/crm-queue-sync';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

type MockDoc = {
    id: string;
    ref: { id: string };
    data: () => Record<string, unknown>;
};

function makeDoc(id: string, data: Record<string, unknown>): MockDoc {
    return {
        id,
        ref: { id },
        data: () => data,
    };
}

function makeSnapshot(docs: MockDoc[]) {
    return { docs };
}

describe('syncCRMDispensariesToOutreachQueue', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('creates new outreach leads and refreshes matching queue records from CRM dispensaries', async () => {
        const batchOps: Array<{ type: 'set' | 'update'; refId: string; data: Record<string, unknown> }> = [];
        const batch = {
            set: jest.fn((ref: { id: string }, data: Record<string, unknown>) => {
                batchOps.push({ type: 'set', refId: ref.id, data });
            }),
            update: jest.fn((ref: { id: string }, data: Record<string, unknown>) => {
                batchOps.push({ type: 'update', refId: ref.id, data });
            }),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        const existingLead = makeDoc('lead-existing', {
            dispensaryName: 'Detroit Green',
            city: 'Detroit',
            state: 'MI',
            email: null,
            phone: null,
            websiteUrl: null,
            notes: null,
        });

        const nyLeadsSnapshot = makeSnapshot([]);
        const miLeadsSnapshot = makeSnapshot([existingLead]);
        const ilLeadsSnapshot = makeSnapshot([]);

        const nyCrmSnapshot = makeSnapshot([
            makeDoc('crm-claimed', {
                name: 'Buffalo Claimed',
                city: 'Buffalo',
                state: 'NY',
                claimStatus: 'claimed',
                source: 'system',
            }),
        ]);
        const miCrmSnapshot = makeSnapshot([
            makeDoc('crm-detroit', {
                name: 'Detroit Green',
                city: 'Detroit',
                state: 'MI',
                email: 'owner@detroitgreen.com',
                phone: '313-555-0000',
                website: 'https://detroitgreen.com',
                claimStatus: 'unclaimed',
                source: 'import',
            }),
        ]);
        const ilCrmSnapshot = makeSnapshot([
            makeDoc('crm-chicago', {
                name: 'Chicago Herb House',
                city: 'Chicago',
                state: 'IL',
                address: '123 W Lake St',
                phone: '312-555-1111',
                website: 'https://chicagoherb.house',
                claimStatus: 'unclaimed',
                source: 'system',
            }),
        ]);

        let generatedDocCount = 0;
        const db = {
            batch: jest.fn(() => batch),
            collection: jest.fn((name: string) => {
                if (name === 'ny_dispensary_leads') {
                    return {
                        where: jest.fn((_field: string, _op: string, state: string) => ({
                            get: jest.fn().mockResolvedValue(
                                state === 'NY' ? nyLeadsSnapshot :
                                state === 'MI' ? miLeadsSnapshot :
                                ilLeadsSnapshot
                            ),
                        })),
                        doc: jest.fn(() => ({ id: `lead-new-${++generatedDocCount}` })),
                    };
                }

                if (name === 'crm_dispensaries') {
                    return {
                        where: jest.fn((_field: string, _op: string, state: string) => ({
                            get: jest.fn().mockResolvedValue(
                                state === 'NY' ? nyCrmSnapshot :
                                state === 'MI' ? miCrmSnapshot :
                                ilCrmSnapshot
                            ),
                        })),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(db);

        const result = await syncCRMDispensariesToOutreachQueue({
            limit: 10,
            states: ['NY', 'MI', 'IL'],
        });

        expect(result).toMatchObject({
            states: ['NY', 'MI', 'IL'],
            created: 1,
            updated: 1,
            skipped: 1,
        });
        expect(result.createdLeadIds).toEqual(['lead-new-1']);
        expect(batch.commit).toHaveBeenCalledTimes(1);
        expect(batchOps).toEqual([
            {
                type: 'update',
                refId: 'lead-existing',
                data: expect.objectContaining({
                    crmDispensaryId: 'crm-detroit',
                    crmClaimStatus: 'unclaimed',
                    email: 'owner@detroitgreen.com',
                    phone: '313-555-0000',
                    websiteUrl: 'https://detroitgreen.com',
                    enriched: true,
                    notes: 'Seeded from CRM dispensary directory',
                }),
            },
            {
                type: 'set',
                refId: 'lead-new-1',
                data: expect.objectContaining({
                    dispensaryName: 'Chicago Herb House',
                    city: 'Chicago',
                    state: 'IL',
                    address: '123 W Lake St',
                    phone: '312-555-1111',
                    websiteUrl: 'https://chicagoherb.house',
                    source: 'crm:system',
                    crmDispensaryId: 'crm-chicago',
                    status: 'researched',
                    outreachSent: false,
                    enriched: false,
                }),
            },
        ]);
    });

    it('skips CRM dispensaries already fully represented in the outreach queue', async () => {
        const batch = {
            set: jest.fn(),
            update: jest.fn(),
            commit: jest.fn().mockResolvedValue(undefined),
        };

        const existingLead = makeDoc('lead-existing', {
            dispensaryName: 'Albany Green',
            city: 'Albany',
            state: 'NY',
            email: 'hello@albanygreen.com',
            phone: '518-555-2222',
            websiteUrl: 'https://albanygreen.com',
            notes: 'Seeded from CRM dispensary directory',
            crmDispensaryId: 'crm-albany',
            crmClaimStatus: 'unclaimed',
            enriched: true,
        });

        const db = {
            batch: jest.fn(() => batch),
            collection: jest.fn((name: string) => {
                if (name === 'ny_dispensary_leads') {
                    return {
                        where: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue(makeSnapshot([existingLead])),
                        })),
                        doc: jest.fn(() => ({ id: 'lead-unused' })),
                    };
                }

                if (name === 'crm_dispensaries') {
                    return {
                        where: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue(makeSnapshot([
                                makeDoc('crm-albany', {
                                    name: 'Albany Green',
                                    city: 'Albany',
                                    state: 'NY',
                                    email: 'hello@albanygreen.com',
                                    phone: '518-555-2222',
                                    website: 'https://albanygreen.com',
                                    claimStatus: 'unclaimed',
                                    source: 'system',
                                }),
                            ])),
                        })),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(db);

        const result = await syncCRMDispensariesToOutreachQueue({
            limit: 5,
            states: ['NY'],
        });

        expect(result).toMatchObject({
            states: ['NY'],
            created: 0,
            updated: 0,
            skipped: 1,
        });
        expect(batch.set).not.toHaveBeenCalled();
        expect(batch.update).not.toHaveBeenCalled();
        expect(batch.commit).not.toHaveBeenCalled();
    });
});
