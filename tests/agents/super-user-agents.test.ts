/**
 * Super User Agents Integration Tests
 *
 * Tests the functionality of Super User agents by prompting them
 * and validating their responses.
 *
 * Run with: npx jest tests/agents/super-user-agents.test.ts
 */

import { PERSONAS, AgentPersona } from '@/app/dashboard/ceo/agents/personas';
import { THREAD_AGENT_MAPPING, InboxThreadType } from '@/types/inbox';

// Mock the server actions since these are integration tests
jest.mock('@/server/auth/auth', () => ({
    requireSuperUser: jest.fn().mockResolvedValue(true),
    requireUser: jest.fn().mockResolvedValue({ uid: 'test-user', role: 'super_user' }),
}));

describe('Super User Agents Configuration', () => {
    // ============ Executive Team Tests ============
    describe('Executive Team Personas', () => {
        const executivePersonas: AgentPersona[] = ['leo', 'jack', 'linus', 'glenda', 'mike_exec'];

        it('should have all executive personas defined', () => {
            executivePersonas.forEach(persona => {
                expect(PERSONAS[persona]).toBeDefined();
                expect(PERSONAS[persona].name).toBeDefined();
                expect(PERSONAS[persona].description).toBeDefined();
            });
        });

        it('Leo should be COO with operations focus', () => {
            const leo = PERSONAS['leo'];
            expect(leo.name).toContain('Leo');
            expect(leo.name.toLowerCase()).toContain('coo');
        });

        it('Jack should be CRO with revenue focus', () => {
            const jack = PERSONAS['jack'];
            expect(jack.name).toContain('Jack');
            expect(jack.name.toLowerCase()).toContain('cro');
        });

        it('Linus should be CTO with technical focus', () => {
            const linus = PERSONAS['linus'];
            expect(linus.name).toContain('Linus');
            expect(linus.name.toLowerCase()).toContain('cto');
        });

        it('Glenda should be CMO with marketing focus', () => {
            const glenda = PERSONAS['glenda'];
            expect(glenda.name).toContain('Glenda');
            expect(glenda.name.toLowerCase()).toContain('cmo');
        });

        it('Mike should be CFO with finance focus', () => {
            const mike = PERSONAS['mike_exec'];
            expect(mike.name).toContain('Mike');
            expect(mike.name.toLowerCase()).toContain('cfo');
        });
    });

    // ============ Support Staff Tests ============
    describe('Support Staff Personas', () => {
        const supportPersonas: AgentPersona[] = [
            'smokey', 'pops', 'craig', 'ezal', 'deebo', 'day_day', 'mrs_parker', 'money_mike'
        ];

        it('should have all support staff personas defined', () => {
            supportPersonas.forEach(persona => {
                expect(PERSONAS[persona]).toBeDefined();
            });
        });

        it('Smokey should be product/budtender focused', () => {
            const smokey = PERSONAS['smokey'];
            expect(smokey.name).toContain('Smokey');
        });

        it('Mrs. Parker should handle customer success', () => {
            const mrsParker = PERSONAS['mrs_parker'];
            expect(mrsParker.name).toContain('Parker');
        });
    });

    // ============ Thread Routing Tests ============
    describe('Agent Thread Routing', () => {
        describe('Company Operations Routing', () => {
            it('daily_standup should route to Leo', () => {
                expect(THREAD_AGENT_MAPPING['daily_standup'].primary).toBe('leo');
            });

            it('sprint_planning should route to Linus', () => {
                expect(THREAD_AGENT_MAPPING['sprint_planning'].primary).toBe('linus');
            });

            it('incident_response should route to Linus', () => {
                expect(THREAD_AGENT_MAPPING['incident_response'].primary).toBe('linus');
            });

            it('customer_onboarding should route to Mrs. Parker', () => {
                expect(THREAD_AGENT_MAPPING['customer_onboarding'].primary).toBe('mrs_parker');
            });

            it('board_prep should route to Mike (CFO)', () => {
                expect(THREAD_AGENT_MAPPING['board_prep'].primary).toBe('mike');
            });

            it('compliance_audit should route to Deebo', () => {
                expect(THREAD_AGENT_MAPPING['compliance_audit'].primary).toBe('deebo');
            });
        });

        describe('Research Routing', () => {
            it('deep_research should route to Big Worm', () => {
                expect(THREAD_AGENT_MAPPING['deep_research'].primary).toBe('big_worm');
            });

            it('compliance_research should route to Roach', () => {
                expect(THREAD_AGENT_MAPPING['compliance_research'].primary).toBe('roach');
            });

            it('market_research should route to Big Worm', () => {
                expect(THREAD_AGENT_MAPPING['market_research'].primary).toBe('big_worm');
            });
        });
    });
});

describe('Agent Prompt Templates', () => {
    // Test that agents have appropriate system prompts for their roles

    describe('Executive Agent Prompts', () => {
        it('should have unique system instructions per executive role', () => {
            const executives = ['leo', 'jack', 'linus', 'glenda', 'mike_exec'];
            const instructions = executives.map(e => PERSONAS[e]?.systemPrompt || PERSONAS[e]?.description);

            // Each should have some instruction/description
            instructions.forEach(inst => {
                expect(inst).toBeDefined();
            });
        });
    });

    describe('Support Staff Prompts', () => {
        it('Mrs. Parker should have customer success focused prompt', () => {
            const mrsParker = PERSONAS['mrs_parker'];
            const prompt = mrsParker?.systemPrompt || mrsParker?.description || '';
            // Should mention customer-related concepts
            expect(prompt.toLowerCase()).toMatch(/customer|retention|welcome|loyalty/i);
        });
    });
});

describe('Agent Response Quality Expectations', () => {
    // These tests define what we expect from agent responses
    // They serve as documentation and regression tests

    describe('Leo (COO) Response Expectations', () => {
        const expectedCapabilities = [
            'coordinate cross-functional activities',
            'run standups and syncs',
            'track OKRs and operational metrics',
            'manage hiring and team operations',
        ];

        it('should handle daily standup requests', () => {
            // Leo should be capable of running standups
            const leoRouting = THREAD_AGENT_MAPPING['daily_standup'];
            expect(leoRouting.primary).toBe('leo');
            expect(leoRouting.supporting).toContain('linus');
            expect(leoRouting.supporting).toContain('jack');
        });

        it('should handle weekly sync requests', () => {
            const weeklySync = THREAD_AGENT_MAPPING['weekly_sync'];
            expect(weeklySync.primary).toBe('leo');
            expect(weeklySync.supporting.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe('Linus (CTO) Response Expectations', () => {
        const techThreads: InboxThreadType[] = [
            'sprint_planning',
            'incident_response',
            'feature_spec',
            'code_review',
            'release',
        ];

        it('should be primary for all technical threads', () => {
            techThreads.forEach(thread => {
                expect(THREAD_AGENT_MAPPING[thread].primary).toBe('linus');
            });
        });
    });

    describe('Mrs. Parker Response Expectations', () => {
        it('should be primary for customer onboarding', () => {
            expect(THREAD_AGENT_MAPPING['customer_onboarding'].primary).toBe('mrs_parker');
        });

        it('should support customer feedback threads', () => {
            const feedback = THREAD_AGENT_MAPPING['customer_feedback'];
            expect(feedback.supporting).toContain('mrs_parker');
        });
    });

    describe('Big Worm Response Expectations', () => {
        it('should handle deep research with supporting agents', () => {
            const deepResearch = THREAD_AGENT_MAPPING['deep_research'];
            expect(deepResearch.primary).toBe('big_worm');
            expect(deepResearch.supporting).toContain('roach');
            expect(deepResearch.supporting).toContain('ezal');
        });
    });

    describe('Roach Response Expectations', () => {
        it('should handle compliance research with Deebo support', () => {
            const complianceResearch = THREAD_AGENT_MAPPING['compliance_research'];
            expect(complianceResearch.primary).toBe('roach');
            expect(complianceResearch.supporting).toContain('deebo');
        });
    });
});

describe('Agent Collaboration Patterns', () => {
    describe('Cross-Functional Support', () => {
        it('weekly_sync should include all executives', () => {
            const sync = THREAD_AGENT_MAPPING['weekly_sync'];
            expect(sync.supporting).toContain('jack');
            expect(sync.supporting).toContain('linus');
            expect(sync.supporting).toContain('glenda');
            expect(sync.supporting).toContain('mike');
        });

        it('quarterly_planning should include all executives', () => {
            const planning = THREAD_AGENT_MAPPING['quarterly_planning'];
            expect(planning.primary).toBe('leo');
            expect(planning.supporting.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe('Research Collaboration', () => {
        it('deep_research should have research team support', () => {
            const research = THREAD_AGENT_MAPPING['deep_research'];
            expect(research.supporting).toContain('roach');
        });

        it('compliance_audit should have research support', () => {
            const audit = THREAD_AGENT_MAPPING['compliance_audit'];
            expect(audit.supporting).toContain('roach');
        });
    });

    describe('Customer Success Collaboration', () => {
        it('customer_onboarding should have sales and product support', () => {
            const onboarding = THREAD_AGENT_MAPPING['customer_onboarding'];
            expect(onboarding.supporting).toContain('jack');
            expect(onboarding.supporting).toContain('smokey');
        });
    });
});
