import {
    buildAutoCustomerTags,
    extractAlleavesCustomerIdentity,
    isPlaceholderCustomerIdentity,
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

    it('ignores synthetic display names when first and last name are available', () => {
        expect(resolveCustomerDisplayName({
            displayName: 'alleaves_2730',
            firstName: 'Michael',
            lastName: 'Green Joseph',
            email: 'alleaves_2730@unknown.local',
            fallbackId: 'alleaves_2730',
        })).toBe('Michael Green Joseph');
    });

    it('extracts Alleaves identity fields from multiple API field shapes', () => {
        expect(extractAlleavesCustomerIdentity({
            id_customer: '2730',
            first_name: 'Michael',
            last_name: 'Green Joseph',
            email: 'michael@example.com',
            phone: '555-000-0000',
            date_of_birth: '1998-01-25',
            loyalty_points: '124',
        })).toEqual({
            displayName: null,
            firstName: 'Michael',
            lastName: 'Green Joseph',
            email: 'michael@example.com',
            phone: '555-000-0000',
            birthDate: '1998-01-25',
            loyaltyPoints: 124,
        });
        expect(isPlaceholderCustomerIdentity('alleaves_2730', {
            email: 'alleaves_2730@unknown.local',
            fallbackId: 'alleaves_2730',
        })).toBe(true);
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
