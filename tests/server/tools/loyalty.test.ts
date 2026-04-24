import { LoyaltyTools } from '@/server/tools/loyalty';
import { alpineClient } from '@/server/integrations/alpine-iq/client';
import { blackleafService } from '@/lib/notifications/blackleaf-service';

jest.mock('@/server/integrations/alpine-iq/client', () => ({
    alpineClient: {
        getLoyaltyProfile: jest.fn()
    }
}));

jest.mock('@/lib/notifications/blackleaf-service', () => ({
    blackleafService: {
        sendCustomMessage: jest.fn()
    }
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(() => ({
        collection: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] })
        }))
    }))
}));

describe('LoyaltyTools', () => {
    describe('checkPoints', () => {
        it('should return profile data in primary field', async () => {
            (alpineClient.getLoyaltyProfile as jest.Mock).mockResolvedValue({
                id: '1', points: 100, tier: 'Gold', lastVisit: '2023-01-01'
            });

            const result = await LoyaltyTools.checkPoints('555');
            expect(result.primary.points).toBe(100);
            expect(result.primary.tier).toBe('Gold');
            expect(result.primary.source).toBe('alpine_iq');
        });
    });

    describe('sendSms', () => {
        it('should use blackleaf service', async () => {
            (blackleafService.sendCustomMessage as jest.Mock).mockResolvedValue(true);
            const result = await LoyaltyTools.sendSms('555', 'test');
            expect(blackleafService.sendCustomMessage).toHaveBeenCalledWith('555', 'test');
            expect(result.success).toBe(true);
        });
    });
});
