/**
 * Test if /order endpoint supports pagination
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

async function testOrderPagination() {
    console.log('🔐 Authenticating...\n');
    const token = await authenticate();

    // Test with query parameters
    console.log('📄 Testing /order with query params...\n');

    const tests = [
        { params: '', desc: 'No params (default)' },
        { params: '?page=1&pageSize=10', desc: 'page=1&pageSize=10' },
        { params: '?page=2&pageSize=10', desc: 'page=2&pageSize=10' },
        { params: '?limit=10', desc: 'limit=10' },
        { params: '?offset=10&limit=10', desc: 'offset=10&limit=10' },
    ];

    for (const test of tests) {
        try {
            const response = await fetch(`${BASE_URL}/order${test.params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const data = await response.json();
                const orders = Array.isArray(data) ? data : (data.orders || data.data || []);
                console.log(`✅ ${test.desc}: ${orders.length} orders`);
                if (orders[0]) {
                    console.log(`   First order ID: ${orders[0].id_order || orders[0].id}`);
                }
            } else {
                console.log(`❌ ${test.desc}: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ ${test.desc}: Error -`, error);
        }
    }
}

testOrderPagination().catch(console.error);
