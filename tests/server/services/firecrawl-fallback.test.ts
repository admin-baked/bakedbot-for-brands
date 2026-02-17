/**
 * Tests for Firecrawl → RTRVR Fallback Implementation
 *
 * Integration tests verifying:
 * 1. Firecrawl success path (no fallback needed)
 * 2. Firecrawl failure → RTRVR fallback
 * 3. RTRVR-only path (Firecrawl not configured)
 * 4. Both unavailable error handling
 */

jest.mock('../../../src/server/services/rtrvr/client');
jest.mock('../../../src/server/services/rtrvr/agent');
jest.mock('@/lib/logger');
jest.mock('@mendable/firecrawl-js');

import { getRTRVRClient } from '../../../src/server/services/rtrvr/client';
import { executeAgentTask, extractFromUrl } from '../../../src/server/services/rtrvr/agent';
import { logger } from '@/lib/logger';
import FirecrawlApp from '@mendable/firecrawl-js';

describe('DiscoveryService - Firecrawl → RTRVR Fallback', () => {
    let mockFirecrawlApp: any;
    let mockRTRVRClient: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firecrawl mock
        mockFirecrawlApp = {
            scrape: jest.fn(),
            search: jest.fn(),
            mapUrl: jest.fn(),
        };

        (FirecrawlApp as jest.Mock).mockImplementation(() => mockFirecrawlApp);

        // Setup RTRVR client mock
        mockRTRVRClient = {
            isAvailable: jest.fn(() => true),
        };
        (getRTRVRClient as jest.Mock).mockReturnValue(mockRTRVRClient);

        // Setup logger mock
        (logger.info as jest.Mock).mockImplementation(() => {});
        (logger.warn as jest.Mock).mockImplementation(() => {});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ============================================================================
    // discoverUrl Tests
    // ============================================================================

    describe('discoverUrl()', () => {
        it('should attempt Firecrawl first when configured', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';

            mockFirecrawlApp.scrape.mockResolvedValue({
                success: true,
                markdown: '# Page Content',
            });

            // Import fresh to pick up env var
            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            const result = await discovery.discoverUrl('https://example.com');

            // Firecrawl should have been called
            expect(mockFirecrawlApp.scrape).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.markdown).toContain('Page Content');
        });

        it('should fallback to RTRVR when Firecrawl throws error', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            // Firecrawl fails
            mockFirecrawlApp.scrape.mockRejectedValue(new Error('Firecrawl API timeout'));

            // RTRVR succeeds
            (extractFromUrl as jest.Mock).mockResolvedValue({
                success: true,
                data: {
                    result: 'Content extracted via RTRVR',
                },
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            const result = await discovery.discoverUrl('https://example.com');

            // Should have tried Firecrawl first
            expect(mockFirecrawlApp.scrape).toHaveBeenCalled();

            // Should have fallen back to RTRVR
            expect(extractFromUrl).toHaveBeenCalledWith(
                'https://example.com',
                expect.stringContaining('Extract the full content'),
                expect.any(Object)
            );

            // Result should be from RTRVR
            expect(result.success).toBe(true);
            expect(result.markdown).toContain('Content extracted via RTRVR');
        });

        it('should throw when both services fail', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            mockFirecrawlApp.scrape.mockRejectedValue(new Error('Firecrawl error'));
            (extractFromUrl as jest.Mock).mockResolvedValue({
                success: false,
                error: 'RTRVR error',
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            await expect(discovery.discoverUrl('https://example.com')).rejects.toThrow(
                'RTRVR fallback failed'
            );
        });
    });

    // ============================================================================
    // search Tests
    // ============================================================================

    describe('search()', () => {
        it('should use Firecrawl when available and succeeds', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';

            const mockResults = [
                { title: 'Result 1', url: 'https://result1.com' },
            ];
            mockFirecrawlApp.search.mockResolvedValue({
                success: true,
                data: mockResults,
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            const result = await discovery.search('cannabis dispensary');

            expect(mockFirecrawlApp.search).toHaveBeenCalledWith('cannabis dispensary');
            expect(result).toEqual(mockResults);
        });

        it('should fallback to RTRVR when Firecrawl fails', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            mockFirecrawlApp.search.mockRejectedValue(new Error('Firecrawl error'));

            const rtrvrResults = [
                { title: 'RTRVR Result', url: 'https://rtrvr.com', snippet: 'Content' },
            ];
            (executeAgentTask as jest.Mock).mockResolvedValue({
                success: true,
                data: {
                    result: rtrvrResults,
                },
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            const result = await discovery.search('query');

            expect(mockFirecrawlApp.search).toHaveBeenCalled();
            expect(executeAgentTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.stringContaining('Search the web for'),
                    schema: expect.any(Object),
                })
            );
            expect(result).toEqual(rtrvrResults);
        });
    });

    // ============================================================================
    // mapSite Tests
    // ============================================================================

    describe('mapSite()', () => {
        it('should fallback to RTRVR when Firecrawl fails', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            mockFirecrawlApp.mapUrl.mockRejectedValue(new Error('Firecrawl error'));

            const links = ['https://example.com/page1', 'https://example.com/page2'];
            (executeAgentTask as jest.Mock).mockResolvedValue({
                success: true,
                data: {
                    result: links,
                },
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            const result = await discovery.mapSite('https://example.com');

            expect(mockFirecrawlApp.mapUrl).toHaveBeenCalled();
            expect(executeAgentTask).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.stringContaining('find all internal links'),
                })
            );
            expect(result.success).toBe(true);
            expect(result.links).toEqual(links);
        });
    });

    // ============================================================================
    // extractData Tests
    // ============================================================================

    describe('extractData()', () => {
        it('should fallback to RTRVR when Firecrawl fails', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            mockFirecrawlApp.scrape.mockRejectedValue(new Error('Firecrawl error'));

            const extractedData = { name: 'Brand Name', color: 'red' };
            (extractFromUrl as jest.Mock).mockResolvedValue({
                success: true,
                data: {
                    result: extractedData,
                },
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            const mockSchema = {
                _def: { description: 'Test schema' },
            };

            const result = await discovery.extractData('https://example.com', mockSchema as any);

            expect(mockFirecrawlApp.scrape).toHaveBeenCalled();
            expect(extractFromUrl).toHaveBeenCalledWith(
                'https://example.com',
                expect.stringContaining('Extract structured data'),
                expect.any(Object)
            );
            expect(result).toEqual(extractedData);
        });
    });

    // ============================================================================
    // discoverWithActions Tests
    // ============================================================================

    describe('discoverWithActions()', () => {
        it('should fallback to RTRVR with natural language actions', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            mockFirecrawlApp.scrape.mockRejectedValue(new Error('Firecrawl error'));

            (executeAgentTask as jest.Mock).mockResolvedValue({
                success: true,
                data: {
                    result: 'Menu content after age gate',
                },
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            const actions = [
                { type: 'click', selector: '.age-gate-yes' },
                { type: 'wait', milliseconds: 500 },
            ];

            const result = await discovery.discoverWithActions('https://example.com', actions);

            expect(mockFirecrawlApp.scrape).toHaveBeenCalled();

            const agentCall = (executeAgentTask as jest.Mock).mock.calls[0][0];
            expect(agentCall.input).toContain('perform these actions');
            expect(agentCall.input).toContain('Click on element matching: .age-gate-yes');
            expect(agentCall.input).toContain('Wait 500ms');

            expect(result.success).toBe(true);
        });
    });

    // ============================================================================
    // Configuration Tests
    // ============================================================================

    describe('isConfigured()', () => {
        it('should return true when Firecrawl is configured', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            delete process.env.RTRVR_API_KEY;

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            expect(discovery.isConfigured()).toBe(true);
        });

        it('should return true when RTRVR is configured (Firecrawl not)', async () => {
            delete process.env.FIRECRAWL_API_KEY;
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            (getRTRVRClient as jest.Mock).mockReturnValue({
                isAvailable: jest.fn(() => true),
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            expect(discovery.isConfigured()).toBe(true);
        });

        it('should return false when neither is configured', async () => {
            delete process.env.FIRECRAWL_API_KEY;
            delete process.env.RTRVR_API_KEY;

            (getRTRVRClient as jest.Mock).mockReturnValue({
                isAvailable: jest.fn(() => false),
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            expect(discovery.isConfigured()).toBe(false);
        });
    });

    // ============================================================================
    // Error Handling & Logging
    // ============================================================================

    describe('error handling and logging', () => {
        it('should log when falling back to RTRVR', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            process.env.RTRVR_API_KEY = 'rtrvr-key';

            mockFirecrawlApp.scrape.mockRejectedValue(new Error('Firecrawl failed'));
            (extractFromUrl as jest.Mock).mockResolvedValue({
                success: true,
                data: { result: 'Fallback' },
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            await discovery.discoverUrl('https://example.com');

            expect(logger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Firecrawl'),
                expect.any(Object)
            );
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('Using RTRVR fallback'),
                expect.any(Object)
            );
        });

        it('should preserve original error if RTRVR unavailable', async () => {
            process.env.FIRECRAWL_API_KEY = 'test-key';
            delete process.env.RTRVR_API_KEY;

            const firecrawlError = new Error('Network timeout');
            mockFirecrawlApp.scrape.mockRejectedValue(firecrawlError);

            (getRTRVRClient as jest.Mock).mockReturnValue({
                isAvailable: jest.fn(() => false),
            });

            jest.resetModules();
            const { discovery } = require('../../../src/server/services/firecrawl');

            await expect(discovery.discoverUrl('https://example.com')).rejects.toThrow(
                'Network timeout'
            );
        });
    });
});
