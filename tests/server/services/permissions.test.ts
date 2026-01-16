
import { checkPermission, grantPermission, revokePermission } from '@/server/services/permissions';

// Basic recursive mock for Firestore chaining
const mockGet = jest.fn();
const mockSet = jest.fn();

// Create a flexible mock object that can handle chained .collection().doc()
const mockDocObj = {
    get: mockGet,
    set: mockSet,
    collection: jest.fn(), // Will be circular-ish
};
const mockCollectionObj = {
    doc: jest.fn(() => mockDocObj),
    add: jest.fn(),
    where: jest.fn(() => mockCollectionObj) // Basic query support
};

// Wire up the circle so .doc().collection() works
// @ts-ignore
mockDocObj.collection.mockReturnValue(mockCollectionObj);

const mockFirestore = {
    collection: jest.fn(() => mockCollectionObj)
};

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(async () => ({ firestore: mockFirestore }))
}));

describe('Permissions Service', () => {
    const userId = 'user_123';
    const toolName = 'agent-builder';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkPermission', () => {
        it('should return false if permission record does not exist', async () => {
            mockGet.mockResolvedValue({ exists: false });
            const result = await checkPermission(userId, toolName);
            expect(result).toBe(false);
            expect(mockFirestore.collection).toHaveBeenCalledWith('users');
            expect(mockCollectionObj.doc).toHaveBeenCalledWith(userId);
            expect(mockDocObj.collection).toHaveBeenCalledWith('permissions');
            expect(mockCollectionObj.doc).toHaveBeenCalledWith(toolName);
        });

        it('should return false if permission is pending or denied', async () => {
             mockGet.mockResolvedValue({ 
                 exists: true,
                 data: () => ({ status: 'pending' })
             });
             expect(await checkPermission(userId, toolName)).toBe(false);

             mockGet.mockResolvedValue({ 
                 exists: true,
                 data: () => ({ status: 'denied' })
             });
             expect(await checkPermission(userId, toolName)).toBe(false);
        });

        it('should return true if permission is granted', async () => {
             mockGet.mockResolvedValue({ 
                 exists: true,
                 data: () => ({ status: 'granted' })
             });
             const result = await checkPermission(userId, toolName);
             expect(result).toBe(true);
        });
    });

    describe('grantPermission', () => {
        it('should write granted status to firestore', async () => {
            await grantPermission(userId, toolName);
            expect(mockSet).toHaveBeenCalledWith({
                toolName,
                status: 'granted',
                grantedAt: expect.any(Date),
                grantedBy: userId
            }, { merge: true });
        });
    });

    describe('revokePermission', () => {
        it('should write denied status to firestore', async () => {
            await revokePermission(userId, toolName);
            expect(mockSet).toHaveBeenCalledWith({
                status: 'denied',
                revokedAt: expect.any(Date)
            }, { merge: true });
        });
    });
});
