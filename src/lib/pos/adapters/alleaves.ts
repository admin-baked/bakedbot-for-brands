import type { POSClient, POSConfig, POSProduct } from '../types';
import { logger } from '@/lib/logger';
import { getPlaceholderImageForCategory } from '@/lib/product-images';

/**
 * ALLeaves POS Adapter with JWT Authentication
 *
 * ALLeaves is a cannabis POS system used by dispensaries.
 * This adapter integrates with their API for menu sync, inventory, and orders.
 *
 * Authentication: JWT-based (login with username/password/pin)
 * API Base: https://app.alleaves.com/api
 * Login Endpoint: POST /api/auth
 */

const ALLEAVES_API_BASE = 'https://app.alleaves.com/api';

export interface ALLeavesConfig extends POSConfig {
    // JWT Authentication credentials
    username: string;         // ALLeaves username (email)
    password: string;         // ALLeaves password
    pin?: string;             // ALLeaves PIN (may be required)
    locationId: string;       // ALLeaves location ID (maps to storeId)
    partnerId?: string;       // Partner ID for multi-location setups
    webhookSecret?: string;   // Secret for validating webhooks
}

interface ALLeavesAuthResponse {
    id_user: number;
    name_first: string;
    name_last: string;
    username: string;
    id_company: number;
    company: string;
    token: string;            // JWT token
}

/**
 * ALLeaves Inventory Item (from POST /inventory/search)
 * This is the actual structure returned by the Alleaves API
 */
export interface ALLeavesInventoryItem {
    id_item: number;
    id_batch: number;
    id_item_group: number;
    id_location: number;
    item: string;                    // Product name
    sku: string;
    brand: string;
    category: string;                // Format: "Category > Subcategory" (e.g., "Category > Flower")
    price_retail: number;            // Retail price before tax
    price_retail_adult_use?: number; // Adult-use retail price
    price_retail_medical_use?: number; // Medical retail price
    price_otd: number;               // Out-the-door price (with tax)
    price_otd_adult_use?: number;    // Adult-use OTD price (with tax)
    price_otd_medical_use?: number;  // Medical OTD price (with tax)
    on_hand: number;                 // Total quantity on hand
    available: number;               // Available quantity for sale
    thc: number;                     // THC percentage
    cbd: number;                     // CBD percentage
    strain: string;
    uom: string;                     // Unit of measure
    is_adult_use: boolean;
    is_medical_use?: boolean;
    is_cannabis: boolean;
    cost_of_good?: number;           // Item cost of goods sold
    batch_cost_of_good?: number;     // Batch cost of goods sold
}

/**
 * Legacy interface for backwards compatibility
 * @deprecated Use ALLeavesInventoryItem for actual API responses
 */
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
    private token: string | null = null;
    private tokenExpiry: number | null = null;

    constructor(config: ALLeavesConfig) {
        this.config = {
            ...config,
            locationId: config.locationId || config.storeId,
        };
    }

    /**
     * Authenticate with Alleaves API and get JWT token
     */
    private async authenticate(): Promise<string> {
        // Return cached token if still valid (with 5 min buffer)
        if (this.token && this.tokenExpiry && Date.now() < (this.tokenExpiry - 5 * 60 * 1000)) {
            logger.debug('[POS_ALLEAVES] Using cached token');
            return this.token;
        }

        logger.info('[POS_ALLEAVES] Authenticating with Alleaves API', {
            username: this.config.username,
            hasPin: !!this.config.pin,
        });

        const response = await fetch(`${ALLEAVES_API_BASE}/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: this.config.username,
                password: this.config.password,
                pin: this.config.pin,
            }),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Alleaves authentication failed: ${response.status} - ${text}`);
        }

        const data: ALLeavesAuthResponse = await response.json();

        if (!data.token) {
            throw new Error('No token received from Alleaves auth endpoint');
        }

        // Store token and decode expiry from JWT
        this.token = data.token;

        // Decode JWT to get expiry (without full JWT library)
        try {
            const payload = JSON.parse(Buffer.from(data.token.split('.')[1], 'base64').toString());
            this.tokenExpiry = payload.exp * 1000; // Convert to milliseconds
            logger.info('[POS_ALLEAVES] Authentication successful', {
                userId: data.id_user,
                company: data.company,
                expiresAt: new Date(this.tokenExpiry).toISOString(),
            });
        } catch (error) {
            // If we can't decode, assume 24 hour expiry
            this.tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
            logger.warn('[POS_ALLEAVES] Could not decode JWT expiry, using 24h default');
        }

        return this.token;
    }

    /**
     * Build authorization headers for ALLeaves API with JWT token
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const token = await this.authenticate();

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

        // Add optional headers
        if (this.config.partnerId) {
            headers['X-Partner-ID'] = this.config.partnerId;
        }

        return headers;
    }

    /**
     * Make authenticated request to ALLeaves API
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${ALLEAVES_API_BASE}${endpoint}`;
        const headers = await this.getAuthHeaders();

        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
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
                errorMessage = `${errorMessage} - ${text.substring(0, 200)}`;
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
            username: this.config.username,
        });

        try {
            // Try to fetch location info to validate credentials
            const locations = await this.request<Array<{ id_location: number; reference: string; active: boolean }>>(
                `/location`
            );

            const location = locations.find(loc => loc.id_location.toString() === this.config.locationId);

            if (location) {
                logger.info('[POS_ALLEAVES] Connection validated', {
                    locationId: location.id_location,
                    reference: location.reference,
                    active: location.active,
                });
                return true;
            }

            logger.warn('[POS_ALLEAVES] Location not found in user locations', {
                requestedLocationId: this.config.locationId,
                availableLocations: locations.map(l => l.id_location),
            });
            return false;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[POS_ALLEAVES] Connection validation failed', { error: errorMessage });
            return false;
        }
    }

    /**
     * Fetch full menu from ALLeaves
     * Uses POST /inventory/search with empty query to get all items
     */
    async fetchMenu(): Promise<POSProduct[]> {
        logger.info('[POS_ALLEAVES] Fetching menu', { locationId: this.config.locationId });

        try {
            // Use inventory search endpoint with empty query to get all items
            const items = await this.request<ALLeavesInventoryItem[]>(
                `/inventory/search`,
                {
                    method: 'POST',
                    body: JSON.stringify({ query: '' }),
                }
            );

            logger.info(`[POS_ALLEAVES] Fetched ${items.length} inventory items`);

            return this.mapInventoryItems(items);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[POS_ALLEAVES] Menu fetch failed', { error: errorMessage });
            throw new Error(`ALLeaves menu fetch failed: ${errorMessage}`);
        }
    }

    /**
     * Map ALLeaves inventory items to standard POS format
     */
    private mapInventoryItems(items: ALLeavesInventoryItem[]): POSProduct[] {
        return items.map((item) => {
            // Strip "Category > " prefix from category if present
            let category = item.category || 'Other';
            if (category.startsWith('Category > ')) {
                category = category.replace('Category > ', '');
            }

            // Calculate retail price with fallback strategy
            // Check all price fields: OTD prices first (includes tax), then retail
            let price = item.price_otd_adult_use
                || item.price_otd_medical_use
                || item.price_otd
                || item.price_retail_adult_use
                || item.price_retail_medical_use
                || item.price_retail;

            // If no retail price, apply category-based markup to cost
            if (price === 0 && item.cost_of_good && item.cost_of_good > 0) {
                const categoryLower = category.toLowerCase();
                let markup = 2.2; // Default 120% markup

                // Category-specific markups (industry standard)
                if (categoryLower.includes('flower')) markup = 2.2;
                else if (categoryLower.includes('vape') || categoryLower.includes('concentrate')) markup = 2.0;
                else if (categoryLower.includes('edible')) markup = 2.3;
                else if (categoryLower.includes('pre roll')) markup = 2.1;
                else if (categoryLower.includes('beverage')) markup = 2.4;
                else if (categoryLower.includes('tincture') || categoryLower.includes('topical')) markup = 2.3;

                price = Math.round(item.cost_of_good * markup * 100) / 100; // Round to cents
            }

            return {
                externalId: item.id_item.toString(),
                name: item.item,
                brand: item.brand || 'Unknown',
                category,
                price,                                       // Use retail price or calculated from cost
                stock: item.available,                       // Use available (not on_hand) for accurate stock
                thcPercent: item.thc || undefined,
                cbdPercent: item.cbd || undefined,
                imageUrl: getPlaceholderImageForCategory(category), // Use category-based placeholder
                rawData: item,
            };
        });
    }

    /**
     * Map ALLeaves products to standard POS format (legacy)
     * @deprecated Use mapInventoryItems for actual API data
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
     * Get all customers with pagination support
     *
     * @param page - Page number (1-based)
     * @param pageSize - Number of customers per page (default: 100)
     * @returns Array of customers with full profile data
     */
    async getAllCustomers(page: number = 1, pageSize: number = 100): Promise<any[]> {
        const data = await this.request<any>('/customer/search', {
            method: 'POST',
            body: JSON.stringify({ page, pageSize }),
        });

        // Debug: Log response structure on first page
        if (page === 1) {
            logger.debug('[ALLEAVES] Customer API response', {
                keys: Object.keys(data),
                hasCustomers: !!data.customers,
                hasData: !!data.data,
                hasMeta: !!data.meta,
                hasPagination: !!data.pagination,
                customersCount: data.customers?.length,
            });
        }

        return data.customers || data.data || data || [];
    }

    /**
     * Get all customers across all pages
     *
     * @param maxPages - Maximum number of pages to fetch (default: 100)
     * @returns Array of all customers
     */
    async getAllCustomersPaginated(maxPages: number = 100): Promise<any[]> {
        const allCustomers: any[] = [];
        const pageSize = 100;

        for (let page = 1; page <= maxPages; page++) {
            const customers = await this.getAllCustomers(page, pageSize);

            logger.debug('[ALLEAVES] Fetched customers page', { page, count: customers?.length || 0 });

            if (!customers || customers.length === 0) {
                logger.info('[ALLEAVES] No more customers, stopping pagination', { page });
                break; // No more customers
            }

            allCustomers.push(...customers);

            if (customers.length < pageSize) {
                logger.info('[ALLEAVES] Last page of customers', { page, count: customers.length, pageSize });
                break; // Last page
            }
        }

        logger.info('[ALLEAVES] Total customers fetched', {
            totalCustomers: allCustomers.length,
            pages: Math.ceil(allCustomers.length / pageSize)
        });
        return allCustomers;
    }

    /**
     * Get orders with pagination
     *
     * @param maxOrders - Maximum number of orders to fetch (default: 100)
     * @returns Array of orders with full details
     */
    async getAllOrders(maxOrders: number = 100): Promise<any[]> {
        const pageSize = 100; // Alleaves API page size
        const maxPages = Math.ceil(maxOrders / pageSize);
        const allOrders: any[] = [];

        for (let page = 1; page <= maxPages; page++) {
            // Use GET with query parameters - add date range to get ALL orders
            // Set start date far in the past to ensure we get all historical orders
            const startDate = '2020-01-01'; // Get orders from 2020 onwards
            const endDate = new Date().toISOString().split('T')[0]; // Today

            const data = await this.request<any>(
                `/order?page=${page}&pageSize=${pageSize}&startDate=${startDate}&endDate=${endDate}`,
                {
                    method: 'GET',
                }
            );

            // Response is a direct array, not wrapped in { orders: [] }
            const orders = Array.isArray(data) ? data : (data.orders || data.data || []);

            if (orders.length > 0) {
                allOrders.push(...orders);

                // Stop if we got fewer than pageSize (last page)
                if (orders.length < pageSize) {
                    logger.info('[ALLEAVES] Reached last page', { page, orderCount: orders.length });
                    break;
                }
            } else {
                logger.info('[ALLEAVES] No orders on page, stopping pagination', { page });
                break;
            }

            // Stop if we've reached the desired limit
            if (allOrders.length >= maxOrders) {
                break;
            }
        }

        logger.info('[ALLEAVES] Total orders fetched', {
            totalOrders: allOrders.length,
            pages: Math.ceil(allOrders.length / pageSize)
        });
        return allOrders.slice(0, maxOrders);
    }

    /**
     * Calculate customer spending from orders
     * Aggregates order data to get total spent and order count per customer
     *
     * @returns Map of customer ID to { totalSpent, orderCount, lastOrderDate, firstOrderDate }
     */
    async getCustomerSpending(): Promise<Map<number, { totalSpent: number; orderCount: number; lastOrderDate: Date; firstOrderDate: Date }>> {
        logger.info('[ALLEAVES] Fetching all orders to calculate customer spending');

        const orders = await this.getAllOrders(100000); // Get up to 100k orders for complete history
        logger.info('[ALLEAVES] Analyzing orders for customer spending', { orderCount: orders.length });

        const customerSpending = new Map<number, { totalSpent: number; orderCount: number; lastOrderDate: Date; firstOrderDate: Date }>();

        orders.forEach((order: any) => {
            const customerId = order.id_customer;
            const total = parseFloat(order.total || 0);
            const orderDate = order.date_created ? new Date(order.date_created) : new Date();

            if (!customerId || customerId <= 0) return; // Skip invalid customer IDs

            const existing = customerSpending.get(customerId);

            if (existing) {
                existing.totalSpent += total;
                existing.orderCount += 1;
                if (orderDate > existing.lastOrderDate) {
                    existing.lastOrderDate = orderDate;
                }
                if (orderDate < existing.firstOrderDate) {
                    existing.firstOrderDate = orderDate;
                }
            } else {
                customerSpending.set(customerId, {
                    totalSpent: total,
                    orderCount: 1,
                    lastOrderDate: orderDate,
                    firstOrderDate: orderDate,
                });
            }
        });

        logger.info('[ALLEAVES] Calculated spending for customers', { customerCount: customerSpending.size });
        return customerSpending;
    }

    /**
     * Get configuration info for debugging
     */
    getConfigInfo(): Record<string, unknown> {
        return {
            locationId: this.config.locationId,
            storeId: this.config.storeId,
            authMethod: 'jwt',
            hasUsername: !!this.config.username,
            hasPassword: !!this.config.password,
            hasPin: !!this.config.pin,
            hasToken: !!this.token,
            tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
            hasPartnerId: !!this.config.partnerId,
            hasWebhookSecret: !!this.config.webhookSecret,
            environment: this.config.environment || 'production',
        };
    }
}
