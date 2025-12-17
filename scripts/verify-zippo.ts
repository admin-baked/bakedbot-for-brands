
async function checkZippopotam() {
    const city = 'detroit';
    const state = 'mi';
    const url = `https://api.zippopotam.us/us/${state}/${city}`;
    console.log(`Fetching ${url}...`);

    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`HTTP ${res.status}`);
            return;
        }
        const data = await res.json();
        console.log(`Found ${data.places.length} ZIPs`);
        console.log('Sample:', data.places.slice(0, 5).map((p: any) => p['post code']));
    } catch (e) {
        console.error('Error:', e);
    }
}

checkZippopotam();
