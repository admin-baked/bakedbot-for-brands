/**
 * Test Authorize.Net Connection
 *
 * Validates that AUTHNET_API_LOGIN_ID and AUTHNET_TRANSACTION_KEY are correct
 * by making a test API call to Authorize.Net.
 *
 * Usage:
 *   npx tsx scripts/test-authnet-connection.ts
 */

const AUTHNET_API_LOGIN_ID = process.env.AUTHNET_API_LOGIN_ID;
const AUTHNET_TRANSACTION_KEY = process.env.AUTHNET_TRANSACTION_KEY;
const AUTHNET_ENV = process.env.AUTHNET_ENV || 'sandbox';

const API_ENDPOINT = AUTHNET_ENV === 'production'
    ? 'https://api2.authorize.net/xml/v1/request.api'
    : 'https://apitest.authorize.net/xml/v1/request.api';

async function testAuthNetConnection() {
    console.log('🔐 Testing Authorize.Net Connection...');
    console.log('');

    // Check environment variables
    console.log('Environment Check:');
    console.log(`  AUTHNET_ENV: ${AUTHNET_ENV}`);
    console.log(`  API Endpoint: ${API_ENDPOINT}`);
    console.log(`  AUTHNET_API_LOGIN_ID: ${AUTHNET_API_LOGIN_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`  AUTHNET_TRANSACTION_KEY: ${AUTHNET_TRANSACTION_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log('');

    if (!AUTHNET_API_LOGIN_ID || !AUTHNET_TRANSACTION_KEY) {
        console.error('❌ ERROR: Authorize.Net credentials not set in environment');
        console.error('');
        console.error('Set them in .env.local:');
        console.error('  AUTHNET_API_LOGIN_ID=your_api_login_id');
        console.error('  AUTHNET_TRANSACTION_KEY=your_transaction_key');
        console.error('  AUTHNET_ENV=production  # or sandbox');
        process.exit(1);
    }

    // Validate format
    console.log('Format Validation:');
    const apiLoginLength = AUTHNET_API_LOGIN_ID.length;
    const transKeyLength = AUTHNET_TRANSACTION_KEY.length;

    console.log(`  API Login ID length: ${apiLoginLength} chars`);
    if (apiLoginLength < 8 || apiLoginLength > 20) {
        console.log('    ⚠️  WARNING: Unusual length (expected 8-20)');
    } else {
        console.log('    ✅ Length OK');
    }

    console.log(`  Transaction Key length: ${transKeyLength} chars`);
    if (transKeyLength < 16 || transKeyLength > 64) {
        console.log('    ❌ ERROR: Invalid length (expected 16-64 alphanumeric characters)');
        console.log('    This will cause "invalid length/format" errors!');
    } else {
        console.log('    ✅ Length OK');
    }

    const alphanumericPattern = /^[0-9a-zA-Z]+$/;
    if (!alphanumericPattern.test(AUTHNET_TRANSACTION_KEY)) {
        console.log('    ❌ ERROR: Transaction Key must be alphanumeric (0-9, a-z, A-Z)');
    } else {
        console.log('    ✅ Format OK (alphanumeric)');
    }

    console.log('');

    // Test API call - getMerchantDetails (lightweight, doesn't create anything)
    console.log('API Connection Test:');
    console.log('  Making test API call to Authorize.Net...');

    const payload = {
        getMerchantDetailsRequest: {
            merchantAuthentication: {
                name: AUTHNET_API_LOGIN_ID,
                transactionKey: AUTHNET_TRANSACTION_KEY,
            }
        }
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        console.log('');
        console.log('API Response:');
        console.log(`  HTTP Status: ${response.status}`);

        if (data.messages) {
            const resultCode = data.messages.resultCode;
            const messageCode = data.messages.message?.[0]?.code;
            const messageText = data.messages.message?.[0]?.text;

            console.log(`  Result Code: ${resultCode}`);
            console.log(`  Message Code: ${messageCode}`);
            console.log(`  Message: ${messageText}`);
            console.log('');

            if (resultCode === 'Ok') {
                console.log('✅ SUCCESS: Authorize.Net credentials are valid!');
                console.log('');
                console.log('Your Authorize.Net integration is working correctly.');
                console.log(`Environment: ${AUTHNET_ENV.toUpperCase()}`);
                process.exit(0);
            } else {
                console.error('❌ FAILED: Authorize.Net returned an error');
                console.error('');

                // Common error codes
                if (messageCode === 'E00007') {
                    console.error('ERROR: Invalid authentication credentials');
                    console.error('');
                    console.error('Possible causes:');
                    console.error('  1. API Login ID is incorrect');
                    console.error('  2. Transaction Key is incorrect');
                    console.error('  3. Using production credentials with sandbox endpoint (or vice versa)');
                    console.error('');
                    console.error('Solutions:');
                    console.error('  1. Verify credentials in Authorize.Net Merchant Dashboard');
                    console.error('  2. Generate a new Transaction Key');
                    console.error('  3. Ensure AUTHNET_ENV matches your credential type');
                } else if (messageCode === 'E00027') {
                    console.error('ERROR: Transaction Key has invalid length or format');
                    console.error('');
                    console.error('The Transaction Key must be exactly 16 hexadecimal characters.');
                    console.error('');
                    console.error('Solution:');
                    console.error('  1. Log into Authorize.Net Merchant Dashboard');
                    console.error('  2. Go to Settings > Security Settings > API Credentials & Keys');
                    console.error('  3. Generate a new Transaction Key');
                    console.error('  4. Copy the 16-character hexadecimal key');
                    console.error('  5. Update AUTHNET_TRANSACTION_KEY in Secret Manager');
                }

                console.error('');
                console.error('Full Response:');
                console.error(JSON.stringify(data, null, 2));
                process.exit(1);
            }
        } else {
            console.error('❌ ERROR: Unexpected API response format');
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }

    } catch (error: any) {
        console.error('❌ ERROR: Network error or API request failed');
        console.error(error.message);
        process.exit(1);
    }
}

testAuthNetConnection();
