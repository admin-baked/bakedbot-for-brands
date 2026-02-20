const brands = {
    'Flowerhouse': 'https://flowerhouseny.com',
    'Melo': 'https://haveamelo.com',
    'Kings Road': 'https://kingsroadcannabis.com',
    'High Peaks': 'https://highpeakscannabis.com',
    'Nanticoke': 'https://nanticokefarms.com',
    'Cannabals': 'https://cannabalsny.com',
    'Off Hours': 'https://offhoursco.com',
    'MFNY': 'https://mfny.com',
    'Find': 'https://findtreatment.com',
    'B Noble': 'https://bnoble.com',
    'Ayrloom': 'https://ayrloom.com',
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
};

async function tryBrand(name, url) {
    try {
        const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
        if (!r.ok) {
            console.log(`${name}: HTTP ${r.status}`);
            return;
        }
        const html = await r.text();
        const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
        const logo = html.match(/<img[^>]+(?:class|alt|id)=["'][^"']*logo[^"']*["'][^>]+src=["']([^"']+)["']/i);
        console.log(`${name}:`);
        console.log(`  og:image = ${og?.[1] || 'none'}`);
        console.log(`  twitter  = ${tw?.[1] || 'none'}`);
        console.log(`  logo img = ${logo?.[1] || 'none'}`);
    } catch (e) {
        console.log(`${name}: ERROR - ${e.message}`);
    }
}

for (const [name, url] of Object.entries(brands)) {
    await tryBrand(name, url);
    await new Promise(r => setTimeout(r, 500));
}
