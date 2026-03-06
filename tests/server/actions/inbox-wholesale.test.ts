var mockRequireUser = jest.fn();
var mockLeaflinkAction = jest.fn();

jest.mock('@/server/auth/auth', () => ({
    requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/server/tools/leaflink', () => ({
    leaflinkAction: (...args: unknown[]) => mockLeaflinkAction(...args),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
    },
}));

import { generateInboxWholesaleInventoryInsight } from '@/server/actions/inbox-wholesale';

describe('inbox wholesale inventory server action', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireUser.mockResolvedValue({
            uid: 'user-1',
            role: 'grower',
            currentOrgId: 'org-grower',
        });
    });

    it('maps live LeafLink products into a wholesale inventory snapshot', async () => {
        mockLeaflinkAction.mockResolvedValue({
            success: true,
            data: [
                { id: 'prod-2', name: 'Reserve Flower', brand: 'Grow House', sku: 'RF-7', inventory: 60 },
                { id: 'prod-1', name: 'Pre-roll Pack', brand: 'Grow House', sku: 'PR-5', inventory: 8 },
            ],
        });

        const result = await generateInboxWholesaleInventoryInsight({
            orgId: 'org-grower',
            prompt: 'Focus on Manhattan buyers.',
        });

        expect(mockLeaflinkAction).toHaveBeenCalledWith(
            { action: 'list_products', limit: 25 },
            expect.objectContaining({ uid: 'user-1' })
        );
        expect(result.success).toBe(true);
        expect(result.insight).toMatchObject({
            totalSkus: 2,
            totalUnits: 68,
            lowStockCount: 1,
            strongAvailabilityCount: 1,
            products: [
                expect.objectContaining({ name: 'Reserve Flower', stockStatus: 'strong' }),
                expect.objectContaining({ name: 'Pre-roll Pack', stockStatus: 'low' }),
            ],
            actions: [
                expect.objectContaining({ kind: 'outreach', label: 'Open Outreach Draft' }),
            ],
        });
    });

    it('returns a user-visible error when LeafLink is unavailable', async () => {
        mockLeaflinkAction.mockResolvedValue({
            success: false,
            error: 'LeafLink is not connected.',
        });

        const result = await generateInboxWholesaleInventoryInsight({
            orgId: 'org-grower',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('LeafLink is not connected');
    });
});
