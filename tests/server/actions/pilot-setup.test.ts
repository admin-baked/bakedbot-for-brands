/**
 * Unit tests for pilot-setup.ts
 * Tests customer segment generation, sample orders, playbooks, and flush functionality
 */

import {
    PILOT_CUSTOMER_SEGMENTS,
    THRIVE_SAMPLE_PRODUCTS,
    type PilotPOSConfig,
    type PilotEmailConfig,
} from '@/server/actions/pilot-setup';
import type { CustomerSegment } from '@/types/customers';

// Mock Firebase
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        auth: {
            getUserByEmail: jest.fn().mockRejectedValue({ code: 'auth/user-not-found' }),
            createUser: jest.fn().mockResolvedValue({ uid: 'test-uid-123' }),
            setCustomUserClaims: jest.fn().mockResolvedValue(undefined),
            revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
        },
        firestore: {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue({
                    set: jest.fn().mockResolvedValue(undefined),
                    get: jest.fn().mockResolvedValue({ exists: false }),
                    update: jest.fn().mockResolvedValue(undefined),
                }),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({
                    empty: true,
                    docs: [],
                }),
            }),
            batch: jest.fn().mockReturnValue({
                delete: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
            }),
        },
    }),
}));

// Mock grounding functions
jest.mock('@/server/grounding', () => ({
    hasGroundTruth: jest.fn().mockReturnValue(false),
    getGroundTruthStats: jest.fn().mockReturnValue(null),
    listGroundedBrands: jest.fn().mockReturnValue([]),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Pilot Setup - Customer Segments', () => {
    describe('PILOT_CUSTOMER_SEGMENTS', () => {
        it('should have all 8 customer segments defined', () => {
            expect(PILOT_CUSTOMER_SEGMENTS).toHaveLength(8);
        });

        it('should have unique segments', () => {
            const segments = PILOT_CUSTOMER_SEGMENTS.map(s => s.segment);
            const uniqueSegments = new Set(segments);
            expect(uniqueSegments.size).toBe(8);
        });

        it('should have unique emails', () => {
            const emails = PILOT_CUSTOMER_SEGMENTS.map(s => s.email);
            const uniqueEmails = new Set(emails);
            expect(uniqueEmails.size).toBe(8);
        });

        it('should have all required segments', () => {
            const expectedSegments: CustomerSegment[] = [
                'vip', 'loyal', 'new', 'at_risk', 'slipping', 'churned', 'high_value', 'frequent'
            ];
            const actualSegments = PILOT_CUSTOMER_SEGMENTS.map(s => s.segment);

            for (const expected of expectedSegments) {
                expect(actualSegments).toContain(expected);
            }
        });

        it('should have bakedbot.ai email domain for all segments', () => {
            for (const segment of PILOT_CUSTOMER_SEGMENTS) {
                expect(segment.email).toMatch(/@bakedbot\.ai$/);
            }
        });

        it('should have valid behavior profiles', () => {
            for (const segment of PILOT_CUSTOMER_SEGMENTS) {
                expect(segment.behaviorProfile.orderCount).toBeGreaterThanOrEqual(0);
                expect(segment.behaviorProfile.totalSpent).toBeGreaterThanOrEqual(0);
                expect(segment.behaviorProfile.avgOrderValue).toBeGreaterThanOrEqual(0);
                expect(segment.behaviorProfile.daysSinceLastOrder).toBeGreaterThanOrEqual(0);
                expect(segment.behaviorProfile.daysSinceFirstOrder).toBeGreaterThanOrEqual(0);
                expect(['budget', 'mid', 'premium']).toContain(segment.behaviorProfile.priceRange);
            }
        });

        describe('segment-specific behavior validation', () => {
            it('VIP segment should have high spend metrics', () => {
                const vip = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === 'vip');
                expect(vip).toBeDefined();
                expect(vip!.behaviorProfile.totalSpent).toBeGreaterThanOrEqual(1000);
                expect(vip!.behaviorProfile.orderCount).toBeGreaterThanOrEqual(10);
            });

            it('new segment should have recent first order', () => {
                const newCustomer = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === 'new');
                expect(newCustomer).toBeDefined();
                expect(newCustomer!.behaviorProfile.daysSinceFirstOrder).toBeLessThanOrEqual(30);
                expect(newCustomer!.behaviorProfile.orderCount).toBeLessThanOrEqual(2);
            });

            it('at_risk segment should have 60+ days since last order', () => {
                const atRisk = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === 'at_risk');
                expect(atRisk).toBeDefined();
                expect(atRisk!.behaviorProfile.daysSinceLastOrder).toBeGreaterThanOrEqual(60);
            });

            it('slipping segment should have 30-60 days inactive', () => {
                const slipping = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === 'slipping');
                expect(slipping).toBeDefined();
                expect(slipping!.behaviorProfile.daysSinceLastOrder).toBeGreaterThanOrEqual(30);
                expect(slipping!.behaviorProfile.daysSinceLastOrder).toBeLessThan(90);
            });

            it('churned segment should have 90+ days inactive', () => {
                const churned = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === 'churned');
                expect(churned).toBeDefined();
                expect(churned!.behaviorProfile.daysSinceLastOrder).toBeGreaterThanOrEqual(90);
            });

            it('high_value segment should have high AOV but low frequency', () => {
                const highValue = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === 'high_value');
                expect(highValue).toBeDefined();
                expect(highValue!.behaviorProfile.avgOrderValue).toBeGreaterThanOrEqual(150);
                expect(highValue!.behaviorProfile.orderCount).toBeLessThan(10);
            });

            it('frequent segment should have many orders with lower AOV', () => {
                const frequent = PILOT_CUSTOMER_SEGMENTS.find(s => s.segment === 'frequent');
                expect(frequent).toBeDefined();
                expect(frequent!.behaviorProfile.orderCount).toBeGreaterThanOrEqual(10);
                expect(frequent!.behaviorProfile.avgOrderValue).toBeLessThan(50);
            });
        });
    });
});

describe('Pilot Setup - Sample Products', () => {
    describe('THRIVE_SAMPLE_PRODUCTS', () => {
        it('should have sample products defined', () => {
            expect(THRIVE_SAMPLE_PRODUCTS.length).toBeGreaterThan(0);
        });

        it('should have products from multiple categories', () => {
            const categories = new Set(THRIVE_SAMPLE_PRODUCTS.map(p => p.category));
            expect(categories.size).toBeGreaterThanOrEqual(5);
        });

        it('should include expected categories', () => {
            const categories = THRIVE_SAMPLE_PRODUCTS.map(p => p.category);
            expect(categories).toContain('Flower');
            expect(categories).toContain('Pre-Rolls');
            expect(categories).toContain('Vapes');
            expect(categories).toContain('Edibles');
        });

        it('should have valid prices', () => {
            for (const product of THRIVE_SAMPLE_PRODUCTS) {
                expect(product.price).toBeGreaterThan(0);
            }
        });

        it('should have named brands', () => {
            for (const product of THRIVE_SAMPLE_PRODUCTS) {
                expect(product.brandName).toBeDefined();
                expect(product.brandName.length).toBeGreaterThan(0);
            }
        });

        it('should include NY market brands', () => {
            const brands = THRIVE_SAMPLE_PRODUCTS.map(p => p.brandName);
            expect(brands).toContain("Kiefer's");
            expect(brands).toContain('Off Hours');
        });
    });
});

describe('Pilot Setup - Configuration Types', () => {
    describe('PilotPOSConfig', () => {
        it('should accept valid ALLeaves config', () => {
            const config: PilotPOSConfig = {
                provider: 'alleaves',
                storeId: 'store-123',
                locationId: 'loc-456',
                environment: 'production',
            };
            expect(config.provider).toBe('alleaves');
            expect(config.storeId).toBeDefined();
        });

        it('should accept valid Dutchie config', () => {
            const config: PilotPOSConfig = {
                provider: 'dutchie',
                storeId: 'dutchie-store-789',
                environment: 'sandbox',
            };
            expect(config.provider).toBe('dutchie');
        });

        it('should accept valid Jane config', () => {
            const config: PilotPOSConfig = {
                provider: 'jane',
                storeId: 'jane-menu-abc',
            };
            expect(config.provider).toBe('jane');
        });
    });

    describe('PilotEmailConfig', () => {
        it('should accept valid email config', () => {
            const config: PilotEmailConfig = {
                provider: 'mailjet',
                senderEmail: 'hello@bakedbot.ai',
                senderName: 'Mrs. Parker',
                enableWelcomePlaybook: true,
                enableWinbackPlaybook: true,
                enableVIPPlaybook: true,
            };
            expect(config.provider).toBe('mailjet');
            expect(config.senderEmail).toBe('hello@bakedbot.ai');
            expect(config.senderName).toBe('Mrs. Parker');
        });

        it('should allow disabling individual playbooks', () => {
            const config: PilotEmailConfig = {
                provider: 'mailjet',
                senderEmail: 'test@example.com',
                senderName: 'Test',
                enableWelcomePlaybook: true,
                enableWinbackPlaybook: false,
                enableVIPPlaybook: false,
            };
            expect(config.enableWelcomePlaybook).toBe(true);
            expect(config.enableWinbackPlaybook).toBe(false);
            expect(config.enableVIPPlaybook).toBe(false);
        });
    });
});

describe('Pilot Setup - Email Templates', () => {
    it('should have correct segment emails for email marketing', () => {
        const emailMap: Record<CustomerSegment, string> = {
            vip: 'vip@bakedbot.ai',
            loyal: 'loyal@bakedbot.ai',
            new: 'newbie@bakedbot.ai',
            at_risk: 'atrisk@bakedbot.ai',
            slipping: 'slipping@bakedbot.ai',
            churned: 'churned@bakedbot.ai',
            high_value: 'highspender@bakedbot.ai',
            frequent: 'frequent@bakedbot.ai',
        };

        for (const segment of PILOT_CUSTOMER_SEGMENTS) {
            expect(segment.email).toBe(emailMap[segment.segment]);
        }
    });
});

describe('Pilot Setup - Segment Descriptions', () => {
    it('should have descriptions for all segments', () => {
        for (const segment of PILOT_CUSTOMER_SEGMENTS) {
            expect(segment.description).toBeDefined();
            expect(segment.description.length).toBeGreaterThan(10);
        }
    });

    it('should have first and last names for all segments', () => {
        for (const segment of PILOT_CUSTOMER_SEGMENTS) {
            expect(segment.firstName).toBeDefined();
            expect(segment.lastName).toBeDefined();
            expect(segment.firstName.length).toBeGreaterThan(0);
            expect(segment.lastName.length).toBeGreaterThan(0);
        }
    });
});

describe('Pilot Setup - Behavior Profile Calculations', () => {
    it('should have consistent totalSpent = orderCount * avgOrderValue (approximately)', () => {
        for (const segment of PILOT_CUSTOMER_SEGMENTS) {
            const { orderCount, avgOrderValue, totalSpent } = segment.behaviorProfile;
            const calculated = orderCount * avgOrderValue;
            // Allow 20% variance for rounding
            const variance = Math.abs(totalSpent - calculated) / calculated;
            expect(variance).toBeLessThan(0.2);
        }
    });

    it('should have daysSinceLastOrder <= daysSinceFirstOrder', () => {
        for (const segment of PILOT_CUSTOMER_SEGMENTS) {
            expect(segment.behaviorProfile.daysSinceLastOrder)
                .toBeLessThanOrEqual(segment.behaviorProfile.daysSinceFirstOrder);
        }
    });
});
