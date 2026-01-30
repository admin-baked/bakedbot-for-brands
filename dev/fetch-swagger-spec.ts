/**
 * Fetch Swagger/OpenAPI spec from Alleaves
 */

async function fetchSwagger() {
    const username = 'bakedbotai@thrivesyracuse.com';
    const password = 'Dreamchasing2030!!@@!!';
    const pin = '1234';
    const baseUrl = 'https://app.alleaves.com/api';

    // First, authenticate
    console.log('🔐 Authenticating...');
    const authResponse = await fetch(`${baseUrl}/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, pin }),
    });

    const authData = await authResponse.json();
    const token = authData.token;
    console.log('✅ Got JWT token\n');

    // Now fetch documentation
    console.log('📖 Fetching API documentation...\n');
    const docResponse = await fetch(`${baseUrl}/documentation`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    const html = await docResponse.text();

    // Extract swagger.json URL from the HTML
    const swaggerMatch = html.match(/url:\s*["']([^"']+)["']/);
    if (swaggerMatch) {
        const swaggerUrl = swaggerMatch[1];
        console.log(`Found Swagger spec URL: ${swaggerUrl}\n`);

        // Fetch the Swagger spec
        const specUrl = swaggerUrl.startsWith('http') ? swaggerUrl : `${baseUrl}${swaggerUrl}`;
        const specResponse = await fetch(specUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (specResponse.ok) {
            const spec = await specResponse.json();
            console.log('✅ Got Swagger spec!\n');
            console.log('Available endpoints:\n');

            // Show all paths
            for (const [path, methods] of Object.entries(spec.paths || {})) {
                console.log(`  ${path}`);
                for (const [method, details] of Object.entries(methods as Record<string, any>)) {
                    if (method !== 'parameters') {
                        const summary = details.summary || details.description || '';
                        console.log(`    ${method.toUpperCase().padEnd(7)} ${summary}`);
                    }
                }
            }

            // Look for product-related endpoints
            console.log('\n\n📦 Product-related endpoints:\n');
            for (const [path, methods] of Object.entries(spec.paths || {})) {
                if (path.toLowerCase().includes('product') || path.toLowerCase().includes('item') || path.toLowerCase().includes('menu')) {
                    console.log(`  ${path}`);
                    for (const [method, details] of Object.entries(methods as Record<string, any>)) {
                        if (method !== 'parameters') {
                            const summary = details.summary || details.description || '';
                            console.log(`    ${method.toUpperCase().padEnd(7)} ${summary}`);
                        }
                    }
                }
            }

            // Save full spec to file
            const fs = await import('fs');
            fs.writeFileSync('alleaves-api-spec.json', JSON.stringify(spec, null, 2));
            console.log('\n✅ Full spec saved to alleaves-api-spec.json');

        } else {
            console.error('Failed to fetch swagger spec:', await specResponse.text());
        }
    } else {
        console.log('Could not find Swagger spec URL in HTML');
        console.log('HTML preview:', html.substring(0, 500));
    }
}

fetchSwagger().catch(console.error);
