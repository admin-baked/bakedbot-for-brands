
import { getKrakenClient } from './src/treasury/lib/kraken';

async function verifyFeeds() {
    console.log('--- Kraken Feed Verification ---');
    const kraken = getKrakenClient();

    try {
        // 1. Public Data (Ticker)
        console.log('Fetching BTC/USD ticker...');
        const ticker = await kraken.fetchTicker('BTC/USD');
        console.log(`✅ BTC Price: $${ticker.last}`);

        // 2. Private Data (if keys exist)
        if (kraken.apiKey) {
            console.log('\nFetching Balance...');
            const balance = await kraken.fetchBalance();
            console.log('✅ Balance fetched successfully');
            console.log('   Total (USD Equivalent):', balance['total']);
        } else {
            console.log('\n⚠️ Skipping Private Data check (No Keys)');
        }

    } catch (error) {
        console.error('❌ Kraken Verification Failed:', error);
        process.exit(1);
    }
}

verifyFeeds().catch(console.error);
