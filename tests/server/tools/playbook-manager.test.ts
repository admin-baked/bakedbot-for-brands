
import { createPlaybook } from '@/server/tools/playbook-manager';

const mockSet = jest.fn();
const mockDoc = jest.fn(() => ({ set: mockSet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => ({
        collection: mockCollection
    })
}));

// Mock Scheduler
jest.mock('@/server/tools/scheduler', () => ({
    scheduleTask: jest.fn(() => Promise.resolve({ success: true, scheduleId: 'sched_123' }))
}));

describe('PlaybookManager', () => {
    it('should create a playbook and save to firestore', async () => {
        mockSet.mockResolvedValueOnce(undefined);

        const result = await createPlaybook(
            { // Fixed: params should be an object
                name: 'Test Playbook',
                description: 'Description',
                steps: [{ action: 'log' }]
            }
        );

        expect(result.success).toBe(true);
        expect(result.playbookId).toBe('test-playbook'); // Slugified
        expect(mockCollection).toHaveBeenCalledWith('playbooks');
        expect(mockDoc).toHaveBeenCalledWith('test-playbook');
        expect(mockSet).toHaveBeenCalled();
    });

    it('should schedule a task if cron provided', async () => {
        mockSet.mockResolvedValueOnce(undefined);

        const result = await createPlaybook(
            {
                name: 'Scheduled Playbook',
                description: 'Desc',
                steps: [],
                schedule: '0 9 * * *'
            }
        );

        expect(result.success).toBe(true);
    });
});
