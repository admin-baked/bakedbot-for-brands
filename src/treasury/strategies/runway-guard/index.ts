
import { StrategyImplementation, TargetAction, MarketContext, StrategyResult } from '../../agents/harness';
import { TreasuryDomainMemory } from '../../memory/adapter';

export class RunwayGuardStrategy implements StrategyImplementation {
    strategyId = 'str_runway_guard';

    async selectTargetAction(memory: TreasuryDomainMemory): Promise<TargetAction | null> {
        console.log(`   [${this.strategyId}] Checking runway health...`);

        const monthlyBurn = memory.runway_model.monthly_burn_usd; // $25k
        const minRunway = memory.runway_model.min_runway_months; // 12

        // Mock Portfolio Value (would come from snapshot)
        const mockTotalAssets = 200000; // 8 months usage -> Danger!
        const currentRunway = mockTotalAssets / monthlyBurn;

        if (currentRunway < minRunway) {
            return {
                actionType: 'CLOSE_POSITION',
                assetSymbols: ['ALL_RISK'],
                venue: 'multi',
                deltaExposureUsd: -10000, // Mock: Reduce risk by $10k
                reason: `Runway ${currentRunway} months < Limit ${minRunway} months. SAFE MODE TRIGGERED.`
            };
        }
        return null; // Healthy
    }

    async loadMarketContext(action: TargetAction): Promise<MarketContext> {
        return { prices: {} };
    }

    async executeStrategyAction(action: TargetAction, context: MarketContext): Promise<StrategyResult> {
        console.log(`   🚨 [SAFE MODE] Executing Emergency Risk Reduction`);
        console.log(`      Action: ${action.reason}`);
        return { success: true, executedAction: action };
    }

    async updateStrategyMemory(result: StrategyResult): Promise<void> {
        console.log(`   💾 [MEMORY] Logged Safe Mode Transition`);
    }
}
