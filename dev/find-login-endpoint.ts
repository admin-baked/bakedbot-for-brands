/**
 * Find Alleaves login endpoint to get JWT token
 */

async function findLoginEndpoint() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const baseUrl = 'https://app.alleaves.com/api';

    console.log('🔍 Finding Login Endpoint\n');

    // Common login endpoint patterns
    const loginEndpoints = [
        '/login',
        '/auth/login',
        '/auth',
        '/authenticate',
        '/signin',
        '/token',
        '/session',
    ];

    for (const endpoint of loginEndpoints) {
        const url = `${baseUrl}${endpoint}`;
        console.log(`Testing POST to: ${endpoint}`);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username,
                    password,
                    pin,
                }),
            });

            console.log(`  Status: ${response.status} - ${response.statusText}`);
            const text = await response.text();

            if (response.ok) {
                console.log(`  ✅ SUCCESS! Found login endpoint!`);
                try {
                    const data = JSON.parse(text);
                    console.log(`  Response:`, JSON.stringify(data, null, 2));

                    // Try to use the token
                    if (data.token || data.access_token || data.jwt) {
                        const token = data.token || data.access_token || data.jwt;
                        console.log(`\n  🎉 Got JWT token! Testing /location with it...\n`);

                        const testResponse = await fetch(`${baseUrl}/location`, {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        });

                        console.log(`  /location Status: ${testResponse.status}`);
                        const testText = await testResponse.text();
                        console.log(`  /location Response:`, testText.substring(0, 500));
                    }
                } catch {
                    console.log(`  Response (not JSON):`, text.substring(0, 200));
                }
                break;
            } else {
                console.log(`  Response:`, text.substring(0, 200));
            }
        } catch (error) {
            console.log(`  Error:`, error instanceof Error ? error.message : String(error));
        }
        console.log('');
    }

    // Also try with different payload formats
    console.log('\n🔍 Trying different payload formats for /login:\n');

    const payloads = [
        { email: username, password, pin },
        { email: username, password },
        { username, password, pin },
        { username, password },
        { user: username, password, pin },
        { login: username, password, pin },
    ];

    for (const payload of payloads) {
        console.log(`Testing payload:`, JSON.stringify(payload, (k, v) => k === 'password' ? '***' : v));

        try {
            const response = await fetch(`${baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log(`  Status: ${response.status}`);
            if (response.ok) {
                const text = await response.text();
                console.log(`  ✅ SUCCESS!`, text.substring(0, 500));
                break;
            } else {
                const text = await response.text();
                if (!text.includes('Not Found')) {
                    console.log(`  Response:`, text.substring(0, 100));
                }
            }
        } catch (error) {
            console.log(`  Error:`, error instanceof Error ? error.message : '');
        }
    }
}

findLoginEndpoint().catch(console.error);
