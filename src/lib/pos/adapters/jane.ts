import type { POSClient, POSConfig, POSProduct } from '../types';

export class JaneClient implements POSClient {
    private config: POSConfig;

    constructor(config: POSConfig) {
        this.config = config;
    }

    async validateConnection(): Promise<boolean> {
        console.log(`[Jane] Validating connection for store ${this.config.storeId}`);
        if (!this.config.storeId) return false;
        return true;
    }

    async fetchMenu(): Promise<POSProduct[]> {
        console.log(`[Jane] Fetching menu for ${this.config.storeId}`);

        // Mock Jane API response
        return [
            {
                externalId: 'jane-500',
                name: 'OG Kush (Jane)',
                brand: 'BakedBrand',
                category: 'Flower',
                price: 50.00,
                stock: 80,
                thcPercent: 24.0,
                imageUrl: '',
                rawData: { id: 'jane-500' }
            },
            {
                externalId: 'jane-501',
                name: 'Relief Balm',
                brand: 'BakedBrand',
                category: 'Topical',
                price: 35.00,
                stock: 12,
                thcPercent: 0,
                cbdPercent: 500,
                rawData: { id: 'jane-501' }
            }
        ];
    }

    async getInventory(externalIds: string[]): Promise<Record<string, number>> {
        const stock: Record<string, number> = {};
        externalIds.forEach(id => {
            stock[id] = Math.floor(Math.random() * 50);
        });
        return stock;
    }
}
