
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock the import of default-tools effectively.
// However, since default-tools exports objects that usually import backend code,
// we must be careful with side effects.
// We will mock the modules that default-tools depends on.

// Mock playbook-manager
const mockCreatePlaybook = vi.fn();
vi.mock('@/server/tools/playbook-manager', () => ({
    createPlaybook: mockCreatePlaybook
}));

// Mock other heavy dependencies to prevent load errors
vi.mock('@/ai/genkit', () => ({ ai: {} }));
vi.mock('@/server/agents/deebo', () => ({ deebo: {} }));
vi.mock('@/lib/notifications/blackleaf-service', () => ({ blackleafService: {} }));
vi.mock('@/server/services/cannmenus', () => ({ CannMenusService: class {} }));
vi.mock('@/server/tools/web-search', () => ({ searchWeb: vi.fn(), formatSearchResults: vi.fn() }));
vi.mock('@/firebase/server-client', () => ({ createServerClient: vi.fn() }));
vi.mock('@/server/auth/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/server/repos/productRepo', () => ({ makeProductRepo: vi.fn() }));
vi.mock('@/app/dashboard/ceo/agents/super-user-tools-impl', () => ({ superUserTools: {} }));
vi.mock('@/server/tools/permissions', () => ({ requestPermission: vi.fn() }));

// Now import the tools
import { defaultCraigTools } from '../default-tools';

describe('Default Agent Tools', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
