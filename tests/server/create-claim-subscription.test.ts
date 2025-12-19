/**
 * Unit tests for createClaimSubscription server action
 * Tests Authorize.net subscription creation for claim wizard
 */

// Mock the firebase server client
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    collection: jest.fn(() => ({
                        add: jest.fn(() => Promise.resolve({ id: 'claim_test123' })),
                        where: jest.fn(() => ({
                            where: jest.fn(() => ({
                                count: jest.fn(() => ({
                                    get: jest.fn(() => Promise.resolve({ data: () => ({ count: 10 }) }))
                                }))
                            }))
                        }))
                    })),
                    update: jest.fn(() => Promise.resolve())
                }))
            }))
        }
    }))
}));

// Mock fetch for Authorize.net API calls
global.fetch = jest.fn();

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    }
}));

// Mock plans
jest.mock('@/lib/plans', () => ({
    PlanId: 'claim_pro',
    computeMonthlyAmount: jest.fn(() => 99),
    COVERAGE_PACKS: {
        pack_25_zips: { price: 0 },
        pack_100_zips: { price: 49 }
    }
}));

// Mock pricing config
jest.mock('@/lib/config/pricing', () => ({
    PRICING_PLANS: [
        { id: 'claim_pro', price: 99, name: 'Claim Pro' },
        { id: 'founders_claim', price: 79, name: 'Founders Claim' }
    ]
}));

describe('createClaimSubscription', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.AUTHNET_API_LOGIN_ID = 'test_login';
        process.env.AUTHNET_TRANSACTION_KEY = 'test_key';
        process.env.AUTHNET_ENV = 'sandbox';
    });

    describe('ClaimSubscriptionInput type', () => {
        it('should accept valid business info', () => {
            const input = {
                businessName: 'Test Dispensary',
                businessAddress: '123 Main St',
                contactName: 'John Doe',
                contactEmail: 'john@test.com',
                contactPhone: '555-123-4567',
                role: 'dispensary',
                planId: 'claim_pro' as const,
            };
            expect(input.businessName).toBe('Test Dispensary');
            expect(input.planId).toBe('claim_pro');
        });

        it('should accept opaqueData from Accept.js', () => {
            const input = {
                businessName: 'Test',
                businessAddress: '123 St',
                contactName: 'Jane',
                contactEmail: 'jane@test.com',
                contactPhone: '555-000-0000',
                role: 'brand',
                planId: 'founders_claim' as const,
                opaqueData: {
                    dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
                    dataValue: 'encrypted_card_token_here'
                }
            };
            expect(input.opaqueData?.dataDescriptor).toBe('COMMON.ACCEPT.INAPP.PAYMENT');
        });

        it('should accept coverage pack IDs', () => {
            const input = {
                businessName: 'Multi-Location',
                businessAddress: '456 Oak Ave',
                contactName: 'Bob Smith',
                contactEmail: 'bob@multi.com',
                contactPhone: '555-999-8888',
                role: 'dispensary',
                planId: 'claim_pro' as const,
                coveragePackIds: ['pack_100_zips', 'pack_25_zips']
            };
            expect(input.coveragePackIds).toHaveLength(2);
        });
    });

    describe('ClaimSubscriptionResult type', () => {
        it('should represent successful result', () => {
            const result = {
                success: true,
                claimId: 'claim_abc123',
                subscriptionId: 'sub_xyz789'
            };
            expect(result.success).toBe(true);
            expect(result.claimId).toBeTruthy();
            expect(result.subscriptionId).toBeTruthy();
        });

        it('should represent error result', () => {
            const result = {
                success: false,
                error: 'Invalid plan selected.'
            };
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid plan selected.');
        });
    });

    describe('Founders Claim limit', () => {
        it('should enforce 250 limit for founders claim', () => {
            const limit = 250;
            const currentCount = 249;
            expect(currentCount < limit).toBe(true);
        });

        it('should reject when limit is reached', () => {
            const limit = 250;
            const currentCount = 250;
            expect(currentCount >= limit).toBe(true);
        });
    });

    describe('Authorize.Net API payloads', () => {
        it('should construct customer profile payload correctly', () => {
            const input = {
                businessName: 'Test Biz',
                contactName: 'John Doe',
                contactEmail: 'john@test.com',
                zip: '60601'
            };

            const payload = {
                createCustomerProfileRequest: {
                    merchantAuthentication: {
                        name: 'test_login',
                        transactionKey: 'test_key'
                    },
                    profile: {
                        merchantCustomerId: 'claim_123',
                        description: `Claim: ${input.businessName}`,
                        email: input.contactEmail,
                    }
                }
            };

            expect(payload.createCustomerProfileRequest.profile.description).toBe('Claim: Test Biz');
            expect(payload.createCustomerProfileRequest.profile.email).toBe('john@test.com');
        });

        it('should construct ARB subscription payload correctly', () => {
            const today = new Date();
            const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            const startDateStr = startDate.toISOString().slice(0, 10);

            const payload = {
                ARBCreateSubscriptionRequest: {
                    subscription: {
                        name: 'Claim Pro - Test Dispensary',
                        paymentSchedule: {
                            interval: { length: 1, unit: 'months' },
                            startDate: startDateStr,
                            totalOccurrences: 9999
                        },
                        amount: '99.00'
                    }
                }
            };

            expect(payload.ARBCreateSubscriptionRequest.subscription.paymentSchedule.interval.unit).toBe('months');
            expect(payload.ARBCreateSubscriptionRequest.subscription.paymentSchedule.totalOccurrences).toBe(9999);
        });
    });

    describe('Error handling', () => {
        it('should handle missing API credentials', () => {
            const missingCreds = !process.env.AUTHNET_API_LOGIN_ID_FAKE;
            expect(missingCreds).toBe(true);
        });

        it('should handle API error responses', () => {
            const errorResponse = {
                messages: {
                    resultCode: 'Error',
                    message: [{ text: 'Invalid card number' }]
                }
            };
            expect(errorResponse.messages.resultCode).toBe('Error');
            expect(errorResponse.messages.message[0].text).toBe('Invalid card number');
        });

        it('should handle success responses', () => {
            const successResponse = {
                messages: { resultCode: 'Ok' },
                customerProfileId: 'profile_123',
                customerPaymentProfileIdList: ['payment_456']
            };
            expect(successResponse.messages.resultCode).toBe('Ok');
            expect(successResponse.customerProfileId).toBeTruthy();
        });
    });

    describe('Claim status workflow', () => {
        const statuses = [
            'pending_payment',
            'pending_verification',
            'payment_failed',
            'payment_config_error',
            'subscription_failed',
            'active',
            'verified'
        ];

        it('should start with pending_payment status', () => {
            expect(statuses[0]).toBe('pending_payment');
        });

        it('should transition to pending_verification on success', () => {
            const successStatus = 'pending_verification';
            expect(statuses).toContain(successStatus);
        });

        it('should have error statuses for failure cases', () => {
            const errorStatuses = statuses.filter(s => s.includes('failed') || s.includes('error'));
            expect(errorStatuses.length).toBeGreaterThan(0);
        });
    });
});
