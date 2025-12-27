import { 
    listBrandPlaybooks, 
    togglePlaybookStatus, 
    createPlaybook, 
    updatePlaybook, 
    deletePlaybook,
    clonePlaybook,
    detectApprovalRequired 
} from '../playbooks';
import { createServerClient } from '@/firebase/server-client';
import { DEFAULT_PLAYBOOKS } from '@/config/default-playbooks';
import { PlaybookStep } from '@/types/playbook';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn()
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn().mockResolvedValue({ 
        uid: 'user1', 
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
    })
}));

const mockFirestore = {
    collection: jest.fn(),
    batch: jest.fn()
};

describe('Playbook Actions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    });

    describe('detectApprovalRequired', () => {
        it('returns true for customer email steps', () => {
            const steps: PlaybookStep[] = [
                { id: '1', action: 'gmail.send', params: { to: 'customer@example.com' } }
            ];
            expect(detectApprovalRequired(steps)).toBe(true);
        });

        it('returns false for user email steps', () => {
            const steps: PlaybookStep[] = [
                { id: '1', action: 'gmail.send', params: { to: '{{current_user.email}}' } }
            ];
            expect(detectApprovalRequired(steps)).toBe(false);
        });

        it('returns false for user.email variable', () => {
            const steps: PlaybookStep[] = [
                { id: '1', action: 'gmail.send', params: { to: '{{user.email}}' } }
            ];
            expect(detectApprovalRequired(steps)).toBe(false);
        });

        it('returns false for non-email steps', () => {
            const steps: PlaybookStep[] = [
                { id: '1', action: 'delegate', params: { agent: 'craig' } }
            ];
            expect(detectApprovalRequired(steps)).toBe(false);
        });

        it('returns true if any step has customer email', () => {
            const steps: PlaybookStep[] = [
                { id: '1', action: 'delegate', params: {} },
                { id: '2', action: 'gmail.send', params: { to: 'external@test.com' } }
            ];
            expect(detectApprovalRequired(steps)).toBe(true);
        });
    });

    describe('listBrandPlaybooks', () => {
        it('seeds default playbooks if brand has none', async () => {
            const mockGet = jest.fn().mockResolvedValue({ empty: true });
            const mockDoc = jest.fn().mockReturnValue({ 
                collection: jest.fn().mockReturnValue({ 
                    get: mockGet, 
                    doc: jest.fn().mockReturnValue({ id: 'new-id' }) 
                }) 
            });
            mockFirestore.collection.mockReturnValue({ doc: mockDoc });

            const mockBatchSet = jest.fn();
            const mockBatchCommit = jest.fn();
            mockFirestore.batch.mockReturnValue({ set: mockBatchSet, commit: mockBatchCommit });

            const result = await listBrandPlaybooks('brand1');

            expect(mockBatchSet).toHaveBeenCalledTimes(DEFAULT_PLAYBOOKS.length);
            expect(mockBatchCommit).toHaveBeenCalled();
            expect(result.length).toBe(DEFAULT_PLAYBOOKS.length);
            expect(result[0].name).toBeDefined();
        });

        it('lists existing playbooks without seeding', async () => {
            const mockData = { name: 'Existing Playbook', status: 'active' };
            const mockGet = jest.fn().mockResolvedValue({
                empty: false,
                docs: [{ id: 'pb1', data: () => mockData }]
            });
            const mockDoc = jest.fn().mockReturnValue({ collection: jest.fn().mockReturnValue({ get: mockGet }) });
            mockFirestore.collection.mockReturnValue({ doc: mockDoc });

            const result = await listBrandPlaybooks('brand1');

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('pb1');
            expect(mockFirestore.batch).not.toHaveBeenCalled();
        });
    });

    describe('createPlaybook', () => {
        it('creates a playbook with owner info', async () => {
            const mockSet = jest.fn();
            const mockDocFn = jest.fn().mockReturnValue({ id: 'new-pb-id', set: mockSet });
            const mockDoc = jest.fn().mockReturnValue({
                collection: jest.fn().mockReturnValue({ doc: mockDocFn })
            });
            mockFirestore.collection.mockReturnValue({ doc: mockDoc });

            const result = await createPlaybook('brand1', {
                name: 'Test Playbook',
                description: 'Test desc',
                agent: 'craig',
                category: 'marketing',
                triggers: [{ type: 'manual' }],
                steps: []
            });

            expect(result.success).toBe(true);
            expect(result.playbook?.name).toBe('Test Playbook');
            expect(result.playbook?.ownerId).toBe('user1');
            expect(result.playbook?.isCustom).toBe(true);
            expect(mockSet).toHaveBeenCalled();
        });
    });

    describe('togglePlaybookStatus', () => {
        it('toggles playbook status for owner', async () => {
            const mockUpdate = jest.fn();
            const mockGet = jest.fn().mockResolvedValue({
                exists: true,
                id: 'pb1',
                data: () => ({ ownerId: 'user1', status: 'active' })
            });
            const mockDocRef = { update: mockUpdate, get: mockGet };
            const mockDoc = jest.fn().mockReturnValue({
                collection: jest.fn().mockReturnValue({
                    doc: jest.fn().mockReturnValue(mockDocRef)
                })
            });
            mockFirestore.collection.mockReturnValue({ doc: mockDoc });

            const result = await togglePlaybookStatus('brand1', 'pb1', false);

            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'paused' }));
            expect(result.success).toBe(true);
        });
    });
});

// Tests for natural language parsing patterns (pure logic, no AI mock needed)
describe('Playbook Creation Detection Patterns', () => {
    const playbookCreationPatterns = [
        /create\s+(?:a\s+)?playbook/i,
        /build\s+(?:a\s+)?(?:playbook|automation|workflow)/i,
        /set\s+up\s+(?:a\s+)?(?:playbook|automation|workflow)/i,
        /make\s+(?:a\s+)?playbook/i,
        /new\s+playbook\s+(?:that|to|for)/i,
    ];

    const shouldMatch = [
        'Create a playbook that sends weekly reports',
        'create playbook for competitor monitoring',
        'build an automation to notify me of low stock',
        'Build a workflow for lead follow-up',
        'set up a playbook for daily intel',
        'Set up an automation that runs every morning',
        'make a playbook that emails me competitor prices',
        'new playbook that monitors reviews',
        'New playbook to track inventory',
    ];

    const shouldNotMatch = [
        'tell me about playbooks',
        'how do I edit a playbook',
        'list my playbooks',
        'what playbooks are available',
        'run the competitor playbook',
    ];

    shouldMatch.forEach(input => {
        it(`should match: "${input}"`, () => {
            const matches = playbookCreationPatterns.some(p => p.test(input));
            expect(matches).toBe(true);
        });
    });

    shouldNotMatch.forEach(input => {
        it(`should NOT match: "${input}"`, () => {
            const matches = playbookCreationPatterns.some(p => p.test(input));
            expect(matches).toBe(false);
        });
    });
});
