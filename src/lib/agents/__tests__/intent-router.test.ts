import { getAgentForIntent, resolveInboxAgent } from '../intent-router';

describe('intent-router', () => {
    it('routes clear compliance requests to Deebo', () => {
        expect(getAgentForIntent('Check NY compliance rules for this campaign')).toBe('deebo');
    });

    it('routes clear competitive requests to Ezal', () => {
        expect(resolveInboxAgent('Show competitor pricing near Syracuse', 'auto')).toBe('ezal');
    });

    it('routes COGS questions to Money Mike', () => {
        expect(getAgentForIntent('What is our COGS on prerolls?')).toBe('money_mike');
    });

    it('preserves the caller fallback when no specialist matches', () => {
        expect(resolveInboxAgent('Hey team, what can you help me with?', 'auto')).toBe('auto');
    });

    it('returns null for empty intent input', () => {
        expect(getAgentForIntent('   ')).toBeNull();
    });
});
