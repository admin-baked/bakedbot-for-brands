import { runStrategyCycle } from '@/server/treasury/harness';
import { BasisTradeStrategy, seedBasisTradeMemory } from '@/server/treasury/strategies/basis-trade';
import { logger } from '@/lib/logger';

// Mock Logger to console
logger.info = console.log;
logger.warn = console.warn;
logger.error = console.error;

async function main() {
    console.log("--- Treasury Paper Trading Runner ---");

    // 1. Seed Memory
    console.log("Seeding memory...");
    await seedBasisTradeMemory();

    // 2. Mock Market Data
    // Case 1: High Funding (Should Open)
    const marketHighFunding = {
        ticks: { 'BTC/USD': 50000 },
        fundingRates: { 'BTC/USD': 0.0002 } // 0.02% per 8h * 3 * 365 = 21.9% APR
    };

    console.log("\nTick 1: High Funding (Expect OPEN)...");
    await runStrategyCycle(BasisTradeStrategy, marketHighFunding);

    // 3. Mock Market Data
    // Case 2: Low Funding (Should Hold)
    const marketLowFunding = {
        ticks: { 'BTC/USD': 50000 },
        fundingRates: { 'BTC/USD': 0.00005 } // 5.4% APR
    };

    console.log("\nTick 2: Low Funding (Expect HOLD)...");
    await runStrategyCycle(BasisTradeStrategy, marketLowFunding);

    console.log("\nDone.");
}

main().catch(console.error);
