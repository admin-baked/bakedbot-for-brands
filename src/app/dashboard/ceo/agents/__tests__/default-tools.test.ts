
// We need to mock the import of default-tools effectively.
// However, since default-tools exports objects that usually import backend code,
// we must be careful with side effects.
// We will mock the modules that default-tools depends on.

// Mock playbook-manager
const mockCreatePlaybook = jest.fn();
jest.mock('@/server/tools/playbook-manager', () => ({
    createPlaybook: mockCreatePlaybook
}));

// Mock other heavy dependencies to prevent load errors
jest.mock('@/ai/genkit', () => ({ ai: {} }));
jest.mock('@/server/agents/deebo', () => ({ deebo: {} }));
jest.mock('@/lib/notifications/blackleaf-service', () => ({ blackleafService: {} }));
jest.mock('@/server/services/cannmenus', () => ({ CannMenusService: class {} }));
jest.mock('@/server/tools/web-search', () => ({ searchWeb: jest.fn(), formatSearchResults: jest.fn() }));
jest.mock('@/firebase/server-client', () => ({ createServerClient: jest.fn() }));
jest.mock('@/server/auth/auth', () => ({ requireUser: jest.fn() }));
jest.mock('@/server/repos/productRepo', () => ({ makeProductRepo: jest.fn() }));
jest.mock('@/app/dashboard/ceo/agents/super-user-tools-impl', () => ({ superUserTools: {} }));
jest.mock('@/server/tools/permissions', () => ({ requestPermission: jest.fn() }));

// Now import the tools
import { defaultCraigTools } from '../default-tools';

describe('Default Agent Tools', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('draft_playbook', () => {
        it('should call createPlaybook with active: false', async () => {
            // Check if tool exists (TS hack as it's added via untyped spread in some places or strict types)
            // In the file it's added via "commonPlaybookTools"
            const draftTool = (defaultCraigTools as any).draft_playbook;
            expect(draftTool).toBeDefined();

            await draftTool('My Draft', 'Description', [{ action: 'test' }], '0 0 * * *');

            expect(mockCreatePlaybook).toHaveBeenCalledWith(expect.objectContaining({
                name: 'My Draft',
                description: 'Description',
                steps: [{ action: 'test' }],
                schedule: '0 0 * * *',
                active: false // CRITICAL ASSERTION
            }));
        });
    });
});
