import type { POSClient, POSConfig, POSProduct } from '../types';
import { logger } from '@/lib/logger';

// Dutchie API endpoints
const DUTCHIE_REST_API = 'https://plus.dutchie.com/api/v1';
const DUTCHIE_PLUS_GRAPHQL = 'https://plus.dutchie.com/graphql';

export class DutchieClient implements POSClient {
    private config: POSConfig;

    constructor(config: POSConfig) {
        this.config = config;
    }

    /**
     * REST API request with Bearer token auth
     */
    private async restRequest(endpoint: string, method = 'GET'): Promise<any> {
        const url = `${DUTCHIE_REST_API}${endpoint}`;
        logger.info(`[POS_DUTCHIE] REST ${method} ${endpoint}`);
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'x-dutchie-retailer-id': this.config.storeId || '',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Dutchie REST API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return response.json();
    }

    /**
     * GraphQL query for public embedded menu (no auth)
     */
    private async graphqlPublic(query: string, variables: any = {}): Promise<any> {
        const response = await fetch('https://dutchie.com/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
        });
        
        if (!response.ok) {
            throw new Error(`Dutchie public GraphQL error: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * GraphQL query for Plus API (requires auth)
     */
    private async graphqlPlus(query: string, variables: any = {}): Promise<any> {
        const response = await fetch(DUTCHIE_PLUS_GRAPHQL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.config.apiKey}`,
                'x-dutchie-plus-token': this.config.apiKey || '',
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`Dutchie Plus GraphQL error: ${response.statusText}`);
        }
        return response.json();
    }

    async validateConnection(): Promise<boolean> {
        logger.info('[POS_DUTCHIE] Validating connection', { 
            storeId: this.config.storeId,
            hasApiKey: !!this.config.apiKey 
        });
        
        // Try REST API first (most reliable for Partner integrations)
        if (this.config.apiKey) {
            try {
                const result = await this.restRequest(`/retailers/${this.config.storeId}/products?limit=1`);
                if (result && (result.data || Array.isArray(result))) {
                    logger.info('[POS_DUTCHIE] REST API connection successful');
                    return true;
                }
            } catch (restError: any) {
                logger.warn('[POS_DUTCHIE] REST API failed:', restError.message);
                
                // Try alternate REST endpoints
                try {
                    const altResult = await this.restRequest('/products?limit=1');
                    if (altResult) {
                        logger.info('[POS_DUTCHIE] REST API (alt endpoint) successful');
                        return true;
                    }
                } catch (altError: any) {
                    logger.warn('[POS_DUTCHIE] Alternate REST also failed:', altError.message);
                }
            }
        }
        
        // Fallback to GraphQL Plus API
        try {
            const result = await this.graphqlPlus(`
                query CheckConnection($retailerId: ID!) {
                    filteredProducts(retailerId: $retailerId) {
                        products { id }
                    }
                }
            `, { retailerId: this.config.storeId });
            
            if (result.data?.filteredProducts) {
                logger.info('[POS_DUTCHIE] Plus GraphQL connection successful');
                return true;
            }
        } catch (graphqlError: any) {
            logger.error('[POS_DUTCHIE] All connection methods failed:', graphqlError.message);
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

            const result = await this.graphqlPublic(publicQuery, { retailerId: this.config.storeId });
            
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

            const result = await this.graphqlPlus(plusQuery, { retailerId: this.config.storeId });
            
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

