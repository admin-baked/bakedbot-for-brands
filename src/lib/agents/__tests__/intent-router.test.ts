import { getAgentForIntent, resolveInboxAgent, resolveInboxThreadAgent } from '../intent-router';

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

    it('routes average revenue per customer questions to Pops', () => {
        expect(getAgentForIntent('What is average revenue per customer')).toBe('pops');
    });

    it('hands off clear analytics questions from a market-intel thread to Pops', () => {
        const resolution = resolveInboxThreadAgent('What is average revenue per customer?', 'ezal', 'auto');

        expect(resolution.agentId).toBe('pops');
        expect(resolution.matchedAgent).toBe('pops');
        expect(resolution.didHandoff).toBe(true);
    });

    it('keeps customer-detail questions with Mrs. Parker', () => {
        const resolution = resolveInboxThreadAgent('How many times has this customer shopped?', 'mrs_parker', 'auto');

        expect(resolution.agentId).toBe('mrs_parker');
        expect(resolution.matchedAgent).toBe('pops');
        expect(resolution.didHandoff).toBe(false);
    });

    it('keeps the current thread agent when no deterministic specialist matches', () => {
        const resolution = resolveInboxThreadAgent('Can you make this sharper?', 'craig', 'auto');

        expect(resolution.agentId).toBe('craig');
        expect(resolution.didHandoff).toBe(false);
    });

    it('returns null for empty intent input', () => {
        expect(getAgentForIntent('   ')).toBeNull();
    });
});
