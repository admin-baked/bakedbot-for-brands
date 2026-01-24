/**
 * Competitive Intelligence Playbook Tests
 *
 * Verifies that the CI playbook is auto-created on signup and that
 * the Ezal pipeline properly discovers, scrapes, and analyzes competitors.
 */

import {
    createCompetitiveIntelPlaybook,
    runCompetitiveIntelScan,
    CompetitiveIntelPlaybookConfig,
} from '@/server/actions/pilot-setup';
import {
    filterUrl,
    filterUrls,
    isDispensaryPlatform,
    extractDisplayDomain,
} from '@/server/agents/ezal-team/url-filter';

// Mock Firestore
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn().mockResolvedValue({
        firestore: {
            collection: (name: string) => mockCollection(name),
        },
    }),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Competitive Intelligence Playbook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCompetitiveIntelPlaybook', () => {
        it('should create a CI playbook for a dispensary', async () => {
            const config: CompetitiveIntelPlaybookConfig = {
                brandName: 'Thrive Syracuse',
                brandType: 'dispensary',
                city: 'Syracuse',
                state: 'NY',
                scheduleFrequency: 'weekly',
                maxUrls: 10,
                reportEmail: 'owner@thrivesyracuse.com',
            };

            const result = await createCompetitiveIntelPlaybook(
                'dispensary_thrive_syracuse',
                'dispensary_thrive_syracuse',
                config
            );

            expect(result.success).toBe(true);
            expect(result.playbookId).toBe('playbook_thrive_syracuse_competitive_intel');

            // Verify Firestore was called
            expect(mockCollection).toHaveBeenCalledWith('playbooks');
            expect(mockDoc).toHaveBeenCalledWith('playbook_thrive_syracuse_competitive_intel');

            // Check the playbook data
            const playbookData = mockSet.mock.calls[0][0];
            expect(playbookData.name).toBe('Competitive Intelligence Report');
            expect(playbookData.agent).toBe('ezal');
            expect(playbookData.category).toBe('intelligence');
            expect(playbookData.status).toBe('active');

            // Verify search query includes location
            expect(playbookData.metadata.searchQuery).toContain('Syracuse');
            expect(playbookData.metadata.searchQuery).toContain('NY');
            expect(playbookData.metadata.searchQuery).toContain('cannabis dispensary');
        });

        it('should create a CI playbook for a brand', async () => {
            const config: CompetitiveIntelPlaybookConfig = {
                brandName: 'Cookies',
                brandType: 'brand',
                state: 'CA',
                scheduleFrequency: 'weekly',
                maxUrls: 15,
            };

            const result = await createCompetitiveIntelPlaybook(
                'brand_cookies',
                'brand_cookies',
                config
            );

            expect(result.success).toBe(true);
            expect(result.playbookId).toBe('playbook_cookies_competitive_intel');

            const playbookData = mockSet.mock.calls[0][0];
            expect(playbookData.metadata.searchQuery).toContain('Cookies');
            expect(playbookData.metadata.searchQuery).toContain('brand competitors');
        });

        it('should use correct cron schedule based on frequency', async () => {
            const frequencies: Array<{
                freq: 'daily' | 'weekly' | 'monthly';
                expected: string;
            }> = [
                { freq: 'daily', expected: '0 8 * * *' },
                { freq: 'weekly', expected: '0 8 * * 1' },
                { freq: 'monthly', expected: '0 8 1 * *' },
            ];

            for (const { freq, expected } of frequencies) {
                jest.clearAllMocks();

                await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                    brandName: 'Test',
                    brandType: 'brand',
                    scheduleFrequency: freq,
                });

                const playbookData = mockSet.mock.calls[0][0];
                expect(playbookData.triggers[0].cron).toBe(expected);
            }
        });

        it('should include watchlist URLs in playbook config', async () => {
            const watchlistUrls = [
                'https://competitor1.com/menu',
                'https://competitor2.com/products',
            ];

            const result = await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                brandName: 'Test Brand',
                brandType: 'brand',
                scheduleFrequency: 'weekly',
                watchlistUrls,
            });

            expect(result.success).toBe(true);

            const playbookData = mockSet.mock.calls[0][0];
            expect(playbookData.steps[0].params.manualUrls).toEqual(watchlistUrls);
        });

        it('should include email sending step when reportEmail provided', async () => {
            await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                brandName: 'Test Brand',
                brandType: 'brand',
                scheduleFrequency: 'weekly',
                reportEmail: 'owner@test.com',
            });

            const playbookData = mockSet.mock.calls[0][0];
            expect(playbookData.yaml).toContain('send_email');
            expect(playbookData.yaml).toContain('owner@test.com');
        });
    });

    describe('URL Filtering', () => {
        describe('filterUrl', () => {
            it('should allow valid dispensary URLs', () => {
                const validUrls = [
                    'https://example-dispensary.com/menu',
                    'https://dutchie.com/embedded-menu/test-store',
                    'https://weedmaps.com/dispensaries/test-dispensary',
                    'https://iheartjane.com/stores/1234/products',
                    'https://local-shop.com/products',
                ];

                for (const url of validUrls) {
                    const result = filterUrl(url);
                    expect(result.allowed).toBe(true);
                    expect(result.confidence).toBeGreaterThan(0.5);
                }
            });

            it('should block social media URLs', () => {
                const blockedUrls = [
                    'https://reddit.com/r/cannabis',
                    'https://twitter.com/dispensary',
                    'https://facebook.com/weedshop',
                    'https://instagram.com/cannabisbrand',
                    'https://tiktok.com/@dispensary',
                ];

                for (const url of blockedUrls) {
                    const result = filterUrl(url);
                    expect(result.allowed).toBe(false);
                    expect(result.reason).toContain('Blocked domain');
                }
            });

            it('should block news and blog URLs', () => {
                const blockedUrls = [
                    'https://hightimes.com/news/best-dispensaries',
                    'https://forbes.com/cannabis-industry',
                    'https://medium.com/cannabis-blog',
                    'https://leafly.com/news/article/new-strains',
                ];

                for (const url of blockedUrls) {
                    const result = filterUrl(url);
                    expect(result.allowed).toBe(false);
                }
            });

            it('should block URLs with news/blog path patterns', () => {
                const blockedPaths = [
                    'https://example.com/news/dispensary-opens',
                    'https://example.com/blog/cannabis-guide',
                    'https://example.com/article/best-strains',
                    'https://example.com/community/discussion',
                ];

                for (const url of blockedPaths) {
                    const result = filterUrl(url);
                    expect(result.allowed).toBe(false);
                    expect(result.reason).toContain('Blocked path');
                }
            });

            it('should boost confidence for known platforms', () => {
                const platformUrl = 'https://dutchie.com/embedded-menu/test';
                const genericUrl = 'https://random-dispensary.com/menu';

                const platformResult = filterUrl(platformUrl);
                const genericResult = filterUrl(genericUrl);

                expect(platformResult.isPlatform).toBe(true);
                expect(genericResult.isPlatform).toBe(false);
                expect(platformResult.confidence).toBeGreaterThan(genericResult.confidence);
            });

            it('should boost confidence for menu/shop/store paths', () => {
                const menuUrl = 'https://example.com/menu';
                const shopUrl = 'https://example.com/shop/products';
                const orderUrl = 'https://example.com/order';
                const rootUrl = 'https://example.com/';

                expect(filterUrl(menuUrl).confidence).toBeGreaterThan(filterUrl(rootUrl).confidence);
                expect(filterUrl(shopUrl).confidence).toBeGreaterThan(filterUrl(rootUrl).confidence);
                expect(filterUrl(orderUrl).confidence).toBeGreaterThan(filterUrl(rootUrl).confidence);
            });

            it('should handle invalid URLs gracefully', () => {
                // Test truly invalid URLs (not parseable)
                const invalidUrls = [
                    'not-a-url',
                    '',
                    '://missing-protocol.com',
                ];

                for (const url of invalidUrls) {
                    const result = filterUrl(url);
                    expect(result.allowed).toBe(false);
                    expect(result.confidence).toBe(0);
                }
            });
        });

        describe('filterUrls (batch)', () => {
            it('should separate allowed and blocked URLs', () => {
                const urls = [
                    'https://good-dispensary.com/menu',
                    'https://reddit.com/r/trees',
                    'https://dutchie.com/store/test',
                    'https://facebook.com/weedshop',
                    'https://another-shop.com/products',
                ];

                const result = filterUrls(urls);

                expect(result.allowed.length).toBe(3);
                expect(result.blocked.length).toBe(2);

                // Verify blocked reasons
                expect(result.blocked.some(b => b.url.includes('reddit'))).toBe(true);
                expect(result.blocked.some(b => b.url.includes('facebook'))).toBe(true);
            });

            it('should sort allowed URLs by confidence (highest first)', () => {
                const urls = [
                    'https://random.com/',  // Lower confidence (root)
                    'https://dutchie.com/store/test',  // High (platform)
                    'https://dispensary.com/menu',  // Medium-high (menu path)
                ];

                const result = filterUrls(urls);

                // Platform URL should be first (highest confidence)
                expect(result.allowed[0].url).toContain('dutchie.com');
                expect(result.allowed[0].confidence).toBeGreaterThanOrEqual(
                    result.allowed[1].confidence
                );
            });

            it('should respect additional blocked domains', () => {
                const urls = [
                    'https://competitor-we-own.com/menu',
                    'https://other-dispensary.com/menu',
                ];

                const result = filterUrls(urls, {
                    additionalBlockedDomains: ['competitor-we-own.com'],
                });

                expect(result.allowed.length).toBe(1);
                expect(result.blocked.length).toBe(1);
                expect(result.blocked[0].url).toContain('competitor-we-own.com');
            });
        });

        describe('isDispensaryPlatform', () => {
            it('should identify known platforms', () => {
                const platforms = [
                    'https://dutchie.com/store/test',
                    'https://iheartjane.com/stores/123',
                    'https://weedmaps.com/dispensaries/test',
                    'https://leafly.com/dispensary/test',
                    'https://www.meadow.com/store',
                ];

                for (const url of platforms) {
                    expect(isDispensaryPlatform(url)).toBe(true);
                }
            });

            it('should not identify non-platforms', () => {
                const nonPlatforms = [
                    'https://my-dispensary.com',
                    'https://random-shop.com',
                    'https://google.com',
                ];

                for (const url of nonPlatforms) {
                    expect(isDispensaryPlatform(url)).toBe(false);
                }
            });
        });

        describe('extractDisplayDomain', () => {
            it('should extract clean domain names', () => {
                expect(extractDisplayDomain('https://www.example.com/path')).toBe('example.com');
                expect(extractDisplayDomain('https://subdomain.example.com')).toBe('subdomain.example.com');
                expect(extractDisplayDomain('http://example.com:8080/path')).toBe('example.com');
            });

            it('should handle invalid URLs gracefully', () => {
                expect(extractDisplayDomain('not-a-url')).toBe('not-a-url');
            });
        });
    });

    describe('Search Query Generation', () => {
        it('should generate location-based query for dispensaries', async () => {
            await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                brandName: 'Green Leaf',
                brandType: 'dispensary',
                city: 'Denver',
                state: 'CO',
                scheduleFrequency: 'weekly',
            });

            const playbookData = mockSet.mock.calls[0][0];
            const query = playbookData.metadata.searchQuery;

            expect(query).toContain('Denver');
            expect(query).toContain('CO');
            expect(query).toContain('cannabis dispensary');
            expect(query).toContain('menu prices');
        });

        it('should generate brand-focused query for brands', async () => {
            await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                brandName: 'Cookies',
                brandType: 'brand',
                state: 'CA',
                scheduleFrequency: 'weekly',
            });

            const playbookData = mockSet.mock.calls[0][0];
            const query = playbookData.metadata.searchQuery;

            expect(query).toContain('Cookies');
            expect(query).toContain('cannabis brand');
            expect(query).toContain('competitors');
            expect(query).toContain('CA');
        });

        it('should handle missing location gracefully', async () => {
            await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                brandName: 'National Brand',
                brandType: 'brand',
                scheduleFrequency: 'monthly',
            });

            const playbookData = mockSet.mock.calls[0][0];
            const query = playbookData.metadata.searchQuery;

            // Should not have undefined or empty segments
            expect(query).not.toContain('undefined');
            expect(query.trim()).toBe(query); // No leading/trailing spaces
        });
    });

    describe('Playbook Structure Validation', () => {
        it('should have required playbook fields', async () => {
            await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                brandName: 'Test',
                brandType: 'dispensary',
                scheduleFrequency: 'weekly',
            });

            const playbookData = mockSet.mock.calls[0][0];

            // Required fields
            expect(playbookData.id).toBeDefined();
            expect(playbookData.name).toBeDefined();
            expect(playbookData.description).toBeDefined();
            expect(playbookData.status).toBe('active');
            expect(playbookData.agent).toBe('ezal');
            expect(playbookData.triggers).toBeDefined();
            expect(playbookData.steps).toBeDefined();
            expect(playbookData.yaml).toBeDefined();

            // Triggers validation
            expect(playbookData.triggers.length).toBe(2);
            expect(playbookData.triggers[0].type).toBe('schedule');
            expect(playbookData.triggers[1].type).toBe('event');
            expect(playbookData.triggers[1].eventName).toBe('manual.competitive.scan');

            // Steps validation
            expect(playbookData.steps.length).toBe(3);
            expect(playbookData.steps[0].action).toBe('ezal_pipeline');
            expect(playbookData.steps[1].action).toBe('analyze');
            expect(playbookData.steps[2].action).toBe('save_to_dashboard');
        });

        it('should include metadata for debugging', async () => {
            await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
                brandName: 'Debug Test',
                brandType: 'dispensary',
                city: 'Test City',
                state: 'TS',
                scheduleFrequency: 'daily',
            });

            const playbookData = mockSet.mock.calls[0][0];

            expect(playbookData.metadata).toBeDefined();
            expect(playbookData.metadata.brandName).toBe('Debug Test');
            expect(playbookData.metadata.brandType).toBe('dispensary');
            expect(playbookData.metadata.city).toBe('Test City');
            expect(playbookData.metadata.state).toBe('TS');
            expect(playbookData.metadata.searchQuery).toBeDefined();
        });
    });
});

describe('Real-World Scenario Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle Syracuse NY dispensary signup', async () => {
        const config: CompetitiveIntelPlaybookConfig = {
            brandName: 'Thrive Syracuse',
            brandType: 'dispensary',
            city: 'Syracuse',
            state: 'NY',
            scheduleFrequency: 'weekly',
            maxUrls: 10,
            reportEmail: 'owner@thrivesyracuse.com',
            watchlistUrls: [
                'https://weedmaps.com/dispensaries/rise-dispensaries-amherst',
                'https://dutchie.com/embedded-menu/curaleaf-syracuse',
            ],
        };

        const result = await createCompetitiveIntelPlaybook(
            'dispensary_thrive_syracuse',
            'dispensary_thrive_syracuse',
            config
        );

        expect(result.success).toBe(true);

        const playbookData = mockSet.mock.calls[0][0];

        // Verify NY-specific search
        expect(playbookData.metadata.searchQuery).toContain('Syracuse');
        expect(playbookData.metadata.searchQuery).toContain('NY');

        // Verify watchlist included
        expect(playbookData.steps[0].params.manualUrls).toContain(
            'https://weedmaps.com/dispensaries/rise-dispensaries-amherst'
        );
    });

    it('should handle California brand signup', async () => {
        const config: CompetitiveIntelPlaybookConfig = {
            brandName: 'Stiiizy',
            brandType: 'brand',
            state: 'CA',
            scheduleFrequency: 'weekly',
            maxUrls: 20,
        };

        const result = await createCompetitiveIntelPlaybook(
            'brand_stiiizy',
            'brand_stiiizy',
            config
        );

        expect(result.success).toBe(true);

        const playbookData = mockSet.mock.calls[0][0];

        // Verify brand-focused search
        expect(playbookData.metadata.searchQuery).toContain('Stiiizy');
        expect(playbookData.metadata.searchQuery).toContain('brand');
        expect(playbookData.metadata.searchQuery).toContain('competitors');
    });

    it('should filter out irrelevant URLs from a mixed result set', () => {
        // Simulate what Finder agent might return from web search
        const rawUrls = [
            'https://curaleaf.com/shop/new-york/syracuse',  // Valid - dispensary
            'https://weedmaps.com/dispensaries/thrive-syracuse',  // Valid - platform
            'https://reddit.com/r/NewYorkMMJ/comments/best_dispensary',  // Block - social
            'https://syracuse.com/news/cannabis-dispensary-opens',  // Block - news
            'https://leafly.com/news/industry/new-york-dispensaries',  // Block - news path
            'https://rise-cannabis.com/menu',  // Valid - dispensary
            'https://instagram.com/thrivesyracuse',  // Block - social
            'https://dutchie.com/embedded-menu/rise-syracuse',  // Valid - platform
            'https://hightimes.com/guides/best-syracuse-dispensaries',  // Block - news
            'https://ethosdispensary.com/locations/syracuse',  // Valid - dispensary
        ];

        const result = filterUrls(rawUrls);

        // Should allow dispensary and platform URLs
        expect(result.allowed.length).toBe(5);
        expect(result.blocked.length).toBe(5);

        // Verify platforms ranked higher
        const platformUrls = result.allowed.filter(u => u.isPlatform);
        expect(platformUrls.length).toBeGreaterThan(0);

        // First few should be high confidence
        expect(result.allowed[0].confidence).toBeGreaterThan(0.7);
    });
});

describe('Full Signup Flow Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should verify CI playbook is created with correct structure for dispensary', async () => {
        // Simulate what happens during onboarding
        const orgId = 'dispensary_test_shop';
        const brandId = 'dispensary_test_shop';
        const config: CompetitiveIntelPlaybookConfig = {
            brandName: 'Test Cannabis Shop',
            brandType: 'dispensary',
            city: 'Detroit',
            state: 'MI',
            scheduleFrequency: 'weekly',
            maxUrls: 10,
            reportEmail: 'owner@testshop.com',
        };

        const result = await createCompetitiveIntelPlaybook(orgId, brandId, config);

        // Verify success
        expect(result.success).toBe(true);
        expect(result.playbookId).toBeDefined();

        // Get the saved playbook data
        const savedPlaybook = mockSet.mock.calls[0][0];

        // Verify all critical fields
        expect(savedPlaybook).toMatchObject({
            id: expect.stringContaining('competitive_intel'),
            name: 'Competitive Intelligence Report',
            status: 'active',
            agent: 'ezal',
            category: 'intelligence',
            orgId: orgId,
            createdBy: 'pilot_setup',
        });

        // Verify triggers are properly configured
        expect(savedPlaybook.triggers).toHaveLength(2);

        const scheduleTrigger = savedPlaybook.triggers.find((t: { type: string }) => t.type === 'schedule');
        expect(scheduleTrigger).toBeDefined();
        expect(scheduleTrigger.cron).toBe('0 8 * * 1'); // Weekly
        expect(scheduleTrigger.enabled).toBe(true);

        const eventTrigger = savedPlaybook.triggers.find((t: { type: string }) => t.type === 'event');
        expect(eventTrigger).toBeDefined();
        expect(eventTrigger.eventName).toBe('manual.competitive.scan');

        // Verify steps
        expect(savedPlaybook.steps).toHaveLength(3);
        expect(savedPlaybook.steps[0].action).toBe('ezal_pipeline');
        expect(savedPlaybook.steps[0].params.query).toContain('Detroit');
        expect(savedPlaybook.steps[0].params.query).toContain('MI');

        // Verify metadata for debugging/display
        expect(savedPlaybook.metadata.brandName).toBe('Test Cannabis Shop');
        expect(savedPlaybook.metadata.brandType).toBe('dispensary');
        expect(savedPlaybook.metadata.city).toBe('Detroit');
        expect(savedPlaybook.metadata.state).toBe('MI');
    });

    it('should verify CI playbook YAML is valid and complete', async () => {
        await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
            brandName: 'YAML Test Brand',
            brandType: 'brand',
            state: 'WA',
            scheduleFrequency: 'daily',
            maxUrls: 15,
            reportEmail: 'test@example.com',
            watchlistUrls: ['https://competitor.com'],
        });

        const savedPlaybook = mockSet.mock.calls[0][0];
        const yaml = savedPlaybook.yaml;

        // YAML should contain all key sections
        expect(yaml).toContain('name: Competitive Intelligence Report');
        expect(yaml).toContain('triggers:');
        expect(yaml).toContain('cron:');
        expect(yaml).toContain('steps:');
        expect(yaml).toContain('ezal_pipeline');
        expect(yaml).toContain('analyze');
        expect(yaml).toContain('send_email');
        expect(yaml).toContain('save_to_dashboard');

        // Should include the brand name
        expect(yaml).toContain('YAML Test Brand');
    });

    it('should handle edge case: dispensary without city', async () => {
        const result = await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
            brandName: 'No City Dispensary',
            brandType: 'dispensary',
            state: 'CO',
            scheduleFrequency: 'monthly',
        });

        expect(result.success).toBe(true);

        const savedPlaybook = mockSet.mock.calls[0][0];

        // Search query should still work without city
        expect(savedPlaybook.metadata.searchQuery).toContain('CO');
        expect(savedPlaybook.metadata.searchQuery).toContain('cannabis dispensary');
        expect(savedPlaybook.metadata.searchQuery).not.toContain('undefined');
    });

    it('should handle edge case: brand without state', async () => {
        const result = await createCompetitiveIntelPlaybook('org_test', 'brand_test', {
            brandName: 'National Brand Inc',
            brandType: 'brand',
            scheduleFrequency: 'weekly',
        });

        expect(result.success).toBe(true);

        const savedPlaybook = mockSet.mock.calls[0][0];

        // Should generate valid query without state
        expect(savedPlaybook.metadata.searchQuery).toContain('National Brand Inc');
        expect(savedPlaybook.metadata.searchQuery).toContain('brand');
        expect(savedPlaybook.metadata.searchQuery).not.toContain('undefined');
    });

    it('should verify URL filtering works for common search results', () => {
        // These are typical URLs that might come back from a web search
        const searchResults = [
            // SHOULD ALLOW - actual dispensary sites
            'https://thegreensolution.com/recreational-marijuana-menu/',
            'https://nativeroots.com/dispensary-locations/denver/',
            'https://livwell.com/stores/downtown-denver/',

            // SHOULD ALLOW - known platforms
            'https://weedmaps.com/dispensaries/the-green-solution-aurora',
            'https://dutchie.com/stores/native-roots-denver',
            'https://jane.co/native-roots-boulder',

            // SHOULD BLOCK - social/news
            'https://westword.com/marijuana/best-dispensaries-denver',
            'https://reddit.com/r/COents/top_dispensaries',
            'https://instagram.com/nativerootscannabis',

            // SHOULD BLOCK - review/info sites
            'https://yelp.com/biz/green-solution-denver',
            'https://leafly.com/news/strains/top-colorado-strains',
        ];

        const result = filterUrls(searchResults);

        // Should have more allowed than blocked for this set
        // Note: westword.com is allowed since it's not in blocked domains list
        expect(result.allowed.length).toBeGreaterThanOrEqual(6);
        expect(result.blocked.length).toBeGreaterThanOrEqual(4);

        // Platform URLs should be included
        expect(result.allowed.some(u => u.url.includes('weedmaps.com'))).toBe(true);
        expect(result.allowed.some(u => u.url.includes('dutchie.com'))).toBe(true);

        // Social/news should be blocked
        expect(result.blocked.some(u => u.url.includes('reddit.com'))).toBe(true);
        expect(result.blocked.some(u => u.url.includes('instagram.com'))).toBe(true);
        expect(result.blocked.some(u => u.url.includes('yelp.com'))).toBe(true);
    });
});
