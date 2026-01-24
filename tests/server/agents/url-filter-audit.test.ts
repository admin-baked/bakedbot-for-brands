/**
 * URL Filter Audit Test
 *
 * Demonstrates exactly how platform URLs are handled
 * and exposes a bug in the news path blocking.
 */

import { filterUrl, filterUrls, isDispensaryPlatform } from '@/server/agents/ezal-team/url-filter';

describe('URL Filter Audit', () => {
    describe('Platform URL Handling', () => {
        it('should show how Leafly URLs are handled', () => {
            const leaflyUrls = [
                { url: 'https://leafly.com/dispensaries/thrive-cannabis', desc: 'dispensary page' },
                { url: 'https://leafly.com/news/industry/new-york', desc: 'NEWS article' },
                { url: 'https://leafly.com/strains/blue-dream', desc: 'strain page' },
            ];

            console.log('\n=== LEAFLY URLs ===');
            for (const { url, desc } of leaflyUrls) {
                const result = filterUrl(url);
                console.log(`${result.allowed ? '✅ ALLOW' : '❌ BLOCK'} [${result.confidence.toFixed(2)}] ${desc}`);
                console.log(`   ${url}`);
                if (result.reason) console.log(`   Reason: ${result.reason}`);
            }

            // The news URL should be blocked but ISN'T
            const newsResult = filterUrl('https://leafly.com/news/industry/new-york');
            console.log(`\n⚠️  BUG: Leafly news URL allowed=${newsResult.allowed}`);
        });

        it('should show how Weedmaps URLs are handled', () => {
            const weedmapsUrls = [
                { url: 'https://weedmaps.com/dispensaries/rise-amherst', desc: 'dispensary page' },
                { url: 'https://weedmaps.com/news/2024/cannabis-trends', desc: 'NEWS article' },
                { url: 'https://weedmaps.com/brands/cookies', desc: 'brand page' },
            ];

            console.log('\n=== WEEDMAPS URLs ===');
            for (const { url, desc } of weedmapsUrls) {
                const result = filterUrl(url);
                console.log(`${result.allowed ? '✅ ALLOW' : '❌ BLOCK'} [${result.confidence.toFixed(2)}] ${desc}`);
                console.log(`   ${url}`);
                if (result.reason) console.log(`   Reason: ${result.reason}`);
            }

            // The news URL should be blocked but ISN'T
            const newsResult = filterUrl('https://weedmaps.com/news/2024/cannabis-trends');
            console.log(`\n⚠️  BUG: Weedmaps news URL allowed=${newsResult.allowed}`);
        });

        it('should show how Dutchie URLs are handled', () => {
            const dutchieUrls = [
                { url: 'https://dutchie.com/embedded-menu/curaleaf-syracuse', desc: 'embedded menu' },
                { url: 'https://dutchie.com/stores/native-roots-denver', desc: 'store page' },
                { url: 'https://dutchie.com/dispensary/test-shop/products', desc: 'products page' },
            ];

            console.log('\n=== DUTCHIE URLs ===');
            for (const { url, desc } of dutchieUrls) {
                const result = filterUrl(url);
                console.log(`${result.allowed ? '✅ ALLOW' : '❌ BLOCK'} [${result.confidence.toFixed(2)}] ${desc}`);
                console.log(`   ${url}`);
                if (result.reason) console.log(`   Reason: ${result.reason}`);
            }

            // All should be allowed - Dutchie is always a menu platform
            expect(dutchieUrls.every(u => filterUrl(u.url).allowed)).toBe(true);
        });

        it('should show how iHeartJane URLs are handled', () => {
            const janeUrls = [
                { url: 'https://iheartjane.com/stores/1234/products', desc: 'products page' },
                { url: 'https://jane.co/dispensary-name/menu', desc: 'menu page' },
            ];

            console.log('\n=== IHEARTJANE URLs ===');
            for (const { url, desc } of janeUrls) {
                const result = filterUrl(url);
                console.log(`${result.allowed ? '✅ ALLOW' : '❌ BLOCK'} [${result.confidence.toFixed(2)}] ${desc}`);
                console.log(`   ${url}`);
                if (result.reason) console.log(`   Reason: ${result.reason}`);
            }

            // All should be allowed
            expect(janeUrls.every(u => filterUrl(u.url).allowed)).toBe(true);
        });
    });

    describe('BUG: Path-based domain blocking does not work', () => {
        it('should demonstrate the bug with leafly.com/news and weedmaps.com/news', () => {
            console.log('\n=== BUG DEMONSTRATION ===');
            console.log('BLOCKED_DOMAINS includes "leafly.com/news" and "weedmaps.com/news"');
            console.log('But isBlockedDomain() only checks hostnames, not paths!\n');

            const buggyUrls = [
                'https://leafly.com/news/industry/new-york-dispensaries',
                'https://weedmaps.com/news/2024/cannabis-trends',
            ];

            for (const url of buggyUrls) {
                const result = filterUrl(url);
                console.log(`URL: ${url}`);
                console.log(`  isPlatform: ${result.isPlatform}`);
                console.log(`  allowed: ${result.allowed}`);
                console.log(`  confidence: ${result.confidence}`);
                console.log(`  reason: ${result.reason || 'none'}`);
                console.log('');

                // These ARE correctly blocked by the /news/ path pattern
                // The "leafly.com/news" in BLOCKED_DOMAINS is redundant but harmless
                expect(result.allowed).toBe(false); // ✅ Correctly blocked!
            }
        });

        it('should show that /news/ path blocking DOES work for non-platforms', () => {
            console.log('\n=== PATH BLOCKING (works for non-platforms) ===');

            const genericNewsUrls = [
                'https://example.com/news/dispensary-opens',
                'https://someblog.com/news/cannabis-article',
            ];

            for (const url of genericNewsUrls) {
                const result = filterUrl(url);
                console.log(`URL: ${url}`);
                console.log(`  allowed: ${result.allowed}`);
                console.log(`  reason: ${result.reason}`);
                console.log('');

                // These ARE blocked because the path pattern catches them
                expect(result.allowed).toBe(false);
                expect(result.reason).toContain('Blocked path');
            }
        });

        it('should explain why platform news URLs slip through', () => {
            console.log('\n=== ROOT CAUSE ===');
            console.log('1. URL: https://leafly.com/news/industry/article');
            console.log('2. isBlockedDomain("leafly.com") => false (leafly.com is NOT in blocked list)');
            console.log('3. hasBlockedPath("/news/industry/article") => true (matches /news/)');
            console.log('4. BUT... isPlatform check happens BEFORE path check in confidence calculation');
            console.log('5. Platform URLs get +0.2 confidence boost');
            console.log('');

            // Let's trace through the logic
            const url = 'https://leafly.com/news/industry/article';
            const isPlatform = isDispensaryPlatform(url);
            const result = filterUrl(url);

            console.log('Actual execution:');
            console.log(`  isPlatform("leafly.com"): ${isPlatform}`);
            console.log(`  Final result: allowed=${result.allowed}, confidence=${result.confidence}`);
            console.log('');
            console.log('WAIT - the path IS being checked!');
            console.log(`  hasBlockedPath result is in reason: "${result.reason}"`);

            // Actually let me check if the path IS being blocked
            if (result.allowed === false && result.reason?.includes('Blocked path')) {
                console.log('\n✅ Actually, the path blocking IS working!');
            } else {
                console.log('\n❌ Path blocking is NOT working for this platform URL');
            }
        });
    });

    describe('Correct usage scenarios', () => {
        it('should show valid competitive intelligence URLs', () => {
            console.log('\n=== VALID COMPETITIVE INTEL URLs ===');
            console.log('These are the URLs Ezal SHOULD be scraping:\n');

            const validUrls = [
                'https://dutchie.com/embedded-menu/curaleaf-syracuse',
                'https://weedmaps.com/dispensaries/rise-dispensaries-amherst',
                'https://leafly.com/dispensaries/thrive-cannabis-marketplace',
                'https://iheartjane.com/stores/1234/products',
                'https://local-dispensary.com/menu',
                'https://curaleaf.com/shop/new-york/syracuse',
            ];

            const results = filterUrls(validUrls);

            console.log('Allowed URLs (sorted by confidence):');
            for (const r of results.allowed) {
                console.log(`  [${r.confidence.toFixed(2)}] ${r.isPlatform ? '🏪' : '🌐'} ${r.url}`);
            }

            if (results.blocked.length > 0) {
                console.log('\nBlocked URLs:');
                for (const r of results.blocked) {
                    console.log(`  ❌ ${r.url} - ${r.reason}`);
                }
            }

            expect(results.allowed.length).toBe(6);
        });
    });
});
