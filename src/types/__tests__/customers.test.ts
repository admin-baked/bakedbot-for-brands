/**
 * Unit tests for Customer CRM Types
 */
import {
    calculateSegment,
    getSegmentInfo,
    CustomerProfile,
    CustomerSegment,
} from '../customers';

describe('Customer Types', () => {
    describe('calculateSegment', () => {
        it('should return "churned" for 90+ days inactive', () => {
            const profile: Partial<CustomerProfile> = {
                daysSinceLastOrder: 100,
                orderCount: 5,
            };
            expect(calculateSegment(profile)).toBe('churned');
        });

        it('should return "at_risk" for 60-89 days inactive', () => {
            const profile: Partial<CustomerProfile> = {
                daysSinceLastOrder: 70,
                orderCount: 5,
            };
            expect(calculateSegment(profile)).toBe('at_risk');
        });

        it('should return "slipping" for 30-59 days inactive', () => {
            const profile: Partial<CustomerProfile> = {
                daysSinceLastOrder: 45,
                orderCount: 5,
            };
            expect(calculateSegment(profile)).toBe('slipping');
        });

        it('should return "new" for new customers', () => {
            const now = new Date();
            const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
            const profile: Partial<CustomerProfile> = {
                daysSinceLastOrder: 5,
                orderCount: 1,
                firstOrderDate: tenDaysAgo,
            };
            expect(calculateSegment(profile)).toBe('new');
        });

        it('should return "vip" for high lifetime value customers', () => {
            const profile: Partial<CustomerProfile> = {
                daysSinceLastOrder: 10,
                orderCount: 15,
                avgOrderValue: 150,
                lifetimeValue: 1500,
            };
            expect(calculateSegment(profile)).toBe('vip');
        });

        it('should return "loyal" for regular customers', () => {
            const profile: Partial<CustomerProfile> = {
                daysSinceLastOrder: 10,
                orderCount: 5,
                avgOrderValue: 50,
                lifetimeValue: 250,
                firstOrderDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            };
            expect(calculateSegment(profile)).toBe('loyal');
        });
    });

    describe('getSegmentInfo', () => {
        it('should return correct info for VIP', () => {
            const info = getSegmentInfo('vip');
            expect(info.label).toBe('VIP');
            expect(info.color).toContain('purple');
        });

        it('should return correct info for at_risk', () => {
            const info = getSegmentInfo('at_risk');
            expect(info.label).toBe('At Risk');
            expect(info.color).toContain('red');
        });

        it('should return correct info for new', () => {
            const info = getSegmentInfo('new');
            expect(info.label).toBe('New');
            expect(info.color).toContain('blue');
        });

        it('should have info for all segment types', () => {
            const segments: CustomerSegment[] = [
                'vip', 'loyal', 'new', 'at_risk', 'slipping', 'churned', 'high_value', 'frequent'
            ];

            segments.forEach(seg => {
                const info = getSegmentInfo(seg);
                expect(info.label).toBeDefined();
                expect(info.color).toBeDefined();
                expect(info.description).toBeDefined();
            });
        });
    });
});
