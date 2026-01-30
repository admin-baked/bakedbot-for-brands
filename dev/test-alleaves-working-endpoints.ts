/**
 * Test Working Alleaves Endpoints
 *
 * Found endpoints:
 * - POST /customer/search (requires page & pageSize)
 * - GET /order (returns 100 orders!)
 */

const ALLEAVES_USERNAME = 'bakedbotai@thrivesyracuse.com';
const ALLEAVES_PASSWORD = 'Dreamchasing2030!!@@!!';
const ALLEAVES_PIN = '1234';
const BASE_URL = 'https://app.alleaves.com/api';

interface AuthResponse {
    token: string;
}

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

    const data: AuthResponse = await response.json();
    return data.token;
}

async function testCustomerSearch(token: string) {
    console.log('\n👥 TESTING CUSTOMER SEARCH ENDPOINT\n');
    console.log('═'.repeat(60) + '\n');

    // Test with pagination parameters
    const response = await fetch(`${BASE_URL}/customer/search`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            page: 1,
            pageSize: 100,
            query: '' // Empty query to get all
        })
    });

    if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS!\n');

        if (Array.isArray(data)) {
            console.log(`📊 Returned ${data.length} customers\n`);

            if (data.length > 0) {
                console.log('📋 Sample Customer:');
                console.log(JSON.stringify(data[0], null, 2));
                console.log('\n📋 Customer Fields:', Object.keys(data[0]).join(', '));
            }
        } else if (data.customers) {
            console.log(`📊 Returned ${data.customers.length} customers\n`);
            console.log('📋 Sample Customer:');
            console.log(JSON.stringify(data.customers[0], null, 2));
        } else {
            console.log('📄 Response Structure:');
            console.log(JSON.stringify(data, null, 2).substring(0, 1000));
        }
    } else {
        const error = await response.text();
        console.log(`❌ Failed: ${response.status} - ${error}`);
    }
}

async function testOrdersEndpoint(token: string) {
    console.log('\n\n📦 TESTING ORDERS ENDPOINT\n');
    console.log('═'.repeat(60) + '\n');

    const response = await fetch(`${BASE_URL}/order`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        }
    });

    if (response.ok) {
        const orders = await response.json();
        console.log('✅ SUCCESS!\n');
        console.log(`📊 Returned ${orders.length} orders\n`);

        if (orders.length > 0) {
            const order = orders[0];
            console.log('📋 Sample Order:');
            console.log(JSON.stringify(order, null, 2).substring(0, 1500));
            console.log('\n...(truncated)\n');

            console.log('\n📊 ORDER STATISTICS:');
            console.log(`   Total Orders: ${orders.length}`);
            console.log(`   Date Range: ${orders[orders.length - 1].date_created} to ${orders[0].date_created}`);

            // Calculate totals
            const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
            console.log(`   Total Revenue: $${totalRevenue.toFixed(2)}`);

            // Count unique customers
            const uniqueCustomers = new Set(orders.map((o: any) => o.id_customer));
            console.log(`   Unique Customers: ${uniqueCustomers.size}`);

            // Show customer info from orders
            console.log(`\n📋 CUSTOMER INFO FROM ORDERS:`);
            console.log(`   Customer ID: ${order.id_customer}`);
            console.log(`   Customer Name: ${order.name_first} ${order.name_last}`);
            console.log(`   Patient Number: ${order.patient_number || 'N/A'}`);
        }
    } else {
        const error = await response.text();
        console.log(`❌ Failed: ${response.status} - ${error}`);
    }
}

async function testOrdersWithParams(token: string) {
    console.log('\n\n📦 TESTING ORDERS WITH QUERY PARAMS\n');
    console.log('═'.repeat(60) + '\n');

    // Try with limit and offset
    const testParams = [
        '?limit=10',
        '?limit=50&offset=0',
        '?id_location=1000',
    ];

    for (const params of testParams) {
        console.log(`Testing: GET /order${params}`);

        const response = await fetch(`${BASE_URL}/order${params}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            const orders = await response.json();
            console.log(`✅ SUCCESS! Returned ${orders.length} orders\n`);
        } else {
            console.log(`❌ Failed: ${response.status}\n`);
        }
    }
}

// Main execution
(async () => {
    try {
        console.log('🔐 Authenticating...');
        const token = await authenticate();
        console.log('✅ Authenticated!\n');

        await testCustomerSearch(token);
        await testOrdersEndpoint(token);
        await testOrdersWithParams(token);

        console.log('\n\n✅ ALL TESTS COMPLETE!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
})();
