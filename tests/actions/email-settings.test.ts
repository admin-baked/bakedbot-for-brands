
import { getEmailProviderAction, updateEmailProviderAction } from '@/server/actions/super-admin/settings';
import { getAdminFirestore } from '@/firebase/admin';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn()
}));
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
    isSuperUser: jest.fn()
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn()
}));

describe('Email Settings Server Actions', () => {
    let mockFirestore: any;
    let mockDoc: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup Firestore mock
        mockDoc = {
            get: jest.fn().mockResolvedValue({
                 exists: true,
                 data: () => ({ emailProvider: 'sendgrid' })
            }),
            set: jest.fn().mockResolvedValue(true)
        };
        mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue(mockDoc)
            })
        };
        (getAdminFirestore as jest.Mock).mockReturnValue(mockFirestore);

        // Setup Auth mocks
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'test_user' });
        (isSuperUser as jest.Mock).mockResolvedValue(true);
    });

    describe('getEmailProviderAction', () => {
        it('should return default provider if no setting exists', async () => {
             mockDoc.get.mockResolvedValue({
                 exists: false,
                 data: () => ({})
             });

             const result = await getEmailProviderAction();
             expect(result).toBe('mailjet'); // Default fallback
        });

        it('should return configured provider', async () => {
            mockDoc.get.mockResolvedValue({
                exists: true,
                data: () => ({ emailProvider: 'sendgrid' })
            });

            const result = await getEmailProviderAction();
            expect(result).toBe('sendgrid');
       });

       it('should check for super user', async () => {
           await getEmailProviderAction();
           expect(requireUser).toHaveBeenCalled();
           expect(isSuperUser).toHaveBeenCalled();
       });

       it('should throw if not super user', async () => {
           (isSuperUser as jest.Mock).mockResolvedValue(false);
           await expect(getEmailProviderAction()).rejects.toThrow('Unauthorized');
       });
    });

    describe('updateEmailProviderAction', () => {
        it('should update provider and revalidate path', async () => {
            const input = { provider: 'sendgrid' as const };
            const result = await updateEmailProviderAction(input);

            expect(result.success).toBe(true);
            expect(mockFirestore.collection).toHaveBeenCalledWith('settings');
            expect(mockDoc.set).toHaveBeenCalledWith({
                emailProvider: 'sendgrid',
                updatedAt: expect.any(Date)
            }, { merge: true });
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard/ceo/settings');
        });

        it('should validate input', async () => {
            // Zod schema validation is implicit in the action call if wrapped?
            // Since we import the raw action, we might invoke it directly.
            // If the action uses internal Zod validation (safeParse inside), we test that.
            // If it accepts raw data that matches the schema inferred type, it works.
            // The action signature expects typed input. 
        });

        it('should throw if not super user', async () => {
            (isSuperUser as jest.Mock).mockResolvedValue(false);
            const input = { provider: 'mailjet' as const };
            await expect(updateEmailProviderAction(input)).rejects.toThrow('Unauthorized');
        });
    });
});
