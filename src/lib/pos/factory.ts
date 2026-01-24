import type { POSClient, POSConfig, POSProvider } from './types';
import { DutchieClient } from './adapters/dutchie';
import { JaneClient } from './adapters/jane';
import { ALLeavesClient, type ALLeavesConfig } from './adapters/alleaves';

/**
 * Get a POS client for automated menu sync and order management.
 *
 * NOTE: Metrc is NOT a POS system - it's a compliance tracking system.
 * For Metrc integration, use the MetrcClient directly:
 *
 * ```typescript
 * import { MetrcClient, type MetrcConfig } from './adapters/metrc';
 * const metrc = new MetrcClient(config);
 * const labData = await metrc.getLabDataMap();
 * ```
 *
 * See: src/lib/pos/adapters/metrc.ts
 */
export function getPOSClient(provider: POSProvider, config: POSConfig): POSClient {
    switch (provider) {
        case 'dutchie':
            return new DutchieClient(config);
        case 'jane':
            return new JaneClient(config);
        case 'alleaves':
            return new ALLeavesClient(config as ALLeavesConfig);
        case 'metrc':
            throw new Error(
                'Metrc is not a POS system. Use MetrcClient directly for compliance/lab data. ' +
                'Import from: @/lib/pos/adapters/metrc'
            );
        case 'manual':
            throw new Error('Manual provider does not support automated sync.');
        default:
            throw new Error(`Unsupported POS provider: ${provider}`);
    }
}
