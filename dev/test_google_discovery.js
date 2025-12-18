
const path = require('path');
const fs = require('fs');
const https = require('https');

// Load Env
const loadEnv = () => {
    try {
        const pathsToCheck = ['.env.local', '.env'];
        for (const file of pathsToCheck) {
            const envPath = path.resolve(process.cwd(), file);
            if (fs.existsSync(envPath)) {
                console.log('Loading env from', file);
                const envContent = fs.readFileSync(envPath, 'utf-8');
                envContent.split('\n').forEach(line => {
                    const parts = line.split('=');
                    if (parts.length >= 2) {
                        const key = parts[0].trim();
                        const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
                        if (key && val && !process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error loading env:', e);
    }
};
loadEnv();

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!API_KEY) {
    console.error('No Google API Key found');
    process.exit(1);
}

function search() {
    console.log('Testing Google Places Search for "Dispensary in Chicago, IL"...');

    // Using New Places API (Text Search)
    const data = JSON.stringify({
        textQuery: "Dispensary in Chicago, IL",
        maxResultCount: 5
    });

    const options = {
        hostname: 'places.googleapis.com',
        path: '/v1/places:searchText',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
            'Content-Length': data.length
        }
    };

    const req = https.request(options, (res) => {
        console.log(`Initial Status: ${res.statusCode}`);

        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            if (res.statusCode >= 400) {
                console.error('API Error:', body);
                return;
            }

            try {
                const json = JSON.parse(body);
                console.log('Results:', JSON.stringify(json, null, 2));

                if (json.places && json.places.length > 0) {
                    const isIllinois = json.places.some(p => p.formattedAddress.includes('IL') || p.formattedAddress.includes('Illinois'));
                    console.log('Found Illinois results?', isIllinois);
                } else {
                    console.log('No results found');
                }
            } catch (e) {
                console.error('JSON Parse Error:', e);
            }
        });
    });

    req.on('error', (error) => {
        console.error('Request Error:', error);
    });

    req.write(data);
    req.end();
}

search();
