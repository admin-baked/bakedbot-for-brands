
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPlaybook } from '../playbook-manager';

// Mock dependencies
const mockSet = vi.fn();
const mockDoc = vi.fn(() => ({ set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));
const mockFirestore = {
    collection: mockCollection,
    batch: vi.fn(() => ({
        set: vi.fn(),
        commit: vi.fn()
    }))
};

vi.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => mockFirestore
}));

vi.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: () => 'MOCK_TIMESTAMP',
        increment: () => 'MOCK_INCREMENT'
    }
}));

vi.mock('../scheduler', () => ({
    scheduleTask: vi.fn(() => Promise.resolve({ jobId: 'mock-job-id' }))
}));

describe('Playbook Manager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createPlaybook', () => {
        it('should create an active playbook by default', async () => {
            const result = await createPlaybook({
                name: 'Test Playbook',
                description: 'Test Description',
                steps: [],
                agentId: 'test-agent'
            });

            expect(result.success).toBe(true);
            expect(mockCollection).toHaveBeenCalledWith('playbooks');
            
            // Allow dynamic ID checking
            const docCall = mockDoc.mock.calls[0];
            // ID is generated from name: "test-playbook"
            expect(mockDoc).toHaveBeenCalledWith('test-playbook');

            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Playbook',
                active: true,
                status: 'active' // New logic
            }));
        });

        it('should create a draft playbook when active is false', async () => {
             const result = await createPlaybook({
                name: 'Draft Playbook',
                description: 'Draft Description',
                steps: [],
                agentId: 'test-agent',
                active: false
            });

            expect(result.success).toBe(true);
            expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Draft Playbook',
                active: false,
                status: 'draft' // New logic verification
            }));
        });

        it('should register a schedule if provided', async () => {
            const { scheduleTask } = await import('../scheduler');
            
            await createPlaybook({
                name: 'Scheduled Playbook',
                description: 'Scheduled',
                steps: [],
                active: true,
                schedule: '0 9 * * *'
            });

            expect(scheduleTask).toHaveBeenCalledWith(expect.objectContaining({
                cron: '0 9 * * *',
                task: 'Execute Playbook: Scheduled Playbook'
            }));
        });
    });
});
