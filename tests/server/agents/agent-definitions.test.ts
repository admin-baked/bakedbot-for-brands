/**
 * Agent Definitions Unit Tests
 *
 * Validates the agent configuration data structure and helper functions.
 */

import {
    AgentId,
    AgentCapability,
    AGENT_CAPABILITIES,
    getAgent,
    canRoleAccessAgent,
    KNOWN_INTEGRATIONS,
    buildIntegrationStatusSummary,
} from '@/server/agents/agent-definitions';

describe('Agent Definitions', () => {
    describe('AgentId type coverage', () => {
        const expectedAgentIds: AgentId[] = [
            'craig', 'pops', 'ezal', 'smokey', 'money_mike', 'mrs_parker',
            'day_day', 'felisha', 'general', 'puff', 'deebo', 'leo', 'linus'
        ];

        it('should have all expected agents in AGENT_CAPABILITIES', () => {
            const definedIds = AGENT_CAPABILITIES.map(a => a.id);
            
            expectedAgentIds.forEach(id => {
                expect(definedIds).toContain(id);
            });
        });

        it('should not have duplicate agent IDs', () => {
            const ids = AGENT_CAPABILITIES.map(a => a.id);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
        });
    });

    describe('AgentCapability structure', () => {
        it('all agents should have required fields', () => {
            AGENT_CAPABILITIES.forEach(agent => {
                expect(agent.id).toBeTruthy();
                expect(agent.name).toBeTruthy();
                expect(agent.specialty).toBeTruthy();
                expect(agent.keywords).toBeInstanceOf(Array);
                expect(agent.keywords.length).toBeGreaterThan(0);
                expect(agent.description).toBeTruthy();
            });
        });

        it('all agents should have responseFormat defined', () => {
            AGENT_CAPABILITIES.forEach(agent => {
                expect(agent.responseFormat).toBeTruthy();
            });
        });

        it('roleRestrictions should be an array when defined', () => {
            AGENT_CAPABILITIES.forEach(agent => {
                if (agent.roleRestrictions !== undefined) {
                    expect(agent.roleRestrictions).toBeInstanceOf(Array);
                }
            });
        });
    });

    describe('New Agents: Day Day & Felisha', () => {
        it('Day Day should be configured correctly', () => {
            const dayDay = getAgent('day_day');
            
            expect(dayDay).toBeDefined();
            expect(dayDay?.name).toBe('Day Day');
            expect(dayDay?.specialty).toContain('SEO');
            expect(dayDay?.keywords).toContain('seo');
            expect(dayDay?.keywords).toContain('meta');
            expect(dayDay?.roleRestrictions).toContain('guest');
        });

        it('Felisha should be configured correctly', () => {
            const felisha = getAgent('felisha');
            
            expect(felisha).toBeDefined();
            expect(felisha?.name).toBe('Felisha');
            expect(felisha?.specialty).toContain('Meeting');
            expect(felisha?.keywords).toContain('meeting');
            expect(felisha?.keywords).toContain('triage');
            expect(felisha?.roleRestrictions).toContain('guest');
        });
    });

    describe('getAgent helper', () => {
        it('should return agent by ID', () => {
            const smokey = getAgent('smokey');
            expect(smokey).toBeDefined();
            expect(smokey?.id).toBe('smokey');
            expect(smokey?.name).toBe('Smokey');
        });

        it('should return undefined for non-existent agent', () => {
            const result = getAgent('nonexistent' as AgentId);
            expect(result).toBeUndefined();
        });

        it('should return all known agents', () => {
            const knownIds: AgentId[] = ['craig', 'pops', 'ezal', 'smokey', 'money_mike', 'mrs_parker', 'puff', 'deebo'];
            
            knownIds.forEach(id => {
                const agent = getAgent(id);
                expect(agent).toBeDefined();
                expect(agent?.id).toBe(id);
            });
        });
    });

    describe('canRoleAccessAgent helper', () => {
        it('should allow access when no restrictions', () => {
            // Smokey has no role restrictions
            expect(canRoleAccessAgent('guest', 'smokey')).toBe(true);
            expect(canRoleAccessAgent('customer', 'smokey')).toBe(true);
            expect(canRoleAccessAgent('brand', 'smokey')).toBe(true);
        });

        it('should deny access for restricted roles', () => {
            // Ezal restricts guest and customer
            expect(canRoleAccessAgent('guest', 'ezal')).toBe(false);
            expect(canRoleAccessAgent('customer', 'ezal')).toBe(false);
        });

        it('should allow access for non-restricted roles', () => {
            // Ezal allows brand
            expect(canRoleAccessAgent('brand', 'ezal')).toBe(true);
            expect(canRoleAccessAgent('dispensary', 'ezal')).toBe(true);
        });

        it('should return false for non-existent agent', () => {
            expect(canRoleAccessAgent('brand', 'nonexistent' as AgentId)).toBe(false);
        });

        it('should correctly restrict executive agents', () => {
            // Leo and Linus are restricted to admin/super_admin only
            expect(canRoleAccessAgent('guest', 'leo')).toBe(false);
            expect(canRoleAccessAgent('customer', 'leo')).toBe(false);
            expect(canRoleAccessAgent('brand', 'leo')).toBe(false);
            expect(canRoleAccessAgent('dispensary', 'leo')).toBe(false);
            
            // Only super_admin should access
            expect(canRoleAccessAgent('super_admin', 'leo')).toBe(true);
        });
    });

    describe('Agent keywords', () => {
        it('each agent should have unique primary keywords', () => {
            const craig = getAgent('craig');
            expect(craig?.keywords).toContain('sms');
            expect(craig?.keywords).toContain('email');
            expect(craig?.keywords).toContain('video');
            expect(craig?.keywords).toContain('image');
            
            const pops = getAgent('pops');
            expect(pops?.keywords).toContain('analytics');
            expect(pops?.keywords).toContain('report');
            expect(pops?.keywords).toContain('kpi');
            
            const moneyMike = getAgent('money_mike');
            expect(moneyMike?.keywords).toContain('price');
            expect(moneyMike?.keywords).toContain('margin');
            expect(moneyMike?.keywords).toContain('revenue');
        });

        it('Mrs. Parker should have loyalty-related keywords', () => {
            const mrsParker = getAgent('mrs_parker');
            expect(mrsParker?.keywords).toContain('loyalty');
            expect(mrsParker?.keywords).toContain('churn');
            expect(mrsParker?.keywords).toContain('vip');
            expect(mrsParker?.keywords).toContain('retention');
        });

        it('Deebo should have compliance-related keywords', () => {
            const deebo = getAgent('deebo');
            expect(deebo?.keywords).toContain('compliance');
            expect(deebo?.keywords).toContain('regulation');
            expect(deebo?.keywords).toContain('license');
        });
    });

    describe('White-Label Branding (BakedBot Mail & SMS)', () => {
        it('should use "BakedBot Mail" instead of "Mailjet" for email integration', () => {
            const emailIntegration = KNOWN_INTEGRATIONS.find(i => i.id === 'mailjet_email');
            expect(emailIntegration).toBeDefined();
            expect(emailIntegration?.name).toBe('BakedBot Mail');
            expect(emailIntegration?.name).not.toContain('Mailjet');
        });

        it('should use "BakedBot SMS" instead of "Blackleaf" for SMS integration', () => {
            const smsIntegration = KNOWN_INTEGRATIONS.find(i => i.id === 'blackleaf_sms');
            expect(smsIntegration).toBeDefined();
            expect(smsIntegration?.name).toBe('BakedBot SMS');
            expect(smsIntegration?.name).not.toContain('Blackleaf');
        });

        it('integration status summary should use BakedBot branding', () => {
            const summary = buildIntegrationStatusSummary();

            // Should contain BakedBot branding
            expect(summary).toContain('BakedBot Mail');
            expect(summary).toContain('BakedBot SMS');

            // Should NOT contain third-party vendor names
            expect(summary).not.toContain('Mailjet');
            expect(summary).not.toContain('Blackleaf');
        });

        it('integration status summary should list email and sms as configured', () => {
            const summary = buildIntegrationStatusSummary();

            // Check they appear in the CONFIGURED section
            expect(summary).toMatch(/\*\*CONFIGURED.*\n.*BakedBot Mail/s);
            expect(summary).toMatch(/\*\*CONFIGURED.*\n.*BakedBot SMS/s);
        });

        it('should maintain correct integration IDs (for backwards compatibility)', () => {
            // Integration IDs should stay the same for code compatibility
            const emailIntegration = KNOWN_INTEGRATIONS.find(i => i.id === 'mailjet_email');
            const smsIntegration = KNOWN_INTEGRATIONS.find(i => i.id === 'blackleaf_sms');

            expect(emailIntegration?.id).toBe('mailjet_email');
            expect(smsIntegration?.id).toBe('blackleaf_sms');
        });
    });
});
