/**
 * Test Alleaves Customer Fields
 * Run: npx tsx dev/test-alleaves-customer-fields.ts
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

async function testCustomerFields() {
    console.log('🔐 Authenticating...\n');
    const token = await authenticate();

    console.log('📋 Fetching first customer...\n');
    const response = await fetch(`${BASE_URL}/customer/search`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ page: 1, pageSize: 1 })
    });

    const data = await response.json();
    const customer = data.customers?.[0] || data.data?.[0] || data[0];

    console.log('✅ Sample Customer:\n');
    console.log(JSON.stringify(customer, null, 2));

    console.log('\n📊 Available Fields:\n');
    console.log(Object.keys(customer).sort().join(', '));

    console.log('\n💰 Spending Fields:\n');
    const spendingFields = Object.keys(customer).filter(k =>
        k.includes('total') || k.includes('spent') || k.includes('order') ||
        k.includes('purchase') || k.includes('amount')
    );
    console.log(spendingFields.length > 0 ? spendingFields : 'No spending fields found');
}

testCustomerFields().catch(console.error);
