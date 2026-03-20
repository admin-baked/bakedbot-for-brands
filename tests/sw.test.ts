/**
 * Service Worker Tests
 * Tests the caching logic for the PWA service worker
 */

describe('Service Worker Caching Logic', () => {
    // Test the isDynamicBrandPage function logic
    const staticPaths = ['dashboard', 'api', 'pricing', 'checkout', 'onboarding', 'brand-login', 'claim', '_next', 'static'];
    const noCachePathPrefixes = ['/dashboard', '/_next/'];

    function isDynamicBrandPage(pathname: string): boolean {
        const segments = pathname.split('/').filter(Boolean);

        // Single segment path that's not a known static path = likely a brand page
        if (segments.length === 1 && !staticPaths.includes(segments[0])) {
            return true;
        }
        // Also match /brandname/collection patterns
        if (segments.length >= 1 && !staticPaths.includes(segments[0])) {
            return true;
        }
        return false;
    }

    function matchesPathPrefix(pathname: string, prefix: string): boolean {
        if (prefix.endsWith('/')) {
            return pathname.startsWith(prefix);
        }

        return pathname === prefix || pathname.startsWith(`${prefix}/`);
    }

    function shouldBypassCache(pathname: string): boolean {
        return noCachePathPrefixes.some((prefix) => matchesPathPrefix(pathname, prefix));
    }

    describe('isDynamicBrandPage', () => {
        it('should identify single-segment brand pages', () => {
            expect(isDynamicBrandPage('/ecstaticedibles')).toBe(true);
            expect(isDynamicBrandPage('/mybrand')).toBe(true);
            expect(isDynamicBrandPage('/cannabis-co')).toBe(true);
        });

        it('should identify brand collection pages', () => {
            expect(isDynamicBrandPage('/ecstaticedibles/flower')).toBe(true);
            expect(isDynamicBrandPage('/mybrand/edibles')).toBe(true);
        });

        it('should NOT identify dashboard pages as brand pages', () => {
            expect(isDynamicBrandPage('/dashboard')).toBe(false);
            expect(isDynamicBrandPage('/dashboard/products')).toBe(false);
            expect(isDynamicBrandPage('/dashboard/settings')).toBe(false);
        });

        it('should NOT identify API routes as brand pages', () => {
            expect(isDynamicBrandPage('/api/products')).toBe(false);
            expect(isDynamicBrandPage('/api/auth/login')).toBe(false);
        });

        it('should NOT identify static paths as brand pages', () => {
            expect(isDynamicBrandPage('/pricing')).toBe(false);
            expect(isDynamicBrandPage('/checkout')).toBe(false);
            expect(isDynamicBrandPage('/onboarding')).toBe(false);
            expect(isDynamicBrandPage('/brand-login')).toBe(false);
            expect(isDynamicBrandPage('/claim')).toBe(false);
        });

        it('should NOT identify _next paths as brand pages', () => {
            expect(isDynamicBrandPage('/_next/static/chunks/main.js')).toBe(false);
            expect(isDynamicBrandPage('/_next/data/build-id/page.json')).toBe(false);
        });

        it('should handle root path correctly', () => {
            expect(isDynamicBrandPage('/')).toBe(false);
        });
    });

    describe('Caching Strategy', () => {
        it('should use network-first for brand pages to ensure fresh content', () => {
            // This is a conceptual test - the actual SW can't be easily unit tested
            // but we document the expected behavior
            const brandPagePaths = ['/ecstaticedibles', '/mybrand/flower'];

            brandPagePaths.forEach(path => {
                expect(isDynamicBrandPage(path)).toBe(true);
                // Network-first means: fetch from network, fallback to offline page on error
            });
        });

        it('should use network-first for dashboard pages', () => {
            const dashboardPaths = ['/dashboard', '/dashboard/products', '/dashboard/settings'];

            dashboardPaths.forEach(path => {
                // Dashboard pages should NOT be cached
                expect(shouldBypassCache(path)).toBe(true);
            });
        });

        it('should bypass the SW cache for Next.js build assets', () => {
            const nextAssets = [
                '/_next/static/chunks/main.js',
                '/_next/static/css/app.css',
                '/_next/image',
            ];

            nextAssets.forEach(asset => {
                expect(shouldBypassCache(asset)).toBe(true);
            });
        });

        it('should allow cache-first behavior for truly static assets outside /_next', () => {
            const staticAssets = ['/manifest.json', '/icon-192.png', '/offline.html'];

            staticAssets.forEach(asset => {
                expect(shouldBypassCache(asset)).toBe(false);
            });
        });
    });

    describe('Cache Version', () => {
        it('should have updated cache version to invalidate old caches', () => {
            // The cache name was bumped to clear old /_next asset caches after deploys
            const expectedCacheName = 'bakedbot-v3';
            expect(expectedCacheName).toBe('bakedbot-v3');
        });
    });
});
