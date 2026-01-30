/**
 * Test Alleaves Orders API
 * Run: npx tsx dev/test-alleaves-orders.ts
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

async function testEndpoint(token: string, endpoint: string, body?: any) {
    console.log(`\n🔍 Testing: ${endpoint}\n`);
    try {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: body ? 'POST' : 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`✅ Success! Response keys:`, Object.keys(data));
            if (Array.isArray(data)) {
                console.log(`   Array with ${data.length} items`);
                if (data[0]) console.log(`   Sample:`, Object.keys(data[0]));
            } else if (data.data || data.orders) {
                const items = data.data || data.orders;
                console.log(`   ${items.length} orders found`);
                if (items[0]) {
                    console.log(`   Sample order fields:`, Object.keys(items[0]));
                    console.log(`   Sample order:`, JSON.stringify(items[0], null, 2));
                }
            }
            return true;
        } else {
            console.log(`❌ ${response.status}:`, await response.text());
            return false;
        }
    } catch (error) {
        console.log(`❌ Error:`, error);
        return false;
    }
}

async function testOrders() {
    console.log('🔐 Authenticating...\n');
    const token = await authenticate();

    const endpoints = [
        { endpoint: '/order', body: null },
        { endpoint: '/order/search', body: { page: 1, pageSize: 1 } },
        { endpoint: '/order/list', body: null },
        { endpoint: '/orders', body: null },
        { endpoint: '/pos/orders', body: null },
        { endpoint: '/transaction', body: null },
        { endpoint: '/transaction/search', body: { page: 1, pageSize: 1 } },
    ];

    for (const { endpoint, body } of endpoints) {
        await testEndpoint(token, endpoint, body);
    }
}

testOrders().catch(console.error);
