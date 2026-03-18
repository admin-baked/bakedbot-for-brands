import { describe, expect, it } from '@jest/globals';

import { classifyFastPathQuery } from '@/server/agents/fast-path-query';

describe('classifyFastPathQuery', () => {
    it('matches explicit model meta questions', () => {
        expect(classifyFastPathQuery("What's your model?")).toEqual({
            isAgentStatusQuery: false,
            isFastPathQuery: true,
        });
    });

    it('matches explicit performance meta questions', () => {
        expect(classifyFastPathQuery('Why are you so slow today?')).toEqual({
            isAgentStatusQuery: false,
            isFastPathQuery: true,
        });
    });

    it('keeps agent status requests on the fast path', () => {
        expect(classifyFastPathQuery('show all active agents')).toEqual({
            isAgentStatusQuery: true,
            isFastPathQuery: true,
        });
    });

    it('does not treat domain requests with model keywords as meta queries', () => {
        expect(classifyFastPathQuery('What pricing model should we use for subscriptions?')).toEqual({
            isAgentStatusQuery: false,
            isFastPathQuery: false,
        });
    });

    it('does not treat domain requests with performance keywords as meta queries', () => {
        expect(classifyFastPathQuery('Build a performance marketing plan for 4/20 promotions.')).toEqual({
            isAgentStatusQuery: false,
            isFastPathQuery: false,
        });
    });
});
