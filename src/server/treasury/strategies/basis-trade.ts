import { StrategyImplementation, StrategyActionTarget, MarketContext } from '../harness';
import { StrategyMemory, StrategyStatus } from '../schema';
import { saveStrategyMemory } from '../memory';

interface BasisTradeConfig {
    min_funding_apr: number;
    max_position_size_usd: number;
}

interface BasisTradeState {
    current_position_usd: number;
}

export const STRATEGY_ID = 'str_basis_kraken_btc';

/**
 * Basis Trade Bot (Green Bucket)
 * Captures spread between Spot and Perp when funding is positive.
 */
export const BasisTradeStrategy: StrategyImplementation<BasisTradeConfig, BasisTradeState> = {
    id: STRATEGY_ID,

    onTick: async (memory, market) => {
        const { ticks, fundingRates } = market;
        const btcPrice = ticks['BTC/USD'];
        const btcFunding = fundingRates?.['BTC/USD'] || 0;

        const state = memory.state;
        const config = memory.config;

        if (!btcPrice) return null;

        // Logic: If no position and funding is high -> OPEN
        if (state.current_position_usd === 0) {
            // Annualize funding (assuming 8h rate provided)
            const annualizedRate = btcFunding * 3 * 365;

            if (annualizedRate > config.min_funding_apr) {
                return {
                    actionType: 'OPEN_POSITION',
                    deltaExposureUsd: 1000, // Fixed size for test
                    assetSymbols: ['BTC'],
                    venue: 'kraken',
                    explanation: `Funding APR ${(annualizedRate * 100).toFixed(2)}% > Min ${(config.min_funding_apr * 100).toFixed(2)}%`
                };
            }
        }

        return null; // Hold
    }
};

/**
 * Initialize default memory for this strategy
 */
export async function seedBasisTradeMemory() {
    const initialMemory: StrategyMemory<BasisTradeConfig, BasisTradeState> = {
        strategy_meta: {
            id: STRATEGY_ID,
            venue: 'kraken',
            risk_bucket: 'green',
            status: 'running' // Start running immediately for testing
        },
        config: {
            min_funding_apr: 0.10, // 10%
            max_position_size_usd: 5000
        },
        performance: {
            lifetime_pnl_usd: 0,
            last_30d_pnl_usd: 0,
            max_drawdown_pct: 0,
            num_trades: 0,
            win_rate: 0
        },
        state: {
            current_position_usd: 0
        },
        logs: []
    };

    await saveStrategyMemory(STRATEGY_ID, initialMemory);
}
