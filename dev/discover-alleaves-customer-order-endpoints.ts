/**
 * Discover Alleaves Customer & Order API Endpoints
 *
 * Tests various endpoint patterns to find how to fetch:
 * - All customers
 * - All orders
 * - Customer purchase history
 * - Order details
 */

const ALLEAVES_USERNAME = 'bakedbotai@thrivesyracuse.com';
const ALLEAVES_PASSWORD = 'Dreamchasing2030!!@@!!';
const ALLEAVES_PIN = '1234';
const LOCATION_ID = '1000';
const BASE_URL = 'https://app.alleaves.com/api';

interface AuthResponse {
    token: string;
    id_user: number;
    id_company: number;
}

async function authenticate(): Promise<string> {
    console.log('🔐 Authenticating with JWT...\n');

    const response = await fetch(`${BASE_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: ALLEAVES_USERNAME,
            password: ALLEAVES_PASSWORD,
            pin: ALLEAVES_PIN
        })
    });

    if (!response.ok) {
        throw new Error(`Auth failed: ${response.status} ${await response.text()}`);
    }

    const data: AuthResponse = await response.json();
    console.log(`✅ Authenticated as user ${data.id_user}\n`);
    return data.token;
}

async function testEndpoint(
    token: string,
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
    const url = `${BASE_URL}${endpoint}`;

    try {
        const options: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        };

        if (body && method === 'POST') {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        if (response.ok) {
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = text;
            }
            return { success: true, data };
        } else {
            const errorText = await response.text();
            return {
                success: false,
                error: `${response.status} ${response.statusText}: ${errorText.substring(0, 200)}`
            };
        }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

async function discoverCustomerEndpoints(token: string) {
    console.log('👥 DISCOVERING CUSTOMER ENDPOINTS\n');
    console.log('═'.repeat(60) + '\n');

    const customerEndpoints = [
        // Standard REST patterns
        { method: 'GET' as const, endpoint: '/customers', desc: 'Get all customers' },
        { method: 'GET' as const, endpoint: `/locations/${LOCATION_ID}/customers`, desc: 'Get customers for location' },
        { method: 'GET' as const, endpoint: '/customer', desc: 'Get customers (singular)' },
        { method: 'POST' as const, endpoint: '/customers/search', body: {}, desc: 'Search customers (empty)' },
        { method: 'POST' as const, endpoint: '/customer/search', body: {}, desc: 'Search customer (singular)' },
        { method: 'POST' as const, endpoint: '/customers/list', body: {}, desc: 'List customers' },
        { method: 'GET' as const, endpoint: '/customers/all', desc: 'Get all customers (explicit)' },

        // With query params
        { method: 'GET' as const, endpoint: '/customers?limit=10', desc: 'Get customers with limit' },
        { method: 'GET' as const, endpoint: `/customers?location=${LOCATION_ID}`, desc: 'Get customers by location param' },

        // Alternative naming
        { method: 'GET' as const, endpoint: '/users', desc: 'Get users (might be customers)' },
        { method: 'GET' as const, endpoint: '/members', desc: 'Get members' },
        { method: 'GET' as const, endpoint: '/clients', desc: 'Get clients' },

        // CRM-style endpoints
        { method: 'GET' as const, endpoint: '/crm/customers', desc: 'CRM customers' },
        { method: 'GET' as const, endpoint: '/loyalty/customers', desc: 'Loyalty customers' },
    ];

    for (const { method, endpoint, body, desc } of customerEndpoints) {
        console.log(`Testing: ${method} ${endpoint}`);
        console.log(`Description: ${desc}`);

        const result = await testEndpoint(token, endpoint, method, body);

        if (result.success) {
            console.log(`✅ SUCCESS!`);

            // Check if it's an array
            const isArray = Array.isArray(result.data);
            const hasCustomers = isArray || (result.data && result.data.customers);

            if (isArray) {
                console.log(`   📊 Returned array with ${result.data.length} items`);
                if (result.data.length > 0) {
                    console.log(`   📋 Sample item keys:`, Object.keys(result.data[0]).join(', '));
                    console.log(`   📄 Sample item:`, JSON.stringify(result.data[0], null, 2).substring(0, 300));
                }
            } else if (hasCustomers) {
                const customers = result.data.customers;
                console.log(`   📊 Returned object with 'customers' array: ${Array.isArray(customers) ? customers.length : '?'} items`);
                if (Array.isArray(customers) && customers.length > 0) {
                    console.log(`   📋 Sample customer keys:`, Object.keys(customers[0]).join(', '));
                }
            } else {
                console.log(`   📄 Response structure:`, JSON.stringify(result.data, null, 2).substring(0, 300));
            }
        } else {
            console.log(`❌ ${result.error}`);
        }
        console.log('');
    }
}

async function discoverOrderEndpoints(token: string) {
    console.log('\n📦 DISCOVERING ORDER ENDPOINTS\n');
    console.log('═'.repeat(60) + '\n');

    const orderEndpoints = [
        // Standard REST patterns
        { method: 'GET' as const, endpoint: '/orders', desc: 'Get all orders' },
        { method: 'GET' as const, endpoint: `/locations/${LOCATION_ID}/orders`, desc: 'Get orders for location' },
        { method: 'GET' as const, endpoint: '/order', desc: 'Get orders (singular)' },
        { method: 'POST' as const, endpoint: '/orders/search', body: {}, desc: 'Search orders (empty)' },
        { method: 'POST' as const, endpoint: '/order/search', body: {}, desc: 'Search order (singular)' },
        { method: 'POST' as const, endpoint: '/orders/list', body: {}, desc: 'List orders' },

        // With date filters
        { method: 'GET' as const, endpoint: '/orders?limit=10', desc: 'Get orders with limit' },
        { method: 'GET' as const, endpoint: `/orders?location=${LOCATION_ID}`, desc: 'Get orders by location param' },
        { method: 'POST' as const, endpoint: '/orders/search', body: { limit: 10 }, desc: 'Search orders with limit' },

        // Sales/Transaction endpoints
        { method: 'GET' as const, endpoint: '/sales', desc: 'Get sales' },
        { method: 'GET' as const, endpoint: '/transactions', desc: 'Get transactions' },
        { method: 'GET' as const, endpoint: '/receipts', desc: 'Get receipts' },

        // Reports
        { method: 'GET' as const, endpoint: '/reports/sales', desc: 'Sales report' },
        { method: 'GET' as const, endpoint: '/reports/orders', desc: 'Orders report' },
    ];

    for (const { method, endpoint, body, desc } of orderEndpoints) {
        console.log(`Testing: ${method} ${endpoint}`);
        console.log(`Description: ${desc}`);

        const result = await testEndpoint(token, endpoint, method, body);

        if (result.success) {
            console.log(`✅ SUCCESS!`);

            const isArray = Array.isArray(result.data);
            const hasOrders = isArray || (result.data && result.data.orders);

            if (isArray) {
                console.log(`   📊 Returned array with ${result.data.length} items`);
                if (result.data.length > 0) {
                    console.log(`   📋 Sample item keys:`, Object.keys(result.data[0]).join(', '));
                    console.log(`   📄 Sample item:`, JSON.stringify(result.data[0], null, 2).substring(0, 300));
                }
            } else if (hasOrders) {
                const orders = result.data.orders;
                console.log(`   📊 Returned object with 'orders' array: ${Array.isArray(orders) ? orders.length : '?'} items`);
                if (Array.isArray(orders) && orders.length > 0) {
                    console.log(`   📋 Sample order keys:`, Object.keys(orders[0]).join(', '));
                }
            } else {
                console.log(`   📄 Response structure:`, JSON.stringify(result.data, null, 2).substring(0, 300));
            }
        } else {
            console.log(`❌ ${result.error}`);
        }
        console.log('');
    }
}

async function discoverAnalyticsEndpoints(token: string) {
    console.log('\n📊 DISCOVERING ANALYTICS/REPORTING ENDPOINTS\n');
    console.log('═'.repeat(60) + '\n');

    // Try to get summary/dashboard data
    const analyticsEndpoints = [
        { method: 'GET' as const, endpoint: '/dashboard', desc: 'Dashboard data' },
        { method: 'GET' as const, endpoint: '/analytics', desc: 'Analytics' },
        { method: 'GET' as const, endpoint: '/metrics', desc: 'Metrics' },
        { method: 'GET' as const, endpoint: `/locations/${LOCATION_ID}/stats`, desc: 'Location stats' },
        { method: 'GET' as const, endpoint: `/locations/${LOCATION_ID}/summary`, desc: 'Location summary' },
    ];

    for (const { method, endpoint, desc } of analyticsEndpoints) {
        console.log(`Testing: ${method} ${endpoint}`);
        console.log(`Description: ${desc}`);

        const result = await testEndpoint(token, endpoint, method);

        if (result.success) {
            console.log(`✅ SUCCESS!`);
            console.log(`   📄 Response:`, JSON.stringify(result.data, null, 2).substring(0, 500));
        } else {
            console.log(`❌ ${result.error}`);
        }
        console.log('');
    }
}

// Main execution
(async () => {
    try {
        const token = await authenticate();

        await discoverCustomerEndpoints(token);
        await discoverOrderEndpoints(token);
        await discoverAnalyticsEndpoints(token);

        console.log('\n✅ DISCOVERY COMPLETE!\n');
        console.log('Check the output above for working endpoints.');

    } catch (error) {
        console.error('❌ Discovery failed:', error);
        process.exit(1);
    }
})();
