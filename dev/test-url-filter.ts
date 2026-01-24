/**
 * URL Filter Audit Script
 * Run with: npx ts-node dev/test-url-filter.ts
 */

import { filterUrl, filterUrls } from '../src/server/agents/ezal-team/url-filter';

console.log('=== PLATFORM URL ANALYSIS ===\n');

// Test cases for the platforms
const testUrls = [
    // Leafly examples
    { url: 'https://leafly.com/dispensaries/thrive-cannabis-marketplace', expected: 'ALLOW - dispensary page' },
    { url: 'https://leafly.com/news/industry/new-york-dispensaries', expected: 'BLOCK - news article' },
    { url: 'https://leafly.com/strains/blue-dream', expected: '? strain page' },

    // Weedmaps examples
    { url: 'https://weedmaps.com/dispensaries/rise-dispensaries-amherst', expected: 'ALLOW - dispensary page' },
    { url: 'https://weedmaps.com/news/2024/cannabis-trends', expected: 'BLOCK - news article' },
    { url: 'https://weedmaps.com/brands/cookies', expected: '? brand page' },

    // Dutchie examples
    { url: 'https://dutchie.com/embedded-menu/curaleaf-syracuse', expected: 'ALLOW - embedded menu' },
    { url: 'https://dutchie.com/stores/native-roots-denver', expected: 'ALLOW - store page' },

    // iHeartJane examples
    { url: 'https://iheartjane.com/stores/1234/products', expected: 'ALLOW - products page' },
    { url: 'https://jane.co/dispensary-name/menu', expected: 'ALLOW - menu page' },
];

console.log('Testing individual URLs:\n');
console.log('Status | Confidence | Expected | URL');
console.log('-'.repeat(120));

for (const { url, expected } of testUrls) {
    const result = filterUrl(url);
    const status = result.allowed ? '✅ ALLOW' : '❌ BLOCK';
    const reason = result.reason || (result.isPlatform ? 'Platform' : 'Passed');
    console.log(`${status} | ${result.confidence.toFixed(2)}       | ${expected.padEnd(25)} | ${url}`);
    if (result.reason) {
        console.log(`         Reason: ${result.reason}`);
    }
}

console.log('\n\n=== BUG ANALYSIS ===\n');

console.log('BLOCKED_DOMAINS list includes:');
console.log('  - "leafly.com/news"');
console.log('  - "weedmaps.com/news"');
console.log('');
console.log('Problem: These are PATHS, not domains!');
console.log('The isBlockedDomain() function only checks hostnames.');
console.log('');

const newsUrls = [
    'https://leafly.com/news/industry/new-york-dispensaries',
    'https://weedmaps.com/news/2024/cannabis-trends',
];

console.log('News URLs that SHOULD be blocked but are NOT:\n');
for (const url of newsUrls) {
    const result = filterUrl(url);
    console.log(`  ${result.allowed ? '⚠️  BUG - ALLOWED' : '✅ BLOCKED'}: ${url}`);
    console.log(`      allowed=${result.allowed}, confidence=${result.confidence}, reason="${result.reason || 'none'}"`);
}

console.log('\n\n=== WHAT THE FILTER ACTUALLY BLOCKS ===\n');

const blockedExamples = [
    'https://reddit.com/r/trees/best-dispensaries',
    'https://instagram.com/dispensary123',
    'https://hightimes.com/culture/best-dispensaries',
    'https://yelp.com/biz/dispensary-name',
    'https://example.com/news/dispensary-opens',  // Path-based block works here
    'https://example.com/blog/cannabis-guide',    // Path-based block works here
];

console.log('These ARE correctly blocked:\n');
for (const url of blockedExamples) {
    const result = filterUrl(url);
    console.log(`  ${result.allowed ? '⚠️  ALLOWED' : '✅ BLOCKED'}: ${url}`);
    console.log(`      Reason: ${result.reason}`);
}

console.log('\n\n=== RECOMMENDED FIX ===\n');
console.log('Remove "leafly.com/news" and "weedmaps.com/news" from BLOCKED_DOMAINS.');
console.log('The BLOCKED_PATH_PATTERNS already has /news/ which will catch these.');
console.log('');
console.log('Current BLOCKED_PATH_PATTERNS includes: /\\/news\\//i');
console.log('This SHOULD block any URL with /news/ in the path.\n');

// Let's verify the path pattern works
const pathTest = 'https://example.com/news/article';
const pathResult = filterUrl(pathTest);
console.log(`Path pattern test: ${pathTest}`);
console.log(`  Result: ${pathResult.allowed ? 'ALLOWED' : 'BLOCKED'}, reason: ${pathResult.reason}`);
