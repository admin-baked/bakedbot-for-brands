import { createShippingOrder } from '@/app/checkout/actions/createShippingOrder';
import { createServerClient } from '@/firebase/server-client';
import { createTransaction } from '@/lib/authorize-net';
import { logger } from '@/lib/logger';

// Mock dependencies
jest.mock('@/firebase/server-client');
jest.mock('@/lib/authorize-net');
jest.mock('@/lib/email/dispatcher');
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('createShippingOrder Mock Fallback', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        process.env.NODE_ENV = 'test';
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    const mockInput = {
        items: [{ id: 'prod1', name: 'Item 1', quantity: 1, price: 10, category: 'Flower' }],
        customer: { name: 'John Doe', email: 'john@example.com' },
        shippingAddress: {
            street: '123 Main St',
            city: 'Los Angeles',
            state: 'CA',
            zip: '90001',
            country: 'US'
        },
        brandId: 'brand_123',
        paymentMethod: 'authorize_net' as const,
        paymentData: { cardNumber: '4242' },
        total: 10
    };

    it('should return mock success in test environment when firestore auth fails', async () => {
        // Mock payment to succeed
        (createTransaction as jest.Mock).mockResolvedValue({
            success: true,
            transactionId: 'test_tx_123'
        });

        // Mock firestore to throw UNAUTHENTICATED error
        const mockFirestoreError = new Error('UNAUTHENTICATED');
        (mockFirestoreError as any).code = 16;

        (createServerClient as jest.Mock).mockResolvedValue({
            firestore: {
                collection: jest.fn().mockImplementation(() => {
                    throw mockFirestoreError;
                })
            }
        });

        const result = await createShippingOrder(mockInput);

        expect(result.success).toBe(true);
        expect(result.orderId).toMatch(/^mock_order_/);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Auth failed (local dev), simulating order success'));
    });

    it('should fail if shipping to a restricted state', async () => {
        const restrictedInput = {
            ...mockInput,
            shippingAddress: { ...mockInput.shippingAddress, state: 'ID' }
        };

        const result = await createShippingOrder(restrictedInput);

        expect(result.success).toBe(false);
        expect(result.error).toContain('cannot ship to ID');
    });
});
