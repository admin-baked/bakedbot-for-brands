import { checkFirstOrderEligibility } from '../first-order-discount';
import { getAdminFirestore } from '@/firebase/admin';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('First-Order Discount System', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn()
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    describe('checkFirstOrderEligibility', () => {
        it('returns eligible for new customer (no existing record)', async () => {
            mockFirestore.get.mockResolvedValue({
                empty: true,
                docs: []
            });

            const result = await checkFirstOrderEligibility('newuser@example.com', 'org_thrive_syracuse');

            expect(result.eligible).toBe(true);
            expect(result.discountCode).toBeDefined();
            expect(result.discountCode).toMatch(/^WELCOME-/);
            expect(result.discountPercent).toBe(20);
            expect(mockFirestore.where).toHaveBeenCalledWith('email', '==', 'newuser@example.com');
            expect(mockFirestore.where).toHaveBeenCalledWith('orgId', '==', 'org_thrive_syracuse');
        });

        it('returns eligible for existing customer with no orders', async () => {
            mockFirestore.get.mockResolvedValue({
                empty: false,
                docs: [{
                    data: () => ({
                        email: 'existing@example.com',
                        orderCount: 0,
                        orgId: 'org_thrive_syracuse'
                    })
                }]
            });

            const result = await checkFirstOrderEligibility('existing@example.com', 'org_thrive_syracuse');

            expect(result.eligible).toBe(true);
            expect(result.discountCode).toBeDefined();
            expect(result.discountPercent).toBe(20);
        });

        it('returns not eligible for returning customer', async () => {
            mockFirestore.get.mockResolvedValue({
                empty: false,
                docs: [{
                    data: () => ({
                        email: 'returning@example.com',
                        orderCount: 3,
                        orgId: 'org_thrive_syracuse'
                    })
                }]
            });

            const result = await checkFirstOrderEligibility('returning@example.com', 'org_thrive_syracuse');

            expect(result.eligible).toBe(false);
            expect(result.discountCode).toBeUndefined();
            expect(result.discountPercent).toBe(0);
            expect(result.reason).toContain('first-time customers');
        });

        it('returns not eligible when email is missing', async () => {
            const result = await checkFirstOrderEligibility('', 'org_thrive_syracuse');

            expect(result.eligible).toBe(false);
            expect(result.discountPercent).toBe(0);
            expect(result.reason).toBe('Invalid request');
        });

        it('returns not eligible when orgId is missing', async () => {
            const result = await checkFirstOrderEligibility('test@example.com', '');

            expect(result.eligible).toBe(false);
            expect(result.discountPercent).toBe(0);
            expect(result.reason).toBe('Invalid request');
        });

        it('handles Firestore errors gracefully', async () => {
            mockFirestore.get.mockRejectedValue(new Error('Firestore connection failed'));

            const result = await checkFirstOrderEligibility('test@example.com', 'org_thrive_syracuse');

            expect(result.eligible).toBe(false);
            expect(result.discountPercent).toBe(0);
            expect(result.reason).toBe('Unable to verify eligibility');
        });
    });

    // generateFirstOrderCode is now a private helper function (not exported)
    // Testing it through checkFirstOrderEligibility instead
    describe('discount code generation (via eligibility check)', () => {
        it('generates personalized codes for new customers', async () => {
            mockFirestore.get.mockResolvedValue({
                empty: true,
                docs: []
            });

            const result = await checkFirstOrderEligibility('john.doe@example.com', 'org_test');

            expect(result.discountCode).toBeDefined();
            expect(result.discountCode).toMatch(/^WELCOME-[A-Z0-9]+$/);
            // Should start with JOHN since that's the email prefix
            expect(result.discountCode).toMatch(/^WELCOME-JOHN/);
        });

        it('generates different codes for different emails', async () => {
            mockFirestore.get.mockResolvedValue({
                empty: true,
                docs: []
            });

            const result1 = await checkFirstOrderEligibility('alice@example.com', 'org_test');
            const result2 = await checkFirstOrderEligibility('bob@example.com', 'org_test');

            expect(result1.discountCode).toBeDefined();
            expect(result2.discountCode).toBeDefined();
            expect(result1.discountCode).not.toBe(result2.discountCode);
        });
    });
});
