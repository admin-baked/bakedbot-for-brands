import { LoyaltyTools } from '@/server/tools/loyalty';
import { getLoyaltyProfile } from '@/server/services/alpine-iq';
import { blackleafService } from '@/lib/notifications/blackleaf-service';

jest.mock('@/server/services/alpine-iq', () => ({
    getLoyaltyProfile: jest.fn()
}));

jest.mock('@/lib/notifications/blackleaf-service', () => ({
    blackleafService: {
        sendCustomMessage: jest.fn()
    }
}));

describe('LoyaltyTools', () => {
    describe('checkPoints', () => {
        it('should return profile data', async () => {
            (getLoyaltyProfile as jest.Mock).mockResolvedValue({
                id: '1', points: 100, tier: 'Gold', lastVisit: '2023-01-01'
            });

            const result = await LoyaltyTools.checkPoints('555');
            expect(result.points).toBe(100);
            expect(result.tier).toBe('Gold');
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
