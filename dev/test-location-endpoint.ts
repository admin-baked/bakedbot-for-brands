/**
 * Test /location endpoint with different configurations
 */

async function testLocationEndpoint() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const locationId = '1000';
    const baseUrl = 'https://app.alleaves.com/api';

    const credentials = Buffer.from(`${username}:${password}`).toString('base64');

    console.log('🔍 Testing /location endpoint variations\n');

    // Test 1: Basic Auth only
    console.log('Test 1: Basic Auth only');
    try {
        const response = await fetch(`${baseUrl}/location`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`  Status: ${response.status} - ${response.statusText}`);
        const text = await response.text();
        console.log(`  Response:`, text.substring(0, 500));
    } catch (error) {
        console.log(`  Error:`, error);
    }

    // Test 2: With Location ID header
    console.log('\nTest 2: With X-Location-ID header');
    try {
        const response = await fetch(`${baseUrl}/location`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'X-Location-ID': locationId,
            },
        });
        console.log(`  Status: ${response.status} - ${response.statusText}`);
        const text = await response.text();
        console.log(`  Response:`, text.substring(0, 500));
    } catch (error) {
        console.log(`  Error:`, error);
    }

    // Test 3: With PIN header
    console.log('\nTest 3: With X-Pin header');
    try {
        const response = await fetch(`${baseUrl}/location`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'X-Pin': pin,
            },
        });
        console.log(`  Status: ${response.status} - ${response.statusText}`);
        const text = await response.text();
        console.log(`  Response:`, text.substring(0, 500));
    } catch (error) {
        console.log(`  Error:`, error);
    }

    // Test 4: With both Location ID and PIN
    console.log('\nTest 4: With X-Location-ID and X-Pin headers');
    try {
        const response = await fetch(`${baseUrl}/location`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
                'X-Location-ID': locationId,
                'X-Pin': pin,
            },
        });
        console.log(`  Status: ${response.status} - ${response.statusText}`);
        const text = await response.text();
        console.log(`  Response:`, text.substring(0, 500));
    } catch (error) {
        console.log(`  Error:`, error);
    }

    // Test 5: Location ID as query parameter
    console.log('\nTest 5: Location ID as query parameter');
    try {
        const response = await fetch(`${baseUrl}/location?location_id=${locationId}`, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
        });
        console.log(`  Status: ${response.status} - ${response.statusText}`);
        const text = await response.text();
        console.log(`  Response:`, text.substring(0, 500));
    } catch (error) {
        console.log(`  Error:`, error);
    }

    // Test 6: Try Swagger/OpenAPI docs
    console.log('\nTest 6: Swagger/OpenAPI documentation');
    const docUrls = [
        '/swagger.json',
        '/openapi.json',
        '/api-docs',
        '/docs',
        '/documentation',
    ];

    for (const docUrl of docUrls) {
        try {
            const response = await fetch(`${baseUrl}${docUrl}`, {
                headers: {
                    'Authorization': `Basic ${credentials}`,
                },
            });
            console.log(`  ${docUrl}: ${response.status}`);
            if (response.ok) {
                const text = await response.text();
                console.log(`    Found! Length: ${text.length}`);
                console.log(`    Preview:`, text.substring(0, 200));
            }
        } catch (error) {
            console.log(`  ${docUrl}: Error`);
        }
    }
}

testLocationEndpoint().catch(console.error);
