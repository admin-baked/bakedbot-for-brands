import { updateAgentConfigAction, getAgentConfigOverride } from '../agent-config';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));

jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn()
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('Agent Config Actions', () => {
    let mockFirestore: any;
    let mockDocRef: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDocRef = {
            set: jest.fn().mockResolvedValue(undefined),
            get: jest.fn()
        };

        mockFirestore = {
            collection: jest.fn().mockReturnThis(),
            doc: jest.fn(() => mockDocRef)
        };

        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);
    });

    describe('updateAgentConfigAction', () => {
        it('should update config successfully for authorized brand user', async () => {
            (requireUser as jest.Mock).mockResolvedValue({
                uid: 'user123',
                role: 'brand',
                orgId: 'org456'
            });

            const result = await updateAgentConfigAction('smokey', { name: 'Custom Smokey' });

            expect(result.success).toBe(true);
            expect(mockFirestore.collection).toHaveBeenCalledWith('agent_configs');
            expect(mockFirestore.doc).toHaveBeenCalledWith('org456_smokey');
            expect(mockDocRef.set).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Custom Smokey',
                agentId: 'smokey',
                orgId: 'org456'
            }), { merge: true });
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard/agents/smokey');
        });

        it('should return unauthorized for users with wrong role', async () => {
            (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

            const result = await updateAgentConfigAction('smokey', { name: 'Hack' });

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(mockDocRef.set).not.toHaveBeenCalled();
        });
    });

    describe('getAgentConfigOverride', () => {
        it('should return config if it exists', async () => {
            mockDocRef.get.mockResolvedValue({
                exists: true,
                data: () => ({ name: 'Custom Smokey', title: 'AI Expert' })
            });

            const result = await getAgentConfigOverride('smokey', 'org456');

            expect(result).toEqual({ name: 'Custom Smokey', title: 'AI Expert' });
            expect(mockFirestore.doc).toHaveBeenCalledWith('org456_smokey');
        });

        it('should return null if config does not exist', async () => {
            mockDocRef.get.mockResolvedValue({ exists: false });

            const result = await getAgentConfigOverride('smokey', 'org456');

            expect(result).toBeNull();
        });
    });
});
