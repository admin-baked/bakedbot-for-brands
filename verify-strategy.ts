
import { tradingHarness } from './src/treasury/agents/harness';
import { KrakenBasisStrategy } from './src/treasury/strategies/basis-kraken-btc';

async function runDemo() {
    console.log('--- Starting Treasury Strategy Demo ---');

    const strategy = new KrakenBasisStrategy();

    // Run a cycle
    await tradingHarness.runStrategy(strategy);

    // Run another cycle to show state update/persistence logic (mocked)
    console.log('\n--- Run 2 ---');
    await tradingHarness.runStrategy(strategy);
}

runDemo().catch(console.error);
