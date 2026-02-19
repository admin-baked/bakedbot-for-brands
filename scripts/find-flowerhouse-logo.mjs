const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*;q=0.8',
};
const pages = [
    ['Flowerhouse-HW', 'https://hwcannabis.co/menu/broadway/brands/flowerhouse-new-york-123595/'],
    ['Flowerhouse-StrainStars', 'https://strainstarsny.com/brands/flowerhouse/'],
    ['Flowerhouse-TerpBros', 'https://www.terpbrosnyc.com/featured-brands/flowerhouse/'],
];
for (const [name, url] of pages) {
    try {
        const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
        const html = await r.text();
        const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
        const brandImgs = [...html.matchAll(/src=["']([^"']*flowerhouse[^"']*)["']/gi)].map(m => m[1]);
        console.log(`${name} (${r.status}):`);
        if (og?.[1]) console.log(`  og: ${og[1]}`);
        if (brandImgs.length) console.log(`  brand imgs: ${brandImgs.slice(0, 3).join(', ')}`);
        if (!og?.[1] && !brandImgs.length) console.log('  no logo found');
    } catch (e) {
        console.log(`${name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 400));
}
