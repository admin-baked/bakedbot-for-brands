/**
 * Test Dutchie POS API with various credential combinations
 */

const LOCATION_API_KEY = '487c94ca-684f-4237-b3ef-6adb996437f1';
const CLIENT_ID = '7ce3ca6c-ab87-479f-8a8e-cc713cbc67dd';
const ORDER_AHEAD_CLIENT_ID = 'DuhGhnVA5nKbokCDDDtcXO3kdt8VdyzG';
const ORDER_AHEAD_TOKEN = '6AnJC-ZcHoxbIE5IGg1kJFQtyyIDRx2Jz1cpY3eY0fwI8WldMjf6tU-2kyhNQP9s';

async function testAuth(name: string, username: string, password: string) {
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    
    console.log(`\n=== ${name} ===`);
    console.log(`Username: ${username.substring(0, 12)}...`);
    console.log(`Password: ${password ? password.substring(0, 12) + '...' : '(empty)'}`);
    
    try {
        const response = await fetch('https://api.pos.dutchie.com/whoami', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
            },
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUCCESS!');
            console.log('Location:', JSON.stringify(data, null, 2));
            return true;
        }
    } catch (error: any) {
        console.log(`Error: ${error.message}`);
    }
    return false;
}

async function main() {
    console.log('Testing Dutchie POS API Authentication Combinations');
    console.log('Endpoint: https://api.pos.dutchie.com/whoami');

    // Combination 1: API Key only (as documented)
    await testAuth('API Key : (empty)', LOCATION_API_KEY, '');

    // Combination 2: API Key : Client ID
    await testAuth('API Key : Client ID', LOCATION_API_KEY, CLIENT_ID);

    // Combination 3: Client ID : API Key
    await testAuth('Client ID : API Key', CLIENT_ID, LOCATION_API_KEY);

    // Combination 4: Order Ahead credentials
    await testAuth('Order Ahead Client : Token', ORDER_AHEAD_CLIENT_ID, ORDER_AHEAD_TOKEN);

    // Combination 5: API Key : Order Ahead Token
    await testAuth('API Key : Order Ahead Token', LOCATION_API_KEY, ORDER_AHEAD_TOKEN);

    // Combination 6: Order Ahead Client ID : API Key
    await testAuth('Order Ahead Client : API Key', ORDER_AHEAD_CLIENT_ID, LOCATION_API_KEY);

    console.log('\n=== Done ===');
    console.log('\nIf all fail, you may need an "Integrator Key" from Dutchie.');
    console.log('Contact Dutchie Support to get developer/integrator credentials.');
}

main();
