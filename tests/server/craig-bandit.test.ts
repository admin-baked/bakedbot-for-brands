
import { selectVariant, CampaignVariant } from '../../src/server/algorithms/craig-algo';

describe('Craig Bandit Algorithms', () => {

    const variants: CampaignVariant[] = [
        { id: 'A', impressions: 100, conversions: 50 }, // 50% CTR
        { id: 'B', impressions: 100, conversions: 10 }, // 10% CTR
        { id: 'C', impressions: 0, conversions: 0 }     // 0% CTR (New)
    ];

    test('selectVariant (epsilon=0) should exploit best performer', () => {
        // Pure exploit -> Should pick A (Highest CTR)
        const selected = selectVariant(variants, 0);
        expect(selected.id).toBe('A');
    });

    test('selectVariant should handle empty impressions gracefully', () => {
        const newVariants: CampaignVariant[] = [
            { id: 'X', impressions: 0, conversions: 0 },
            { id: 'Y', impressions: 0, conversions: 0 }
        ];
        // Should pick random valid variant
        const selected = selectVariant(newVariants, 0);
        expect(['X', 'Y']).toContain(selected.id);
    });

    test('selectVariant throws if empty list', () => {
        expect(() => selectVariant([], 0)).toThrow();
    });
});
