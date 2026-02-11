import { createTransaction } from '@/lib/authorize-net';
import { logger } from '@/lib/logger';

// Mock logger to avoid noisy output
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('Authorize.Net Mock Fallback', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        // Ensure keys are missing
        delete process.env.AUTHNET_API_LOGIN_ID;
        delete process.env.AUTHNET_TRANSACTION_KEY;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should return mock success in test environment when credentials are missing', async () => {
        // Force NODE_ENV to something other than production
        process.env.NODE_ENV = 'test';

        const result = await createTransaction({
            amount: 100,
            orderId: 'test_order_123',
            customer: { email: 'test@example.com' }
        });

        expect(result.success).toBe(true);
        expect(result.transactionId).toMatch(/^mock_tx_/);
        expect(result.message).toBe('Transaction approved (MOCK)');
        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Using MOCK transaction for non-production Authorize.net checkout'),
            expect.any(Object)
        );
    });

    it('should return error in production environment when credentials are missing', async () => {
        // We have to mock NODE_ENV if we want to test the 'production' branch logic, 
        // but note that NODE_ENV is often baked in. 
        // In our implementation, we check it inside the function.

        process.env.NODE_ENV = 'production';

        const result = await createTransaction({
            amount: 100,
            orderId: 'test_order_123',
            customer: { email: 'test@example.com' }
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe('Payment configuration error');
        expect(logger.error).toHaveBeenCalledWith('Authorize.net credentials missing');
    });
});
