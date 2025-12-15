
async function run() {
    const zipCode = '90002';
    console.log(`Checking Nominatim for ${zipCode}...`);

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=US&format=json&limit=1&addressdetails=1`,
        {
            headers: {
                'User-Agent': 'BakedBot-Debug/1.0',
            },
        }
    );

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);
