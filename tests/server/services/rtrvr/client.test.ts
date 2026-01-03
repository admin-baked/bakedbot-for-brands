/**
 * Unit Tests: Discovery Browser Client Exports
 */

import { describe, it, expect } from 'vitest';

describe('Discovery Browser Client Module', () => {
    it('should export getRTRVRClient function', async () => {
        const client = await import('@/server/services/rtrvr/client');
        expect(typeof client.getRTRVRClient).toBe('function');
    });

    it('should export isRTRVRAvailable function', async () => {
        const client = await import('@/server/services/rtrvr/client');
        expect(typeof client.isRTRVRAvailable).toBe('function');
    });

    it('should export RTRVRClient class', async () => {
        const client = await import('@/server/services/rtrvr/client');
        expect(client.RTRVRClient).toBeDefined();
    });
});

describe('Discovery Browser Service Index', () => {
    it('should export all core client functions', async () => {
        const rtrvr = await import('@/server/services/rtrvr');
        expect(typeof rtrvr.getRTRVRClient).toBe('function');
        expect(typeof rtrvr.isRTRVRAvailable).toBe('function');
    });

    it('should export agent functions', async () => {
        const rtrvr = await import('@/server/services/rtrvr');
        expect(typeof rtrvr.executeAgentTask).toBe('function');
        expect(typeof rtrvr.summarizeUrl).toBe('function');
        expect(typeof rtrvr.extractFromUrl).toBe('function');
        expect(typeof rtrvr.fillForm).toBe('function');
        expect(typeof rtrvr.createRedditAdCampaign).toBe('function');
    });

    it('should export discovery tools', async () => {
        const rtrvr = await import('@/server/services/rtrvr');
        expect(rtrvr.DISCOVERY_BROWSER_TOOLS).toBeDefined();
        expect(typeof rtrvr.executeDiscoveryBrowserTool).toBe('function');
        expect(typeof rtrvr.canAgentUseDiscoveryBrowser).toBe('function');
        expect(typeof rtrvr.canRoleUseDiscoveryBrowser).toBe('function');
    });

    it('should export MCP functions', async () => {
        const rtrvr = await import('@/server/services/rtrvr');
        expect(typeof rtrvr.executeMCPTool).toBe('function');
        expect(typeof rtrvr.runPlanner).toBe('function');
        expect(typeof rtrvr.act).toBe('function');
        expect(typeof rtrvr.extract).toBe('function');
        expect(typeof rtrvr.crawl).toBe('function');
    });
});
