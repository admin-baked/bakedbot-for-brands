/**
 * Unit Tests: Discovery Browser Tools
 * 
 * Tests the tool definitions and access control functions.
 */

import { describe, it, expect } from 'vitest';
import { 
    DISCOVERY_BROWSER_TOOLS,
    DISCOVERY_BROWSER_ALLOWED_AGENTS,
    canAgentUseDiscoveryBrowser,
    canRoleUseDiscoveryBrowser,
} from '@/server/services/rtrvr/tools';

describe('Discovery Browser Tools', () => {
    describe('DISCOVERY_BROWSER_TOOLS', () => {
        it('should export 5 discovery tools', () => {
            expect(Object.keys(DISCOVERY_BROWSER_TOOLS)).toHaveLength(5);
        });

        it('should include all expected tools', () => {
            expect(DISCOVERY_BROWSER_TOOLS['discovery.browserAutomate']).toBeDefined();
            expect(DISCOVERY_BROWSER_TOOLS['discovery.summarizePage']).toBeDefined();
            expect(DISCOVERY_BROWSER_TOOLS['discovery.extractData']).toBeDefined();
            expect(DISCOVERY_BROWSER_TOOLS['discovery.fillForm']).toBeDefined();
            expect(DISCOVERY_BROWSER_TOOLS['discovery.createRedditAd']).toBeDefined();
        });

        it('should have admin:all permission on all tools', () => {
            Object.values(DISCOVERY_BROWSER_TOOLS).forEach(tool => {
                expect(tool.requiredPermission).toBe('admin:all');
            });
        });

        it('should use discovery.* naming convention', () => {
            Object.keys(DISCOVERY_BROWSER_TOOLS).forEach(name => {
                expect(name.startsWith('discovery.')).toBe(true);
            });
        });

        it('should have valid tool definitions', () => {
            Object.values(DISCOVERY_BROWSER_TOOLS).forEach(tool => {
                expect(tool.name).toBeDefined();
                expect(tool.description).toBeDefined();
                expect(tool.inputSchema).toBeDefined();
                expect(tool.category).toBeDefined();
            });
        });
    });

    describe('DISCOVERY_BROWSER_ALLOWED_AGENTS', () => {
        it('should include Executive Boardroom agents', () => {
            expect(DISCOVERY_BROWSER_ALLOWED_AGENTS).toContain('leo');
            expect(DISCOVERY_BROWSER_ALLOWED_AGENTS).toContain('linus');
            expect(DISCOVERY_BROWSER_ALLOWED_AGENTS).toContain('glenda');
            expect(DISCOVERY_BROWSER_ALLOWED_AGENTS).toContain('mike_exec');
            expect(DISCOVERY_BROWSER_ALLOWED_AGENTS).toContain('jack');
        });

        it('should have exactly 5 allowed agents', () => {
            expect(DISCOVERY_BROWSER_ALLOWED_AGENTS).toHaveLength(5);
        });
    });

    describe('canAgentUseDiscoveryBrowser', () => {
        it('should return true for allowed agents', () => {
            expect(canAgentUseDiscoveryBrowser('leo')).toBe(true);
            expect(canAgentUseDiscoveryBrowser('linus')).toBe(true);
            expect(canAgentUseDiscoveryBrowser('glenda')).toBe(true);
            expect(canAgentUseDiscoveryBrowser('mike_exec')).toBe(true);
            expect(canAgentUseDiscoveryBrowser('jack')).toBe(true);
        });

        it('should return false for non-executive agents', () => {
            expect(canAgentUseDiscoveryBrowser('smokey')).toBe(false);
            expect(canAgentUseDiscoveryBrowser('craig')).toBe(false);
            expect(canAgentUseDiscoveryBrowser('pops')).toBe(false);
            expect(canAgentUseDiscoveryBrowser('ezal')).toBe(false);
            expect(canAgentUseDiscoveryBrowser('deebo')).toBe(false);
        });

        it('should return false for unknown agents', () => {
            expect(canAgentUseDiscoveryBrowser('unknown')).toBe(false);
            expect(canAgentUseDiscoveryBrowser('')).toBe(false);
        });
    });

    describe('canRoleUseDiscoveryBrowser', () => {
        it('should return true for super_admin', () => {
            expect(canRoleUseDiscoveryBrowser('super_admin')).toBe(true);
        });

        it('should return true for admin', () => {
            expect(canRoleUseDiscoveryBrowser('admin')).toBe(true);
        });

        it('should return false for brand users', () => {
            expect(canRoleUseDiscoveryBrowser('brand')).toBe(false);
        });

        it('should return false for dispensary users', () => {
            expect(canRoleUseDiscoveryBrowser('dispensary')).toBe(false);
        });

        it('should return false for customer users', () => {
            expect(canRoleUseDiscoveryBrowser('customer')).toBe(false);
        });
    });
});
