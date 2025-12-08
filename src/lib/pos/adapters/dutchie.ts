import type { POSClient, POSConfig, POSProduct } from '../types';
import { logger } from '@/lib/logger';

export class DutchieClient implements POSClient {
    private config: POSConfig;

    constructor(config: POSConfig) {
        this.config = config;
    }

    async validateConnection(): Promise<boolean> {
        // Mock validation
        logger.info('[POS_DUTCHIE] Validating connection', { storeId: this.config.storeId });
        // Simulate API check
        if (this.config.storeId === 'invalid') return false;
        return true;
    }

    async fetchMenu(): Promise<POSProduct[]> {
        logger.info('[POS_DUTCHIE] Fetching menu', { storeId: this.config.storeId });

        // Mock Data Response (Simulating a Dutchie GraphQL response)
        // In prod, this would be a fetch() to https://plus.dutchie.com/graphql
        return [
            {
                externalId: 'dut-101',
                name: 'Blue Dream (Dutchie)',
                brand: 'BakedBrand',
                category: 'Flower',
                price: 45.00,
                stock: 120,
                thcPercent: 22.5,
                imageUrl: 'https://images.leafly.com/flower-images/blue-dream.jpg',
                rawData: { __typename: 'Product', id: 'dut-101' }
            },
            {
                externalId: 'dut-102',
                name: 'Sleep Gummies',
                brand: 'BakedBrand',
                category: 'Edibles',
                price: 25.00,
                stock: 45,
                thcPercent: 10,
                rawData: { __typename: 'Product', id: 'dut-102' }
            }
        ];
    }

    async getInventory(externalIds: string[]): Promise<Record<string, number>> {
        // Mock inventory check
        const stock: Record<string, number> = {};
        externalIds.forEach(id => {
            stock[id] = Math.floor(Math.random() * 100);
        });
        return stock;
    }
}
