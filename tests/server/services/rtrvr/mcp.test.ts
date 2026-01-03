/**
 * Unit Tests: Discovery MCP Types and Exports
 */

import { describe, it, expect } from 'vitest';

describe('Discovery MCP Module', () => {
    it('should export executeMCPTool function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.executeMCPTool).toBe('function');
    });

    it('should export getBrowserTabs function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.getBrowserTabs).toBe('function');
    });

    it('should export getPageData function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.getPageData).toBe('function');
    });

    it('should export takePageAction function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.takePageAction).toBe('function');
    });

    it('should export runPlanner function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.runPlanner).toBe('function');
    });

    it('should export act function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.act).toBe('function');
    });

    it('should export extract function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.extract).toBe('function');
    });

    it('should export crawl function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.crawl).toBe('function');
    });

    it('should export listDevices function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.listDevices).toBe('function');
    });

    it('should export getCredits function', async () => {
        const mcp = await import('@/server/services/rtrvr/mcp');
        expect(typeof mcp.getCredits).toBe('function');
    });
});
