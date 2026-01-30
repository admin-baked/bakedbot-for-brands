/**
 * Test if /order endpoint pagination actually works
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

async function fetchOrders(token: string, page: number, pageSize: number = 100) {
    const response = await fetch(`${BASE_URL}/order?page=${page}&pageSize=${pageSize}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    const data = await response.json();
    const orders = Array.isArray(data) ? data : (data.orders || data.data || []);
    return orders;
}

async function testPagination() {
    console.log('🔐 Authenticating...\n');
    const token = await authenticate();

    console.log('📄 Fetching first 5 pages...\n');

    for (let page = 1; page <= 5; page++) {
        const orders = await fetchOrders(token, page, 100);

        if (orders.length > 0) {
            const firstId = orders[0].id_order || orders[0].id;
            const lastId = orders[orders.length - 1].id_order || orders[orders.length - 1].id;
            console.log(`Page ${page}: ${orders.length} orders (IDs: ${firstId} to ${lastId})`);
        } else {
            console.log(`Page ${page}: No orders (stopping)`);
            break;
        }
    }
}

testPagination().catch(console.error);
