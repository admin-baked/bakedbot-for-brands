
import { computeMonthlyAmount, PLANS, COVERAGE_PACKS } from '@/lib/plans';

describe('Pricing Logic Check', () => {

    test('Free plan should cost $0', () => {
        const cost = computeMonthlyAmount('free', 1);
        expect(cost).toBe(0);
    });

    test('Claim Pro base cost', () => {
        const cost = computeMonthlyAmount('claim_pro', 1);
        expect(cost).toBe(99);
    });

    test('Founders Claim base cost', () => {
        const cost = computeMonthlyAmount('founders_claim', 1);
        expect(cost).toBe(79);
    });

    test('Claim Pro with 1 coverage pack (100 ZIPs)', () => {
        // $99 + $49 = $148
        const cost = computeMonthlyAmount('claim_pro', 1, ['pack_100']);
        expect(cost).toBe(148);
    });

    test('Founders Claim with multiple coverage packs', () => {
        // $79 + $49 + $149 = $277
        const cost = computeMonthlyAmount('founders_claim', 1, ['pack_100', 'pack_500']);
        expect(cost).toBe(277);
    });

    test('Growth plan with extra locations', () => {
        // Growth: $350 (includes 5 locs). Extra: $25
        // 7 locations = 2 extra
        // $350 + (2 * 25) = $400
        const cost = computeMonthlyAmount('growth_5', 7);
        expect(cost).toBe(400);
    });

    test('Growth plan with extra locations AND coverage packs', () => {
        // Growth (7 locs): $400
        // + Pack 500: $149
        // Total: $549
        const cost = computeMonthlyAmount('growth_5', 7, ['pack_500']);
        expect(cost).toBe(549);
    });

    test('Enterprise should throw error', () => {
        expect(() => computeMonthlyAmount('enterprise', 100))
            .toThrow("Enterprise pricing is handled via custom agreement.");
    });
});
