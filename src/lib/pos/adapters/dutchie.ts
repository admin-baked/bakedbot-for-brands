import type { POSClient, POSConfig, POSProduct } from '../types';
import { logger } from '@/lib/logger';

// Dutchie API endpoints
const DUTCHIE_PLUS_GRAPHQL = 'https://plus.dutchie.com/plus/2021-07/graphql';
const DUTCHIE_POS_API = 'https://pos-api.dutchie.com'; // POS REST API

export interface DutchieConfig extends POSConfig {
    clientId?: string;          // Dutchie Client ID
    orderAheadClientId?: string;  // Order Ahead Client ID
    orderAheadClientToken?: string; // Order Ahead Client Token
    authMethod?: 'bearer' | 'basic' | 'pos'; // Authentication method to use
}

export class DutchieClient implements POSClient {
    private config: DutchieConfig;

    constructor(config: DutchieConfig) {
        this.config = config;
    }

    /**
     * Build authorization header based on config
     */
    private getAuthHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Method 1: Bearer token with API key (Plus GraphQL)
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            headers['x-dutchie-plus-token'] = this.config.apiKey;
        }

        // Method 2: HTTP Basic Auth with API key (POS API style)
        if (this.config.authMethod === 'basic' && this.config.apiKey) {
            const basicAuth = Buffer.from(`${this.config.apiKey}:`).toString('base64');
            headers['Authorization'] = `Basic ${basicAuth}`;
        }

        // Method 3: Order Ahead OAuth credentials
        if (this.config.orderAheadClientId && this.config.orderAheadClientToken) {
            const basicAuth = Buffer.from(
                `${this.config.orderAheadClientId}:${this.config.orderAheadClientToken}`
            ).toString('base64');
            headers['Authorization'] = `Basic ${basicAuth}`;
        }

        return headers;
    }

    /**
     * GraphQL query for Plus API (2021-07 Endpoint)
     */
    private async graphqlPlus(query: string, variables: any = {}): Promise<any> {
        const headers = this.getAuthHeaders();
        
        const response = await fetch(DUTCHIE_PLUS_GRAPHQL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Dutchie Plus GraphQL error: ${response.status} ${response.statusText} - ${text}`);
        }
        return response.json();
    }

    /**
     * REST API call for POS API (fallback)
     */
    private async posApiRequest(endpoint: string): Promise<any> {
        if (!this.config.apiKey) {
            throw new Error('API key required for POS API');
        }

        const basicAuth = Buffer.from(`${this.config.apiKey}:`).toString('base64');
        
        const response = await fetch(`${DUTCHIE_POS_API}${endpoint}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Dutchie POS API error: ${response.status} - ${text}`);
        }
        return response.json();
    }

    async validateConnection(): Promise<boolean> {
        logger.info('[POS_DUTCHIE] Validating connection', { 
            storeId: this.config.storeId,
            hasApiKey: !!this.config.apiKey,
            hasOrderAheadCreds: !!(this.config.orderAheadClientId && this.config.orderAheadClientToken),
            authMethod: this.config.authMethod || 'bearer'
        });
        
        // Try Plus GraphQL first
        const query = `
            query CheckConnection($retailerId: ID!) {
                menu(retailerId: $retailerId) {
                    products {
                        id
                    }
                }
            }
        `;

        try {
            const result = await this.graphqlPlus(query, { retailerId: this.config.storeId });
            
            if (result.data?.menu?.products) {
                logger.info('[POS_DUTCHIE] Plus GraphQL connection successful');
                return true;
            }
            
            if (result.errors) {
                const errorCode = result.errors[0]?.extensions?.code;
                const errorMsg = result.errors[0]?.message;
                
                logger.warn('[POS_DUTCHIE] GraphQL validation failed', { 
                    code: errorCode, 
                    message: errorMsg 
                });

                // If unauthenticated, the credentials may be for a different API
                if (errorCode === 'UNAUTHENTICATED') {
                    logger.info('[POS_DUTCHIE] Auth failed - credentials may be for Order Ahead API, not Plus API');
                }
            }
        } catch (graphqlError: any) {
            logger.error('[POS_DUTCHIE] Connection validation failed:', graphqlError.message);
        }

        // Try POS REST API if configured
        if (this.config.apiKey && this.config.authMethod === 'pos') {
            try {
                logger.info('[POS_DUTCHIE] Trying POS REST API...');
                const result = await this.posApiRequest(`/v2/locations/${this.config.storeId}/products`);
                if (result && (result.products || result.data)) {
                    logger.info('[POS_DUTCHIE] POS REST API connection successful');
                    return true;
                }
            } catch (posError: any) {
                logger.warn('[POS_DUTCHIE] POS REST API failed:', posError.message);
            }
        }
        
        return false;
    }

    async fetchMenu(): Promise<POSProduct[]> {
        logger.info('[POS_DUTCHIE] Fetching menu', { storeId: this.config.storeId });

        const query = `
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

        try {
            const result = await this.graphqlPlus(query, { retailerId: this.config.storeId });
            
            if (result.errors) {
                const errorCode = result.errors[0]?.extensions?.code;
                
                // If authentication fails, provide helpful error
                if (errorCode === 'UNAUTHENTICATED') {
                    throw new Error(
                        'Dutchie authentication failed. The provided credentials may be for Order Ahead API. ' +
                        'Please contact Dutchie support to obtain Plus API credentials for this store.'
                    );
                }
                
                throw new Error(result.errors[0]?.message || 'GraphQL error');
            }

            const products = result.data?.menu?.products || [];
            logger.info(`[POS_DUTCHIE] Fetched ${products.length} products via Plus API`);
            return this.mapProducts(products);

        } catch (error: any) {
            logger.error('[POS_DUTCHIE] Menu fetch failed:', error.message);
            throw new Error(`Dutchie menu fetch failed: ${error.message}`);
        }
    }

    private mapProducts(products: any[]): POSProduct[] {
        return products.map((p: any) => {
            const variant = p.variants?.[0] || {};
            return {
                externalId: p.id,
                name: p.name,
                brand: p.brand?.name || 'Unknown',
                category: p.category || 'Other',
                price: variant.price || 0,
                stock: variant.quantity || 0,
                thcPercent: p.potencyThc?.formatted ? parseFloat(p.potencyThc.formatted) : undefined,
                cbdPercent: p.potencyCbd?.formatted ? parseFloat(p.potencyCbd.formatted) : undefined,
                imageUrl: p.image,
                rawData: p
            };
        });
    }

    async getInventory(externalIds: string[]): Promise<Record<string, number>> {
        const products = await this.fetchMenu();
        const stock: Record<string, number> = {};
        products.forEach(p => {
            if (externalIds.includes(p.externalId)) {
                stock[p.externalId] = p.stock;
            }
        });
        return stock;
    }

    /**
     * Get configuration info for debugging
     */
    getConfigInfo(): Record<string, any> {
        return {
            storeId: this.config.storeId,
            hasApiKey: !!this.config.apiKey,
            hasClientId: !!this.config.clientId,
            hasOrderAheadCreds: !!(this.config.orderAheadClientId && this.config.orderAheadClientToken),
            authMethod: this.config.authMethod || 'bearer',
            environment: this.config.environment || 'production'
        };
    }
}
