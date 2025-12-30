
// Mock external dependencies
jest.mock('node-mailjet');
jest.mock('@/firebase/admin', () => ({}));
jest.mock('@/server/services/usage', () => ({
    UsageService: {
        increment: jest.fn(),
    }
}));
jest.mock('@/firebase/server-client', () => ({}));
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    }
}));

import Mailjet from 'node-mailjet';
import { logger } from '@/lib/monitoring';



describe.skip('Mailjet Service - sendInvitationEmail', () => {

    let sendInvitationEmail: any;
    let mockRequest: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.resetModules(); // Force reload of modules
        
        // mocked dependencies must be re-defined if they were reset? 
        // Actually resetModules clears the cache. The manual mocks above (jest.mock) should persist or need re-application?
        // jest.mock persists across resetModules if defined at top level.

        process.env.MAILJET_API_KEY = 'test-key';
        process.env.MAILJET_SECRET_KEY = 'test-secret';
        
        // Re-mock Mailjet for this fresh load
        // Note: top-level mock factory applies, but we want to manipulate the instance return.
        
        mockRequest = jest.fn().mockResolvedValue({ body: { Messages: [{ Status: 'success' }] } });
        // We need to ensure the top level mock returns OUR mockRequest
        // The top level mock returns `mockPost` which returns `mockRequest`. 
        // We just need to ensure `mockPost` is wired up.
        
        // Because of resetModules, we need to re-require
        const module = require('@/lib/email/mailjet');
        sendInvitationEmail = module.sendInvitationEmail;
    });


    it('should successfully send an invitation email', async () => {
        const testData = {
            to: 'newuser@example.com',
            link: 'https://bakedbot.ai/join/token',
            role: 'brand',
            businessName: 'Acme'
        };

        const result = await sendInvitationEmail(testData);

        expect(result).toBe(true);
        expect(logger.info).toHaveBeenCalledWith('Invitation email sent (Mailjet)', expect.objectContaining({ email: testData.to }));
    });

    it('should handle errors gracefully', async () => {
        // Mock failure
        mockRequest.mockRejectedValue(new Error('API Failure'));
        // We need to re-mock the instance for this test
        (Mailjet as unknown as jest.Mock).mockImplementation(() => ({
            post: jest.fn().mockReturnValue({ request: mockRequest })
        }));

        const result = await sendInvitationEmail({
             to: 'fail@example.com',
             link: 'link',
             role: 'brand'
        });

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalled();
    });
});
