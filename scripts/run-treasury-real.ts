import { runStrategyCycle } from '@/server/treasury/harness';
import { BasisTradeStrategy, seedBasisTradeMemory } from '@/server/treasury/strategies/basis-trade';
import { krakenAdapter } from '@/server/treasury/exchange';
import { logger } from '@/lib/logger';

// Mock Logger
logger.info = console.log;
logger.warn = console.warn;
logger.error = console.error;

async function main() {
    console.log("--- Treasury LIVE FEED Runner ---");

    // 1. Seed Memory
    await seedBasisTradeMemory();

    // 2. Fetch Real Data
    console.log("Fetching real data from Kraken...");
    const symbols = ['BTC/USD'];
    const marketContext = await krakenAdapter.fetchMarketContext(symbols);

    console.log("Market Context:", JSON.stringify(marketContext, null, 2));

    if (!marketContext.ticks['BTC/USD']) {
        console.error("Failed to fetch BTC price. Check internet connection.");
        return;
    }

    // 3. Run Strategy
    console.log("\nRunning Strategy Cycle...");
    await runStrategyCycle(BasisTradeStrategy, marketContext);

    console.log("\nDone.");
}

main().catch(console.error);
