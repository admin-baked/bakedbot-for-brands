
import { GOOGLE_MAPS_CONFIG } from '@/lib/config';

async function main() {
    const apiKey = GOOGLE_MAPS_CONFIG.API_KEY;
    console.log('Testing Google Places API search for "Smoke Shop" in Milwaukee...');
    
    // Milwaukee Coordinates
    const lat = 43.0389;
    const lng = -87.9065;
    const radius = 5000; // 5km
    const keyword = 'smoke shop';

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&key=${apiKey}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.status !== 'OK') {
            console.error('API Error:', data.status, data.error_message);
            return;
        }

        console.log(`Found ${data.results.length} places.`);
        data.results.slice(0, 5).forEach((p: any) => {
            console.log(`- ${p.name} | ${p.vicinity} | Rating: ${p.rating}`);
        });

    } catch (err) {
        console.error('Fetch error:', err);
    }
}

main();
