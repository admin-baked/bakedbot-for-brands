import * as ccxt from 'ccxt';
import { treasuryConfig } from '../config';

let krakenClient: ccxt.kraken | null = null;

export function getKrakenClient(): ccxt.kraken {
    if (krakenClient) return krakenClient;

    const config: any = {
        'enableRateLimit': true,
        'options': {
            'adjustForTimeDifference': true,
        }
    };

    if (treasuryConfig.KRAKEN_API_KEY && treasuryConfig.KRAKEN_PRIVATE_KEY) {
        config['apiKey'] = treasuryConfig.KRAKEN_API_KEY;
        config['secret'] = treasuryConfig.KRAKEN_PRIVATE_KEY;
        console.log('✅ [Kraken] Initialized with API Keys');
    } else {
        console.warn('⚠️ [Kraken] Initialized in PUBLIC mode (No API Keys found)');
    }

    krakenClient = new ccxt.kraken(config);
    return krakenClient;
}
