
import { KrakenBasisStrategy } from '../../src/treasury/strategies/basis-kraken-btc';
import { TreasuryDomainMemory } from '../../src/treasury/memory/adapter';

describe('Kraken Basis Strategy', () => {
    let strategy: KrakenBasisStrategy;

    // Mock generic treasury memory (strategy mostly uses its own local state, but interface requires generic)
    const mockTreasuryMemory = {} as TreasuryDomainMemory;

    beforeEach(() => {
        strategy = new KrakenBasisStrategy();
        // Reset or mock internal state if needed. 
        // Currently class re-initialization is enough as state is instance property.
    });

    it('should IDENTIFY an opportunity if funding rate is high', async () => {
        // We need to spy on the internal logic or mock market fetch? 
        // In the current implementation, 'selectTargetAction' has HARDCODED mock data or calls a mocked fetch.
        // The implementation has: const fundingRateApr = 0.12; 

        // To test logic properly, the Strategy class should arguably accept a MarketDataProvider or Context provider.
        // However, given the current code, we can verify the behavior based on the hardcoded 0.12 > 0.05 logic.

        const action = await strategy.selectTargetAction(mockTreasuryMemory);

        expect(action).not.toBeNull();
        if (action) {
            expect(action.actionType).toBe('OPEN_POSITION');
            expect(action.deltaExposureUsd).toBe(5000);
            expect(action.venue).toBe('kraken');
        }
    });

    it('should NOT trade if max exposure reached', async () => {
        // Manually saturate the memory
        // Accessing private property for testing (or use a setter if available, or cast to any)
        (strategy as any).localMemory.risk_state.current_exposure_usd = 20000;

        const action = await strategy.selectTargetAction(mockTreasuryMemory);
        expect(action).toBeNull();
    });
});
