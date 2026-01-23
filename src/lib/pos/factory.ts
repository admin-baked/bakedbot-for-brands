import type { POSClient, POSConfig, POSProvider } from './types';
import { DutchieClient } from './adapters/dutchie';
import { JaneClient } from './adapters/jane';
import { ALLeavesClient, type ALLeavesConfig } from './adapters/alleaves';

export function getPOSClient(provider: POSProvider, config: POSConfig): POSClient {
    switch (provider) {
        case 'dutchie':
            return new DutchieClient(config);
        case 'jane':
            return new JaneClient(config);
        case 'alleaves':
            return new ALLeavesClient(config as ALLeavesConfig);
        case 'manual':
            throw new Error('Manual provider does not support automated sync.');
        default:
            throw new Error(`Unsupported POS provider: ${provider}`);
    }
}
