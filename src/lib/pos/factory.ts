import type { POSClient, POSConfig, POSProvider } from './types';
import { DutchieClient } from './adapters/dutchie';
import { JaneClient } from './adapters/jane';

export function getPOSClient(provider: POSProvider, config: POSConfig): POSClient {
    switch (provider) {
        case 'dutchie':
            return new DutchieClient(config);
        case 'jane':
            return new JaneClient(config);
        case 'manual':
            throw new Error('Manual provider does not support automated sync.');
        default:
            throw new Error(`Unsupported POS provider: ${provider}`);
    }
}
