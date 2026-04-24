
import { completeOnboarding } from '@/app/onboarding/actions.ts';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';
import { ONBOARDING_PHASE1_VERSION } from '@/lib/onboarding/activation';

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
jest.mock('@/server/actions/platform-signup', () => ({
    handlePlatformSignup: jest.fn().mockResolvedValue({ success: true }),
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
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }), // Mock org logic
        };

        mockFirestore = {
            collection: jest.fn().mockReturnValue({
                doc: jest.fn().mockReturnValue(mockUserDoc),
                add: jest.fn().mockResolvedValue({ id: 'job-123' }), // Mock job queue
            }),
            batch: jest.fn().mockReturnValue({
                set: jest.fn(),
                commit: jest.fn().mockResolvedValue(undefined),
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
            isNewUser: false,
            onboarding: expect.objectContaining({
                version: ONBOARDING_PHASE1_VERSION,
                primaryGoal: 'creative_center', // default for brand
                selectedCompetitorCount: 0,
                selectedAt: expect.any(String),
            }),
        }), { merge: true });
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
    });

    it('stores the selected plan as onboarding metadata without activating it', async () => {
        const formData = new FormData();
        formData.append('role', 'dispensary');
        formData.append('planId', 'empire');
        formData.append('manualDispensaryName', 'Test Dispensary');

        const result = await completeOnboarding(null, formData);

        expect(result.error).toBe(false);

        const setPayloads = mockUserDoc.set.mock.calls.map(([payload]: any) => payload);

        // Source stores the plan as-is from findPricingPlan('empire')
        expect(setPayloads).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    selectedPlanId: 'empire',
                    selectedPlanName: 'Empire',
                }),
            ])
        );
    });

    it('persists a selected first win and competitor count in onboarding metadata', async () => {
        const formData = new FormData();
        formData.append('role', 'dispensary');
        formData.append('manualDispensaryName', 'Test Dispensary');
        // Use a valid primary goal from ONBOARDING_PRIMARY_GOALS
        formData.append('primaryGoal', 'competitive_intelligence');
        formData.append('selectedCompetitors', JSON.stringify([
            { placeId: 'a' },
            { placeId: 'b' },
        ]));

        const result = await completeOnboarding(null, formData);

        expect(result.error).toBe(false);
        expect(mockUserDoc.set).toHaveBeenCalledWith(expect.objectContaining({
            onboarding: expect.objectContaining({
                version: ONBOARDING_PHASE1_VERSION,
                primaryGoal: 'competitive_intelligence',
                selectedCompetitorCount: 2,
                selectedAt: expect.any(String),
            }),
        }), { merge: true });
    });
});
