/**
 * Super User Inbox Types Tests
 *
 * Tests for the new thread types, quick actions, and agent mappings
 * added for Super User company operations.
 */

import {
    InboxThreadType,
    InboxAgentPersona,
    InboxArtifactType,
    INBOX_QUICK_ACTIONS,
    THREAD_AGENT_MAPPING,
    InboxThreadTypeSchema,
    InboxAgentPersonaSchema,
    InboxArtifactTypeSchema,
    getQuickActionsForRole,
    getDefaultAgentForThreadType,
    getSupportingAgentsForThreadType,
    getThreadTypeIcon,
    getThreadTypeLabel,
    getArtifactTypesForThreadType,
    createInboxThreadId,
    createInboxArtifactId,
} from '../../src/types/inbox';

describe('Super User Inbox Types', () => {
    // ============ Thread Type Tests ============
    describe('Company Operations Thread Types', () => {
        const companyOpsTypes: InboxThreadType[] = [
            'daily_standup',
            'sprint_planning',
            'incident_response',
            'feature_spec',
            'code_review',
            'release',
            'customer_onboarding',
            'customer_feedback',
            'support_escalation',
            'content_calendar',
            'launch_campaign',
            'seo_sprint',
            'partnership_outreach',
            'billing_review',
            'budget_planning',
            'vendor_management',
            'compliance_audit',
            'weekly_sync',
            'quarterly_planning',
            'board_prep',
            'hiring',
        ];

        it('should include all company operations thread types', () => {
            companyOpsTypes.forEach(type => {
                expect(InboxThreadTypeSchema.safeParse(type).success).toBe(true);
            });
        });

        it('should have agent mappings for all company operations types', () => {
            companyOpsTypes.forEach(type => {
                expect(THREAD_AGENT_MAPPING[type]).toBeDefined();
                expect(THREAD_AGENT_MAPPING[type].primary).toBeDefined();
                expect(Array.isArray(THREAD_AGENT_MAPPING[type].supporting)).toBe(true);
            });
        });

        it('should have icons for all company operations types', () => {
            companyOpsTypes.forEach(type => {
                const icon = getThreadTypeIcon(type);
                expect(icon).toBeDefined();
                expect(icon).not.toBe('MessageSquare'); // Default fallback
            });
        });

        it('should have labels for all company operations types', () => {
            companyOpsTypes.forEach(type => {
                const label = getThreadTypeLabel(type);
                expect(label).toBeDefined();
                expect(label).not.toBe('Unknown'); // Default fallback
            });
        });

        it('should have artifact types for all company operations types', () => {
            companyOpsTypes.forEach(type => {
                const artifactTypes = getArtifactTypesForThreadType(type);
                expect(Array.isArray(artifactTypes)).toBe(true);
                // Most should have at least one artifact type
            });
        });
    });

    describe('Research Thread Types', () => {
        const researchTypes: InboxThreadType[] = [
            'deep_research',
            'compliance_research',
            'market_research',
        ];

        it('should include all research thread types', () => {
            researchTypes.forEach(type => {
                expect(InboxThreadTypeSchema.safeParse(type).success).toBe(true);
            });
        });

        it('should route deep_research to big_worm', () => {
            expect(THREAD_AGENT_MAPPING['deep_research'].primary).toBe('big_worm');
        });

        it('should route compliance_research to roach', () => {
            expect(THREAD_AGENT_MAPPING['compliance_research'].primary).toBe('roach');
        });

        it('should route market_research to big_worm', () => {
            expect(THREAD_AGENT_MAPPING['market_research'].primary).toBe('big_worm');
        });
    });

    // ============ Agent Persona Tests ============
    describe('New Agent Personas', () => {
        const newAgents: InboxAgentPersona[] = [
            'mrs_parker',
            'big_worm',
            'roach',
            'mike', // CFO (executive)
        ];

        it('should include new agent personas in schema', () => {
            newAgents.forEach(agent => {
                expect(InboxAgentPersonaSchema.safeParse(agent).success).toBe(true);
            });
        });

        it('should have mrs_parker as primary for customer_onboarding', () => {
            expect(getDefaultAgentForThreadType('customer_onboarding')).toBe('mrs_parker');
        });

        it('should have big_worm as primary for deep_research', () => {
            expect(getDefaultAgentForThreadType('deep_research')).toBe('big_worm');
        });

        it('should have roach as primary for compliance_research', () => {
            expect(getDefaultAgentForThreadType('compliance_research')).toBe('roach');
        });

        it('should have mike as primary for billing_review', () => {
            expect(getDefaultAgentForThreadType('billing_review')).toBe('mike');
        });
    });

    // ============ Artifact Type Tests ============
    describe('New Artifact Types', () => {
        const newArtifactTypes: InboxArtifactType[] = [
            'standup_notes',
            'sprint_plan',
            'incident_report',
            'postmortem',
            'feature_spec',
            'technical_design',
            'release_notes',
            'onboarding_checklist',
            'content_calendar',
            'okr_document',
            'meeting_notes',
            'board_deck',
            'budget_model',
            'job_spec',
            'research_brief',
            'compliance_brief',
        ];

        it('should include all new artifact types in schema', () => {
            newArtifactTypes.forEach(type => {
                expect(InboxArtifactTypeSchema.safeParse(type).success).toBe(true);
            });
        });

        it('should map sprint_planning to sprint_plan artifact', () => {
            const artifacts = getArtifactTypesForThreadType('sprint_planning');
            expect(artifacts).toContain('sprint_plan');
        });

        it('should map incident_response to incident_report and postmortem', () => {
            const artifacts = getArtifactTypesForThreadType('incident_response');
            expect(artifacts).toContain('incident_report');
            expect(artifacts).toContain('postmortem');
        });

        it('should map deep_research to research_brief', () => {
            const artifacts = getArtifactTypesForThreadType('deep_research');
            expect(artifacts).toContain('research_brief');
        });

        it('should map board_prep to board_deck', () => {
            const artifacts = getArtifactTypesForThreadType('board_prep');
            expect(artifacts).toContain('board_deck');
        });
    });

    // ============ Quick Action Tests ============
    describe('Super User Quick Actions', () => {
        it('should have quick actions for super_user role', () => {
            const superUserActions = getQuickActionsForRole('super_user');
            expect(superUserActions.length).toBeGreaterThan(10);
        });

        it('should include daily-standup quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'daily-standup');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('leo');
            expect(action?.threadType).toBe('daily_standup');
            expect(action?.roles).toContain('super_user');
        });

        it('should include sprint-planning quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'sprint-planning');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('linus');
            expect(action?.threadType).toBe('sprint_planning');
        });

        it('should include incident-response quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'incident-response');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('linus');
            expect(action?.threadType).toBe('incident_response');
        });

        it('should include customer-onboarding quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'customer-onboarding');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('mrs_parker');
            expect(action?.threadType).toBe('customer_onboarding');
        });

        it('should include deep-research quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'deep-research');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('big_worm');
            expect(action?.threadType).toBe('deep_research');
        });

        it('should include compliance-brief quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'compliance-brief');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('roach');
            expect(action?.threadType).toBe('compliance_research');
        });

        it('should include cash-flow quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'cash-flow');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('mike');
            expect(action?.threadType).toBe('budget_planning');
        });

        it('should include board-update quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'board-update');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('mike');
            expect(action?.threadType).toBe('board_prep');
        });

        it('should include compliance-audit quick action', () => {
            const action = INBOX_QUICK_ACTIONS.find(a => a.id === 'compliance-audit');
            expect(action).toBeDefined();
            expect(action?.defaultAgent).toBe('deebo');
            expect(action?.threadType).toBe('compliance_audit');
        });
    });

    // ============ Agent Routing Tests ============
    describe('Agent Routing for Company Operations', () => {
        it('should route daily_standup to leo with executive supporting', () => {
            const mapping = THREAD_AGENT_MAPPING['daily_standup'];
            expect(mapping.primary).toBe('leo');
            expect(mapping.supporting).toContain('linus');
            expect(mapping.supporting).toContain('jack');
            expect(mapping.supporting).toContain('glenda');
        });

        it('should route sprint_planning to linus', () => {
            const mapping = THREAD_AGENT_MAPPING['sprint_planning'];
            expect(mapping.primary).toBe('linus');
            expect(mapping.supporting).toContain('leo');
        });

        it('should route customer_onboarding to mrs_parker', () => {
            const mapping = THREAD_AGENT_MAPPING['customer_onboarding'];
            expect(mapping.primary).toBe('mrs_parker');
            expect(mapping.supporting).toContain('jack');
            expect(mapping.supporting).toContain('smokey');
        });

        it('should route seo_sprint to day_day', () => {
            const mapping = THREAD_AGENT_MAPPING['seo_sprint'];
            expect(mapping.primary).toBe('day_day');
            expect(mapping.supporting).toContain('glenda');
            expect(mapping.supporting).toContain('roach');
        });

        it('should route compliance_audit to deebo with roach support', () => {
            const mapping = THREAD_AGENT_MAPPING['compliance_audit'];
            expect(mapping.primary).toBe('deebo');
            expect(mapping.supporting).toContain('roach');
        });

        it('should route weekly_sync to leo with all executives', () => {
            const mapping = THREAD_AGENT_MAPPING['weekly_sync'];
            expect(mapping.primary).toBe('leo');
            expect(mapping.supporting).toContain('jack');
            expect(mapping.supporting).toContain('linus');
            expect(mapping.supporting).toContain('glenda');
            expect(mapping.supporting).toContain('mike');
        });
    });

    // ============ Helper Function Tests ============
    describe('Helper Functions', () => {
        it('createInboxThreadId should generate unique IDs', () => {
            const id1 = createInboxThreadId();
            const id2 = createInboxThreadId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^inbox-thread-/);
        });

        it('createInboxArtifactId should generate unique IDs', () => {
            const id1 = createInboxArtifactId();
            const id2 = createInboxArtifactId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^inbox-artifact-/);
        });

        it('getDefaultAgentForThreadType should return primary agent', () => {
            expect(getDefaultAgentForThreadType('daily_standup')).toBe('leo');
            expect(getDefaultAgentForThreadType('deep_research')).toBe('big_worm');
            expect(getDefaultAgentForThreadType('customer_onboarding')).toBe('mrs_parker');
        });

        it('getSupportingAgentsForThreadType should return supporting agents array', () => {
            const supporting = getSupportingAgentsForThreadType('deep_research');
            expect(Array.isArray(supporting)).toBe(true);
            expect(supporting).toContain('roach');
            expect(supporting).toContain('ezal');
        });
    });

    // ============ Icon Tests ============
    describe('Thread Type Icons', () => {
        const iconMappings: Record<string, string> = {
            'daily_standup': 'Coffee',
            'sprint_planning': 'ListTodo',
            'incident_response': 'AlertTriangle',
            'release': 'Rocket',
            'customer_onboarding': 'UserPlus',
            'deep_research': 'BookOpen',
            'compliance_research': 'Scale',
            'board_prep': 'Presentation',
            'hiring': 'UserSearch',
        };

        Object.entries(iconMappings).forEach(([type, expectedIcon]) => {
            it(`should return ${expectedIcon} icon for ${type}`, () => {
                expect(getThreadTypeIcon(type as InboxThreadType)).toBe(expectedIcon);
            });
        });
    });

    // ============ Label Tests ============
    describe('Thread Type Labels', () => {
        const labelMappings: Record<string, string> = {
            'daily_standup': 'Daily Standup',
            'sprint_planning': 'Sprint Planning',
            'incident_response': 'Incident Response',
            'customer_onboarding': 'Customer Onboarding',
            'deep_research': 'Deep Research',
            'compliance_research': 'Compliance Research',
            'board_prep': 'Board Prep',
        };

        Object.entries(labelMappings).forEach(([type, expectedLabel]) => {
            it(`should return "${expectedLabel}" label for ${type}`, () => {
                expect(getThreadTypeLabel(type as InboxThreadType)).toBe(expectedLabel);
            });
        });
    });

    // ============ Validation Tests ============
    describe('Zod Schema Validation', () => {
        it('should reject invalid thread types', () => {
            expect(InboxThreadTypeSchema.safeParse('invalid_type').success).toBe(false);
            expect(InboxThreadTypeSchema.safeParse('').success).toBe(false);
            expect(InboxThreadTypeSchema.safeParse(null).success).toBe(false);
        });

        it('should reject invalid agent personas', () => {
            expect(InboxAgentPersonaSchema.safeParse('invalid_agent').success).toBe(false);
            expect(InboxAgentPersonaSchema.safeParse('').success).toBe(false);
        });

        it('should reject invalid artifact types', () => {
            expect(InboxArtifactTypeSchema.safeParse('invalid_artifact').success).toBe(false);
            expect(InboxArtifactTypeSchema.safeParse('').success).toBe(false);
        });
    });
});
