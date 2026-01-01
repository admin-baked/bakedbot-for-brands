import type { POSClient, POSConfig, POSProduct } from '../types';
import { logger } from '@/lib/logger';

const DUTCHIE_GRAPHQL_URL = 'https://plus.dutchie.com/graphql';

export class DutchieClient implements POSClient {
    private config: POSConfig;

    constructor(config: POSConfig) {
        this.config = config;
    }

    private async query(query: string, variables: any = {}) {
        const response = await fetch(DUTCHIE_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
                'x-dutchie-plus-token': this.config.apiKey || '', // Some versions of Plus use this header
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Dutchie API error: ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    async validateConnection(): Promise<boolean> {
        logger.info('[POS_DUTCHIE] Validating connection', { storeId: this.config.storeId });
        try {
            // Simplified query for connection check
            const result = await this.query(`
                query CheckConnection($retailerId: ID!) {
                    filteredProducts(retailerId: $retailerId) {
                        products { id }
                    }
                }
            `, { retailerId: this.config.storeId });
            
            return !!result.data?.filteredProducts;
        } catch (error) {
            logger.error('[POS_DUTCHIE] Connection validation failed', { error });
            return false;
        }
    }

    async fetchMenu(): Promise<POSProduct[]> {
        logger.info('[POS_DUTCHIE] Fetching menu', { storeId: this.config.storeId });

        try {
            const query = `
                query GetMenu($retailerId: ID!) {
                    filteredProducts(retailerId: $retailerId) {
                        products {
                            id
                            name
                            brand { name }
                            category
                            image
                            potencyThc { formatted }
                            potencyCbd { formatted }
                            variants {
                                priceRecalc { price }
                                quantity
                            }
                        }
                    }
                }
            `;

            const result = await this.query(query, { retailerId: this.config.storeId });
            
            if (result.errors) {
                logger.error('[POS_DUTCHIE] GraphQL errors', { errors: result.errors });
                throw new Error(result.errors[0]?.message || 'GraphQL error');
            }

            const products = result.data?.filteredProducts?.products || [];

            return products.map((p: any) => {
                const variant = p.variants?.[0] || {};
                return {
                    externalId: p.id,
                    name: p.name,
                    brand: p.brand?.name || 'Unknown',
                    category: p.category || 'Other',
                    price: variant.priceRecalc?.price || 0,
                    stock: variant.quantity || 0,
                    thcPercent: p.potencyThc?.formatted ? parseFloat(p.potencyThc.formatted) : undefined,
                    cbdPercent: p.potencyCbd?.formatted ? parseFloat(p.potencyCbd.formatted) : undefined,
                    imageUrl: p.image,
                    rawData: p
                };
            });
        } catch (error) {
            logger.error('[POS_DUTCHIE] Failed to fetch menu', { error });
            throw error;
        }
    }

    async getInventory(externalIds: string[]): Promise<Record<string, number>> {
        // Fetch full menu and filter for inventory sync
        const products = await this.fetchMenu();
        const stock: Record<string, number> = {};
        products.forEach(p => {
            if (externalIds.includes(p.externalId)) {
                stock[p.externalId] = p.stock;
            }
        });
        return stock;
    }
}

