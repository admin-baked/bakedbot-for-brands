/**
 * Check Alleaves Loyalty Data
 * Tests if loyalty points are available via orders, separate endpoints, or integrations
 * Run: npx tsx dev/check-alleaves-loyalty.ts
 */

const ALLEAVES_USERNAME = 'bakedbotai@thrivesyracuse.com';
const ALLEAVES_PASSWORD = 'Dreamchasing2030!!@@!!';
const ALLEAVES_PIN = '1234';
const BASE_URL = 'https://app.alleaves.com/api';

async function authenticate(): Promise<string> {
    const response = await fetch(`${BASE_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: ALLEAVES_USERNAME,
            password: ALLEAVES_PASSWORD,
            pin: ALLEAVES_PIN
        })
    });

    const data = await response.json();
    return data.token;
}

async function testEndpoint(token: string, endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
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
            return { success: true, data: await response.json() };
        } else {
            return { success: false, status: response.status, error: await response.text() };
        }
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

async function checkLoyaltyData() {
    console.log('🔐 Authenticating...\n');
    const token = await authenticate();

    // Test loyalty-related endpoints
    console.log('🎯 Testing Loyalty Endpoints:\n');
    console.log('═'.repeat(60) + '\n');

    const loyaltyEndpoints = [
        { method: 'GET' as const, endpoint: '/loyalty', desc: 'Loyalty endpoint' },
        { method: 'GET' as const, endpoint: '/loyalty/customers', desc: 'Loyalty customers' },
        { method: 'GET' as const, endpoint: '/loyalty/points', desc: 'Loyalty points' },
        { method: 'POST' as const, endpoint: '/loyalty/search', body: {}, desc: 'Search loyalty' },
        { method: 'GET' as const, endpoint: '/rewards', desc: 'Rewards endpoint' },
        { method: 'GET' as const, endpoint: '/points', desc: 'Points endpoint' },
    ];

    for (const { method, endpoint, body, desc } of loyaltyEndpoints) {
        console.log(`Testing: ${method} ${endpoint} - ${desc}`);
        const result = await testEndpoint(token, endpoint, method, body);

        if (result.success) {
            console.log(`  ✅ SUCCESS!`);
            console.log(`  📄 Response:`, JSON.stringify(result.data, null, 2).substring(0, 500));
        } else {
            console.log(`  ❌ Failed: ${result.status || 'Error'}`);
        }
        console.log('');
    }

    // Check if order data includes loyalty/points info
    console.log('\n📦 Checking Order Data for Loyalty Info:\n');
    console.log('═'.repeat(60) + '\n');

    console.log('Fetching sample order...');
    const ordersResult = await testEndpoint(token, '/order?page=1&pageSize=1', 'GET');

    if (ordersResult.success && Array.isArray(ordersResult.data) && ordersResult.data.length > 0) {
        const order = ordersResult.data[0];
        console.log('\n✅ Sample Order:\n');
        console.log(JSON.stringify(order, null, 2));

        // Look for loyalty/points fields
        const loyaltyFields = Object.keys(order).filter(k =>
            k.includes('loyalty') ||
            k.includes('points') ||
            k.includes('reward') ||
            k.includes('springbig') ||
            k.includes('alpine')
        );

        console.log('\n💰 Loyalty-related fields in order:');
        console.log(loyaltyFields.length > 0 ? loyaltyFields : 'None found');
    } else {
        console.log('❌ Could not fetch order data');
    }

    // Check customer with orders
    console.log('\n\n👤 Checking Customer with Order History:\n');
    console.log('═'.repeat(60) + '\n');

    // Get a customer who has made purchases
    const customersResult = await testEndpoint(token, '/customer/search', 'POST', { page: 1, pageSize: 10 });

    if (customersResult.success) {
        const customers = customersResult.data?.customers || customersResult.data?.data || [];

        // Find a customer with alpine_user_code or springbig_user_code
        const customerWithLoyalty = customers.find((c: any) =>
            c.alpine_user_code || c.springbig_user_code
        );

        if (customerWithLoyalty) {
            console.log('Found customer with loyalty integration:');
            console.log(`  ID: ${customerWithLoyalty.id_customer}`);
            console.log(`  Name: ${customerWithLoyalty.customer_name}`);
            console.log(`  Alpine Code: ${customerWithLoyalty.alpine_user_code || 'N/A'}`);
            console.log(`  Springbig Code: ${customerWithLoyalty.springbig_user_code || 'N/A'}`);
        } else {
            console.log('No customers found with loyalty integration codes');
        }
    }
}

checkLoyaltyData().catch(console.error);
