
import { describe, it, expect } from 'vitest';
import { contextOsToolDefs, lettaToolDefs, intuitionOsToolDefs } from '../shared-tools';

describe('Shared Tools Definitions', () => {
    describe('Context OS Tools', () => {
        it('should define core context tools', () => {
            const toolNames = contextOsToolDefs.map(t => t.name);
            expect(toolNames).toContain('contextLogDecision');
            expect(toolNames).toContain('contextAskWhy');
            expect(toolNames).toContain('contextGetAgentHistory');
        });

        it('should have valid schemas', () => {
            const logDecision = contextOsToolDefs.find(t => t.name === 'contextLogDecision');
            expect(logDecision?.schema).toBeDefined();
            // Verify schema parsing
            const validInput = { decision: 'Test', reasoning: 'Because', category: 'strategy' };
            expect(logDecision?.schema.safeParse(validInput).success).toBe(true);
        });
    });

    describe('Letta Tools', () => {
        it('should define memory tools', () => {
           const toolNames = lettaToolDefs.map(t => t.name);
           expect(toolNames).toContain('lettaSaveFact');
           expect(toolNames).toContain('lettaAsk');
        });
    });

    describe('Intuition OS Tools', () => {
        it('should define heuristic tools', () => {
            const toolNames = intuitionOsToolDefs.map(t => t.name);
            expect(toolNames).toContain('intuitionEvaluateHeuristics');
        });
    });
});
