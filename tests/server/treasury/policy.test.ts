import { checkTreasuryPolicy } from '@/server/treasury/policy';
import { PolicyCheckRequest, TreasuryDomainMemory } from '@/server/treasury/schema';
import * as memoryModule from '@/server/treasury/memory';

// Mock loadTreasuryMemory
jest.mock('@/server/treasury/memory', () => ({
    loadTreasuryMemory: jest.fn()
}));

const MOCK_MEMORY: TreasuryDomainMemory = {
    treasury_profile: {
        entity_name: "Mock Treasury",
        base_currency: "USD",
        reporting_interval_days: 7
    },
    runway_model: {
        monthly_burn_usd: 1000,
        min_runway_months: 12,
        warning_runway_months: 9
    },
    allocation_policy: {
        max_total_crypto_pct: 50,
        risk_buckets: { green: 50, yellow: 30, red: 10 },
        max_per_asset_pct: { "BTC": 20, "ETH": 20 }
    },
    venue_limits: {
        centralized: {
            kraken: { status: 'approved', max_exposure_pct: 100 }
        },
        defi: {}
    },
    strategy_registry: []
};

describe('Treasury Policy Engine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (memoryModule.loadTreasuryMemory as jest.Mock).mockResolvedValue(MOCK_MEMORY);
    });

    it('should ALLOW a trade that fits within all caps', async () => {
        const request: PolicyCheckRequest = {
            strategyId: 'str_1',
            actionType: 'OPEN_POSITION',
            deltaExposureUsd: 1000,
            assetSymbols: ['BTC'],
            venue: 'kraken',
            currentPortfolioSnapshot: {
                totalPortfolioUsd: 10000,
                assetAllocationsPct: { "BTC": 0 },
                venueAllocationsPct: { "kraken": 0 },
                riskBucketUsagePct: { green: 0, yellow: 0, red: 0 },
                stablePct: 100,
                runwayMonths: 24
            }
        };

        const result = await checkTreasuryPolicy(request);
        expect(result.decision).toBe('allow');
    });

    it('should DENY a trade exceeeding Global Crypto Cap', async () => {
        const request: PolicyCheckRequest = {
            strategyId: 'str_1',
            actionType: 'OPEN_POSITION',
            deltaExposureUsd: 6000, // 60% of new total
            assetSymbols: ['BTC'],
            venue: 'kraken',
            currentPortfolioSnapshot: {
                totalPortfolioUsd: 4000,
                assetAllocationsPct: {},
                venueAllocationsPct: {},
                riskBucketUsagePct: { green: 0, yellow: 0, red: 0 },
                stablePct: 100,
                runwayMonths: 24
            }
        };

        const result = await checkTreasuryPolicy(request);
        expect(result.decision).toBe('deny');
        expect(result.reasons[0]).toContain('Global crypto cap exceeded');
    });

    it('should DENY a trade exceeding Per-Asset Cap', async () => {
        // Max BTC is 20%. Try to go to 30%.
        const request: PolicyCheckRequest = {
            strategyId: 'str_1',
            actionType: 'OPEN_POSITION',
            deltaExposureUsd: 3000,
            assetSymbols: ['BTC'],
            venue: 'kraken',
            currentPortfolioSnapshot: {
                totalPortfolioUsd: 10000,
                assetAllocationsPct: {},
                venueAllocationsPct: {},
                riskBucketUsagePct: { green: 0, yellow: 0, red: 0 },
                stablePct: 100,
                runwayMonths: 24
            }
        };

        const result = await checkTreasuryPolicy(request);
        expect(result.decision).toBe('deny');
        expect(result.reasons[0]).toContain('Asset cap exceeded for BTC');
    });

    it('should DENY a trade on restricted venue', async () => {
        const request: PolicyCheckRequest = {
            strategyId: 'str_1',
            actionType: 'OPEN_POSITION',
            deltaExposureUsd: 100,
            assetSymbols: ['BTC'],
            venue: 'coinbase', // Not in MOCK_MEMORY
            currentPortfolioSnapshot: {
                totalPortfolioUsd: 10000,
                assetAllocationsPct: {},
                venueAllocationsPct: {},
                riskBucketUsagePct: { green: 0, yellow: 0, red: 0 },
                stablePct: 100,
                runwayMonths: 24
            }
        };

        const result = await checkTreasuryPolicy(request);
        expect(result.decision).toBe('deny');
        expect(result.reasons[0]).toContain('not explicitly approved');
    });
});
