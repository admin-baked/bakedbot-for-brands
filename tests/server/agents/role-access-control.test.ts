/**
 * Unit tests for role access control in agent-definitions.ts
 * 
 * Verifies that Executive Boardroom agents are restricted from
 * brand, dispensary, and customer roles.
 */

import { canRoleAccessAgent, AGENT_CAPABILITIES, getAgent } from '@/server/agents/agent-definitions';

describe('Agent Role Access Control', () => {
    
    // Executive Boardroom agents - should be Super User only
    const EXECUTIVE_AGENTS = ['leo', 'linus', 'mike_exec', 'jack', 'glenda', 'roach'] as const;
    
    // Non-executive agents - should have broader access
    const OPERATIONAL_AGENTS = ['smokey', 'craig', 'pops', 'ezal', 'money_mike', 'mrs_parker'] as const;
    
    // Roles that should NOT access Executive Boardroom
    const RESTRICTED_ROLES = ['guest', 'customer', 'dispensary', 'brand'];
    
    // Roles that SHOULD access Executive Boardroom
    const ALLOWED_ROLES = ['super_admin', 'owner'];

    describe('Executive Boardroom Agents', () => {
        test.each(EXECUTIVE_AGENTS)('%s should be restricted from guest role', (agentId) => {
            expect(canRoleAccessAgent('guest', agentId as any)).toBe(false);
        });

        test.each(EXECUTIVE_AGENTS)('%s should be restricted from customer role', (agentId) => {
            expect(canRoleAccessAgent('customer', agentId as any)).toBe(false);
        });

        test.each(EXECUTIVE_AGENTS)('%s should be restricted from dispensary role', (agentId) => {
            expect(canRoleAccessAgent('dispensary', agentId as any)).toBe(false);
        });

        test.each(EXECUTIVE_AGENTS)('%s should be restricted from brand role', (agentId) => {
            expect(canRoleAccessAgent('brand', agentId as any)).toBe(false);
        });

        test.each(EXECUTIVE_AGENTS)('%s should be accessible to super_admin role', (agentId) => {
            expect(canRoleAccessAgent('super_admin', agentId as any)).toBe(true);
        });

        test.each(EXECUTIVE_AGENTS)('%s should be accessible to owner role', (agentId) => {
            expect(canRoleAccessAgent('owner', agentId as any)).toBe(true);
        });
    });

    describe('Role Restrictions Matrix', () => {
        test('Linus (CTO) should have correct roleRestrictions', () => {
            const linus = getAgent('linus');
            expect(linus).toBeDefined();
            expect(linus?.roleRestrictions).toEqual(
                expect.arrayContaining(['guest', 'customer', 'dispensary', 'brand'])
            );
        });

        test('Jack (CRO) should have correct roleRestrictions', () => {
            const jack = getAgent('jack');
            expect(jack).toBeDefined();
            expect(jack?.roleRestrictions).toEqual(
                expect.arrayContaining(['guest', 'customer', 'dispensary', 'brand'])
            );
        });

        test('Glenda (CMO) should have correct roleRestrictions', () => {
            const glenda = getAgent('glenda');
            expect(glenda).toBeDefined();
            expect(glenda?.roleRestrictions).toEqual(
                expect.arrayContaining(['guest', 'customer', 'dispensary', 'brand'])
            );
        });

        test('Leo (COO) should have correct roleRestrictions', () => {
            const leo = getAgent('leo');
            expect(leo).toBeDefined();
            expect(leo?.roleRestrictions).toEqual(
                expect.arrayContaining(['guest', 'customer', 'dispensary', 'brand'])
            );
        });
    });

    describe('Operational Agents', () => {
        test('Smokey should be accessible to brand role', () => {
            expect(canRoleAccessAgent('brand', 'smokey')).toBe(true);
        });

        test('Ezal should be accessible to dispensary role', () => {
            expect(canRoleAccessAgent('dispensary', 'ezal')).toBe(true);
        });

        test('Pops should be accessible to brand role', () => {
            expect(canRoleAccessAgent('brand', 'pops')).toBe(true);
        });
    });

    describe('canRoleAccessAgent helper', () => {
        test('should return false for unknown agent', () => {
            expect(canRoleAccessAgent('brand', 'nonexistent' as any)).toBe(false);
        });

        test('should return true for agent with no restrictions', () => {
            // General/puff typically have no restrictions
            const general = getAgent('general');
            if (general && (!general.roleRestrictions || general.roleRestrictions.length === 0)) {
                expect(canRoleAccessAgent('guest', 'general')).toBe(true);
            }
        });
    });

    describe('getAgent helper', () => {
        test('should return agent by ID', () => {
            const linus = getAgent('linus');
            expect(linus).toBeDefined();
            expect(linus?.name).toBe('Linus');
            expect(linus?.specialty).toContain('CTO');
        });

        test('should return undefined for unknown agent', () => {
            const unknown = getAgent('unknown_agent' as any);
            expect(unknown).toBeUndefined();
        });
    });
});
