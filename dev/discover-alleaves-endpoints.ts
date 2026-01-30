/**
 * Discover Alleaves API Endpoints
 *
 * This script tests different API endpoint patterns to find the correct structure.
 */

async function discoverEndpoints() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const locationId = '1000';
    const baseUrl = 'https://app.alleaves.com/api';

    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    const headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
    };

    console.log('🔍 Discovering Alleaves API Endpoints\n');

    // List of endpoints to try
    const endpoints = [
        // Root/Health
        '/',
        '/health',
        '/status',

        // Location endpoints
        '/locations',
        `/locations/${locationId}`,
        '/location',
        `/location/${locationId}`,

        // Product/Menu endpoints
        '/products',
        '/menu',
        '/items',
        `/locations/${locationId}/products`,
        `/locations/${locationId}/menu`,
        `/location/${locationId}/products`,

        // Inventory
        '/inventory',
        `/locations/${locationId}/inventory`,

        // Auth/User
        '/me',
        '/user',
        '/profile',
    ];

    for (const endpoint of endpoints) {
        const url = `${baseUrl}${endpoint}`;
        try {
            console.log(`Testing: ${endpoint}`);
            const response = await fetch(url, { headers });

            if (response.ok) {
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    data = text.substring(0, 200);
                }

                console.log(`  ✅ ${response.status} - Success!`);
                console.log(`  Response:`, JSON.stringify(data, null, 2).substring(0, 500));
                console.log('');
            } else {
                console.log(`  ❌ ${response.status} - ${response.statusText}`);
            }
        } catch (error) {
            console.log(`  ⚠️  Error:`, error instanceof Error ? error.message : String(error));
        }
    }
}

discoverEndpoints().catch(console.error);
