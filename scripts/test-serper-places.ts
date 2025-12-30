import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
    const apiKey = process.env.SERPER_API_KEY || '99a4731362e49f8745582c0b49079ea9405d648c'; 
    console.log('Testing Serper Places API with key:', apiKey ? apiKey.substring(0, 4) + '...' : 'NONE');

    const headers = {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
    };

    const payload = {
        q: "smoke shops in Milwaukee, WI",
        location: "Milwaukee, Wisconsin, United States"
    };

    try {
        console.log('Fetching https://google.serper.dev/places...');
        const response = await fetch('https://google.serper.dev/places', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error('API Error:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        console.log(`Found ${data.places?.length || 0} places.`);
        
        if (data.places) {
            data.places.slice(0, 5).forEach((p: any) => {
                console.log(`- ${p.title} | ${p.address} | Rating: ${p.rating}`);
            });
        }

    } catch (err) {
        console.error('Fetch error:', err);
    }
}

main();
