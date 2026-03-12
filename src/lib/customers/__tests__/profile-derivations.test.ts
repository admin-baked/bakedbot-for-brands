import {
    buildAutoCustomerTags,
    mergeCustomerTags,
    resolveCustomerDisplayName,
} from '../profile-derivations';

describe('profile-derivations', () => {
    it('resolves a customer name from first and last name when displayName is blank', () => {
        expect(resolveCustomerDisplayName({
            displayName: '',
            firstName: 'Michael',
            lastName: 'Green Joseph',
            email: 'customer_2518@alleaves.local',
        })).toBe('Michael Green Joseph');
    });

    it('builds auto tags from customer status and preferences', () => {
        expect(buildAutoCustomerTags({
            segment: 'vip',
            tier: 'silver',
            priceRange: 'budget',
            orderCount: 12,
            totalSpent: 983,
            daysSinceLastOrder: 0,
            preferredCategories: ['flower'],
            preferredProducts: ['Blue Dream'],
        })).toEqual(expect.arrayContaining([
            'VIP',
            'Silver Tier',
            'Budget Buyer',
            'Prefers Flower',
        ]));
    });

    it('merges manual tags before auto tags without duplicates', () => {
        expect(mergeCustomerTags(['VIP', 'Legacy'], ['vip', 'Recently Active'])).toEqual([
            'VIP',
            'Legacy',
            'Recently Active',
        ]);
    });
});
