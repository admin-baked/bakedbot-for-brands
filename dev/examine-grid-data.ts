/**
 * Examine the grid data structure to find products
 */

async function examineGrid() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const baseUrl = 'https://app.alleaves.com/api';

    // Authenticate
    const authResponse = await fetch(`${baseUrl}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, pin }),
    });
    const authData = await authResponse.json();
    const token = authData.token;

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    // Get all areas first
    console.log('📦 Getting all inventory areas...\n');
    const areasResponse = await fetch(`${baseUrl}/inventory/area`, { headers });
    const areasData = await areasResponse.json();

    if (Array.isArray(areasData) && areasData[0]?.area_list) {
        const areas = areasData[0].area_list;
        console.log(`Found ${areas.length} areas\n`);

        // Check each area for products
        for (const area of areas.slice(0, 5)) { // Check first 5 areas
            console.log(`📍 Area: ${area.area} (ID: ${area.id_area})`);

            try {
                const gridResponse = await fetch(
                    `${baseUrl}/inventory/area/open_grid/${area.id_area}`,
                    { headers }
                );

                if (gridResponse.ok) {
                    const gridData = await gridResponse.json();

                    if (Array.isArray(gridData) && gridData.length > 0) {
                        const firstGrid = gridData[0];
                        console.log(`  Found grid data with keys:`, Object.keys(firstGrid).join(', '));

                        // Check if grid property contains products
                        if (firstGrid.grid) {
                            console.log(`  Grid structure:`, JSON.stringify(firstGrid.grid, null, 2).substring(0, 1500));

                            // If grid is an array, check for product-like objects
                            if (Array.isArray(firstGrid.grid)) {
                                console.log(`  Grid is array with ${firstGrid.grid.length} items`);
                                if (firstGrid.grid[0]) {
                                    console.log(`  First grid item:`, JSON.stringify(firstGrid.grid[0], null, 2).substring(0, 800));
                                }
                            }
                        }
                    } else {
                        console.log(`  No grid data`);
                    }
                } else {
                    console.log(`  Error: ${gridResponse.status}`);
                }
            } catch (error) {
                console.log(`  Error:`, error instanceof Error ? error.message : String(error));
            }

            console.log('');
        }
    }

    // Also check if there's a general product lookup endpoint
    console.log('\n🔍 Trying search/lookup patterns...\n');

    // Try POST endpoints that might search for products
    const searchEndpoints = [
        { endpoint: '/product/search', body: { query: '' } },
        { endpoint: '/inventory/search', body: { query: '' } },
        { endpoint: '/item/search', body: { query: '' } },
    ];

    for (const { endpoint, body } of searchEndpoints) {
        try {
            const response = await fetch(`${baseUrl}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${endpoint} works!`);
                console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 800));
                break;
            }
        } catch (error) {
            // Silent
        }
    }
}

examineGrid().catch(console.error);
