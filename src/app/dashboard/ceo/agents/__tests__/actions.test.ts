/**
 * Tests for CEO Agent Actions
 * Specifically tests error handling in runAgentChat
 */

// Mock crypto.randomUUID for Node.js test environment
if (!global.crypto) {
    global.crypto = {} as any;
}
(global.crypto as any).randomUUID = jest.fn(() => 'mock-uuid-12345');

// Mock all required modules before imports
jest.mock('firebase-admin', () => ({
    firestore: () => ({}),
    auth: () => ({}),
    apps: [],
}));

jest.mock('firebase-admin/firestore', () => ({
    getFirestore: jest.fn(),
    FieldValue: {
        serverTimestamp: jest.fn(() => 'mock-timestamp'),
        increment: jest.fn((n: number) => `increment-${n}`),
    }
}), { virtual: true });

jest.mock('next/cache', () => ({
    unstable_cache: (fn: any) => fn,
    revalidatePath: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));

jest.mock('@/ai/chat-query-handler', () => ({
    analyzeQuery: jest.fn(),
}));

jest.mock('@/server/jobs/dispatch', () => ({
    dispatchAgentJob: jest.fn(),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(),
    })),
}));

// Mock genkit and AI modules to avoid ESM issues
jest.mock('@/ai/genkit', () => ({}));
jest.mock('@/ai/model-selector', () => ({
    getGenerateOptions: jest.fn(),
}));

// Mock all agent modules
jest.mock('@/server/agents/deebo', () => ({ deebo: jest.fn() }));
jest.mock('@/server/agents/craig', () => ({ craigAgent: jest.fn() }));
jest.mock('@/server/agents/smokey', () => ({ smokeyAgent: jest.fn() }));
jest.mock('@/server/agents/pops', () => ({ popsAgent: jest.fn() }));
jest.mock('@/server/agents/ezal', () => ({ ezalAgent: jest.fn() }));
jest.mock('@/server/agents/moneyMike', () => ({ moneyMikeAgent: jest.fn() }));
jest.mock('@/server/agents/mrsParker', () => ({ mrsParkerAgent: jest.fn() }));
jest.mock('@/server/agents/executive', () => ({ executiveAgent: jest.fn() }));
jest.mock('@/server/agents/deebo-agent-impl', () => ({ deeboAgent: jest.fn() }));
jest.mock('@/server/agents/bigworm', () => ({ bigWormAgent: jest.fn() }));
jest.mock('@/server/agents/linus', () => ({ linusAgent: jest.fn() }));
jest.mock('@/server/agents/harness', () => ({ runAgent: jest.fn() }));
jest.mock('@/server/agents/persistence', () => ({ persistence: {} }));

// Mock tool modules
jest.mock('@/server/tools/web-search', () => ({ searchWeb: jest.fn(), formatSearchResults: jest.fn() }));
jest.mock('@/server/tools/http-client', () => ({ httpRequest: jest.fn() }));
jest.mock('@/server/tools/browser', () => ({ browserAction: jest.fn() }));
jest.mock('@/server/tools/scheduler', () => ({ scheduleTask: jest.fn() }));
jest.mock('@/server/tools/webhooks', () => ({ manageWebhooks: jest.fn() }));
jest.mock('@/server/tools/gmail', () => ({ gmailAction: jest.fn() }));
jest.mock('@/server/tools/calendar', () => ({ calendarAction: jest.fn() }));
jest.mock('@/server/tools/sheets', () => ({ sheetsAction: jest.fn() }));
jest.mock('@/server/tools/leaflink', () => ({ leaflinkAction: jest.fn() }));
jest.mock('@/server/tools/dutchie', () => ({ dutchieAction: jest.fn() }));

// Mock other dependencies
jest.mock('@/server/integrations/gmail/oauth', () => ({ getAuthUrl: jest.fn() }));
jest.mock('@/server/integrations/gmail/token-storage', () => ({ getGmailToken: jest.fn() }));
jest.mock('@/lib/notifications/blackleaf-service', () => ({ blackleafService: {} }));
jest.mock('@/server/services/cannmenus', () => ({ CannMenusService: jest.fn() }));
jest.mock('@/server/intuition/customer-memory', () => ({ getCustomerMemory: jest.fn() }));

// Mock default-tools to avoid genkit imports
jest.mock('../default-tools', () => ({
    defaultCraigTools: {},
    defaultSmokeyTools: {},
    defaultPopsTools: {},
    defaultEzalTools: {},
    defaultMoneyMikeTools: {},
    defaultMrsParkerTools: {},
    defaultDeeboTools: {},
    defaultBigWormTools: {},
    defaultExecutiveTools: {},
}));

// Import after mocks
import { runAgentChat } from '../actions';
import { requireUser } from '@/server/auth/auth';
import { dispatchAgentJob } from '@/server/jobs/dispatch';
import { getFirestore } from 'firebase-admin/firestore';

describe('runAgentChat', () => {
    let mockFirestore: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn().mockReturnThis(),
            set: jest.fn().mockResolvedValue({}),
            update: jest.fn().mockResolvedValue({}),
        };

        (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    describe('error handling', () => {
        it('should return error content when requireUser throws', async () => {
            (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized: No session cookie found.'));

            const result = await runAgentChat('Setup integrations', 'leo');

            expect(result.content).toContain('Error');
            expect(result.content).toContain('Unauthorized');
            expect(result.toolCalls).toEqual([]);
        });

        it('should return error content when Firestore write fails', async () => {
            (requireUser as jest.Mock).mockResolvedValue({
                uid: 'super-user-123',
                email: 'super@bakedbot.ai',
                role: 'super_user',
            });
            mockFirestore.set.mockRejectedValue(new Error('Firestore connection failed'));

            const result = await runAgentChat('Setup integrations', 'leo');

            expect(result.content).toContain('Error');
            expect(result.content).toContain('Firestore');
        });

        it('should return error content when dispatch fails with error', async () => {
            (requireUser as jest.Mock).mockResolvedValue({
                uid: 'super-user-123',
                email: 'super@bakedbot.ai',
                role: 'super_user',
                brandId: 'test-brand',
            });
            mockFirestore.set.mockResolvedValue({});
            (dispatchAgentJob as jest.Mock).mockResolvedValue({
                success: false,
                error: 'Cloud Tasks quota exceeded',
            });

            const result = await runAgentChat('Setup integrations', 'leo');

            expect(result.content).toContain('Error');
            expect(result.content).toContain('Cloud Tasks quota exceeded');
        });
    });

    describe('successful operation', () => {
        it('should return jobId in metadata when successful', async () => {
            (requireUser as jest.Mock).mockResolvedValue({
                uid: 'super-user-123',
                email: 'super@bakedbot.ai',
                role: 'super_user',
                brandId: 'test-brand',
            });
            mockFirestore.set.mockResolvedValue({});
            (dispatchAgentJob as jest.Mock).mockResolvedValue({
                success: true,
            });

            const result = await runAgentChat('Setup integrations', 'leo');

            expect(result.metadata?.jobId).toBeDefined();
            expect(result.metadata?.agentName).toBe('leo');
            expect(result.metadata?.type).toBe('session_context');
            expect(result.content).toBe(''); // Empty content - UI should handle polling
        });

        it('should return hire_modal for hire-related messages', async () => {
            const result = await runAgentChat('I want to hire the team');

            expect(result.metadata?.type).toBe('hire_modal');
            expect(result.content).toContain('digital workforce');
        });
    });
});
