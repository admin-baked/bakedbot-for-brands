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
    expiration_date?: string;        // Batch expiration date (ISO string)
    package_date?: string;           // Package/harvest date
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

/**
 * ALLeaves Discount Rule (from GET /api/discount)
 * Represents active promotions and discounts configured in the POS
 */
export interface ALLeavesDiscount {
    id_discount: number;
    name: string;
    description?: string;
    discount_type: 'percent' | 'amount' | 'fixed_price' | 'bogo';
    discount_value: number;           // Percentage (0-100) or dollar amount
    start_date?: string;              // ISO date string
    end_date?: string;                // ISO date string
    active: boolean;

    // Conditions for when discount applies
    conditions?: {
        categories?: string[];        // Category names or IDs
        brands?: string[];            // Brand names
        products?: number[];          // Specific product IDs (id_item)
        min_qty?: number;             // Minimum quantity required
        min_total?: number;           // Minimum cart total
        customer_types?: ('adult_use' | 'medical')[];
    };

    // Display configuration
    badge_text?: string;              // e.g., "20% OFF", "BOGO"
    priority?: number;                // Higher = applied first
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

            // Parse expiration date if available
            let expirationDate: Date | undefined;
            if (item.expiration_date) {
                const parsed = new Date(item.expiration_date);
                if (!isNaN(parsed.getTime())) {
                    expirationDate = parsed;
                }
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
                expirationDate,                              // Batch expiration for clearance bundles
                rawData: item as unknown as Record<string, unknown>,
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
            rawData: p as unknown as Record<string, unknown>,
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

    // ============ Discount & Promotion Methods ============

    /**
     * Fetch all active discounts from Alleaves
     * Powers "On Sale" badges and dynamic pricing
     *
     * @returns Array of active discount rules
     */
    async getDiscounts(): Promise<ALLeavesDiscount[]> {
        logger.info('[POS_ALLEAVES] Fetching discounts');

        try {
            const discounts = await this.request<ALLeavesDiscount[]>('/discount');

            // Filter to only active discounts
            const activeDiscounts = discounts.filter(d => {
                if (!d.active) return false;

                // Check date range if specified
                const now = new Date();
                if (d.start_date && new Date(d.start_date) > now) return false;
                if (d.end_date && new Date(d.end_date) < now) return false;

                return true;
            });

            logger.info('[POS_ALLEAVES] Fetched discounts', {
                total: discounts.length,
                active: activeDiscounts.length,
            });

            return activeDiscounts;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Discount fetch failed (may not be supported)', { error: errorMessage });
            return [];
        }
    }

    /**
     * Fetch menu with discounts applied
     * Returns products with sale pricing and badges
     */
    async fetchMenuWithDiscounts(): Promise<POSProduct[]> {
        logger.info('[POS_ALLEAVES] Fetching menu with discounts');

        // Fetch products and discounts in parallel
        const [products, discounts] = await Promise.all([
            this.fetchMenu(),
            this.getDiscounts(),
        ]);

        if (discounts.length === 0) {
            return products;
        }

        // Build discount lookup maps for efficient matching
        const productDiscounts = new Map<string, ALLeavesDiscount>();
        const categoryDiscounts = new Map<string, ALLeavesDiscount>();
        const brandDiscounts = new Map<string, ALLeavesDiscount>();

        // Sort by priority (higher first) so we apply best discount
        const sortedDiscounts = [...discounts].sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const discount of sortedDiscounts) {
            // Product-specific discounts
            if (discount.conditions?.products) {
                for (const productId of discount.conditions.products) {
                    const key = productId.toString();
                    if (!productDiscounts.has(key)) {
                        productDiscounts.set(key, discount);
                    }
                }
            }

            // Category discounts
            if (discount.conditions?.categories) {
                for (const category of discount.conditions.categories) {
                    const key = category.toLowerCase();
                    if (!categoryDiscounts.has(key)) {
                        categoryDiscounts.set(key, discount);
                    }
                }
            }

            // Brand discounts
            if (discount.conditions?.brands) {
                for (const brand of discount.conditions.brands) {
                    const key = brand.toLowerCase();
                    if (!brandDiscounts.has(key)) {
                        brandDiscounts.set(key, discount);
                    }
                }
            }
        }

        // Apply discounts to products
        return products.map(product => {
            // Find applicable discount (product > category > brand priority)
            const discount =
                productDiscounts.get(product.externalId) ||
                categoryDiscounts.get(product.category.toLowerCase()) ||
                brandDiscounts.get(product.brand.toLowerCase());

            if (!discount) {
                return product;
            }

            // Calculate sale price
            let salePrice = product.price;
            if (discount.discount_type === 'percent') {
                salePrice = product.price * (1 - discount.discount_value / 100);
            } else if (discount.discount_type === 'amount') {
                salePrice = Math.max(0, product.price - discount.discount_value);
            } else if (discount.discount_type === 'fixed_price') {
                salePrice = discount.discount_value;
            }

            // Round to cents
            salePrice = Math.round(salePrice * 100) / 100;

            // Generate badge text if not provided
            const saleBadgeText = discount.badge_text ||
                (discount.discount_type === 'percent' ? `${discount.discount_value}% OFF` :
                 discount.discount_type === 'bogo' ? 'BOGO' :
                 `$${discount.discount_value} OFF`);

            return {
                ...product,
                isOnSale: true,
                originalPrice: product.price,
                salePrice,
                saleBadgeText,
                discountId: discount.id_discount.toString(),
                discountName: discount.name,
            };
        });
    }

    /**
     * Get batch details for expiration tracking
     * More reliable expiration data than inventory/search
     *
     * @param batchId - Alleaves batch ID
     * @returns Batch details with expiration dates
     */
    async getBatchDetails(batchId: number): Promise<{
        id_batch: number;
        date_expire?: string;
        date_production?: string;
        date_harvest?: string;
        quantity: number;
    } | null> {
        try {
            const batch = await this.request<{
                id_batch: number;
                date_expire?: string;
                date_production?: string;
                date_harvest?: string;
                quantity: number;
            }>(`/inventory/batch/${batchId}`);

            return batch;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Batch fetch failed', { batchId, error: errorMessage });
            return null;
        }
    }

    /**
     * Search batches for expiration data
     * Used for clearance bundle generation
     *
     * @param query - Search parameters
     * @returns Array of batches with expiration info
     */
    async searchBatches(query: {
        expiringWithinDays?: number;
        categories?: string[];
        minQuantity?: number;
    } = {}): Promise<Array<{
        id_batch: number;
        id_item: number;
        item_name: string;
        date_expire?: string;
        quantity: number;
        days_until_expiry?: number;
    }>> {
        try {
            const batches = await this.request<Array<{
                id_batch: number;
                id_item: number;
                item: string;
                date_expire?: string;
                on_hand: number;
            }>>('/inventory/batch/search', {
                method: 'POST',
                body: JSON.stringify(query),
            });

            const now = new Date();
            return batches
                .filter(b => {
                    if (query.minQuantity && b.on_hand < query.minQuantity) return false;
                    return true;
                })
                .map(b => {
                    let daysUntilExpiry: number | undefined;
                    if (b.date_expire) {
                        const expiry = new Date(b.date_expire);
                        daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    }

                    return {
                        id_batch: b.id_batch,
                        id_item: b.id_item,
                        item_name: b.item,
                        date_expire: b.date_expire,
                        quantity: b.on_hand,
                        days_until_expiry: daysUntilExpiry,
                    };
                })
                .filter(b => {
                    if (query.expiringWithinDays && b.days_until_expiry !== undefined) {
                        return b.days_until_expiry <= query.expiringWithinDays && b.days_until_expiry > 0;
                    }
                    return true;
                });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Batch search failed', { error: errorMessage });
            return [];
        }
    }

    // ============ Two-Way Sync Methods ============

    /**
     * Apply a discount to an existing order
     * Uses POST /api/order/{id_order}/discount
     *
     * @param orderId - Alleaves order ID
     * @param discountId - Discount rule ID to apply
     * @returns Updated order with discount applied
     */
    async applyOrderDiscount(orderId: number, discountId: number): Promise<{
        success: boolean;
        order?: ALLeavesOrder;
        error?: string;
    }> {
        logger.info('[POS_ALLEAVES] Applying discount to order', { orderId, discountId });

        try {
            const result = await this.request<{ order: ALLeavesOrder }>(
                `/order/${orderId}/discount`,
                {
                    method: 'POST',
                    body: JSON.stringify({ id_discount: discountId }),
                }
            );

            logger.info('[POS_ALLEAVES] Discount applied successfully', {
                orderId,
                discountId,
                newTotal: result.order?.total,
            });

            return { success: true, order: result.order };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error('[POS_ALLEAVES] Failed to apply order discount', { orderId, discountId, error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Create a new discount rule in Alleaves
     * Note: This may require elevated permissions in Alleaves
     *
     * @param discount - Discount configuration
     * @returns Created discount with ID
     */
    async createDiscount(discount: {
        name: string;
        discount_type: 'percent' | 'amount' | 'fixed_price' | 'bogo';
        discount_value: number;
        start_date?: string;
        end_date?: string;
        conditions?: {
            categories?: string[];
            brands?: string[];
            products?: number[];
            min_qty?: number;
        };
        badge_text?: string;
    }): Promise<{
        success: boolean;
        discount?: ALLeavesDiscount;
        error?: string;
    }> {
        logger.info('[POS_ALLEAVES] Creating discount', { name: discount.name });

        try {
            const result = await this.request<{ discount: ALLeavesDiscount }>(
                '/discount',
                {
                    method: 'POST',
                    body: JSON.stringify({
                        ...discount,
                        active: true,
                    }),
                }
            );

            logger.info('[POS_ALLEAVES] Discount created', {
                id: result.discount?.id_discount,
                name: result.discount?.name,
            });

            return { success: true, discount: result.discount };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Failed to create discount (may not be supported)', {
                name: discount.name,
                error: errorMessage,
            });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Update an existing discount rule
     * Note: This may require elevated permissions
     *
     * @param discountId - Discount ID to update
     * @param updates - Fields to update
     */
    async updateDiscount(
        discountId: number,
        updates: Partial<{
            name: string;
            discount_value: number;
            start_date: string;
            end_date: string;
            active: boolean;
            badge_text: string;
        }>
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        logger.info('[POS_ALLEAVES] Updating discount', { discountId, updates });

        try {
            await this.request<{ success: boolean }>(
                `/discount/${discountId}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(updates),
                }
            );

            logger.info('[POS_ALLEAVES] Discount updated', { discountId });
            return { success: true };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Failed to update discount', { discountId, error: errorMessage });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Deactivate a discount rule
     *
     * @param discountId - Discount ID to deactivate
     */
    async deactivateDiscount(discountId: number): Promise<{
        success: boolean;
        error?: string;
    }> {
        return this.updateDiscount(discountId, { active: false });
    }

    /**
     * Update customer loyalty points
     * Note: Alleaves uses SpringBig for loyalty - this may require their API
     *
     * @param customerId - Customer ID
     * @param points - Points to add (positive) or subtract (negative)
     */
    async updateLoyaltyPoints(
        customerId: string,
        points: number,
        reason?: string
    ): Promise<{
        success: boolean;
        newBalance?: number;
        error?: string;
    }> {
        logger.info('[POS_ALLEAVES] Updating loyalty points', { customerId, points, reason });

        try {
            // Alleaves customer object has springbig_user_code and credit_balance
            // Loyalty is typically managed through SpringBig integration
            const result = await this.request<{ customer: { loyalty_points: number } }>(
                `/customer/${customerId}/loyalty`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        points_change: points,
                        reason: reason || 'BakedBot adjustment',
                    }),
                }
            );

            return {
                success: true,
                newBalance: result.customer?.loyalty_points,
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Loyalty update failed (may use SpringBig)', {
                customerId,
                error: errorMessage,
            });
            return {
                success: false,
                error: `Loyalty management may require SpringBig integration: ${errorMessage}`,
            };
        }
    }

    /**
     * Add store credit to customer account
     *
     * @param customerId - Customer ID
     * @param amount - Credit amount to add
     * @param reason - Reason for credit
     */
    async addStoreCredit(
        customerId: string,
        amount: number,
        reason?: string
    ): Promise<{
        success: boolean;
        newBalance?: number;
        error?: string;
    }> {
        logger.info('[POS_ALLEAVES] Adding store credit', { customerId, amount, reason });

        try {
            const result = await this.request<{ customer: { credit_balance: number } }>(
                `/customer/${customerId}/credit`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        amount,
                        reason: reason || 'BakedBot credit',
                    }),
                }
            );

            return {
                success: true,
                newBalance: result.customer?.credit_balance,
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Store credit update failed', {
                customerId,
                error: errorMessage,
            });
            return { success: false, error: errorMessage };
        }
    }

    // ============ Metadata Endpoints (Phase 3) ============

    /**
     * Get all brands from Alleaves inventory
     * Used for building filter UIs
     *
     * @returns Array of brand names with product counts
     */
    async getBrands(): Promise<Array<{
        id: string;
        name: string;
        productCount?: number;
    }>> {
        logger.info('[POS_ALLEAVES] Fetching brands');

        try {
            const brands = await this.request<Array<{
                id_brand?: number;
                brand?: string;
                name?: string;
            }>>('/inventory/brand');

            return brands.map(b => ({
                id: b.id_brand?.toString() || b.brand || b.name || 'unknown',
                name: b.brand || b.name || 'Unknown',
            }));
        } catch (error: unknown) {
            // Fallback: Parse brands from menu
            logger.warn('[POS_ALLEAVES] Brand endpoint failed, falling back to menu parse');
            const products = await this.fetchMenu();

            const brandMap = new Map<string, number>();
            for (const p of products) {
                const count = brandMap.get(p.brand) || 0;
                brandMap.set(p.brand, count + 1);
            }

            return Array.from(brandMap.entries())
                .map(([name, productCount]) => ({
                    id: name.toLowerCase().replace(/\s+/g, '_'),
                    name,
                    productCount,
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    /**
     * Get all categories from Alleaves inventory
     * Used for building filter UIs
     *
     * @returns Array of category names with product counts
     */
    async getCategories(): Promise<Array<{
        id: string;
        name: string;
        productCount?: number;
    }>> {
        logger.info('[POS_ALLEAVES] Fetching categories');

        try {
            const categories = await this.request<Array<{
                id_category?: number;
                category?: string;
                name?: string;
            }>>('/inventory/category');

            return categories.map(c => ({
                id: c.id_category?.toString() || c.category || c.name || 'unknown',
                name: c.category || c.name || 'Unknown',
            }));
        } catch (error: unknown) {
            // Fallback: Parse categories from menu
            logger.warn('[POS_ALLEAVES] Category endpoint failed, falling back to menu parse');
            const products = await this.fetchMenu();

            const categoryMap = new Map<string, number>();
            for (const p of products) {
                const count = categoryMap.get(p.category) || 0;
                categoryMap.set(p.category, count + 1);
            }

            return Array.from(categoryMap.entries())
                .map(([name, productCount]) => ({
                    id: name.toLowerCase().replace(/\s+/g, '_'),
                    name,
                    productCount,
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    /**
     * Get all vendors from Alleaves inventory
     * Used for procurement and filter UIs
     *
     * @returns Array of vendor names
     */
    async getVendors(): Promise<Array<{
        id: string;
        name: string;
    }>> {
        logger.info('[POS_ALLEAVES] Fetching vendors');

        try {
            const vendors = await this.request<Array<{
                id_vendor?: number;
                vendor?: string;
                name?: string;
            }>>('/inventory/vendor');

            return vendors.map(v => ({
                id: v.id_vendor?.toString() || v.vendor || v.name || 'unknown',
                name: v.vendor || v.name || 'Unknown',
            })).sort((a, b) => a.name.localeCompare(b.name));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Vendor endpoint failed', { error: errorMessage });
            return [];
        }
    }

    /**
     * Get location details including license and timezone
     * Useful for compliance and scheduling
     *
     * @returns Location details
     */
    async getLocationDetails(): Promise<{
        id: string;
        name: string;
        licenseNumber?: string;
        timezone?: string;
        address?: {
            street?: string;
            city?: string;
            state?: string;
            zip?: string;
        };
    } | null> {
        logger.info('[POS_ALLEAVES] Fetching location details');

        try {
            const locations = await this.request<Array<{
                id_location: number;
                reference: string;
                license_number?: string;
                timezone?: string;
                address_1?: string;
                city?: string;
                state?: string;
                zip?: string;
                active: boolean;
            }>>('/location');

            const location = locations.find(
                loc => loc.id_location.toString() === this.config.locationId
            );

            if (!location) {
                return null;
            }

            return {
                id: location.id_location.toString(),
                name: location.reference,
                licenseNumber: location.license_number,
                timezone: location.timezone,
                address: {
                    street: location.address_1,
                    city: location.city,
                    state: location.state,
                    zip: location.zip,
                },
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.warn('[POS_ALLEAVES] Location details fetch failed', { error: errorMessage });
            return null;
        }
    }

    /**
     * Get all metadata in a single call (brands, categories, vendors)
     * More efficient than calling each separately
     *
     * @returns Combined metadata object
     */
    async getAllMetadata(): Promise<{
        brands: Array<{ id: string; name: string; productCount?: number }>;
        categories: Array<{ id: string; name: string; productCount?: number }>;
        vendors: Array<{ id: string; name: string }>;
        location: { id: string; name: string; licenseNumber?: string; timezone?: string } | null;
    }> {
        logger.info('[POS_ALLEAVES] Fetching all metadata');

        // Fetch all in parallel
        const [brands, categories, vendors, location] = await Promise.all([
            this.getBrands(),
            this.getCategories(),
            this.getVendors(),
            this.getLocationDetails(),
        ]);

        return { brands, categories, vendors, location };
    }
}

// ============ Two-Way Sync Limitations ============
/**
 * ALLEAVES TWO-WAY SYNC CAPABILITIES
 *
 * ✅ CONFIRMED WORKING:
 * - createCustomer() - Create new customers
 * - createOrder() - Submit orders from BakedBot
 * - applyOrderDiscount() - Apply discount to existing order
 *
 * ⚠️ LIKELY SUPPORTED (needs testing):
 * - createDiscount() - Create new discount rules
 * - updateDiscount() - Modify existing discounts
 * - addStoreCredit() - Add credit to customer account
 *
 * ❌ NOT SUPPORTED / REQUIRES 3RD PARTY:
 * - updateLoyaltyPoints() - Uses SpringBig (separate integration needed)
 * - updateProductPrice() - Inventory prices are typically POS-controlled
 * - updateProductStock() - Inventory managed by POS/METRC
 *
 * 📝 NOTES:
 * - Price updates: Alleaves is the source of truth for inventory pricing
 *   To adjust prices, create DISCOUNTS rather than changing base prices
 * - Loyalty: Alleaves uses SpringBig for loyalty programs
 *   springbig_user_code field links customers to SpringBig
 * - Webhooks: No public webhook documentation - contact Alleaves support
 */
