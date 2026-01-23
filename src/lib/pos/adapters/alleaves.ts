import type { POSClient, POSConfig, POSProduct } from '../types';
import { logger } from '@/lib/logger';

/**
 * ALLeaves POS Adapter
 *
 * ALLeaves is a cannabis POS system used by dispensaries.
 * This adapter integrates with their API for menu sync, inventory, and orders.
 *
 * API Documentation: https://alleaves.com/api/docs (requires partner access)
 */

const ALLEAVES_API_BASE = 'https://api.alleaves.com/v1';

export interface ALLeavesConfig extends POSConfig {
    apiKey: string;           // ALLeaves API key
    locationId: string;       // ALLeaves location ID (maps to storeId)
    partnerId?: string;       // Partner ID for multi-location setups
    webhookSecret?: string;   // Secret for validating webhooks
}

export interface ALLeavesProduct {
    id: string;
    sku: string;
    name: string;
    brand: string;
    category: string;
    subcategory?: string;
    price: number;
    quantity: number;
    unit: string;
    thc_percentage?: number;
    cbd_percentage?: number;
    strain_type?: 'indica' | 'sativa' | 'hybrid';
    image_url?: string;
    description?: string;
    effects?: string[];
    terpenes?: Array<{ name: string; percentage: number }>;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ALLeavesOrder {
    id: string;
    external_id?: string;
    customer: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone?: string;
    };
    items: Array<{
        product_id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        total: number;
    }>;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';
    payment_method: 'cash' | 'debit' | 'credit';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ALLeavesCustomer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    date_of_birth?: string;
    loyalty_points?: number;
    total_spent?: number;
    order_count?: number;
    last_order_date?: string;
    created_at: string;
}

export class ALLeavesClient implements POSClient {
    private config: ALLeavesConfig;

    constructor(config: ALLeavesConfig) {
        this.config = {
            ...config,
            locationId: config.locationId || config.storeId,
        };
    }

    /**
     * Build authorization headers for ALLeaves API
     */
    private getAuthHeaders(): Record<string, string> {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Location-ID': this.config.locationId,
            ...(this.config.partnerId && { 'X-Partner-ID': this.config.partnerId }),
        };
    }

    /**
     * Make authenticated request to ALLeaves API
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${ALLEAVES_API_BASE}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...(options.headers || {}),
            },
        });

        if (!response.ok) {
            const text = await response.text();
            let errorMessage = `ALLeaves API error: ${response.status}`;

            try {
                const errorJson = JSON.parse(text);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch {
                errorMessage = `${errorMessage} - ${text}`;
            }

            throw new Error(errorMessage);
        }

        return response.json();
    }

    /**
     * Validate connection to ALLeaves API
     */
    async validateConnection(): Promise<boolean> {
        logger.info('[POS_ALLEAVES] Validating connection', {
            locationId: this.config.locationId,
            hasApiKey: !!this.config.apiKey,
        });

        try {
            // Try to fetch location info to validate credentials
            const result = await this.request<{ location: { id: string; name: string } }>(
                `/locations/${this.config.locationId}`
            );

            if (result.location?.id) {
                logger.info('[POS_ALLEAVES] Connection validated', {
                    locationId: result.location.id,
                    locationName: result.location.name,
                });
                return true;
            }

            return false;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[POS_ALLEAVES] Connection validation failed', { error: errorMessage });
            return false;
        }
    }

    /**
     * Fetch full menu from ALLeaves
     */
    async fetchMenu(): Promise<POSProduct[]> {
        logger.info('[POS_ALLEAVES] Fetching menu', { locationId: this.config.locationId });

        try {
            const result = await this.request<{ products: ALLeavesProduct[]; total: number }>(
                `/locations/${this.config.locationId}/products?limit=1000&active=true`
            );

            const products = result.products || [];
            logger.info(`[POS_ALLEAVES] Fetched ${products.length} products`);

            return this.mapProducts(products);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[POS_ALLEAVES] Menu fetch failed', { error: errorMessage });
            throw new Error(`ALLeaves menu fetch failed: ${errorMessage}`);
        }
    }

    /**
     * Map ALLeaves products to standard POS format
     */
    private mapProducts(products: ALLeavesProduct[]): POSProduct[] {
        return products.map((p) => ({
            externalId: p.id,
            name: p.name,
            brand: p.brand || 'Unknown',
            category: p.category || 'Other',
            price: p.price,
            stock: p.quantity,
            thcPercent: p.thc_percentage,
            cbdPercent: p.cbd_percentage,
            imageUrl: p.image_url,
            rawData: p,
        }));
    }

    /**
     * Get inventory levels for specific products
     */
    async getInventory(externalIds: string[]): Promise<Record<string, number>> {
        logger.info('[POS_ALLEAVES] Fetching inventory', {
            locationId: this.config.locationId,
            productCount: externalIds.length,
        });

        try {
            const result = await this.request<{ inventory: Array<{ product_id: string; quantity: number }> }>(
                `/locations/${this.config.locationId}/inventory`,
                {
                    method: 'POST',
                    body: JSON.stringify({ product_ids: externalIds }),
                }
            );

            const inventory: Record<string, number> = {};
            for (const item of result.inventory || []) {
                inventory[item.product_id] = item.quantity;
            }

            return inventory;
        } catch (error: unknown) {
            // Fallback: fetch full menu and filter
            logger.warn('[POS_ALLEAVES] Inventory endpoint failed, falling back to menu fetch');
            const products = await this.fetchMenu();
            const stock: Record<string, number> = {};
            for (const p of products) {
                if (externalIds.includes(p.externalId)) {
                    stock[p.externalId] = p.stock;
                }
            }
            return stock;
        }
    }

    /**
     * Create a customer in ALLeaves (for syncing BakedBot customers)
     */
    async createCustomer(customer: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
        dateOfBirth?: string;
    }): Promise<ALLeavesCustomer> {
        logger.info('[POS_ALLEAVES] Creating customer', { email: customer.email });

        const result = await this.request<{ customer: ALLeavesCustomer }>(
            `/locations/${this.config.locationId}/customers`,
            {
                method: 'POST',
                body: JSON.stringify({
                    first_name: customer.firstName,
                    last_name: customer.lastName,
                    email: customer.email,
                    phone: customer.phone,
                    date_of_birth: customer.dateOfBirth,
                }),
            }
        );

        return result.customer;
    }

    /**
     * Look up customer by email
     */
    async findCustomerByEmail(email: string): Promise<ALLeavesCustomer | null> {
        try {
            const result = await this.request<{ customers: ALLeavesCustomer[] }>(
                `/locations/${this.config.locationId}/customers?email=${encodeURIComponent(email)}`
            );

            return result.customers?.[0] || null;
        } catch {
            return null;
        }
    }

    /**
     * Create an order in ALLeaves POS
     */
    async createOrder(order: {
        customerId: string;
        items: Array<{
            productId: string;
            quantity: number;
            unitPrice: number;
        }>;
        notes?: string;
    }): Promise<ALLeavesOrder> {
        logger.info('[POS_ALLEAVES] Creating order', {
            customerId: order.customerId,
            itemCount: order.items.length,
        });

        const result = await this.request<{ order: ALLeavesOrder }>(
            `/locations/${this.config.locationId}/orders`,
            {
                method: 'POST',
                body: JSON.stringify({
                    customer_id: order.customerId,
                    items: order.items.map(item => ({
                        product_id: item.productId,
                        quantity: item.quantity,
                        unit_price: item.unitPrice,
                    })),
                    notes: order.notes,
                    source: 'bakedbot',
                }),
            }
        );

        return result.order;
    }

    /**
     * Get orders for a customer
     */
    async getCustomerOrders(customerId: string): Promise<ALLeavesOrder[]> {
        const result = await this.request<{ orders: ALLeavesOrder[] }>(
            `/locations/${this.config.locationId}/customers/${customerId}/orders`
        );

        return result.orders || [];
    }

    /**
     * Sync customer from BakedBot to ALLeaves
     * Creates if doesn't exist, returns existing if found
     */
    async syncCustomer(customer: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string;
    }): Promise<ALLeavesCustomer> {
        // Check if customer exists
        const existing = await this.findCustomerByEmail(customer.email);
        if (existing) {
            return existing;
        }

        // Create new customer
        return this.createCustomer(customer);
    }

    /**
     * Get configuration info for debugging
     */
    getConfigInfo(): Record<string, unknown> {
        return {
            locationId: this.config.locationId,
            storeId: this.config.storeId,
            hasApiKey: !!this.config.apiKey,
            hasPartnerId: !!this.config.partnerId,
            hasWebhookSecret: !!this.config.webhookSecret,
            environment: this.config.environment || 'production',
        };
    }
}
