
import fs from 'fs';
import path from 'path';

// --- ENV ---
const loadEnv = () => {
    try {
        const pathsToCheck = ['.env.local', '.env'];
        for (const file of pathsToCheck) {
            const envPath = path.resolve(process.cwd(), file);
            if (fs.existsSync(envPath)) {
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

// --- HELPERS ---
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        hash = (hash << 5) - hash + code;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

interface DiscoveredDispensary {
    id: number;
    name: string;
    city: string;
    state: string;
    address: string;
}

// --- MAIN ---
async function main() {
    console.log('Starting Google Places Scan for "Dispensary in Chicago, IL"...');

    const url = 'https://places.googleapis.com/v1/places:searchText';
    const body = {
        textQuery: "Dispensary in Chicago, IL",
        maxResultCount: 20 // Sample size
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': API_KEY, // Ensure env var is set
                'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents'
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            console.error('API Error:', res.status, res.statusText);
            console.error(await res.text());
            return;
        }

        const data = await res.json();
        const results: DiscoveredDispensary[] = [];

        if (data.places && Array.isArray(data.places)) {
            for (const place of data.places) {
                // Parse city/state from address components or simple string parsing if lazy
                // For robustness, let's just use the formatted string for now and hardcode Chicago/IL context if missing
                // Or parse simplified:
                const address = place.formattedAddress;
                // Basic extraction:
                let city = 'Chicago';
                let state = 'IL';

                // Try to find components if available (field mask requested them)
                if (place.addressComponents) {
                    const cityComp = place.addressComponents.find((c: any) => c.types.includes('locality'));
                    const stateComp = place.addressComponents.find((c: any) => c.types.includes('administrative_area_level_1'));
                    if (cityComp) city = cityComp.longText;
                    if (stateComp) state = stateComp.shortText;
                }

                results.push({
                    id: hashCode(place.id), // Hash Google Place ID to number
                    name: place.displayName?.text || 'Unknown Dispensary',
                    city: city,
                    state: state,
                    address: address
                });
            }
        }

        console.log(`Found ${results.length} dispensaries via Google Places.`);

        const outputPath = path.resolve(__dirname, 'discovered_dispensaries.json');
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`Saved to ${outputPath}`);

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

main().catch(console.error);
