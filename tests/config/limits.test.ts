/**
 * Unit Tests for Free Account Limits Configuration
 */

import { FREE_ACCOUNT_LIMITS } from '@/lib/config/limits';

describe('FREE_ACCOUNT_LIMITS', () => {
    describe('Brand Limits', () => {
        it('should have products limit of 10', () => {
            expect(FREE_ACCOUNT_LIMITS.brand.products).toBe(10);
        });

        it('should have dispensaries limit of 3', () => {
            expect(FREE_ACCOUNT_LIMITS.brand.dispensaries).toBe(3);
        });
    });

    describe('Dispensary Limits', () => {
        it('should have locations limit of 1', () => {
            expect(FREE_ACCOUNT_LIMITS.dispensary.locations).toBe(1);
        });

        it('should have products limit of 10', () => {
            expect(FREE_ACCOUNT_LIMITS.dispensary.products).toBe(10);
        });
    });

    describe('Type Safety', () => {
        it('should be readonly (const assertion)', () => {
            // This test verifies the type is correctly inferred as const
            const brandProducts: 10 = FREE_ACCOUNT_LIMITS.brand.products;
            const dispensaryLocations: 1 = FREE_ACCOUNT_LIMITS.dispensary.locations;

            expect(brandProducts).toBe(10);
            expect(dispensaryLocations).toBe(1);
        });
    });
});
