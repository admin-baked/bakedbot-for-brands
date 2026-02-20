const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
const urls = [
    ['webclip', 'https://cdn.prod.website-files.com/65ef2b75c351263c368485e8/65f326f4b6cd492992a44ffb_webclip.png'],
    ['favicon', 'https://cdn.prod.website-files.com/65ef2b75c351263c368485e8/65f326c9a5a19775d0007c2d_Favicon.png'],
    ['image1',  'https://cdn.prod.website-files.com/65ef2b75c351263c36848600/69399e74a1834e97927feae2_image.png'],
    ['image2',  'https://cdn.prod.website-files.com/65ef2b75c351263c36848600/69399f3b70d27d2102e9f9d7_image.png'],
    ['image3',  'https://cdn.prod.website-files.com/65ef2b75c351263c36848600/6939a508c91193e76ad5348c_image.png'],
];
for (const [name, url] of urls) {
    const r = await fetch(url, { headers: HEADERS, method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const ct = r.headers.get('content-type') || '';
    const cl = parseInt(r.headers.get('content-length') || '0');
    console.log(`${name}: ${r.status} ${Math.round(cl/1024)}KB ${ct.split('/')[1] || ''} ${url}`);
}
