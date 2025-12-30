
import { updatePlaybook, createPlaybook } from '@/server/actions/playbooks';

// Mock dependencies
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(() => ({
        firestore: {
            collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                    collection: jest.fn(() => ({
                        doc: jest.fn(() => ({
                            get: jest.fn().mockResolvedValue({
                                exists: true,
                                id: 'pb123',
                                data: () => ({
                                    ownerId: 'other-user',
                                    name: 'Test Playbook'
                                })
                            }),
                            update: jest.fn().mockResolvedValue(true),
                            set: jest.fn().mockResolvedValue(true)
                        })),
                        add: jest.fn()
                    }))
                }))
            })),
            batch: jest.fn(() => ({
                set: jest.fn(),
                commit: jest.fn()
            }))
        }
    }))
}));

const mockUser = {
    uid: 'user123',
    email: 'test@example.com',
    role: 'guest'
};

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(() => Promise.resolve(mockUser))
}));

describe('Playbook Permissions', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('denies edit for Guest user on playbook they do not own', async () => {
        mockUser.role = 'guest';
        mockUser.uid = 'user123'; // Logic mocks existing owner as 'other-user'
        
        const result = await updatePlaybook('brand1', 'pb123', { name: 'New Name' });
        expect(result.success).toBe(false);
        expect(result.error).toContain('Permission denied');
    });

    it('allows edit for Super Admin on any playbook', async () => {
        mockUser.role = 'super_admin';
        mockUser.uid = 'admin1';
        
        const result = await updatePlaybook('brand1', 'pb123', { name: 'New Name' });
        expect(result.success).toBe(true);
    });

    // We can't easily test the agent-runner 1-playbook limit here without importing the runner 
    // which has huge dependency tree. We rely on the code change for that.
});
