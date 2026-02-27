/**
 * Tests for brand-pages server actions:
 * - getBrandPage: returns Firestore data or default
 * - updateBrandPage: requires auth, saves content, creates if missing
 * - toggleBrandPagePublish: flips isPublished field
 * - getBrandPageBySlug: resolves orgId via organizations → brands fallback
 */

// ---- Mocks ----------------------------------------------------------------

jest.mock('@/firebase/server-client', () => ({
    createServerClient: jest.fn(),
}));

jest.mock('@/lib/auth-helpers', () => ({
    getCurrentUser: jest.fn(),
    requireUser: jest.fn(),
    verifySessionCookie: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

// ---- Imports (after mocks) -------------------------------------------------

import {
    getBrandPage,
    updateBrandPage,
    toggleBrandPagePublish,
    getBrandPageBySlug,
} from '@/server/actions/brand-pages';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/lib/auth-helpers';

// ---- Test Data -------------------------------------------------------------

const ORG_ID = 'org_thrive_syracuse';
const MOCK_USER = { uid: 'user123', role: 'dispensary', orgId: ORG_ID };

const ABOUT_CONTENT = {
    heroTitle: 'About Thrive',
    heroDescription: 'Premium cannabis in Syracuse',
    story: 'Founded in 2021...',
    values: [],
};

const MOCK_PAGE_DOC = {
    orgId: ORG_ID,
    pageType: 'about' as const,
    aboutContent: ABOUT_CONTENT,
    isPublished: true,
    lastEditedBy: 'user123',
    createdAt: { toDate: () => new Date() },
    updatedAt: { toDate: () => new Date() },
};

// ---- Firestore Mock Builder ------------------------------------------------

function buildFirestoreMock(overrides: {
    docExists?: boolean;
    docData?: Record<string, unknown>;
    orgsEmpty?: boolean;
    brandsEmpty?: boolean;
} = {}) {
    const {
        docExists = true,
        docData = MOCK_PAGE_DOC,
        orgsEmpty = false,
        brandsEmpty = false,
    } = overrides;

    const mockSet = jest.fn().mockResolvedValue({});
    const mockUpdate = jest.fn().mockResolvedValue({});
    const mockDocGet = jest.fn().mockResolvedValue({
        exists: docExists,
        data: () => (docExists ? docData : undefined),
        id: 'about',
    });

    const mockDocRef = {
        get: mockDocGet,
        set: mockSet,
        update: mockUpdate,
    };

    const mockDoc = jest.fn().mockReturnValue(mockDocRef);
    const mockSubCollection = jest.fn().mockReturnValue({ doc: mockDoc });

    const mockOrgDoc = jest.fn().mockReturnValue({ collection: mockSubCollection });

    // Organization query mock
    const mockOrgGet = jest.fn().mockResolvedValue({
        empty: orgsEmpty,
        docs: orgsEmpty ? [] : [{ id: ORG_ID }],
    });
    const mockOrgLimit = jest.fn().mockReturnValue({ get: mockOrgGet });
    const mockOrgWhere = jest.fn().mockReturnValue({ limit: mockOrgLimit });

    // Brand query mock
    const mockBrandGet = jest.fn().mockResolvedValue({
        empty: brandsEmpty,
        docs: brandsEmpty ? [] : [{ id: ORG_ID }],
    });
    const mockBrandLimit = jest.fn().mockReturnValue({ get: mockBrandGet });
    const mockBrandWhere = jest.fn().mockReturnValue({ limit: mockBrandLimit });

    const mockCollection = jest.fn((name: string) => {
        if (name === 'organizations') return { where: mockOrgWhere, doc: mockOrgDoc };
        if (name === 'brands') return { where: mockBrandWhere };
        if (name === 'tenants') return { doc: mockOrgDoc };
        return { where: jest.fn() };
    });

    return {
        mockSet,
        mockUpdate,
        mockDocGet,
        mockDoc,
        mockSubCollection,
        mockOrgDoc,
        mockOrgWhere,
        mockCollection,
        firestore: { collection: mockCollection },
    };
}

// ============================================================================
// getBrandPage Tests
// ============================================================================

describe('getBrandPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireUser as jest.Mock).mockResolvedValue(MOCK_USER);
    });

    it('returns page content when document exists', async () => {
        const { firestore } = buildFirestoreMock({ docExists: true });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const result = await getBrandPage(ORG_ID, 'about');

        expect(result).not.toBeNull();
        expect(result?.orgId).toBe(ORG_ID);
        expect(result?.pageType).toBe('about');
    });

    it('returns default content when document does not exist', async () => {
        const { firestore } = buildFirestoreMock({ docExists: false });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const result = await getBrandPage(ORG_ID, 'about');

        expect(result).not.toBeNull();
        expect(result?.orgId).toBe(ORG_ID);
        expect(result?.pageType).toBe('about');
        // Default page is not published
        expect(result?.isPublished).toBe(false);
    });

    it('returns null on Firestore error', async () => {
        (createServerClient as jest.Mock).mockRejectedValue(new Error('Firestore unavailable'));

        const result = await getBrandPage(ORG_ID, 'about');
        expect(result).toBeNull();
    });

    it('works for all 6 page types', async () => {
        const pageTypes = ['about', 'careers', 'locations', 'contact', 'loyalty', 'press'] as const;

        for (const pageType of pageTypes) {
            const { firestore } = buildFirestoreMock({ docExists: false });
            (createServerClient as jest.Mock).mockResolvedValue({ firestore });

            const result = await getBrandPage(ORG_ID, pageType);
            expect(result).not.toBeNull();
            expect(result?.pageType).toBe(pageType);
        }
    });

    it('queries tenants/{orgId}/brand_pages/{pageType}', async () => {
        const { firestore, mockCollection, mockOrgDoc, mockSubCollection, mockDoc } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await getBrandPage(ORG_ID, 'careers');

        expect(mockCollection).toHaveBeenCalledWith('tenants');
        expect(mockOrgDoc).toHaveBeenCalledWith(ORG_ID);
        expect(mockSubCollection).toHaveBeenCalledWith('brand_pages');
        expect(mockDoc).toHaveBeenCalledWith('careers');
    });

    it('returns null for cross-org reads by non-super users', async () => {
        const { firestore } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user123',
            role: 'dispensary',
            orgId: 'org_other',
            currentOrgId: 'org_other',
        });

        const result = await getBrandPage(ORG_ID, 'about');
        expect(result).toBeNull();
    });
});

// ============================================================================
// updateBrandPage Tests
// ============================================================================

describe('updateBrandPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireUser as jest.Mock).mockResolvedValue(MOCK_USER);
    });

    it('throws when user is not authenticated', async () => {
        (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
        const { firestore } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await expect(updateBrandPage(ORG_ID, 'about', {})).rejects.toThrow();
    });

    it('updates existing document with provided content', async () => {
        const { firestore, mockUpdate } = buildFirestoreMock({ docExists: true });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const newContent = { aboutContent: { ...ABOUT_CONTENT, heroTitle: 'Updated Title' } };
        await updateBrandPage(ORG_ID, 'about', newContent);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                aboutContent: expect.objectContaining({ heroTitle: 'Updated Title' }),
                lastEditedBy: MOCK_USER.uid,
                pageType: 'about',
            })
        );
    });

    it('creates new document when one does not exist', async () => {
        const { firestore, mockSet } = buildFirestoreMock({ docExists: false });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await updateBrandPage(ORG_ID, 'careers', {
            careersContent: { heroTitle: 'Join Us', benefits: [], openPositions: [] },
        });

        expect(mockSet).toHaveBeenCalledWith(
            expect.objectContaining({ pageType: 'careers' })
        );
    });

    it('records lastEditedBy with user uid', async () => {
        const { firestore, mockUpdate } = buildFirestoreMock({ docExists: true });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await updateBrandPage(ORG_ID, 'about', {});

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ lastEditedBy: 'user123' })
        );
    });

    it('requires allowed roles (brand, dispensary, super_user)', async () => {
        // The auth check happens inside requireUser
        const { firestore } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await updateBrandPage(ORG_ID, 'about', {});

        expect(requireUser).toHaveBeenCalledWith(['brand', 'dispensary', 'super_user']);
    });

    it('throws on Firestore error after auth succeeds', async () => {
        (createServerClient as jest.Mock).mockRejectedValue(new Error('DB error'));

        await expect(updateBrandPage(ORG_ID, 'about', {})).rejects.toThrow('Failed to update brand page');
    });

    it('throws when non-super users try to update a different org', async () => {
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user123',
            role: 'dispensary',
            orgId: 'org_other',
            currentOrgId: 'org_other',
        });
        const { firestore } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await expect(updateBrandPage(ORG_ID, 'about', {})).rejects.toThrow('Unauthorized');
    });
});

// ============================================================================
// toggleBrandPagePublish Tests
// ============================================================================

describe('toggleBrandPagePublish', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireUser as jest.Mock).mockResolvedValue(MOCK_USER);
    });

    it('sets isPublished to true', async () => {
        const { firestore, mockUpdate } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await toggleBrandPagePublish(ORG_ID, 'about', true);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ isPublished: true })
        );
    });

    it('sets isPublished to false (unpublish)', async () => {
        const { firestore, mockUpdate } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await toggleBrandPagePublish(ORG_ID, 'about', false);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ isPublished: false })
        );
    });

    it('requires auth (throws when unauthorized)', async () => {
        (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));
        const { firestore } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await expect(toggleBrandPagePublish(ORG_ID, 'about', true)).rejects.toThrow();
    });

    it('records lastEditedBy on publish', async () => {
        const { firestore, mockUpdate } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await toggleBrandPagePublish(ORG_ID, 'loyalty', true);

        expect(mockUpdate).toHaveBeenCalledWith(
            expect.objectContaining({ lastEditedBy: MOCK_USER.uid })
        );
    });

    it('throws when non-super users try to publish a different org', async () => {
        (requireUser as jest.Mock).mockResolvedValue({
            uid: 'user123',
            role: 'dispensary',
            orgId: 'org_other',
            currentOrgId: 'org_other',
        });
        const { firestore } = buildFirestoreMock();
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await expect(toggleBrandPagePublish(ORG_ID, 'about', true)).rejects.toThrow('Unauthorized');
    });
});

// ============================================================================
// getBrandPageBySlug Tests
// ============================================================================

describe('getBrandPageBySlug', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('resolves orgId from organizations collection first', async () => {
        const { firestore, mockCollection } = buildFirestoreMock({
            orgsEmpty: false,
            docExists: true,
        });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const result = await getBrandPageBySlug('thrivesyracuse', 'about');

        expect(mockCollection).toHaveBeenCalledWith('organizations');
        expect(result).not.toBeNull();
    });

    it('falls back to brands collection when org not found by slug', async () => {
        const { firestore, mockCollection } = buildFirestoreMock({
            orgsEmpty: true,
            brandsEmpty: false,
            docExists: true,
        });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await getBrandPageBySlug('thrivesyracuse', 'about');

        expect(mockCollection).toHaveBeenCalledWith('brands');
    });

    it('returns null when neither organizations nor brands has the slug', async () => {
        const { firestore } = buildFirestoreMock({
            orgsEmpty: true,
            brandsEmpty: true,
        });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const result = await getBrandPageBySlug('nonexistent-slug', 'about');
        expect(result).toBeNull();
    });

    it('returns null on Firestore error', async () => {
        (createServerClient as jest.Mock).mockRejectedValue(new Error('DB error'));

        const result = await getBrandPageBySlug('thrivesyracuse', 'about');
        expect(result).toBeNull();
    });

    it('queries by slug field in organizations collection', async () => {
        const { firestore, mockOrgWhere } = buildFirestoreMock({ orgsEmpty: false });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        await getBrandPageBySlug('thrivesyracuse', 'about');

        expect(mockOrgWhere).toHaveBeenCalledWith('slug', '==', 'thrivesyracuse');
    });

    it('includes orgId field in returned document', async () => {
        const { firestore } = buildFirestoreMock({ docExists: true });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const result = await getBrandPageBySlug('thrivesyracuse', 'about');

        if (result) {
            expect(result.orgId).toBeDefined();
        }
    });

    it('returns null for unpublished pages on public slug lookup', async () => {
        const { firestore } = buildFirestoreMock({
            docExists: true,
            docData: {
                ...MOCK_PAGE_DOC,
                isPublished: false,
            },
        });
        (createServerClient as jest.Mock).mockResolvedValue({ firestore });

        const result = await getBrandPageBySlug('thrivesyracuse', 'about');
        expect(result).toBeNull();
    });
});
