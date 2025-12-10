
import { treasuryMemory } from '../memory/adapter';
import { policyEngine, PolicyCheckResult } from '../policy/policy-engine';
import { TreasuryDomainMemory } from '../memory/adapter';

export interface MarketContext {
    prices: Record<string, number>;
    fundingRates?: Record<string, number>;
    // Add more as needed
}

export interface TargetAction {
    actionType: "OPEN_POSITION" | "ADJUST_POSITION" | "CLOSE_POSITION" | "MOVE_LIQUIDITY";
    deltaExposureUsd: number;
    assetSymbols: string[];
    venue: string;
    reason: string;
}

export interface StrategyResult {
    success: boolean;
    txHash?: string;
    error?: string;
    executedAction?: TargetAction;
}

export interface StrategyImplementation {
    strategyId: string;

    // 1. Orient: Load specific strategy memory and decide what to do
    selectTargetAction(
        treasuryMemory: TreasuryDomainMemory
    ): Promise<TargetAction | null>;

    // 2. Context: Fetch live data needed for execution
    loadMarketContext(action: TargetAction): Promise<MarketContext>;

    // 3. Execute: Perform the actual trade (or log it in paper mode)
    executeStrategyAction(
        action: TargetAction,
        context: MarketContext
    ): Promise<StrategyResult>;

    // 4. Update: Save strategy-specific state
    updateStrategyMemory(result: StrategyResult): Promise<void>;
}

export class TradingAgentHarness {
    async runStrategy(impl: StrategyImplementation) {
        console.log(`\n🤖 [${impl.strategyId}] Starting cycle...`);

        // 1. Load Global Memory
        const memory = await treasuryMemory.read();

        // 2. Select Target Action
        console.log(`🔍 [${impl.strategyId}] Orienting...`);
        const target = await impl.selectTargetAction(memory);

        if (!target) {
            console.log(`💤 [${impl.strategyId}] No action needed.`);
            return;
        }

        console.log(`🎯 [${impl.strategyId}] Target Identified: ${target.actionType} ${target.assetSymbols.join('/')} ($${target.deltaExposureUsd})`);

        // 3. Check Policy
        // Mocking current portfolio snapshot for now - in real implementation this comes from live balances
        // For v1 paper trading, we can read from memory or just mock it.
        const mockSnapshot = {
            totalPortfolioUsd: 100000,
            assetAllocationsPct: { 'USDC': 100 },
            venueAllocationsPct: { [target.venue]: 0 },
            riskBucketUsagePct: { 'green': 0, 'yellow': 0, 'red': 0 },
            stablePct: 100,
            runwayMonths: 18
        };

        // Determine risk bucket from registry
        const stratConfig = memory.strategy_registry.find(s => s.id === impl.strategyId);
        if (!stratConfig) throw new Error(`Strategy ${impl.strategyId} not found in registry`);

        const policyResult = await policyEngine.checkTreasuryPolicy({
            strategyId: impl.strategyId,
            actionType: target.actionType,
            deltaExposureUsd: target.deltaExposureUsd,
            assetSymbols: target.assetSymbols,
            venue: target.venue,
            currentPortfolioSnapshot: mockSnapshot,
            riskBucket: stratConfig.risk_bucket
        });

        if (policyResult.decision !== 'allow') {
            console.warn(`🛑 [${impl.strategyId}] Policy Denied: ${policyResult.reasons.join(', ')}`);
            // Should verify we log this denial
            return;
        }

        console.log(`✅ [${impl.strategyId}] Policy Approved.`);

        // 4. Load Context
        const context = await impl.loadMarketContext(target);

        // 5. Execute
        console.log(`🚀 [${impl.strategyId}] Executing...`);
        const result = await impl.executeStrategyAction(target, context);

        // 6. Update Memory
        await impl.updateStrategyMemory(result);

        console.log(`🏁 [${impl.strategyId}] Cycle Complete. Success: ${result.success}`);
    }
}

export const tradingHarness = new TradingAgentHarness();
