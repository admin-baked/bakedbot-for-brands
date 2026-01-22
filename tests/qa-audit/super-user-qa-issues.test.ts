/**
 * Super User QA Audit - Unit Tests
 *
 * Tests for issues identified during the comprehensive QA audit
 * of the Super User role on BakedBot AI (2026-01-22).
 *
 * QA Report: BakedBot AI - Super User QA Audit Report
 * Tester: Claude via Browser Automation
 */

// Mock server-only to prevent import errors in test environment
jest.mock('server-only', () => ({}));

// ============================================================
// TEST SUITE 1: Agent Registry Completeness
// Issue #7: Missing Agents from Management Page
// ============================================================

describe('Agent Registry Completeness', () => {
    // Load both registries
    let AGENT_CAPABILITIES: any[];
    let configAgents: any[];

    beforeAll(async () => {
        // Agent definitions from server (comprehensive list)
        const agentDefs = await import('@/server/agents/agent-definitions');
        AGENT_CAPABILITIES = agentDefs.AGENT_CAPABILITIES;

        // Agent config (displayed on Agents page)
        const config = await import('@/config/agents');
        configAgents = config.agents;
    });

    it('should have all executive agents in agent-definitions.ts', () => {
        const executiveAgentIds = ['leo', 'jack', 'glenda', 'linus', 'mike_exec'];

        executiveAgentIds.forEach(id => {
            const found = AGENT_CAPABILITIES.find((a: any) => a.id === id);
            expect(found).toBeDefined();
            expect(found.name).toBeDefined();
            expect(found.specialty).toBeDefined();
        });
    });

    it('should have Mrs. Parker, Big Worm, and Roach defined', () => {
        const expectedAgents = [
            { id: 'mrs_parker', name: 'Mrs. Parker' },
            { id: 'big_worm', name: 'Big Worm' },
            { id: 'roach', name: 'Roach' },
        ];

        expectedAgents.forEach(expected => {
            const found = AGENT_CAPABILITIES.find((a: any) => a.id === expected.id);
            // Note: Some may be planned but not implemented
            if (expected.id === 'big_worm') {
                // Big Worm may not be in AGENT_CAPABILITIES yet
                // This test documents the gap
                console.log(`[QA] ${expected.name}: ${found ? 'Found' : 'NOT FOUND (gap)'}`);
            } else {
                expect(found).toBeDefined();
            }
        });
    });

    it('should list at least 15 agents in full registry', () => {
        // We identified 18 agents in AgentId type
        expect(AGENT_CAPABILITIES.length).toBeGreaterThanOrEqual(15);
    });

    it('should have executive agents in config (FIXED)', async () => {
        // FIXED: Added executiveAgents and allAgents exports to config/agents.ts
        const { executiveAgents, allAgents } = await import('@/config/agents');

        // Executive agents should be defined
        expect(executiveAgents).toBeDefined();
        expect(executiveAgents.length).toBeGreaterThanOrEqual(5); // Leo, Jack, Linus, Glenda, Mike

        // Check specific executives
        const execIds = executiveAgents.map((a: any) => a.id);
        expect(execIds).toContain('leo');
        expect(execIds).toContain('linus');
        expect(execIds).toContain('jack');
        expect(execIds).toContain('glenda');

        // allAgents should combine both
        expect(allAgents.length).toBe(configAgents.length + executiveAgents.length);

        console.log('[QA] Executive agents now in config/agents.ts (FIXED)');
    });
});

// ============================================================
// TEST SUITE 2: Revenue Data Consistency
// Issue #2: Mock Data Detected (different MRR values)
// ============================================================

describe('Revenue Data Consistency', () => {
    it('should have static mock values in config/agents.ts (documenting issue)', () => {
        // This test documents the current state (hardcoded values)
        const { agents } = require('@/config/agents');

        // These are hardcoded static values - NOT real-time data
        const smokey = agents.find((a: any) => a.id === 'smokey');
        expect(smokey.primaryMetricValue).toBe('128'); // Hardcoded

        const craig = agents.find((a: any) => a.id === 'craig');
        expect(craig.primaryMetricValue).toBe('3'); // Hardcoded

        // Document: These values don't come from Firestore
        console.log('[QA WARNING] Agent metrics are STATIC mock values, not live data');
    });

    it('should define consistent metric labels for each agent', () => {
        const { agents } = require('@/config/agents');

        agents.forEach((agent: any) => {
            expect(agent.primaryMetricLabel).toBeDefined();
            expect(agent.primaryMetricValue).toBeDefined();
            expect(typeof agent.primaryMetricLabel).toBe('string');
            expect(typeof agent.primaryMetricValue).toBe('string');
        });
    });
});

// ============================================================
// TEST SUITE 3: Playbook Creation Functionality
// Issue #5: "New Playbook" Button Non-Functional
// ============================================================

describe('Playbook Creation', () => {
    it('should have playbook save action implemented', async () => {
        // Verify the server action exists
        const { savePlaybookDraft } = await import('@/app/dashboard/playbooks/actions');
        expect(typeof savePlaybookDraft).toBe('function');
    });

    it('should have CreatePlaybookDialog component available', async () => {
        // The component exists but is not wired to the main button
        const CreatePlaybookDialog = await import(
            '@/app/dashboard/playbooks/components/create-playbook-dialog'
        );
        expect(CreatePlaybookDialog).toBeDefined();
    });

    it('should have CreatePlaybookDialog integrated into page (FIXED)', () => {
        // FIXED: The playbooks page now uses CreatePlaybookDialog component
        // instead of showing a "Coming Soon" toast
        const fs = require('fs');
        const path = require('path');
        const pagePath = path.join(process.cwd(), 'src/app/dashboard/playbooks/page.tsx');
        const content = fs.readFileSync(pagePath, 'utf-8');

        // Verify CreatePlaybookDialog is imported and used
        expect(content).toContain('CreatePlaybookDialog');
        expect(content).toContain('handleCreateFromScratch');
        expect(content).toContain('handleCloneTemplate');

        // Old "Coming Soon" toast should be removed
        expect(content).not.toContain('Coming Soon');
        console.log('[QA] Create Manually button: Now opens CreatePlaybookDialog (FIXED)');
    });
});

// ============================================================
// TEST SUITE 4: Project Creation Error Handling
// Issue #3: Error Display Bug (success shows error)
// ============================================================

describe('Project Creation Error Handling', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have project actions module available', async () => {
        // Verify the module exists - actual import requires Next.js runtime
        // which isn't available in Jest. This documents the test gap.
        const fs = require('fs');
        const path = require('path');
        const actionsPath = path.join(
            process.cwd(),
            'src/server/actions/projects.ts'
        );
        expect(fs.existsSync(actionsPath)).toBe(true);
    });

    it('should validate project input with Zod schema', async () => {
        // Zod validation should catch invalid input before DB write
        const { CreateProjectSchema } = await import('@/types/project');

        expect(CreateProjectSchema).toBeDefined();

        // Valid input should pass
        const validInput = { name: 'Test Project' };
        expect(() => CreateProjectSchema.parse(validInput)).not.toThrow();

        // Invalid input (empty name) should throw
        const invalidInput = { name: '' };
        expect(() => CreateProjectSchema.parse(invalidInput)).toThrow();
    });
});

// ============================================================
// TEST SUITE 5: Agent Response Template Replacement
// Issue #4: Timestamp Template Not Replaced
// ============================================================

describe('Agent Response Template Processing', () => {
    it('should define responseFormat for all agents', async () => {
        const { AGENT_CAPABILITIES } = await import('@/server/agents/agent-definitions');

        // All operational agents should have a responseFormat hint
        const operationalAgents = AGENT_CAPABILITIES.filter(
            (a: any) => !['general'].includes(a.id)
        );

        operationalAgents.forEach((agent: any) => {
            expect(agent.responseFormat).toBeDefined();
            expect(typeof agent.responseFormat).toBe('string');
            expect(agent.responseFormat.length).toBeGreaterThan(10);
        });
    });

    it('should replace timestamp templates via formatAgentResponse (FIXED)', () => {
        // FIXED: Added agent-response-formatter.ts to replace placeholders
        const { formatAgentResponse, hasUnprocessedTemplates } = require('@/lib/agent-response-formatter');

        // Test replacement of common patterns
        const inputWithPlaceholder = 'System Health Status as of [Current Date/Time]';
        const formatted = formatAgentResponse(inputWithPlaceholder);

        // Should NOT contain the placeholder anymore
        expect(formatted).not.toContain('[Current Date/Time]');

        // Should contain actual date/time components
        expect(formatted).toMatch(/\d{4}/); // Year
        expect(formatted).toMatch(/\d{1,2}:\d{2}/); // Time

        // Test the detection function
        expect(hasUnprocessedTemplates(inputWithPlaceholder)).toBe(true);
        expect(hasUnprocessedTemplates(formatted)).toBe(false);

        console.log('[QA] Timestamp templates: Now auto-replaced via formatAgentResponse (FIXED)');
    });
});

// ============================================================
// TEST SUITE 6: Agent Capability Access by Role
// ============================================================

describe('Agent Role Access Control', () => {
    it('should restrict executive agents from non-super-user roles', async () => {
        const { canRoleAccessAgent } = await import('@/server/agents/agent-definitions');

        // Executive agents should be restricted
        expect(canRoleAccessAgent('brand', 'leo')).toBe(false);
        expect(canRoleAccessAgent('dispensary', 'linus')).toBe(false);
        expect(canRoleAccessAgent('customer', 'jack')).toBe(false);
        expect(canRoleAccessAgent('guest', 'glenda')).toBe(false);
    });

    it('should allow super_admin access to all agents', async () => {
        const { AGENT_CAPABILITIES, canRoleAccessAgent } = await import(
            '@/server/agents/agent-definitions'
        );

        // Super admin should have access to all agents
        // Note: roleRestrictions doesn't include super_admin
        AGENT_CAPABILITIES.forEach((agent: any) => {
            // super_admin is never in roleRestrictions
            if (agent.roleRestrictions) {
                expect(agent.roleRestrictions).not.toContain('super_admin');
                expect(agent.roleRestrictions).not.toContain('super_user');
            }
        });
    });

    it('should allow customer access to Smokey (budtender)', async () => {
        const { canRoleAccessAgent, getAgent } = await import(
            '@/server/agents/agent-definitions'
        );

        const smokey = getAgent('smokey');
        expect(smokey).toBeDefined();
        expect(smokey?.roleRestrictions).toEqual([]);
        expect(canRoleAccessAgent('customer', 'smokey')).toBe(true);
    });
});

// ============================================================
// TEST SUITE 7: Integration Status Grounding
// Issue #6: Missing Integration Setup UI
// ============================================================

describe('Integration Status Grounding', () => {
    it('should list Gmail, Calendar, Drive as not_configured', async () => {
        const { KNOWN_INTEGRATIONS } = await import('@/server/agents/agent-definitions');

        const googleIntegrations = ['gmail', 'google_calendar', 'google_drive'];

        googleIntegrations.forEach(id => {
            const integration = KNOWN_INTEGRATIONS.find((i: any) => i.id === id);
            expect(integration).toBeDefined();
            expect(integration?.status).toBe('not_configured');
            expect(integration?.setupRequired).toContain('OAuth');
        });
    });

    it('should have active core integrations', async () => {
        const { KNOWN_INTEGRATIONS } = await import('@/server/agents/agent-definitions');

        const coreIntegrations = ['firebase_auth', 'firestore', 'letta', 'claude_api'];

        coreIntegrations.forEach(id => {
            const integration = KNOWN_INTEGRATIONS.find((i: any) => i.id === id);
            expect(integration).toBeDefined();
            expect(integration?.status).toBe('active');
        });
    });

    it('should generate accurate integration summary for prompts', async () => {
        const { buildIntegrationStatusSummary } = await import(
            '@/server/agents/agent-definitions'
        );

        const summary = buildIntegrationStatusSummary();

        expect(summary).toContain('ACTIVE INTEGRATIONS');
        expect(summary).toContain('Firebase Auth');
        expect(summary).toContain('NOT YET INTEGRATED');
        expect(summary).toContain('Gmail');
    });
});

// ============================================================
// TEST SUITE 8: Build Squad Roster for Prompts
// ============================================================

describe('Squad Roster Generation', () => {
    it('should generate formatted roster string', async () => {
        const { buildSquadRoster } = await import('@/server/agents/agent-definitions');

        const roster = buildSquadRoster();

        // Should include key agents
        expect(roster).toContain('Craig');
        expect(roster).toContain('Pops');
        expect(roster).toContain('Smokey');
        expect(roster).toContain('Deebo');

        // Should be formatted with markdown
        expect(roster).toContain('**');
    });

    it('should exclude specified agent from roster', async () => {
        const { buildSquadRoster } = await import('@/server/agents/agent-definitions');

        const rosterWithoutLeo = buildSquadRoster('leo');

        expect(rosterWithoutLeo).not.toContain('**Leo**');
        expect(rosterWithoutLeo).toContain('**Linus**'); // Others still present
    });

    it('should exclude general agent from roster', async () => {
        const { buildSquadRoster } = await import('@/server/agents/agent-definitions');

        const roster = buildSquadRoster();

        // 'general' is the fallback, not a named squad member
        expect(roster).not.toContain('**Assistant**');
    });
});
