
import { StrategyImplementation, TargetAction, MarketContext, StrategyResult } from '../../agents/harness';
import { TreasuryDomainMemory } from '../../memory/adapter';
import { getKrakenClient } from '../../lib/kraken';
import { treasuryConfig } from '../../config';


// Specific memory interface for this strategy (extends base concept if we had a strongly typed base)
interface BasisStrategyMemory {
    config: {
        min_funding_apr: number;
        max_position_notional_usd: number;
    };
    risk_state: {
        current_exposure_usd: number;
    };
}

export class KrakenBasisStrategy implements StrategyImplementation {
    strategyId = 'str_basis_kraken_btc';

    // Mock Memory for now until we build per-strategy memory adapter
    private localMemory: BasisStrategyMemory = {
        config: {
            min_funding_apr: 0.05, // 5%
            max_position_notional_usd: 20000
        },
        risk_state: {
            current_exposure_usd: 0
        }
    };

    async selectTargetAction(treasuryMemory: TreasuryDomainMemory): Promise<TargetAction | null> {
        // 1. Fetch Mock Market Data (in real life, maybe we do a lightweight check here)
        console.log(`   [${this.strategyId}] Checking funding rates...`);
        const fundingRateApr = 0.12; // MOCK: 12% APR (Juicy!)

        // 2. Check Conditions
        if (fundingRateApr > this.localMemory.config.min_funding_apr) {
            // Opportunity!
            // Check if we have room in our local cap
            if (this.localMemory.risk_state.current_exposure_usd < this.localMemory.config.max_position_notional_usd) {
                return {
                    actionType: 'OPEN_POSITION',
                    assetSymbols: ['BTC'],
                    venue: 'kraken',
                    deltaExposureUsd: 5000, // Buy $5k worth
                    reason: `Funding APR ${fundingRateApr * 100}% > Min ${this.localMemory.config.min_funding_apr * 100}%`
                };
            } else {
                console.log(`   [${this.strategyId}] Max position reached.`);
            }
        }

        return null;
    }

    async loadMarketContext(action: TargetAction): Promise<MarketContext> {
        // Real Data Fetch
        const kraken = getKrakenClient();

        // Map symbol to Kraken pair (simplified)
        const pair = 'BTC/USD';

        try {
            const [ticker, fundingInfo] = await Promise.all([
                kraken.fetchTicker(pair),
                // CCXT unified funding rate fetching if supported, else public endpoint
                // Kraken funding rates are often separate. For v1 simplified: use ticker or separate call.
                // Assuming simple perp funding for now or hardcoded 'mock' real rate if API is complex
                // without deep digging.
                Promise.resolve({ activeFundingRate: 0.10 }) // Placeholder for complex funding API call
            ]);

            return {
                prices: {
                    'BTC': ticker.last || 0
                },
                fundingRates: {
                    'BTC': fundingInfo.activeFundingRate // In reality: fetch from kraken futures API
                }
            };
        } catch (err) {
            console.error('Failed to fetch real market data', err);
            // Fallback to paper mock if real fetch fails
            return {
                prices: { 'BTC': 98000 },
                fundingRates: { 'BTC': 0.12 }
            };
        }
    }

    async executeStrategyAction(action: TargetAction, context: MarketContext): Promise<StrategyResult> {
        // Safe Mode: Paper Trading by default
        if (!treasuryConfig.ENABLE_REAL_TRADING) {
            console.log(`   📝 [PAPER TRADE] Executing ${action.actionType} on ${action.venue}`);
            console.log(`      Asset: ${action.assetSymbols[0]}`);
            console.log(`      Amount: $${action.deltaExposureUsd} (~${(action.deltaExposureUsd / context.prices['BTC']).toFixed(4)} BTC)`);
            console.log(`      Price: $${context.prices['BTC']}`);

            return {
                success: true,
                executedAction: action,
                txHash: 'mock-tx-id-' + Date.now()
            };
        }

        // REAL TRADING MODE
        console.log(`   🚨 [REAL TRADE] Executing ${action.actionType} on ${action.venue}`);
        const kraken = getKrakenClient();
        const pair = 'BTC/USD';
        const side = action.deltaExposureUsd > 0 ? 'buy' : 'sell';
        const amountBtc = Math.abs(action.deltaExposureUsd) / context.prices['BTC'];

        try {
            // Simplified Order: Market order for immediate execution
            // In production, we'd likely use Limit orders or more complex logic
            const order = await kraken.createOrder(pair, 'market', side, amountBtc);
            console.log(`      ✅ Order Placed: ${order.id}`);

            return {
                success: true,
                executedAction: action,
                txHash: order.id
            };
        } catch (error) {
            console.error('      ❌ Order Failed:', error);
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    async updateStrategyMemory(result: StrategyResult): Promise<void> {
        if (result.success && result.executedAction) {
            this.localMemory.risk_state.current_exposure_usd += result.executedAction.deltaExposureUsd;
            console.log(`   💾 [MEMORY] Updated local exposure to $${this.localMemory.risk_state.current_exposure_usd}`);
        }
    }
}
