import type { POSClient, POSConfig, POSProduct } from '../types';
import { logger } from '@/lib/logger';

// Dutchie has multiple API endpoints
const DUTCHIE_PLUS_URL = 'https://plus.dutchie.com/graphql';
const DUTCHIE_EMBEDDED_URL = 'https://dutchie.com/graphql'; // Public embedded menu

export class DutchieClient implements POSClient {
    private config: POSConfig;

    constructor(config: POSConfig) {
        this.config = config;
    }

    /**
     * Query the public embedded menu API (no auth required)
     */
    private async queryPublic(query: string, variables: any = {}) {
        const response = await fetch(DUTCHIE_EMBEDDED_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Dutchie public API error: ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * Query the Plus API (requires API key)
     */
    private async queryPlus(query: string, variables: any = {}) {
        const response = await fetch(DUTCHIE_PLUS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
                'x-dutchie-plus-token': this.config.apiKey || '',
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Dutchie Plus API error: ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    async validateConnection(): Promise<boolean> {
        logger.info('[POS_DUTCHIE] Validating connection', { storeId: this.config.storeId });
        
        // Try public API first
        try {
            const result = await this.queryPublic(`
                query CheckConnection($retailerId: ID!) {
                    menu(retailerId: $retailerId) {
                        products { id }
                    }
                }
            `, { retailerId: this.config.storeId });
            
            if (result.data?.menu?.products) {
                logger.info('[POS_DUTCHIE] Public API connection successful');
                return true;
            }
        } catch (pubError: any) {
            logger.warn('[POS_DUTCHIE] Public API failed, trying Plus:', pubError.message);
        }
        
        // Fallback to Plus API
        try {
            const result = await this.queryPlus(`
                query CheckConnection($retailerId: ID!) {
                    filteredProducts(retailerId: $retailerId) {
                        products { id }
                    }
                }
            `, { retailerId: this.config.storeId });
            
            if (result.data?.filteredProducts) {
                logger.info('[POS_DUTCHIE] Plus API connection successful');
                return true;
            }
        } catch (plusError: any) {
            logger.error('[POS_DUTCHIE] Both APIs failed:', plusError.message);
        }
        
        return false;
    }

    async fetchMenu(): Promise<POSProduct[]> {
        logger.info('[POS_DUTCHIE] Fetching menu', { storeId: this.config.storeId });

        // Try public embedded API first
        try {
            const publicQuery = `
                query GetMenu($retailerId: ID!) {
                    menu(retailerId: $retailerId) {
                        products {
                            id
                            name
                            brand { name }
                            category
                            image
                            potencyThc { formatted }
                            potencyCbd { formatted }
                            variants {
                                price
                                quantity
                            }
                        }
                    }
                }
            `;

            const result = await this.queryPublic(publicQuery, { retailerId: this.config.storeId });
            
            if (result.data?.menu?.products) {
                logger.info('[POS_DUTCHIE] Fetched menu via public API');
                return this.mapProducts(result.data.menu.products);
            }
        } catch (pubError: any) {
            logger.warn('[POS_DUTCHIE] Public API menu fetch failed, trying Plus:', pubError.message);
        }

        // Fallback to Plus API
        try {
            const plusQuery = `
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

            const result = await this.queryPlus(plusQuery, { retailerId: this.config.storeId });
            
            if (result.errors) {
                logger.error('[POS_DUTCHIE] GraphQL errors', { errors: result.errors });
                throw new Error(result.errors[0]?.message || 'GraphQL error');
            }

            const products = result.data?.filteredProducts?.products || [];
            logger.info('[POS_DUTCHIE] Fetched menu via Plus API');
            return this.mapProducts(products, true);
        } catch (error: any) {
            logger.error('[POS_DUTCHIE] Both APIs failed for menu fetch:', error.message);
            throw new Error(`Dutchie menu fetch failed: ${error.message}`);
        }
    }

    private mapProducts(products: any[], isPlusApi = false): POSProduct[] {
        return products.map((p: any) => {
            const variant = p.variants?.[0] || {};
            return {
                externalId: p.id,
                name: p.name,
                brand: p.brand?.name || 'Unknown',
                category: p.category || 'Other',
                price: isPlusApi ? (variant.priceRecalc?.price || 0) : (variant.price || 0),
                stock: variant.quantity || 0,
                thcPercent: p.potencyThc?.formatted ? parseFloat(p.potencyThc.formatted) : undefined,
                cbdPercent: p.potencyCbd?.formatted ? parseFloat(p.potencyCbd.formatted) : undefined,
                imageUrl: p.image,
                rawData: p
            };
        });
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

