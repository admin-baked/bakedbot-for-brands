
import { testEmailDispatch } from '../actions';
import { requireUser, isSuperUser } from '@/server/auth/auth';
import { sendGenericEmail } from '@/lib/email/dispatcher';

jest.mock('firebase-admin', () => ({
    firestore: () => ({}),
    auth: () => ({}),
    apps: [],
}));

jest.mock('@/firebase/admin', () => ({
    getAdminFirestore: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/server/actions/cannmenus', () => ({
    searchCannMenusRetailers: jest.fn(),
}));

jest.mock('@/server/jobs/seo-generator', () => ({
    runChicagoPilotJob: jest.fn(),
}));

jest.mock('@/server/jobs/brand-discovery-job', () => ({
    runBrandPilotJob: jest.fn(),
}));

jest.mock('@/server/repos/productRepo', () => ({
    makeProductRepo: jest.fn(),
}));


jest.mock('@/ai/flows/update-product-embeddings', () => ({
    updateProductEmbeddings: jest.fn(),
}));

jest.mock('@/server/services/geo-discovery', () => ({
    getZipCodeCoordinates: jest.fn(),
    getRetailersByZipCode: jest.fn(),
    discoverNearbyProducts: jest.fn(),
}));

jest.mock('@/lib/seo-kpis', () => ({
    fetchSeoKpis: jest.fn(),
}));

jest.mock('@/lib/mrr-ladder', () => ({
    calculateMrrLadder: jest.fn(),
}));

// Mock auth and email
jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
  isSuperUser: jest.fn(),
}));

jest.mock('@/lib/email/dispatcher', () => ({
  sendGenericEmail: jest.fn(),
}));

describe('Super User Email Tool', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should deny access if user is not a super admin', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'test-user' });
        (isSuperUser as jest.Mock).mockResolvedValue(false);

        const result = await testEmailDispatch({
            to: 'test@example.com',
            subject: 'Test',
            body: 'Body'
        });

        expect(result.error).toBe(true);
        expect(result.message).toContain('Unauthorized');
        expect(sendGenericEmail).not.toHaveBeenCalled();
    });

    it('should send email successfully if authorized', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-user' });
        (isSuperUser as jest.Mock).mockResolvedValue(true);
        (sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });

        const result = await testEmailDispatch({
            to: 'test@example.com',
            subject: 'Test Subject',
            body: '<p>Test Body</p>'
        });

        expect(result.error).toBeUndefined();
        expect(result.message).toContain('successfully');
        expect(sendGenericEmail).toHaveBeenCalledWith({
            to: 'test@example.com',
            subject: 'Test Subject',
            htmlBody: '<p>Test Body</p>',
            textBody: 'Test Body' // stripped tags
        });
    });

    it('should handle dispatcher failure', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-user' });
        (isSuperUser as jest.Mock).mockResolvedValue(true);
        (sendGenericEmail as jest.Mock).mockResolvedValue({ success: false, error: 'Mocked Failure' });

        const result = await testEmailDispatch({
            to: 'test@example.com',
            subject: 'Test',
            body: 'Body'
        });

        expect(result.error).toBe(true);
        expect(result.message).toContain('Failed to dispatch');
    });

    it('should handle errors gracefully', async () => {
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'admin-user' });
        (isSuperUser as jest.Mock).mockResolvedValue(true);
        (sendGenericEmail as jest.Mock).mockRejectedValue(new Error('Mailjet Error'));

        const result = await testEmailDispatch({
            to: 'test@example.com',
            subject: 'Test',
            body: 'Body'
        });

        expect(result.error).toBe(true);
        expect(result.message).toContain('Mailjet Error');
    });
});
