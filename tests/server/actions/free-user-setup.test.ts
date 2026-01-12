/**
 * Unit Tests: Free User Setup Actions
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock Firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            add: jest.fn().mockResolvedValue({ id: 'test-competitor-id' }),
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
        },
    }),
}));

// Mock Firecrawl Discovery
jest.mock('@/server/services/firecrawl', () => ({
    discovery: {
        isConfigured: jest.fn().mockReturnValue(true),
        search: jest.fn().mockResolvedValue([
            {
                title: 'Green Leaf Dispensary - Cannabis Menu',
                url: 'https://example.com/greenleaf',
                description: 'Best dispensary in Chicago, IL 60601',
            },
            {
                title: 'High Times Cannabis Shop',
                url: 'https://example.com/hightimes/menu',
                description: 'Premium cannabis Chicago, IL',
            },
            {
                title: 'Wellness Dispensary',
                url: 'https://example.com/wellness',
                description: 'Medical marijuana Chicago, IL 60602',
            },
        ]),
    },
}));

// Mock competitor-manager
jest.mock('@/server/services/ezal/competitor-manager', () => ({
    quickSetupCompetitor: jest.fn().mockResolvedValue({
        competitor: { id: 'comp-1', name: 'Green Leaf Dispensary' },
        dataSource: { id: 'src-1' },
    }),
}));

// Mock playbooks
jest.mock('@/server/actions/playbooks', () => ({
    assignPlaybookToOrg: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Free User Setup Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initializeFreeUserCompetitors', () => {
        it('should discover and create up to 3 competitors', async () => {
            const { initializeFreeUserCompetitors } = await import('@/server/actions/free-user-setup');
            const { quickSetupCompetitor } = await import('@/server/services/ezal/competitor-manager');
            
            const result = await initializeFreeUserCompetitors('org-123', {
                lat: 41.8781,
                lng: -87.6298,
                zip: '60601',
                city: 'Chicago',
                state: 'IL',
            });

            expect(result.success).toBe(true);
            expect(result.competitorsCreated).toBe(3);
            expect(result.competitors).toHaveLength(3);
            expect(quickSetupCompetitor).toHaveBeenCalledTimes(3);
        });

        it('should enforce Free tier limits (3 competitors, daily frequency)', async () => {
            const { initializeFreeUserCompetitors } = await import('@/server/actions/free-user-setup');
            const { quickSetupCompetitor } = await import('@/server/services/ezal/competitor-manager');
            
            await initializeFreeUserCompetitors('org-123', {
                lat: 41.8781,
                lng: -87.6298,
                zip: '60601',
                city: 'Chicago',
                state: 'IL',
            });

            // Check that quickSetupCompetitor was called with daily frequency
            const calls = (quickSetupCompetitor as jest.Mock).mock.calls;
            expect(calls).toHaveLength(3);
            
            // Each call should have frequencyMinutes = 1440 (daily)
            calls.forEach(call => {
                expect(call[1]).toMatchObject({
                    frequencyMinutes: 1440,
                    planId: 'free',
                });
            });
        });

        it('should assign weekly playbook after competitor setup', async () => {
            const { initializeFreeUserCompetitors } = await import('@/server/actions/free-user-setup');
            const { assignPlaybookToOrg } = await import('@/server/actions/playbooks');
            
            const result = await initializeFreeUserCompetitors('org-123', {
                lat: 41.8781,
                lng: -87.6298,
                zip: '60601',
                city: 'Chicago',
                state: 'IL',
            });

            expect(result.playbookAssigned).toBe(true);
            expect(assignPlaybookToOrg).toHaveBeenCalledWith(
                'org-123',
                'free-weekly-competitive-intel'
            );
        });

        it('should handle case when no dispensaries found', async () => {
            const { discovery } = await import('@/server/services/firecrawl');
            (discovery.search as jest.Mock).mockResolvedValueOnce([]);
            
            const { initializeFreeUserCompetitors } = await import('@/server/actions/free-user-setup');
            
            const result = await initializeFreeUserCompetitors('org-123', {
                lat: 41.8781,
                lng: -87.6298,
                zip: '60601',
                city: 'Chicago',
                state: 'IL',
            });

            expect(result.success).toBe(true);
            expect(result.competitorsCreated).toBe(0);
            expect(result.error).toContain('No dispensaries found');
        });

        it('should filter out non-dispensary search results', async () => {
            const { discovery } = await import('@/server/services/firecrawl');
            (discovery.search as jest.Mock).mockResolvedValueOnce([
                { title: 'Best Coffee Shop', url: 'https://coffee.com' },
                { title: 'Cannabis Dispensary Menu', url: 'https://disp.com/menu' },
                { title: 'Pizza Place', url: 'https://pizza.com' },
            ]);
            
            const { initializeFreeUserCompetitors } = await import('@/server/actions/free-user-setup');
            const { quickSetupCompetitor } = await import('@/server/services/ezal/competitor-manager');
            
            await initializeFreeUserCompetitors('org-123', {
                lat: 41.8781,
                lng: -87.6298,
                zip: '60601',
                city: 'Chicago',
                state: 'IL',
            });

            // Only 1 dispensary result should be created
            expect(quickSetupCompetitor).toHaveBeenCalledTimes(1);
        });
    });
});
