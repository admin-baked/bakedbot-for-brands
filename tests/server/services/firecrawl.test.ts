/**
 * Tests for DiscoveryService (firecrawl wrapper)
 * Uses the global jest.setup.js mock for @/server/services/firecrawl
 */

import { discovery } from '@/server/services/firecrawl';

describe('FirecrawlService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should be configured when API key is present', () => {
        expect(discovery.isConfigured()).toBe(true);
    });

    it('should call discoverUrl with correct params', async () => {
        const result = await discovery.discoverUrl('https://example.com');
        expect(result.success).toBe(true);
        expect(result.markdown).toBe('Mock content');
    });

    it('should search and return results', async () => {
        const results = await discovery.search('cannabis dispensary NYC');
        expect(Array.isArray(results)).toBe(true);
    });

    it('should mapSite and return links', async () => {
        const result = await discovery.mapSite('https://example.com');
        expect(result.success).toBe(true);
        expect(Array.isArray(result.links)).toBe(true);
    });

    it('should report remaining credits', async () => {
        const credits = await discovery.getRemainingCredits();
        expect(typeof credits).toBe('number');
        expect(credits).toBeGreaterThan(0);
    });

    it('should check credit budget', async () => {
        const hasBudget = await discovery.hasCreditBudget(100);
        expect(typeof hasBudget).toBe('boolean');
    });
});
