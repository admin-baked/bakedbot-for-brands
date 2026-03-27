import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/server/agents/linus', () => ({
    runLinus: jest.fn(),
}));

jest.mock('../incident-notifications', () => ({
    postLinusIncidentSlack: jest.fn(),
}));

describe('linus-incident-response', () => {
    let dispatchLinusIncidentResponse: typeof import('../linus-incident-response').dispatchLinusIncidentResponse;
    let mockRunLinus: jest.Mock;
    let mockPostLinusIncidentSlack: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        dispatchLinusIncidentResponse = require('../linus-incident-response').dispatchLinusIncidentResponse;
        mockRunLinus = require('@/server/agents/linus').runLinus;
        mockPostLinusIncidentSlack = require('../incident-notifications').postLinusIncidentSlack;
        mockPostLinusIncidentSlack.mockResolvedValue({
            channelId: 'C123',
            channelName: 'linus-incidents',
            ts: '123.456',
            delivery: 'channel',
        });
    });

    it('posts Linus final analysis to Slack after a successful run', async () => {
        mockRunLinus.mockResolvedValue({
            content: 'FIXED: shipped the repair and verified the checks.',
            toolExecutions: [],
            decision: 'MISSION_READY',
            model: 'claude-test',
        });

        await dispatchLinusIncidentResponse({
            prompt: 'repair this',
            source: 'support-ticket',
            incidentId: 'ticket_123',
            incidentLink: '<https://bakedbot.ai|Open Ticket Queue>',
            maxIterations: 10,
        });

        expect(mockRunLinus).toHaveBeenCalledWith(expect.objectContaining({
            prompt: 'repair this',
            maxIterations: 10,
        }));
        expect(mockPostLinusIncidentSlack).toHaveBeenCalledWith(expect.objectContaining({
            source: 'support-ticket',
            incidentId: 'ticket_123',
            fallbackText: expect.stringContaining('Linus incident report'),
        }));
    });

    it('posts a blocked notice to Slack when Linus cannot complete the run', async () => {
        mockRunLinus.mockRejectedValue(new Error('Claude API unavailable'));

        await dispatchLinusIncidentResponse({
            prompt: 'repair this',
            source: 'auto-escalator',
            incidentId: 'bug_123',
        });

        expect(mockPostLinusIncidentSlack).toHaveBeenCalledWith(expect.objectContaining({
            source: 'auto-escalator',
            incidentId: 'bug_123',
            fallbackText: expect.stringContaining('blocked'),
        }));
    });

    it('posts a blocked notice when Linus returns no report content', async () => {
        mockRunLinus.mockResolvedValue({
            content: '',
            toolExecutions: [],
            decision: undefined,
            model: 'claude-test',
        });

        await dispatchLinusIncidentResponse({
            prompt: 'repair this',
            source: 'support-ticket',
            incidentId: 'ticket_456',
        });

        expect(mockPostLinusIncidentSlack).toHaveBeenCalledWith(expect.objectContaining({
            source: 'support-ticket',
            incidentId: 'ticket_456',
            fallbackText: expect.stringContaining('blocked'),
        }));
    });
});
