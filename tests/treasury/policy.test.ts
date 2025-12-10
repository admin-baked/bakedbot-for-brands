
import { policyEngine } from '../../src/treasury/policy/policy-engine';
import { TreasuryDomainMemory } from '../../src/treasury/memory/adapter';

// Mock Memory State
const mockMemory: TreasuryDomainMemory = {
    treasury_profile: {
        entity_name: 'Test Corp',
        base_currency: 'USD',
        reporting_interval_days: 7
    },
    runway_model: {
        monthly_burn_usd: 10000,
        min_runway_months: 12,
        warning_runway_months: 18
    },
    allocation_policy: {
        max_total_crypto_pct: 20,
        risk_buckets: {
            green: 15,
            yellow: 5,
            red: 0
        },
        max_per_asset_pct: {
            'BTC': 15,
            'ETH': 5
        }
    },
    venue_limits: {
        centralized: {
            'kraken': { status: 'approved', max_exposure_pct: 100 }
        },
        defi: {
            'aave': { status: 'approved', max_exposure_pct: 10, chains: ['mainnet'] }
        },
        virtual: {
            'multi': { status: 'approved', max_exposure_pct: 100 }
        }
    },
    strategy_registry: [
        {
            id: 'test_strat_1',
            name: 'Test Strategy',
            risk_bucket: 'green',
            venue: 'kraken',
            status: 'running',
            target_allocation_pct: 5
        }
    ]
};

// Mock Snapshot
const mockSnapshot = {
    totalPortfolioUsd: 100000,
    assetAllocationsPct: { 'BTC': 0, 'ETH': 0 },
    venueAllocationsPct: {},
    riskBucketUsagePct: { green: 0, yellow: 0, red: 0 },
    stablePct: 100,
    runwayMonths: 24
};

describe('Treasury Policy Engine', () => {
    it('should APPROVE a safe trade within limits', async () => {
        const result = await policyEngine.checkTreasuryPolicy({
            strategyId: 'test_strat_1',
            actionType: 'OPEN_POSITION',
            assetSymbols: ['BTC'],
            venue: 'kraken',
            deltaExposureUsd: 5000, // 5%
            currentPortfolioSnapshot: mockSnapshot,
            riskBucket: 'green'
        }, mockMemory);

        expect(result.decision).toBe('allow');
    });

    it('should DENY a trade with invalid venue', async () => {
        const result = await policyEngine.checkTreasuryPolicy({
            strategyId: 'test_strat_1',
            actionType: 'OPEN_POSITION',
            assetSymbols: ['BTC'],
            venue: 'shadyswap',
            deltaExposureUsd: 1000,
            currentPortfolioSnapshot: mockSnapshot,
            riskBucket: 'green'
        }, mockMemory);

        expect(result.decision).toBe('deny');
        expect(result.reasons[0]).toContain('Venue');
    });

    it('should APPROVE a virtual venue (multi)', async () => {
        const result = await policyEngine.checkTreasuryPolicy({
            strategyId: 'test_strat_1',
            actionType: 'CLOSE_POSITION',
            assetSymbols: ['ALL'],
            venue: 'multi',
            deltaExposureUsd: -1000,
            currentPortfolioSnapshot: mockSnapshot,
            riskBucket: 'green'
        }, mockMemory);

        expect(result.decision).toBe('allow');
    });

    it('should DENY if Risk Bucket limit exceeded', async () => {
        const result = await policyEngine.checkTreasuryPolicy({
            strategyId: 'test_strat_1',
            actionType: 'OPEN_POSITION',
            assetSymbols: ['BTC'],
            venue: 'kraken',
            deltaExposureUsd: 20000, // 20% > 15% Green bucket limit
            currentPortfolioSnapshot: mockSnapshot,
            riskBucket: 'green'
        }, mockMemory);

        expect(result.decision).toBe('deny');
        expect(result.reasons[0]).toContain('Risk Bucket');
    });
});
