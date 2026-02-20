const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,*/*;q=0.8',
};
const r = await fetch('https://mfny.co', { headers: HEADERS, signal: AbortSignal.timeout(8000) });
const html = await r.text();

// All src= attributes
const allSrcs = [...html.matchAll(/src=["']([^"']+)["']/gi)].map(m => m[1]);
const nonSvg = allSrcs.filter(u => !u.endsWith('.svg') && !u.includes('-icon'));
console.log('Non-SVG images:');
nonSvg.forEach(u => console.log(' ', u));
