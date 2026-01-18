
import { sendGenericEmail } from '../dispatcher';
import * as sendgrid from '../sendgrid';
import * as mailjet from '../mailjet';

// Mock dependencies
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('../sendgrid', () => ({
    sendGenericEmail: jest.fn(),
}));

jest.mock('../mailjet', () => ({
    sendGenericEmail: jest.fn(),
}));

describe('Email Dispatcher', () => {
    let mockFirestoreData: any = {};
    const mockGet = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset cache-busting mechanism in dispatcher if possible, 
        // but since we can't easily reset module-level variables without hacks,
        // we might rely on the fact that we mock `getAdminFirestore` return value.
        // However, `dispatcher.ts` has a cache (60s). 
        // We might need to use jest.isolateModules or just accept that the first test sets the cache.
        // Alternatively, we can mock Date.now() to force cache invalidation.
        
        const { getAdminFirestore } = require('@/firebase/admin');
        getAdminFirestore.mockReturnValue({
            collection: () => ({
                doc: () => ({
                    get: mockGet
                })
            })
        });
    });

    it('should route to SendGrid when provider is configured to sendgrid', async () => {
        // Mock Firestore to return 'sendgrid'
        mockGet.mockResolvedValue({
            data: () => ({ emailProvider: 'sendgrid' })
        });
        
        // Force cache expiration
        jest.spyOn(Date, 'now').mockReturnValue(new Date().getTime() + 100000); 

        (sendgrid.sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Test',
            htmlBody: 'Body'
        });

        expect(sendgrid.sendGenericEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@example.com'
        }));
        expect(mailjet.sendGenericEmail).not.toHaveBeenCalled();
    });

    it('should route to Mailjet when provider is configured to mailjet', async () => {
        // Mock Firestore to return 'mailjet'
        mockGet.mockResolvedValue({
            data: () => ({ emailProvider: 'mailjet' })
        });

        // Force cache expiration
        jest.spyOn(Date, 'now').mockReturnValue(new Date().getTime() + 200000);

        (mailjet.sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Test',
            htmlBody: 'Body'
        });

        expect(mailjet.sendGenericEmail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@example.com'
        }));
        expect(sendgrid.sendGenericEmail).not.toHaveBeenCalled();
    });

    it('should default to Mailjet if firestore fails', async () => {
        // Mock Firestore failure
        mockGet.mockRejectedValue(new Error('Firestore error'));

        // Force cache expiration
        jest.spyOn(Date, 'now').mockReturnValue(new Date().getTime() + 300000);

        (mailjet.sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Test',
            htmlBody: 'Body'
        });

        expect(mailjet.sendGenericEmail).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('should failover to SendGrid if Mailjet fails', async () => {
        // Mock Firestore to return 'mailjet'
        mockGet.mockResolvedValue({
            data: () => ({ emailProvider: 'mailjet' })
        });

        // Force cache expiration
        jest.spyOn(Date, 'now').mockReturnValue(new Date().getTime() + 400000);

        // Mock Mailjet failure
        (mailjet.sendGenericEmail as jest.Mock).mockResolvedValue({ success: false, error: 'Unauthorized' });
        // Mock SendGrid success
        (sendgrid.sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Test',
            htmlBody: 'Body'
        });

        expect(mailjet.sendGenericEmail).toHaveBeenCalled();
        expect(sendgrid.sendGenericEmail).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('should return combined error if both fail', async () => {
         // Mock Firestore to return 'mailjet'
         mockGet.mockResolvedValue({
            data: () => ({ emailProvider: 'mailjet' })
        });
        
        jest.spyOn(Date, 'now').mockReturnValue(new Date().getTime() + 500000);

        (mailjet.sendGenericEmail as jest.Mock).mockResolvedValue({ success: false, error: 'MJ Error' });
        (sendgrid.sendGenericEmail as jest.Mock).mockResolvedValue({ success: false, error: 'SG Error' });

        const result = await sendGenericEmail({
            to: 'test@example.com',
            subject: 'Fail',
            htmlBody: 'Body'
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Mailjet Failed: MJ Error');
        expect(result.error).toContain('SendGrid Failed: SG Error');
    });
});

