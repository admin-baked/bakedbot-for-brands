
import { completeOnboarding } from '@/app/onboarding/actions.ts';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

// Mock dependencies
jest.mock('@/server/auth/auth', () => ({
    requireUser: jest.fn(),
}));
jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));
jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));
// Mock heavy imports inside onboarding
jest.mock('@/server/repos/brandRepo', () => ({
    makeBrandRepo: jest.fn().mockReturnValue({ create: jest.fn() }),
}));
jest.mock('@/lib/notifications/email-service', () => ({
    emailService: {
        sendWelcomeEmail: jest.fn().mockResolvedValue(true),
        notifyAdminNewUser: jest.fn().mockResolvedValue(true),
    },
}));

describe('Onboarding Approval Status', () => {
    let mockFirestore: any;
    let mockUserDoc: any;
    let mockAuth: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserDoc = {
            set: jest.fn(),
            update: jest.fn(),
            get: jest.fn().mockResolvedValue({ exists: false }), // Mock org logic
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue(mockUserDoc),
                add: jest.fn().mockResolvedValue({ id: 'job-123' }), // Mock job queue
            }),
        };

        mockAuth = {
            setCustomUserClaims: jest.fn(),
        };

        (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore, auth: mockAuth });
        (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-123', email: 'test@bakedbot.ai' });
    });

    it('sets approvalStatus to pending for Brands', async () => {
        const formData = new FormData();
        formData.append('role', 'brand');
        formData.append('brandId', 'brand_123');
        formData.append('brandName', 'Test Brand');

        const result = await completeOnboarding(null, formData);

        expect(result.error).toBe(false);

        // Verify correct status in Firestore user update
        expect(mockUserDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            role: 'brand',
            approvalStatus: 'pending',
            isNewUser: false
        }), { merge: true });

        // Verify notifications sent
        const { emailService } = require('@/lib/notifications/email-service');
        expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
        expect(emailService.notifyAdminNewUser).toHaveBeenCalledWith(expect.objectContaining({
            role: 'brand',
            email: 'test@bakedbot.ai'
        }));
    });

    it('sets approvalStatus to pending for Dispensaries', async () => {
        const formData = new FormData();
        formData.append('role', 'dispensary');
        formData.append('locationId', 'loc_123');
        formData.append('manualDispensaryName', 'Test Dispensary');

        const result = await completeOnboarding(null, formData);
        
        expect(result.error).toBe(false);

        expect(mockUserDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            role: 'dispensary',
            approvalStatus: 'pending'
        }), { merge: true });

         const { emailService } = require('@/lib/notifications/email-service');
         expect(emailService.notifyAdminNewUser).toHaveBeenCalled();
    });

    it('sets approvalStatus to approved for Customers', async () => {
        const formData = new FormData();
        formData.append('role', 'customer');

        const result = await completeOnboarding(null, formData);
        
        expect(result.error).toBe(false);

        expect(mockUserDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            role: 'customer',
            approvalStatus: 'approved'
        }), { merge: true });

        // Customer usually does not get admin notification but does get welcome email?
        // Current logic: welcome email is sent, admin notification ONLY for brand/dispensary.
        const { emailService } = require('@/lib/notifications/email-service');
        expect(emailService.sendWelcomeEmail).toHaveBeenCalled();
        expect(emailService.notifyAdminNewUser).not.toHaveBeenCalled();
    });
});
