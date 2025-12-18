
import path from 'path';
import fs from 'fs';

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

async function search() {
    console.log('Testing Google Places Search for "Dispensary in Chicago, IL"...');

    // Using New Places API (Text Search)
    // https://places.googleapis.com/v1/places:searchText

    const url = 'https://places.googleapis.com/v1/places:searchText';
    const body = {
        textQuery: "Dispensary in Chicago, IL",
        maxResultCount: 5
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY,
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error('API Error:', res.status, res.statusText);
            console.error(await res.text());
            return;
        }

        const data = await res.json();
        console.log('Results:', JSON.stringify(data, null, 2));

        if (data.places && data.places.length > 0) {
            const isIllinois = data.places.some((p: any) => p.formattedAddress.includes('IL') || p.formattedAddress.includes('Illinois'));
            console.log('Found Illinois results?', isIllinois);
        } else {
            console.log('No results found');
        }

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

search();
