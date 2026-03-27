jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock('@/server/utils/auth-check', () => ({
    verifySession: jest.fn(),
    verifySuperAdmin: jest.fn(),
}));

jest.mock('@/server/agents/harness', () => ({
    runAgent: jest.fn(),
}));

jest.mock('@/server/agents/persistence', () => ({
    persistence: {},
}));

jest.mock('@/server/agents/linus', () => ({
    linusAgent: { id: 'linus' },
}));

jest.mock('@/server/services/incident-notifications', () => ({
    postLinusIncidentSlack: jest.fn(),
}));

jest.mock('@/server/security', () => ({
    wrapUserData: jest.fn((value: string, label: string) => `[${label}] ${value}`),
    buildSystemDirectives: jest.fn((directives: string[]) => directives.join('\n')),
}));

const mockCreateServerClient = require('@/firebase/server-client').createServerClient as jest.Mock;
const mockVerifySession = require('@/server/utils/auth-check').verifySession as jest.Mock;
const mockRunAgent = require('@/server/agents/harness').runAgent as jest.Mock;
const mockPostLinusIncidentSlack = require('@/server/services/incident-notifications').postLinusIncidentSlack as jest.Mock;
const { POST } = require('../route') as typeof import('../route');

function buildRequest(body: unknown, url = 'http://localhost/api/tickets') {
    return {
        url,
        json: async () => body,
    } as any;
}

describe('POST /api/tickets', () => {
    const add = jest.fn();
    const collection = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        add.mockResolvedValue({ id: 'ticket_123' });
        collection.mockImplementation((name: string) => {
            if (name === 'tickets') {
                return { add };
            }

            throw new Error(`Unexpected collection: ${name}`);
        });

        mockCreateServerClient.mockResolvedValue({
            firestore: { collection },
        });
        mockVerifySession.mockResolvedValue(null);
        mockRunAgent.mockResolvedValue({ content: 'Linus is on it' });
        mockPostLinusIncidentSlack.mockResolvedValue(undefined);
    });

    it('posts high-priority system errors to #linus-incidents and dispatches Linus', async () => {
        const request = buildRequest({
            title: 'b.i.find is not a function',
            description: 'Rewards page crashed for a user',
            priority: 'high',
            category: 'system_error',
            pageUrl: 'https://bakedbot.ai/rewards',
            reporterEmail: 'auto-boundary',
            errorDigest: 'digest-123',
            errorStack: 'TypeError: b.i.find is not a function',
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.id).toBe('ticket_123');
        expect(mockPostLinusIncidentSlack).toHaveBeenCalledWith(
            expect.objectContaining({
                source: 'support-ticket',
                incidentId: 'ticket_123',
                fallbackText: expect.stringContaining('High system error'),
            }),
        );
        expect(mockRunAgent).toHaveBeenCalledTimes(1);
    });

    it('does not notify Slack or Linus for non-critical tickets', async () => {
        const request = buildRequest({
            title: 'Minor copy issue',
            description: 'Button text looks off',
            priority: 'medium',
            category: 'ux_feedback',
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
        expect(mockPostLinusIncidentSlack).not.toHaveBeenCalled();
        expect(mockRunAgent).not.toHaveBeenCalled();
    });

    it('still returns success when the Slack incident notification fails', async () => {
        mockPostLinusIncidentSlack.mockRejectedValueOnce(new Error('Slack unavailable'));

        const request = buildRequest({
            title: 'Crash on rewards',
            description: 'Rewards page crashed again',
            priority: 'high',
            category: 'system_error',
        });

        const response = await POST(request);
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.id).toBe('ticket_123');
        expect(mockRunAgent).toHaveBeenCalledTimes(1);
    });
});
