import { checkGmailConnection, getOutreachDashboardData, triggerCRMLeadSync } from '@/server/actions/ny-outreach-dashboard';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { getOutreachStats } from '@/server/services/ny-outreach/outreach-read-model';
import { syncCRMDispensariesToOutreachQueue } from '@/server/services/ny-outreach/crm-queue-sync';

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/ny-outreach/outreach-read-model', () => ({
    getOutreachStats: jest.fn(),
}));

jest.mock('@/server/services/ny-outreach/outreach-service', () => ({
    sendTestOutreachBatch: jest.fn(),
    trackInCRM: jest.fn(),
}));

jest.mock('@/server/services/ny-outreach/contact-research', () => ({
    researchNewLeads: jest.fn(),
    importNYLicensedLeads: jest.fn(),
    bulkImportAllNYLeads: jest.fn(),
}));

jest.mock('@/server/services/ny-outreach/email-templates', () => ({
    generateOutreachEmails: jest.fn(),
}));

jest.mock('@/server/services/email-verification', () => ({
    verifyEmail: jest.fn(),
}));

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));

jest.mock('@/server/services/ny-outreach/apollo-enrichment', () => ({
    apolloSearchPeople: jest.fn(),
    apolloEnrichByDomain: jest.fn(),
    getApolloCreditStatus: jest.fn(),
}));

jest.mock('@/server/services/ny-outreach/lead-enrichment', () => ({
    enrichLeadBatch: jest.fn(),
}));

jest.mock('@/server/services/ny-outreach/crm-queue-sync', () => ({
    MAX_CRM_QUEUE_SYNC_LIMIT: 500,
    syncCRMDispensariesToOutreachQueue: jest.fn(),
}));

jest.mock('@/server/services/glm-usage', () => ({
    getGLMUsageStatus: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

function makeDoc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    };
}

describe('ny-outreach-dashboard actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('reports Gmail connection using the stored integration document', async () => {
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user-1',
            email: 'martez@bakedbot.ai',
        });
        (getAdminFirestore as jest.Mock).mockReturnValue({
            collection: jest.fn((name: string) => {
                if (name !== 'users') {
                    throw new Error(`Unexpected collection: ${name}`);
                }

                return {
                    doc: jest.fn((id: string) => {
                        expect(id).toBe('user-1');

                        return {
                            collection: jest.fn((subcollection: string) => {
                                if (subcollection !== 'integrations') {
                                    throw new Error(`Unexpected subcollection: ${subcollection}`);
                                }

                                return {
                                    doc: jest.fn((docId: string) => {
                                        expect(docId).toBe('gmail');
                                        return {
                                            get: jest.fn().mockResolvedValue({
                                                exists: true,
                                                data: () => ({
                                                    refreshTokenEncrypted: 'encrypted-refresh-token',
                                                }),
                                            }),
                                        };
                                    }),
                                };
                            }),
                        };
                    }),
                };
            }),
        });

        const result = await checkGmailConnection();

        expect(result).toEqual({
            connected: true,
            email: 'martez@bakedbot.ai',
        });
    });

    it('loads dashboard data even when the sent-today count needs an index fallback', async () => {
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user-1',
            email: 'martez@bakedbot.ai',
        });
        (getOutreachStats as jest.Mock).mockResolvedValue({
            totalSent: 3,
            totalFailed: 1,
            totalBadEmails: 0,
            totalPending: 0,
            recentResults: [],
        });

        const queueDocs = [
            makeDoc('lead-1', {
                dispensaryName: 'Albany One',
                email: 'lead@example.com',
                city: 'Albany',
                source: 'crm',
                createdAt: 1700000000000,
            }),
        ];

        const crmDocs = [
            makeDoc('crm-1', {
                dispensaryName: 'Albany One',
                email: 'lead@example.com',
                city: 'Albany',
                status: 'contacted',
                outreachCount: 2,
                lastOutreachAt: 1700000001000,
                lastTemplateId: 'competitive-report',
            }),
        ];

        const queueQuery = {
            count: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    data: () => ({ count: 1 }),
                }),
            }),
            orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({ docs: queueDocs }),
                }),
            }),
            limit: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ docs: queueDocs }),
            }),
            get: jest.fn().mockResolvedValue({ docs: queueDocs, size: 1 }),
        };

        const sentTodayBaseQuery = {
            where: jest.fn().mockReturnValue({
                count: jest.fn().mockReturnValue({
                    get: jest.fn().mockRejectedValue({
                        code: 9,
                        message: 'FAILED_PRECONDITION: The query requires an index.',
                    }),
                }),
            }),
            get: jest.fn().mockResolvedValue({
                docs: [
                    makeDoc('log-1', { emailSent: true }),
                    makeDoc('log-2', { emailSent: false }),
                ],
            }),
        };

        const pendingDraftsQuery = {
            count: jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({
                    data: () => ({ count: 2 }),
                }),
            }),
            get: jest.fn().mockResolvedValue({ size: 2 }),
        };

        const db = {
            collection: jest.fn((name: string) => {
                if (name === 'ny_dispensary_leads') {
                    return {
                        where: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnValue(queueQuery),
                        }),
                    };
                }

                if (name === 'crm_outreach_contacts') {
                    return {
                        orderBy: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue({ docs: crmDocs }),
                            }),
                        }),
                    };
                }

                if (name === 'ny_outreach_log') {
                    return {
                        where: jest.fn().mockReturnValue(sentTodayBaseQuery),
                    };
                }

                if (name === 'ny_outreach_drafts') {
                    return {
                        where: jest.fn().mockReturnValue(pendingDraftsQuery),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(db);

        const result = await getOutreachDashboardData();

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({
            queueDepth: 1,
            sentToday: 1,
            pendingDrafts: 2,
            crmContacts: [
                expect.objectContaining({
                    id: 'crm-1',
                    email: 'lead@example.com',
                }),
            ],
            queueLeads: [
                expect.objectContaining({
                    id: 'lead-1',
                    email: 'lead@example.com',
                }),
            ],
        });
    });

    it('syncs CRM dispensaries into the outreach queue', async () => {
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user-1',
            email: 'martez@bakedbot.ai',
        });
        (getAdminFirestore as jest.Mock).mockReturnValue({
            batch: jest.fn(() => ({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
            })),
            collection: jest.fn((name: string) => {
                if (name === 'retailers') {
                    return {
                        limit: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({ docs: [] }),
                        })),
                    };
                }

                if (name === 'crm_dispensaries') {
                    return {
                        get: jest.fn().mockResolvedValue({ docs: [] }),
                        doc: jest.fn((id: string) => ({ id })),
                    };
                }

                throw new Error(`Unexpected collection: ${name}`);
            }),
        });
        (syncCRMDispensariesToOutreachQueue as jest.Mock).mockResolvedValue({
            states: ['NY', 'MI', 'IL'],
            scanned: 12,
            created: 5,
            updated: 2,
            skipped: 5,
            createdLeadIds: ['lead-1'],
        });

        const result = await triggerCRMLeadSync();

        expect(syncCRMDispensariesToOutreachQueue).toHaveBeenCalledWith({ limit: 500 });
        expect(result).toMatchObject({
            success: true,
            created: 5,
            updated: 2,
            skipped: 5,
            states: ['NY', 'MI', 'IL'],
        });
    });
});
