import { loadStrategyMemory, saveStrategyMemory, loadTreasuryMemory } from './memory';
import { checkTreasuryPolicy } from './policy';
import { PolicyCheckRequest, StrategyMemory, PolicyCheckResult } from './schema';
import { logger } from '@/lib/logger';

export interface StrategyActionTarget {
    actionType: 'OPEN_POSITION' | 'ADJUST_POSITION' | 'CLOSE_POSITION' | 'MOVE_LIQUIDITY';
    deltaExposureUsd: number;
    assetSymbols: string[];
    venue: any; // Venue type
    explanation: string;
}

export interface MarketContext {
    ticks: Record<string, number>; // Symbol -> Price
    fundingRates?: Record<string, number>;
}

export interface StrategyImplementation<TConfig = any, TState = any> {
    id: string;
    onTick: (
        memory: StrategyMemory<TConfig, TState>,
        market: MarketContext
    ) => Promise<StrategyActionTarget | null>;
}

/**
 * Runs a single tick/cycle for a treasury strategy.
 */
export async function runStrategyCycle(
    impl: StrategyImplementation,
    marketContext: MarketContext
): Promise<void> {
    const memory = await loadStrategyMemory(impl.id);
    if (!memory) {
        logger.warn(`[Treasury] Memory not found for strategy ${impl.id}`);
        return;
    }

    if (memory.strategy_meta.status !== 'running') {
        return; // Skip non-running
    }

    // 1. Strategy Decision
    const target = await impl.onTick(memory, marketContext);

    if (!target) {
        // No action needed this tick
        return;
    }

    logger.info(`[Treasury] Strategy ${impl.id} proposes: ${target.actionType} (${target.explanation})`);

    // 2. Load Global Context for Policy
    const globalMemory = await loadTreasuryMemory();

    // Mock snapshot construction (in real implementation, this comes from live balances)
    // For V1 Paper Trading, we assume the snapshot is roughly what's in memory or empty
    const mockSnapshot = {
        totalPortfolioUsd: 100000,
        assetAllocationsPct: {},
        venueAllocationsPct: {},
        riskBucketUsagePct: { green: 0, yellow: 0, red: 0 },
        stablePct: 100,
        runwayMonths: 12
    };

    const policyRequest: PolicyCheckRequest = {
        strategyId: impl.id,
        actionType: target.actionType,
        deltaExposureUsd: target.deltaExposureUsd,
        assetSymbols: target.assetSymbols,
        venue: target.venue,
        currentPortfolioSnapshot: mockSnapshot
    };

    // 3. Policy Check
    const policyResult = await checkTreasuryPolicy(policyRequest);

    if (policyResult.decision === 'deny') {
        logger.warn(`[Treasury] Policy DENIED action for ${impl.id}: ${policyResult.reasons.join(', ')}`);

        // Log denial
        memory.logs.push({
            timestamp: new Date().toISOString(),
            action: 'DENIAL',
            details: { target, reasons: policyResult.reasons }
        });
        await saveStrategyMemory(impl.id, memory);
        return;
    }

    // 4. Execution (Paper Mode)
    logger.info(`[Treasury] Executing (PAPER): ${target.actionType} on ${target.venue}`);

    // Simulate updating state
    if (target.actionType === 'OPEN_POSITION') {
        memory.performance.num_trades += 1;
        // Mock PnL impact just to show activity
        memory.performance.lifetime_pnl_usd -= 1; // Commission ;)
    }

    memory.logs.push({
        timestamp: new Date().toISOString(),
        action: target.actionType,
        details: target,
        pnl_impact_usd: 0
    });

    await saveStrategyMemory(impl.id, memory);
}
