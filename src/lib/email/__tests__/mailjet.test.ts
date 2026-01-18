
import { sendGenericEmail, sendOrderConfirmationEmail } from '../mailjet';
import Mailjet from 'node-mailjet';
import { logger } from '@/lib/monitoring';

// Mock dependencies
jest.mock('node-mailjet');
jest.mock('@/lib/monitoring', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));
jest.mock('@/server/services/usage', () => ({
    UsageService: {
        increment: jest.fn(),
    },
}));

describe('Mailjet Service', () => {
    const mockRequest = jest.fn();
    const mockPost = jest.fn().mockReturnValue({ request: mockRequest });
    let mailjetService: any;

    beforeAll(() => {
        // Mock Mailjet constructor before importing service
        (Mailjet as unknown as jest.Mock).mockImplementation(() => ({
            post: mockPost,
        }));
        
        // Set environment variables before first require
        process.env.MAILJET_API_KEY = 'test_key';
        process.env.MAILJET_SECRET_KEY = 'test_secret';
        
        mailjetService = require('../mailjet');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest.mockReset();
        mockPost.mockClear();
        mockPost.mockReturnValue({ request: mockRequest });
    });

    describe('sendGenericEmail', () => {
        it('should send email correctly via Mailjet API v3.1', async () => {
            mockRequest.mockResolvedValue({ body: { Messages: [{ Status: 'success' }] } });

            const result = await mailjetService.sendGenericEmail({
                to: 'user@example.com',
                subject: 'Hello',
                htmlBody: '<h1>Hi</h1>',
                textBody: 'Hi'
            });

            expect(mockPost).toHaveBeenCalledWith('send', { version: 'v3.1' });
            expect(result.success).toBe(true);
        });

        it('should handle API errors gracefully', async () => {
            mockRequest.mockRejectedValue({ 
                statusCode: 401, 
                message: 'Unauthorized' 
            });

            const result = await mailjetService.sendGenericEmail({
                to: 'user@example.com',
                subject: 'Fail',
                htmlBody: 'Body'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Mailjet Error 401');
        });
    });

    describe('sendOrderConfirmationEmail', () => {
        it('should format items and send order confirmation', async () => {
            mockRequest.mockResolvedValue({ body: {} });

            const orderData = {
                orderId: 'order123',
                customerName: 'John Doe',
                customerEmail: 'john@example.com',
                total: 50.00,
                items: [
                    { name: 'Product A', qty: 2, price: 25.00 }
                ],
                retailerName: 'Green Shop',
                pickupAddress: '123 Weed St'
            };

            const result = await mailjetService.sendOrderConfirmationEmail(orderData);

            expect(result).toBe(true);
            expect(mockRequest).toHaveBeenCalled();
        });
    });
});
