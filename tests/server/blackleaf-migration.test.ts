
// Mock UsageService to avoid Firebase ESM issues in Jest
jest.mock('@/server/services/usage', () => ({
    UsageService: {
        increment: jest.fn()
    }
}));

import { blackleafService } from '@/lib/notifications/blackleaf-service';
import { sendSms } from '@/lib/sms/twilio';

// Mock blackleaf module properly
jest.mock('@/lib/notifications/blackleaf-service', () => ({
    blackleafService: {
        sendCustomMessage: jest.fn(),
        sendMessage: jest.fn()
    }
}));

describe('BlackLeaf Migration', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default success response
        (blackleafService.sendCustomMessage as jest.Mock).mockResolvedValue(true);
    });

    it('should route legacy Twilio calls to BlackLeaf', async () => {
        const payload = { to: '+15551234567', body: 'Legacy Test' };

        const result = await sendSms(payload);

        expect(result.success).toBe(true);
        expect(blackleafService.sendCustomMessage).toHaveBeenCalledWith(
            payload.to,
            payload.body
        );
    });

    it('should handle BlackLeaf failures in legacy wrapper', async () => {
        (blackleafService.sendCustomMessage as jest.Mock).mockResolvedValue(false);

        const payload = { to: '+15551234567', body: 'Fail Test' };
        const result = await sendSms(payload);

        expect(result.success).toBe(false);
    });
});
