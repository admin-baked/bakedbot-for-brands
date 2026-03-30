jest.mock('../registry', () => ({
    TOOL_REGISTRY: {},
    getToolsForRole: jest.fn(() => []),
}));

jest.mock('../router', () => ({
    routeToolCall: jest.fn(),
}));

import { shouldUseClaudeTools } from '../claude-tools';

describe('shouldUseClaudeTools', () => {
    it('enables Claude tools for explicit web research requests', () => {
        expect(shouldUseClaudeTools('Search the web for the latest NY cannabis packaging rules')).toBe(true);
    });

    it('enables Claude tools for explicit asset generation requests', () => {
        expect(shouldUseClaudeTools('Create an image banner for our 4/20 sale')).toBe(true);
    });

    it('enables Claude tools for COGS and inventory-health questions', () => {
        expect(shouldUseClaudeTools('What is our COGS on prerolls?')).toBe(true);
        expect(shouldUseClaudeTools('Which categories have the worst days on hand right now?')).toBe(true);
    });

    it('does not enable Claude tools for specialist compliance prompts', () => {
        expect(shouldUseClaudeTools('Check NY compliance for this campaign')).toBe(false);
    });

    it('does not enable Claude tools for integration requests without matching universal tools', () => {
        expect(shouldUseClaudeTools('Send an email to our top 10 leads')).toBe(false);
    });
});
