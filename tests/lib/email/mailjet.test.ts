import Mailjet from 'node-mailjet';
import { logger } from '@/lib/monitoring';
import { UsageService } from '@/server/services/usage';

// Mock dependencies
jest.mock('node-mailjet', () => {
    return jest.fn().mockImplementation(() => ({
        post: jest.fn().mockReturnThis(),
        request: jest.fn()
    }));
});

jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

jest.mock('@/server/services/usage', () => ({
    UsageService: {
        increment: jest.fn()
    }
}));

describe('Mailjet Service', () => {
    let mockPost: jest.Mock;
    let mockRequest: jest.Mock;

    const mockOrderData = {
        orderId: 'ord_123',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        total: 100.50,
        items: [
            { name: 'Product A', qty: 2, price: 25.00 },
            { name: 'Product B', qty: 1, price: 50.50 }
        ],
        retailerName: 'Test Dispensary',
        pickupAddress: '123 Weed St',
        retailerId: 'ret_456'
    };

    let sendOrderConfirmationEmail: any;

    beforeEach(() => {
        jest.resetModules();
        process.env.MAILJET_API_KEY = 'test_api_key';
        process.env.MAILJET_SECRET_KEY = 'test_secret_key';

        jest.clearAllMocks();

        // Setup Mailjet mock chain
        mockRequest = jest.fn().mockResolvedValue({ body: { Messages: [{ Status: 'success' }] } });
        mockPost = jest.fn().mockReturnValue({ request: mockRequest });
        
        // Re-mock constructor return value for the fresh require
        (Mailjet as unknown as jest.Mock).mockReturnValue({
            post: mockPost
        });

        const module = require('@/lib/email/mailjet');
        sendOrderConfirmationEmail = module.sendOrderConfirmationEmail;
    });

    it('should initialize Mailjet with credentials', () => {
        expect(Mailjet).toHaveBeenCalledWith({
            apiKey: 'test_api_key',
            apiSecret: 'test_secret_key'
        });
    });

    it('should send an order confirmation email successfully', async () => {
        const result = await sendOrderConfirmationEmail(mockOrderData);

        expect(result).toBe(true);
        expect(mockPost).toHaveBeenCalledWith('send', { version: 'v3.1' });
        expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({
            Messages: expect.arrayContaining([
                expect.objectContaining({
                    To: [{ Email: 'john@example.com', Name: 'John Doe' }],
                    Subject: expect.stringContaining('Order Confirmation #ord_123'),
                    CustomID: 'ord_123'
                })
            ])
        }));
        
        expect(UsageService.increment).toHaveBeenCalledWith('ret_456', 'messages_sent');
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Order confirmation email sent'), expect.any(Object));
    });

    it('should return false and log error on failure', async () => {
        const error = { message: 'API Error', statusCode: 500 };
        
        // Use doMock to inject specific behavior for this test run
        jest.doMock('node-mailjet', () => {
            return jest.fn().mockImplementation(() => ({
                post: jest.fn().mockReturnThis(),
                request: jest.fn().mockRejectedValue(error)
            }));
        });
        
        const { sendOrderConfirmationEmail } = require('@/lib/email/mailjet');
        const result = await sendOrderConfirmationEmail(mockOrderData);

        expect(result).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('Failed to send email'), 
            expect.objectContaining({ error: 'API Error' })
        );
        expect(UsageService.increment).not.toHaveBeenCalled();
    });

    it('should handle missing retailerId gracefully', async () => {
        const { sendOrderConfirmationEmail } = require('@/lib/email/mailjet');
        const dataWithoutRetailer = { ...mockOrderData, retailerId: undefined };
        const result = await sendOrderConfirmationEmail(dataWithoutRetailer);

        expect(result).toBe(true);
        expect(UsageService.increment).not.toHaveBeenCalled();
    });
});
