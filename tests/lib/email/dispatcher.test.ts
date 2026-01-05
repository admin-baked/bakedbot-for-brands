
import { sendGenericEmail } from '@/lib/email/dispatcher';

// Mock Providers (Separate files)
const mockSendSG = jest.fn();
const mockSendMJ = jest.fn();

jest.mock('@/lib/email/sendgrid', () => ({
    sendGenericEmail: (...args: any[]) => mockSendSG(...args)
}));

jest.mock('@/lib/email/mailjet', () => ({
    sendGenericEmail: (...args: any[]) => mockSendMJ(...args)
}));

// Mock Firestore Settings
const mockGet = jest.fn();
jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: () => ({
        collection: () => ({
            doc: () => ({
                get: mockGet
            })
        })
    })
}));

describe('EmailDispatcher', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset specific mocks
    });

    it('should default to SendGrid if settings missing', async () => {
        mockGet.mockRejectedValueOnce(new Error('No DB'));
        mockSendSG.mockResolvedValueOnce({ success: true });

        const result = await sendGenericEmail({ to: 'test@test.com', subject: 'Hi', htmlBody: 'b' });
        
        expect(result.success).toBe(true);
        expect(mockSendSG).toHaveBeenCalled();
        expect(mockSendMJ).not.toHaveBeenCalled();
    });

    it('should use Mailjet if configured', async () => {
        mockGet.mockResolvedValueOnce({ data: () => ({ emailProvider: 'mailjet' }) });
        mockSendMJ.mockResolvedValueOnce({ success: true });

        // We need to wait for cache invalidation? 
        // Code has 60s cache. In test environment, module state might persist.
        // For unit test stability, we might assume first run or mock Date.now() if needed.
        // Assuming fresh module load or cache miss for simplification.
        
        // Force cache expiry mock? hard to do without exposing internals.
        // We will mock Date.now() to ensure cache skip.
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 100000); 

        const result = await sendGenericEmail({ to: 'test@test.com', subject: 'Hi', htmlBody: 'b' });

        expect(mockSendMJ).toHaveBeenCalled();
    });

    it('should fail over to SendGrid if Mailjet fails', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 200000); 
        mockGet.mockResolvedValueOnce({ data: () => ({ emailProvider: 'mailjet' }) });
        
        // Mailjet Fails
        mockSendMJ.mockResolvedValueOnce({ success: false, error: 'MJ Down' });
        // SendGrid Succeeds
        mockSendSG.mockResolvedValueOnce({ success: true, url: 'sg_sent' });

        const result = await sendGenericEmail({ to: 'test@test.com', subject: 'Failover', htmlBody: 'b' });

        expect(mockSendMJ).toHaveBeenCalled();
        expect(mockSendSG).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });
});
