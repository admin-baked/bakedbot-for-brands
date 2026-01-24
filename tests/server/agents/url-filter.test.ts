/**
 * Unit Tests: URL Filter Module
 *
 * Tests for the Ezal competitive intelligence URL filtering system.
 * Ensures non-dispensary URLs (blogs, Reddit, news, social media) are filtered.
 */

import {
    filterUrl,
    filterUrls,
    extractDisplayDomain,
    isDispensaryPlatform,
    UrlFilterOptions,
} from '@/server/agents/ezal-team/url-filter';

describe('URL Filter Module', () => {
    // ============ extractDisplayDomain Tests ============
    describe('extractDisplayDomain', () => {
        it('should extract domain without www prefix', () => {
            expect(extractDisplayDomain('https://www.example.com/page')).toBe('example.com');
        });

        it('should handle domains without www', () => {
            expect(extractDisplayDomain('https://dispensary.co/menu')).toBe('dispensary.co');
        });

        it('should handle subdomains', () => {
            expect(extractDisplayDomain('https://store.dutchie.com/menu')).toBe('store.dutchie.com');
        });

        it('should return original string for invalid URLs', () => {
            expect(extractDisplayDomain('not-a-url')).toBe('not-a-url');
        });
    });

    // ============ isDispensaryPlatform Tests ============
    describe('isDispensaryPlatform', () => {
        const platforms = [
            'https://store.dutchie.com/menu',
            'https://www.iheartjane.com/dispensary/abc',
            'https://weedmaps.com/dispensaries/store-name',
            'https://leafly.com/dispensary/store-name',
            'https://meadow.com/store/menu',
            'https://www.flowhub.com/retailer/store',
        ];

        platforms.forEach(url => {
            it(`should identify ${new URL(url).hostname} as dispensary platform`, () => {
                expect(isDispensaryPlatform(url)).toBe(true);
            });
        });

        it('should return false for non-platform URLs', () => {
            expect(isDispensaryPlatform('https://reddit.com/r/cannabis')).toBe(false);
            expect(isDispensaryPlatform('https://example.com')).toBe(false);
            expect(isDispensaryPlatform('https://facebook.com/dispensary')).toBe(false);
        });

        it('should return false for invalid URLs', () => {
            expect(isDispensaryPlatform('not-a-url')).toBe(false);
        });
    });

    // ============ filterUrl - Blocked Domain Tests ============
    describe('filterUrl - Blocked Domains', () => {
        const blockedDomains = [
            // Social Media
            { url: 'https://reddit.com/r/weed', domain: 'reddit.com' },
            { url: 'https://twitter.com/dispensary', domain: 'twitter.com' },
            { url: 'https://facebook.com/local-dispensary', domain: 'facebook.com' },
            { url: 'https://instagram.com/p/12345', domain: 'instagram.com' },
            { url: 'https://tiktok.com/@dispensary', domain: 'tiktok.com' },
            { url: 'https://linkedin.com/company/dispensary', domain: 'linkedin.com' },
            { url: 'https://youtube.com/watch?v=abc', domain: 'youtube.com' },

            // News & Media
            { url: 'https://forbes.com/cannabis-industry', domain: 'forbes.com' },
            { url: 'https://bloomberg.com/news/cannabis', domain: 'bloomberg.com' },
            { url: 'https://vice.com/en/article/cannabis', domain: 'vice.com' },

            // Cannabis News (not dispensaries)
            { url: 'https://hightimes.com/news/article', domain: 'hightimes.com' },
            { url: 'https://cannabisnow.com/article', domain: 'cannabisnow.com' },
            { url: 'https://mjbizdaily.com/report', domain: 'mjbizdaily.com' },

            // Review Sites
            { url: 'https://yelp.com/biz/dispensary-name', domain: 'yelp.com' },

            // Other Non-Dispensary
            { url: 'https://wikipedia.org/wiki/Cannabis', domain: 'wikipedia.org' },
            { url: 'https://quora.com/question/cannabis', domain: 'quora.com' },
        ];

        blockedDomains.forEach(({ url, domain }) => {
            it(`should block ${domain}`, () => {
                const result = filterUrl(url);
                expect(result.allowed).toBe(false);
                expect(result.reason).toContain('Blocked domain');
            });
        });

        it('should block additional custom domains', () => {
            const result = filterUrl('https://custom-blog.com/cannabis', {
                additionalBlockedDomains: ['custom-blog.com'],
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Blocked domain');
        });
    });

    // ============ filterUrl - Blocked Path Tests ============
    describe('filterUrl - Blocked Paths', () => {
        const blockedPaths = [
            { url: 'https://dispensary.com/news/article', pattern: '/news/' },
            { url: 'https://dispensary.com/blog/post-title', pattern: '/blog/' },
            { url: 'https://dispensary.com/article/guide-to-cannabis', pattern: '/article/' },
            { url: 'https://dispensary.com/community/forum', pattern: '/community/' },
            { url: 'https://dispensary.com/reviews/product', pattern: '/reviews/' },
            { url: 'https://dispensary.com/about', pattern: '/about' },
            { url: 'https://dispensary.com/careers', pattern: '/careers' },
            { url: 'https://dispensary.com/jobs', pattern: '/jobs' },
            { url: 'https://dispensary.com/learn/guide', pattern: '/learn/' },
            { url: 'https://dispensary.com/how-to/use-product', pattern: '/how-to/' },
            { url: 'https://dispensary.com/best-of/2024', pattern: '/best-of/' },
            { url: 'https://dispensary.com/top-10-strains', pattern: '/top-' },
        ];

        blockedPaths.forEach(({ url, pattern }) => {
            it(`should block path pattern ${pattern}`, () => {
                const result = filterUrl(url);
                expect(result.allowed).toBe(false);
                expect(result.reason).toContain('Blocked path pattern');
            });
        });
    });

    // ============ filterUrl - Allowed URLs Tests ============
    describe('filterUrl - Allowed URLs', () => {
        const allowedUrls = [
            'https://mydispensary.com/menu',
            'https://store.dutchie.com/embedded-menu/dispensary-name',
            'https://weedmaps.com/dispensaries/dispensary-name',
            'https://leafly.com/dispensary/dispensary-name/menu',
            'https://localdispensary.com/shop/flower',
            'https://dispensaryname.com/products/edibles',
        ];

        allowedUrls.forEach(url => {
            it(`should allow ${new URL(url).hostname}${new URL(url).pathname}`, () => {
                const result = filterUrl(url);
                expect(result.allowed).toBe(true);
            });
        });

        it('should return high confidence for platform URLs', () => {
            const result = filterUrl('https://store.dutchie.com/menu/flower');
            expect(result.allowed).toBe(true);
            expect(result.confidence).toBeGreaterThan(0.8);
            expect(result.isPlatform).toBe(true);
        });

        it('should boost confidence for menu/shop paths', () => {
            const menuResult = filterUrl('https://dispensary.com/menu');
            const plainResult = filterUrl('https://dispensary.com/page');
            expect(menuResult.confidence).toBeGreaterThan(plainResult.confidence);
        });
    });

    // ============ filterUrl - Chain Page Detection ============
    describe('filterUrl - Chain Page Detection', () => {
        it('should mark root URLs as possible chain landing pages', () => {
            const result = filterUrl('https://dispensarychain.com/');
            expect(result.allowed).toBe(true);
            expect(result.reason).toBe('Possible chain landing page');
            expect(result.confidence).toBeLessThan(0.5);
        });

        it('should not flag platform root URLs', () => {
            const result = filterUrl('https://weedmaps.com/');
            expect(result.confidence).toBeGreaterThan(0.5);
        });

        it('should allow chain pages when option enabled', () => {
            const result = filterUrl('https://medmen.com/', { allowChainPages: true });
            expect(result.allowed).toBe(true);
            expect(result.reason).toBeUndefined();
        });
    });

    // ============ filterUrl - Confidence Scoring ============
    describe('filterUrl - Confidence Scoring', () => {
        it('should have higher confidence for dispensary-specific paths', () => {
            const result = filterUrl('https://dispensary.com/dispensary/downtown');
            expect(result.confidence).toBeGreaterThan(0.75);
        });

        it('should reduce confidence for very long paths', () => {
            const shortPath = filterUrl('https://dispensary.com/menu');
            const longPath = filterUrl('https://dispensary.com/a/b/c/d/e/f/g');
            expect(shortPath.confidence).toBeGreaterThan(longPath.confidence);
        });

        it('should allow chain landing pages even with low confidence', () => {
            // Chain landing pages are explicitly allowed with low confidence
            // This is by design - they are marked as "Possible chain landing page"
            const result = filterUrl('https://dispensarychain.com/', {
                minConfidence: 0.6,
            });
            expect(result.allowed).toBe(true);
            expect(result.confidence).toBeLessThan(0.6);
            expect(result.reason).toBe('Possible chain landing page');
        });

        it('should reject non-chain URLs below minimum confidence threshold', () => {
            // For a long path that would normally be allowed but with reduced confidence
            const result = filterUrl('https://dispensary.com/a/b/c/d/e/f/g/h', {
                minConfidence: 0.8,
            });
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Low confidence');
        });
    });

    // ============ filterUrl - Edge Cases ============
    describe('filterUrl - Edge Cases', () => {
        it('should handle invalid URLs', () => {
            const result = filterUrl('not-a-valid-url');
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain('Invalid URL');
            expect(result.confidence).toBe(0);
        });

        it('should normalize URL in result', () => {
            const result = filterUrl('https://WWW.Dispensary.COM/Menu');
            expect(result.normalizedUrl).toBe('https://dispensary.com/Menu');
        });

        it('should preserve query strings in normalized URL', () => {
            const result = filterUrl('https://dispensary.com/menu?category=flower');
            expect(result.normalizedUrl).toContain('?category=flower');
        });
    });

    // ============ filterUrls - Batch Processing ============
    describe('filterUrls', () => {
        it('should separate allowed and blocked URLs', () => {
            const urls = [
                'https://dispensary.com/menu',
                'https://reddit.com/r/trees',
                'https://store.dutchie.com/dispensary',
                'https://twitter.com/dispensary',
            ];

            const result = filterUrls(urls);
            expect(result.allowed).toHaveLength(2);
            expect(result.blocked).toHaveLength(2);
        });

        it('should sort allowed URLs by confidence (highest first)', () => {
            const urls = [
                'https://dispensarychain.com/', // Low confidence
                'https://store.dutchie.com/dispensary/menu', // High confidence
                'https://dispensary.com/page', // Medium confidence
            ];

            const result = filterUrls(urls);
            expect(result.allowed[0].url).toContain('dutchie');
        });

        it('should include reason for blocked URLs', () => {
            const urls = ['https://reddit.com/r/cannabis'];
            const result = filterUrls(urls);
            expect(result.blocked[0].reason).toBeDefined();
            expect(result.blocked[0].reason).toContain('Blocked domain');
        });

        it('should apply options to all URLs', () => {
            const urls = [
                'https://dispensary.com/',
                'https://custom-block.com/menu',
            ];

            const result = filterUrls(urls, {
                additionalBlockedDomains: ['custom-block.com'],
            });

            // Root URL allowed as chain landing page (low confidence but allowed)
            expect(result.allowed.some(a => a.url.includes('dispensary.com'))).toBe(true);
            // Custom domain blocked
            expect(result.blocked.some(b => b.url.includes('custom-block.com'))).toBe(true);
        });

        it('should block additional custom domains', () => {
            const urls = [
                'https://example.com/menu',
                'https://competitor-blog.com/products',
            ];

            const result = filterUrls(urls, {
                additionalBlockedDomains: ['competitor-blog.com'],
            });

            expect(result.allowed).toHaveLength(1);
            expect(result.blocked.some(b => b.url.includes('competitor-blog.com'))).toBe(true);
        });

        it('should handle empty input', () => {
            const result = filterUrls([]);
            expect(result.allowed).toHaveLength(0);
            expect(result.blocked).toHaveLength(0);
        });

        it('should include isPlatform flag in allowed results', () => {
            const urls = [
                'https://store.dutchie.com/menu',
                'https://localdispensary.com/menu',
            ];

            const result = filterUrls(urls);
            const dutchieResult = result.allowed.find(r => r.url.includes('dutchie'));
            const localResult = result.allowed.find(r => r.url.includes('localdispensary'));

            expect(dutchieResult?.isPlatform).toBe(true);
            expect(localResult?.isPlatform).toBe(false);
        });
    });

    // ============ Real-World Scenario Tests ============
    describe('Real-World Scenarios', () => {
        it('should filter out news articles about dispensaries', () => {
            const urls = [
                'https://localnews.com/news/new-dispensary-opens',
                'https://hightimes.com/dispensaries/best-of',
                'https://forbes.com/cannabis-industry-report',
            ];

            const result = filterUrls(urls);
            expect(result.allowed).toHaveLength(0);
            expect(result.blocked).toHaveLength(3);
        });

        it('should correctly identify Leafly dispensary pages vs news', () => {
            const dispensaryPage = filterUrl('https://leafly.com/dispensary/green-thumb');
            const newsPage = filterUrl('https://leafly.com/news/cannabis-legalization');

            expect(dispensaryPage.allowed).toBe(true);
            expect(newsPage.allowed).toBe(false);
        });

        it('should correctly identify Weedmaps dispensary pages vs blog', () => {
            const dispensaryPage = filterUrl('https://weedmaps.com/dispensaries/store-name');
            const blogPage = filterUrl('https://weedmaps.com/learn/guide-to-cannabis');

            expect(dispensaryPage.allowed).toBe(true);
            expect(blogPage.allowed).toBe(false);
        });

        it('should handle multi-level subdomain platforms', () => {
            const result = filterUrl('https://menu.store.dutchie.com/dispensary');
            expect(result.isPlatform).toBe(true);
            expect(result.allowed).toBe(true);
        });
    });
});
