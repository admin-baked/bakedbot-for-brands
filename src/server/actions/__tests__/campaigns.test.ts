/**
 * Campaign Server Actions Tests
 *
 * Tests for createCampaign, updateCampaign, getCampaign, getCampaigns,
 * getCampaignStats, approveCampaign, scheduleCampaign, cancelCampaign,
 * and pauseCampaign server actions.
 */

import {
    createCampaign,
    updateCampaign,
    getCampaign,
    getCampaigns,
    getCampaignStats,
    approveCampaign,
    scheduleCampaign,
    cancelCampaign,
    pauseCampaign,
} from '../campaigns';
import { requireUser } from '@/server/auth/auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({
        uid: 'user-1',
        email: 'test@example.com',
        role: 'dispensary',
        orgId: 'org-1',
    }),
}));

// Chainable Firestore mock helper
const createChainableMock = (finalResult: unknown = { docs: [] }) => {
    const mock: Record<string, jest.Mock> = {};
    const chainMethods = ['collection', 'doc', 'where', 'orderBy', 'limit'];

    chainMethods.forEach(method => {
        mock[method] = jest.fn(() => mock);
    });

    mock.get = jest.fn().mockResolvedValue(finalResult);
    mock.add = jest.fn().mockResolvedValue({ id: 'new-campaign-id' });
    mock.update = jest.fn().mockResolvedValue(undefined);
    mock.set = jest.fn().mockResolvedValue(undefined);

    return mock;
};

const mockFirestore = createChainableMock();

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: mockFirestore,
    })),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Campaign Server Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Reset chain defaults
        ['collection', 'doc', 'where', 'orderBy', 'limit'].forEach(m => {
            mockFirestore[m]?.mockReturnValue(mockFirestore);
        });
        mockFirestore.get.mockResolvedValue({ exists: true, data: () => ({ orgId: 'org-1' }), docs: [] });
        mockFirestore.add.mockResolvedValue({ id: 'new-campaign-id' });
        mockFirestore.update.mockResolvedValue(undefined);
    });

    // -----------------------------------------------------------------------
    // createCampaign
    // -----------------------------------------------------------------------

    describe('createCampaign', () => {
        it('creates doc with correct data and returns Campaign', async () => {
            const result = await createCampaign({
                name: 'Spring Sale',
                goal: 'drive_sales',
                channels: ['sms'],
            });

            expect(result).not.toBeNull();
            expect(result!.id).toBe('new-campaign-id');
            expect(result!.name).toBe('Spring Sale');
            expect(result!.goal).toBe('drive_sales');
            expect(result!.status).toBe('draft');
            expect(result!.channels).toEqual(['sms']);
            expect(mockFirestore.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Spring Sale',
                    goal: 'drive_sales',
                    status: 'draft',
                })
            );
        });

        it('uses orgId from auth when not provided', async () => {
            const result = await createCampaign({
                name: 'Auto Org',
                goal: 'retention',
                channels: ['email'],
            });

            expect(result).not.toBeNull();
            expect(result!.orgId).toBe('org-1');
        });

        it('returns null on error', async () => {
            mockFirestore.add.mockRejectedValue(new Error('Write failed'));

            const result = await createCampaign({
                name: 'Fail',
                goal: 'winback',
                channels: ['sms'],
            });

            expect(result).toBeNull();
        });

        it('blocks cross-org create for non-super users', async () => {
            const result = await createCampaign({
                orgId: 'org-2',
                name: 'Cross Org Attempt',
                goal: 'drive_sales',
                channels: ['email'],
            });

            expect(result).toBeNull();
            expect(mockFirestore.add).not.toHaveBeenCalled();
        });

        it('allows super_user to create for another org', async () => {
            (requireUser as jest.Mock).mockResolvedValueOnce({
                uid: 'super-1',
                email: 'super@example.com',
                role: 'super_user',
                orgId: 'org-1',
            });

            const result = await createCampaign({
                orgId: 'org-2',
                name: 'Cross Org Allowed',
                goal: 'drive_sales',
                channels: ['email'],
            });

            expect(result).not.toBeNull();
            expect(result!.orgId).toBe('org-2');
            expect(mockFirestore.add).toHaveBeenCalledWith(
                expect.objectContaining({
                    orgId: 'org-2',
                })
            );
        });
    });

    // -----------------------------------------------------------------------
    // updateCampaign
    // -----------------------------------------------------------------------

    describe('updateCampaign', () => {
        it('calls Firestore update with provided fields', async () => {
            const result = await updateCampaign('camp-1', {
                name: 'Renamed Campaign',
                status: 'approved',
            });

            expect(result).toBe(true);
            expect(mockFirestore.doc).toHaveBeenCalledWith('camp-1');
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Renamed Campaign',
                    status: 'approved',
                })
            );
        });

        it('blocks update when campaign belongs to another org', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                exists: true,
                data: () => ({ orgId: 'org-2' }),
            });

            const result = await updateCampaign('camp-1', {
                name: 'Should Not Update',
            });

            expect(result).toBe(false);
            expect(mockFirestore.update).not.toHaveBeenCalled();
        });
    });

    // -----------------------------------------------------------------------
    // getCampaign
    // -----------------------------------------------------------------------

    describe('getCampaign', () => {
        it('returns null when doc does not exist', async () => {
            mockFirestore.get.mockResolvedValue({ exists: false });

            const result = await getCampaign('nonexistent');

            expect(result).toBeNull();
        });

        it('converts Firestore timestamps to Dates', async () => {
            const fakeCreated = new Date('2026-01-01T00:00:00Z');
            const fakeUpdated = new Date('2026-01-15T00:00:00Z');
            const fakeScheduled = new Date('2026-02-01T09:00:00Z');

            mockFirestore.get.mockResolvedValue({
                exists: true,
                id: 'camp-100',
                data: () => ({
                    name: 'Timestamped Campaign',
                    orgId: 'org-1',
                    goal: 'loyalty',
                    status: 'scheduled',
                    channels: ['email'],
                    audience: { type: 'all', estimatedCount: 100 },
                    content: {},
                    createdAt: { toDate: () => fakeCreated },
                    updatedAt: { toDate: () => fakeUpdated },
                    scheduledAt: { toDate: () => fakeScheduled },
                    sentAt: null,
                    completedAt: null,
                    approvedAt: null,
                    complianceReviewedAt: null,
                }),
            });

            const result = await getCampaign('camp-100');

            expect(result).not.toBeNull();
            expect(result!.createdAt).toEqual(fakeCreated);
            expect(result!.updatedAt).toEqual(fakeUpdated);
            expect(result!.scheduledAt).toEqual(fakeScheduled);
        });

        it('returns null when campaign org is unauthorized', async () => {
            mockFirestore.get.mockResolvedValueOnce({
                exists: true,
                id: 'camp-200',
                data: () => ({
                    orgId: 'org-2',
                    name: 'Foreign Campaign',
                    goal: 'drive_sales',
                    status: 'draft',
                    channels: ['email'],
                    audience: { type: 'all', estimatedCount: 0 },
                    content: {},
                    createdAt: { toDate: () => new Date('2026-01-01T00:00:00Z') },
                    updatedAt: { toDate: () => new Date('2026-01-01T00:00:00Z') },
                }),
            });

            const result = await getCampaign('camp-200');
            expect(result).toBeNull();
        });
    });

    // -----------------------------------------------------------------------
    // getCampaigns
    // -----------------------------------------------------------------------

    describe('getCampaigns', () => {
        it('filters by orgId', async () => {
            const fakeDate = new Date('2026-01-01');
            mockFirestore.get.mockResolvedValue({
                docs: [
                    {
                        id: 'camp-a',
                        data: () => ({
                            name: 'Camp A',
                            orgId: 'org-1',
                            goal: 'drive_sales',
                            status: 'draft',
                            channels: ['sms'],
                            audience: { type: 'all', estimatedCount: 50 },
                            content: {},
                            createdAt: { toDate: () => fakeDate },
                            updatedAt: { toDate: () => fakeDate },
                        }),
                    },
                ],
            });

            const result = await getCampaigns('org-1');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('camp-a');
            expect(mockFirestore.where).toHaveBeenCalledWith('orgId', '==', 'org-1');
        });

        it('returns empty list for unauthorized org queries', async () => {
            const result = await getCampaigns('org-2');
            expect(result).toEqual([]);
            expect(mockFirestore.where).not.toHaveBeenCalledWith('orgId', '==', 'org-2');
        });
    });

    // -----------------------------------------------------------------------
    // getCampaignStats
    // -----------------------------------------------------------------------

    describe('getCampaignStats', () => {
        it('computes stats from campaigns list', async () => {
            const fakeDate = new Date('2026-01-01');
            const baseCampaign = {
                orgId: 'org-1',
                channels: ['sms'],
                audience: { type: 'all', estimatedCount: 10 },
                content: {},
                createdAt: { toDate: () => fakeDate },
                updatedAt: { toDate: () => fakeDate },
            };

            mockFirestore.get.mockResolvedValue({
                docs: [
                    { id: '1', data: () => ({ ...baseCampaign, name: 'Draft', goal: 'drive_sales', status: 'draft' }) },
                    { id: '2', data: () => ({ ...baseCampaign, name: 'Active', goal: 'retention', status: 'scheduled' }) },
                    { id: '3', data: () => ({ ...baseCampaign, name: 'Sent', goal: 'winback', status: 'sent' }) },
                    { id: '4', data: () => ({ ...baseCampaign, name: 'Another Draft', goal: 'loyalty', status: 'draft' }) },
                ],
            });

            const stats = await getCampaignStats('org-1');

            expect(stats.total).toBe(4);
            expect(stats.drafts).toBe(2);
            expect(stats.scheduled).toBe(1);
            expect(stats.sent).toBe(1);
            // 'scheduled' is in active statuses
            expect(stats.active).toBe(1);
        });

        it('computes avgOpenRate from sent campaigns with performance data', async () => {
            const fakeDate = new Date('2026-01-01');
            const baseCampaign = {
                orgId: 'org-1',
                channels: ['email'],
                audience: { type: 'all', estimatedCount: 100 },
                content: {},
                createdAt: { toDate: () => fakeDate },
                updatedAt: { toDate: () => fakeDate },
            };

            mockFirestore.get.mockResolvedValue({
                docs: [
                    {
                        id: '1',
                        data: () => ({
                            ...baseCampaign,
                            name: 'Sent A',
                            goal: 'drive_sales',
                            status: 'sent',
                            performance: {
                                sent: 100,
                                openRate: 40,
                                clickRate: 10,
                                revenue: 500,
                                lastUpdated: { toDate: () => fakeDate },
                            },
                        }),
                    },
                    {
                        id: '2',
                        data: () => ({
                            ...baseCampaign,
                            name: 'Sent B',
                            goal: 'winback',
                            status: 'sent',
                            performance: {
                                sent: 200,
                                openRate: 60,
                                clickRate: 20,
                                revenue: 1000,
                                lastUpdated: { toDate: () => fakeDate },
                            },
                        }),
                    },
                ],
            });

            const stats = await getCampaignStats('org-1');

            // avgOpenRate = (40 + 60) / 2 = 50
            expect(stats.avgOpenRate).toBe(50);
            // avgClickRate = (10 + 20) / 2 = 15
            expect(stats.avgClickRate).toBe(15);
            // totalRevenue = 500 + 1000 = 1500
            expect(stats.totalRevenue).toBe(1500);
        });
    });

    // -----------------------------------------------------------------------
    // Lifecycle Actions
    // -----------------------------------------------------------------------

    describe('approveCampaign', () => {
        it('sets status to approved with approvedAt and approvedBy', async () => {
            const result = await approveCampaign('camp-10', 'admin-user');

            expect(result).toBe(true);
            expect(mockFirestore.doc).toHaveBeenCalledWith('camp-10');
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'approved',
                    approvedBy: 'admin-user',
                    approvedAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                })
            );
        });
    });

    describe('scheduleCampaign', () => {
        it('sets status to scheduled with scheduledAt', async () => {
            const scheduleDate = new Date('2026-03-01T09:00:00Z');

            const result = await scheduleCampaign('camp-20', scheduleDate);

            expect(result).toBe(true);
            expect(mockFirestore.doc).toHaveBeenCalledWith('camp-20');
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'scheduled',
                    scheduledAt: scheduleDate,
                    updatedAt: expect.any(Date),
                })
            );
        });
    });

    describe('cancelCampaign', () => {
        it('sets status to cancelled', async () => {
            const result = await cancelCampaign('camp-30');

            expect(result).toBe(true);
            expect(mockFirestore.doc).toHaveBeenCalledWith('camp-30');
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'cancelled',
                    updatedAt: expect.any(Date),
                })
            );
        });
    });

    describe('pauseCampaign', () => {
        it('sets status to paused', async () => {
            const result = await pauseCampaign('camp-40');

            expect(result).toBe(true);
            expect(mockFirestore.doc).toHaveBeenCalledWith('camp-40');
            expect(mockFirestore.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'paused',
                    updatedAt: expect.any(Date),
                })
            );
        });
    });
});
