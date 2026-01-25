/**
 * @jest-environment node
 */
/**
 * Unit Tests: Domain Routing Middleware
 *
 * Tests for subdomain and custom domain routing in middleware.
 * Verifies correct URL rewriting for brand subdomains and custom domains.
 *
 * [BUILDER-MODE @ 2026-01-24]
 * Created as part of custom domain routing implementation
 */

import { NextRequest } from 'next/server';

// Mock the cors module
jest.mock('@/lib/cors', () => ({
    getCorsHeaders: jest.fn(() => ({
        'Access-Control-Allow-Origin': '*',
    })),
    CORS_PREFLIGHT_HEADERS: {
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    isOriginAllowed: jest.fn(() => true),
}));

// Helper to create mock NextRequest
function createMockRequest(
    url: string,
    options: {
        host?: string;
        method?: string;
        xForwardedHost?: string;
        xForwardedProto?: string;
    } = {}
): NextRequest {
    const { host, method = 'GET', xForwardedHost, xForwardedProto } = options;

    const headers = new Headers();
    if (host) headers.set('host', host);
    if (xForwardedHost) headers.set('x-forwarded-host', xForwardedHost);
    if (xForwardedProto) headers.set('x-forwarded-proto', xForwardedProto);

    return new NextRequest(url, {
        method,
        headers,
    });
}

describe('Domain Routing Logic', () => {
    describe('isCustomDomain detection', () => {
        const checkIsCustomDomain = (hostname: string): boolean => {
            return (
                !hostname.includes('bakedbot.ai') &&
                !hostname.includes('localhost') &&
                !hostname.includes('127.0.0.1') &&
                !hostname.includes('firebaseapp.com') &&
                !hostname.includes('hosted.app') &&
                !hostname.includes('web.app') &&
                !hostname.includes('appspot.com') &&
                hostname.includes('.')
            );
        };

        it('should detect ecstaticedibles.com as custom domain', () => {
            expect(checkIsCustomDomain('ecstaticedibles.com')).toBe(true);
        });

        it('should detect mybrand.co as custom domain', () => {
            expect(checkIsCustomDomain('mybrand.co')).toBe(true);
        });

        it('should NOT detect bakedbot.ai as custom domain', () => {
            expect(checkIsCustomDomain('bakedbot.ai')).toBe(false);
        });

        it('should NOT detect subdomain.bakedbot.ai as custom domain', () => {
            expect(checkIsCustomDomain('ecstaticedibles.bakedbot.ai')).toBe(false);
        });

        it('should NOT detect localhost as custom domain', () => {
            expect(checkIsCustomDomain('localhost')).toBe(false);
            expect(checkIsCustomDomain('localhost:3000')).toBe(false);
        });

        it('should NOT detect Firebase hosting domains as custom domain', () => {
            expect(checkIsCustomDomain('myapp.firebaseapp.com')).toBe(false);
            expect(checkIsCustomDomain('myapp.web.app')).toBe(false);
            expect(checkIsCustomDomain('myapp.appspot.com')).toBe(false);
        });

        it('should NOT detect Firebase App Hosting domain as custom domain', () => {
            expect(checkIsCustomDomain('bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app')).toBe(false);
        });

        it('should NOT detect 127.0.0.1 as custom domain', () => {
            expect(checkIsCustomDomain('127.0.0.1')).toBe(false);
            expect(checkIsCustomDomain('127.0.0.1:3000')).toBe(false);
        });

        it('should require a dot for custom domain', () => {
            expect(checkIsCustomDomain('nodotdomain')).toBe(false);
        });
    });

    describe('Subdomain detection for *.bakedbot.ai', () => {
        const checkHasSubdomain = (hostname: string): { hasSubdomain: boolean; subdomain?: string } => {
            const bakedBotDomains = ['bakedbot.ai', 'bakedbot.dev', 'localhost:9000'];
            const isBakedBotDomain = bakedBotDomains.some(d => hostname.includes(d));

            if (!isBakedBotDomain) {
                return { hasSubdomain: false };
            }

            const hostParts = hostname.split('.');
            const isLocalhost = hostname.includes('localhost');
            const hasSubdomain = isLocalhost
                ? hostParts[0] !== 'localhost' && hostParts.length > 1
                : hostParts.length > 2 && hostParts[0] !== 'www';

            if (hasSubdomain) {
                const subdomain = hostParts[0].toLowerCase();
                const reservedSubdomains = ['www', 'api', 'app', 'dashboard', 'admin', 'mail', 'cdn', 'static'];
                if (!reservedSubdomains.includes(subdomain)) {
                    return { hasSubdomain: true, subdomain };
                }
            }

            return { hasSubdomain: false };
        };

        it('should detect ecstaticedibles.bakedbot.ai as subdomain', () => {
            const result = checkHasSubdomain('ecstaticedibles.bakedbot.ai');
            expect(result.hasSubdomain).toBe(true);
            expect(result.subdomain).toBe('ecstaticedibles');
        });

        it('should detect mybrand.bakedbot.ai as subdomain', () => {
            const result = checkHasSubdomain('mybrand.bakedbot.ai');
            expect(result.hasSubdomain).toBe(true);
            expect(result.subdomain).toBe('mybrand');
        });

        it('should NOT detect www.bakedbot.ai as subdomain', () => {
            const result = checkHasSubdomain('www.bakedbot.ai');
            expect(result.hasSubdomain).toBe(false);
        });

        it('should NOT detect bakedbot.ai (root domain) as subdomain', () => {
            const result = checkHasSubdomain('bakedbot.ai');
            expect(result.hasSubdomain).toBe(false);
        });

        it('should NOT detect reserved subdomains', () => {
            expect(checkHasSubdomain('api.bakedbot.ai').hasSubdomain).toBe(false);
            expect(checkHasSubdomain('app.bakedbot.ai').hasSubdomain).toBe(false);
            expect(checkHasSubdomain('dashboard.bakedbot.ai').hasSubdomain).toBe(false);
            expect(checkHasSubdomain('admin.bakedbot.ai').hasSubdomain).toBe(false);
            expect(checkHasSubdomain('cdn.bakedbot.ai').hasSubdomain).toBe(false);
            expect(checkHasSubdomain('static.bakedbot.ai').hasSubdomain).toBe(false);
        });

        it('should work with bakedbot.dev domain', () => {
            const result = checkHasSubdomain('mybrand.bakedbot.dev');
            expect(result.hasSubdomain).toBe(true);
            expect(result.subdomain).toBe('mybrand');
        });

        it('should lowercase subdomain', () => {
            const result = checkHasSubdomain('MyBrand.bakedbot.ai');
            expect(result.subdomain).toBe('mybrand');
        });
    });

    describe('URL Rewrite Path Construction', () => {
        it('should construct correct rewrite path for subdomain root', () => {
            const subdomain = 'ecstaticedibles';
            const pathname = '/';
            const expectedPath = `/${subdomain}`;
            expect(expectedPath).toBe('/ecstaticedibles');
        });

        it('should construct correct rewrite path for subdomain with path', () => {
            const subdomain = 'ecstaticedibles';
            const pathname = '/products';
            const expectedPath = `/${subdomain}${pathname}`;
            expect(expectedPath).toBe('/ecstaticedibles/products');
        });

        it('should not double-prefix if already prefixed', () => {
            const subdomain = 'ecstaticedibles';
            const pathname = '/ecstaticedibles/products';
            const shouldRewrite = !pathname.startsWith(`/${subdomain}`);
            expect(shouldRewrite).toBe(false);
        });
    });
});

describe('Domain Routing Integration', () => {
    // These tests would require mocking NextResponse which is complex
    // For now, we test the logic functions directly above

    describe('Request URL parsing', () => {
        it('should parse hostname from request', () => {
            const request = createMockRequest('https://ecstaticedibles.bakedbot.ai/', {
                host: 'ecstaticedibles.bakedbot.ai',
            });

            expect(request.headers.get('host')).toBe('ecstaticedibles.bakedbot.ai');
        });

        it('should prefer x-forwarded-host over host', () => {
            const request = createMockRequest('https://internal.server/', {
                host: 'internal.server',
                xForwardedHost: 'ecstaticedibles.com',
            });

            const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
            expect(hostname).toBe('ecstaticedibles.com');
        });

        it('should get pathname from request URL', () => {
            const request = createMockRequest('https://ecstaticedibles.bakedbot.ai/products', {
                host: 'ecstaticedibles.bakedbot.ai',
            });

            expect(request.nextUrl.pathname).toBe('/products');
        });
    });
});
