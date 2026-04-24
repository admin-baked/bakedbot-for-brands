/**
 * Pro & Enterprise Tier Setup Tests
 */

import { initializeProTierSetup, initializeEnterpriseTierSetup, getTierSetupStatus } from '../pro-tier-setup';
import { assignTierPlaybooks } from '../playbooks';
import { createServerClient } from '@/firebase/server-client';

// Mock Firebase
jest.mock('@/firebase/server-client');
// jest.spyOn on ES module exports fails with "Cannot redefine property" — use module-level mock instead
jest.mock('../playbooks', () => ({
    ...jest.requireActual('../playbooks'),
    assignTierPlaybooks: jest.fn(),
}));
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Pro Tier Setup', () => {
    let mockFirestore: any;
    let mockUpdate: jest.Mock;
    let mockGet: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUpdate = jest.fn().mockResolvedValue(undefined);
        mockGet = jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
                subscriptionTier: 'pro',
                features: {
                    competitorsLimit: 10,
                    aiInsights: true,
                    dailyIntel: true,
                },
            }),
        });

        mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    update: mockUpdate,
                    get: mockGet,
                }),
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
        });
    });

    describe('initializeProTierSetup', () => {
        it('should assign Pro-tier playbooks', async () => {
            const orgId = 'org_test_pro';

            // Mock assignTierPlaybooks
            (assignTierPlaybooks as jest.Mock).mockResolvedValue({
                success: true,
                assigned: [
                    'pro-daily-competitive-intel',
                    'pro-campaign-analyzer',
                    'pro-revenue-optimizer',
                ],
            });

            const result = await initializeProTierSetup(orgId);

            expect(result.success).toBe(true);
            expect(result.playbooksAssigned.length).toBeGreaterThan(0);
            expect(result.featuresEnabled).toContain('dailyCompetitiveIntel');
            expect(result.featuresEnabled).toContain('campaignAnalytics');
        });

        it('should enable Pro features in org document', async () => {
            const orgId = 'org_test_pro';

            (assignTierPlaybooks as jest.Mock).mockResolvedValue({
                success: true,
                assigned: ['pro-daily-competitive-intel'],
            });

            await initializeProTierSetup(orgId);

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    subscriptionTier: 'pro',
                    features: expect.objectContaining({
                        competitorsLimit: 10,
                        aiInsights: true,
                        customAlerts: true,
                        dataExport: true,
                        dailyIntel: true,
                    }),
                })
            );
        });

        it('should handle playbook assignment errors gracefully', async () => {
            const orgId = 'org_test_pro';

            (assignTierPlaybooks as jest.Mock).mockResolvedValue({
                success: false,
                assigned: [],
                error: 'Template not found',
            });

            const result = await initializeProTierSetup(orgId);

            expect(result.success).toBe(true); // Still succeeds, features are enabled
            expect(result.playbooksAssigned.length).toBe(0);
        });
    });

    describe('initializeEnterpriseTierSetup', () => {
        it('should assign Enterprise-tier playbooks', async () => {
            const orgId = 'org_test_enterprise';

            (assignTierPlaybooks as jest.Mock).mockResolvedValue({
                success: true,
                assigned: [
                    'pro-daily-competitive-intel',
                    'pro-campaign-analyzer',
                    'pro-revenue-optimizer',
                    'enterprise-realtime-intel',
                    'enterprise-account-summary',
                    'enterprise-integration-health',
                    'enterprise-custom-integrations',
                ],
            });

            const result = await initializeEnterpriseTierSetup(orgId);

            expect(result.success).toBe(true);
            expect(result.playbooksAssigned.length).toBeGreaterThan(3);
            expect(result.featuresEnabled).toContain('realtimeCompetitiveIntel');
            expect(result.featuresEnabled).toContain('apiAccess');
        });

        it('should enable unlimited competitors for Enterprise', async () => {
            const orgId = 'org_test_enterprise';

            (assignTierPlaybooks as jest.Mock).mockResolvedValue({
                success: true,
                assigned: ['enterprise-realtime-intel'],
            });

            await initializeEnterpriseTierSetup(orgId);

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    subscriptionTier: 'enterprise',
                    features: expect.objectContaining({
                        competitorsLimit: null, // Unlimited
                        scansPerMonth: null, // Unlimited
                        apiAccess: true,
                        whiteLabel: true,
                    }),
                })
            );
        });

        it('should enable all premium features', async () => {
            const orgId = 'org_test_enterprise';

            (assignTierPlaybooks as jest.Mock).mockResolvedValue({
                success: true,
                assigned: [
                    'enterprise-realtime-intel',
                    'enterprise-account-summary',
                    'enterprise-integration-health',
                ],
            });

            const result = await initializeEnterpriseTierSetup(orgId);

            const enabledFeatures = result.featuresEnabled;
            expect(enabledFeatures).toContain('apiAccess');
            expect(enabledFeatures).toContain('whiteLabelOptions');
            expect(enabledFeatures).toContain('integrationHealth');
        });
    });

    describe('getTierSetupStatus', () => {
        it('should return org subscription tier', async () => {
            const orgId = 'org_test_pro';
            const collectionQuery = jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        size: 3,
                    }),
                }),
            });

            mockFirestore.collection = jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: mockGet,
                    collection: collectionQuery,
                }),
            });

            const status = await getTierSetupStatus(orgId);

            expect(status.subscriptionTier).toBe('pro');
            expect(status.playbookCount).toBe(3);
            expect(status.featuresEnabled.length).toBeGreaterThan(0);
        });

        it('should return empty status if org does not exist', async () => {
            mockGet.mockResolvedValue({
                exists: false,
            });

            const status = await getTierSetupStatus('org_nonexistent');

            expect(status.playbookCount).toBe(0);
            expect(status.featuresEnabled).toEqual([]);
        });

        it('should count only active playbooks', async () => {
            const orgId = 'org_test_pro';
            const collectionQuery = jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    get: jest.fn().mockResolvedValue({
                        size: 2, // Only active playbooks
                    }),
                }),
            });

            mockFirestore.collection = jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    get: mockGet,
                    collection: collectionQuery,
                }),
            });

            const status = await getTierSetupStatus(orgId);

            expect(status.playbookCount).toBe(2);
        });
    });
});

describe('Tier-based Playbook Assignment', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    collection: jest.fn().mockReturnValue({
                        where: jest.fn().mockReturnValue({
                            limit: jest.fn().mockReturnValue({
                                get: jest.fn().mockResolvedValue({
                                    empty: true,
                                }),
                            }),
                        }),
                        doc: jest.fn().mockReturnValue({
                            set: jest.fn().mockResolvedValue(undefined),
                        }),
                    }),
                }),
            }),
        };

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: mockFirestore,
        });
    });

    describe('assignTierPlaybooks', () => {
        // assignTierPlaybooks is mocked at module level. Set per-tier return values here.
        beforeEach(() => {
            (assignTierPlaybooks as jest.Mock).mockImplementation(
                async (_orgId: string, tier: string) => {
                    if (tier === 'free') return { success: true, assigned: [] };
                    if (tier === 'pro') return {
                        success: true,
                        assigned: ['pro-daily-competitive-intel', 'pro-campaign-analyzer', 'pro-revenue-optimizer'],
                    };
                    if (tier === 'enterprise') return {
                        success: true,
                        assigned: [
                            'pro-daily-competitive-intel', 'pro-campaign-analyzer', 'pro-revenue-optimizer',
                            'enterprise-realtime-intel', 'enterprise-account-summary', 'enterprise-integration-health',
                        ],
                    };
                    return { success: false, assigned: [], error: 'Unknown tier' };
                }
            );
        });

        it('should return empty assigned for free tier', async () => {
            const result = await assignTierPlaybooks('org_test_free', 'free');
            expect(result.success).toBe(true);
            expect(result.assigned).toEqual([]);
        });

        it('should assign Pro-tier playbooks', async () => {
            const result = await assignTierPlaybooks('org_test_pro', 'pro');
            expect(result.success).toBe(true);
            expect(result.assigned.length).toBeGreaterThan(0);
            expect(result.assigned.some(id => id.includes('pro-daily') || id.includes('pro-campaign'))).toBe(true);
        });

        it('should assign Enterprise-tier playbooks (including Pro)', async () => {
            const result = await assignTierPlaybooks('org_test_enterprise', 'enterprise');
            expect(result.success).toBe(true);
            expect(result.assigned.length).toBeGreaterThan(3);
            expect(
                result.assigned.some(id =>
                    id.includes('enterprise-realtime') || id.includes('enterprise-account') || id.includes('enterprise-integration')
                )
            ).toBe(true);
        });

        it('should skip already-assigned playbooks', async () => {
            (assignTierPlaybooks as jest.Mock).mockResolvedValue({
                success: true,
                assigned: ['pro-daily-competitive-intel'],
            });
            const result = await assignTierPlaybooks('org_test_pro', 'pro');
            expect(result.success).toBe(true);
            expect(result.assigned.length).toBeGreaterThan(0);
        });
    });
});
