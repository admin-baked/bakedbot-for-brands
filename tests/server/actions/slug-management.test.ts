import { checkSlugAvailability, reserveSlug, getBrandSlug } from '@/server/actions/slug-management';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { createSlug } from '@/lib/utils/slug';

// Mock modules
jest.mock('@/firebase/server-client');
jest.mock('@/server/auth/auth');
jest.mock('@/lib/utils/slug');

describe('Slug Management', () => {
  let mockFirestore: any;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;

  const mockUser = {
    uid: 'test-user-123',
    orgId: 'org-test-123',
    role: 'brand_admin',
    email: 'test@example.com',
    displayName: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firestore mock chain
    mockGet = jest.fn();
    mockSet = jest.fn().mockResolvedValue(undefined);
    mockDoc = jest.fn((id) => ({ get: mockGet, set: mockSet }));
    mockCollection = jest.fn((name) => ({ doc: mockDoc }));
    mockFirestore = { collection: mockCollection };

    (createServerClient as jest.Mock).mockResolvedValue({ firestore: mockFirestore });
    (createSlug as jest.Mock).mockImplementation((slug) => slug.toLowerCase().trim());
    (requireUser as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('checkSlugAvailability', () => {
    it('returns available: false for slug less than 3 characters', async () => {
      (createSlug as jest.Mock).mockReturnValue('ab');
      const result = await checkSlugAvailability('ab');
      expect(result.available).toBe(false);
      expect(result.suggestion).toBeUndefined();
    });

    it('returns available: true when slug does not exist in brands collection', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');
      mockGet.mockResolvedValue({ exists: false });

      const result = await checkSlugAvailability('thrivesyracuse');

      expect(result.available).toBe(true);
      expect(result.suggestion).toBeUndefined();
      expect(mockCollection).toHaveBeenCalledWith('brands');
      expect(mockDoc).toHaveBeenCalledWith('thrivesyracuse');
      expect(mockGet).toHaveBeenCalled();
    });

    it('returns available: true when user owns the slug (ownership fix 916a5cd3)', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');

      // Mock brands doc exists with user's orgId
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ originalBrandId: 'org-test-123' }) }) // brands doc
        .mockResolvedValueOnce({ exists: true, data: () => ({ orgId: 'org-test-123' }) }); // user doc

      const result = await checkSlugAvailability('thrivesyracuse');

      expect(result.available).toBe(true);
      expect(result.suggestion).toBeUndefined();
    });

    it('returns available: false with suggestion when someone else owns the slug', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');

      // Mock brands doc exists with different orgId
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ originalBrandId: 'org-different-456' }) }) // brands doc
        .mockResolvedValueOnce({ exists: true, data: () => ({ orgId: 'org-test-123' }) }); // user doc

      const result = await checkSlugAvailability('thrivesyracuse');

      expect(result.available).toBe(false);
      expect(result.suggestion).toMatch(/^thrivesyracuse-\d+$/);
    });

    it('checks availability even when unauthenticated (soft fail on requireUser)', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');
      (requireUser as jest.Mock).mockRejectedValueOnce(new Error('Unauthorized'));
      mockGet.mockResolvedValue({ exists: false });

      const result = await checkSlugAvailability('thrivesyracuse');

      expect(result.available).toBe(true);
      // Verify Firestore was still checked even though user auth failed
      expect(mockCollection).toHaveBeenCalledWith('brands');
    });

    it('handles user doc not existing (fallback to uid)', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');

      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ originalBrandId: 'test-user-123' }) }) // brands doc
        .mockResolvedValueOnce({ exists: false }); // user doc doesn't exist

      const result = await checkSlugAvailability('thrivesyracuse');

      // User owns it via uid fallback
      expect(result.available).toBe(true);
    });

    it('handles no brandData in existing document', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');
      mockGet.mockResolvedValue({ exists: true, data: () => null });

      const result = await checkSlugAvailability('thrivesyracuse');

      // No ownership info, so unavailable
      expect(result.available).toBe(false);
      expect(result.suggestion).toBeDefined();
    });
  });

  describe('reserveSlug', () => {
    it('rejects slug less than 3 characters', async () => {
      (createSlug as jest.Mock).mockReturnValue('ab');

      const result = await reserveSlug('ab', 'org-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Slug must be at least 3 characters');
    });

    it('creates brand document and updates organization on successful reservation', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');
      mockGet
        .mockResolvedValueOnce({ exists: false }) // brands doc doesn't exist
        .mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Thrive Syracuse', description: 'A dispensary', logoUrl: 'https://...' }) }); // org doc

      const result = await reserveSlug('thrivesyracuse', 'org-thrive-123');

      expect(result.success).toBe(true);
      expect(mockSet).toHaveBeenCalledTimes(2);

      // Verify brands doc was created with correct fields
      const brandsSetCall = mockSet.mock.calls[0];
      expect(brandsSetCall[0]).toEqual(expect.objectContaining({
        id: 'thrivesyracuse',
        slug: 'thrivesyracuse',
        name: 'Thrive Syracuse',
        originalBrandId: 'org-thrive-123',
        ownerId: 'test-user-123',
        verificationStatus: 'verified',
        claimStatus: 'claimed',
        type: 'brand',
      }));
      expect(brandsSetCall[1]).toEqual({ merge: true });

      // Verify org doc was updated with slug
      const orgSetCall = mockSet.mock.calls[1];
      expect(orgSetCall[0]).toEqual(expect.objectContaining({
        slug: 'thrivesyracuse',
      }));
    });

    it('is idempotent when user re-reserves their own slug', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ originalBrandId: 'org-thrive-123' }) });

      const result = await reserveSlug('thrivesyracuse', 'org-thrive-123');

      expect(result.success).toBe(true);
      expect(mockSet).not.toHaveBeenCalled(); // No write for idempotent case
    });

    it('rejects when someone else owns the slug', async () => {
      (createSlug as jest.Mock).mockReturnValue('thrivesyracuse');
      mockGet.mockResolvedValueOnce({ exists: true, data: () => ({ originalBrandId: 'org-different-456' }) });

      const result = await reserveSlug('thrivesyracuse', 'org-thrive-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('This URL is already taken. Try a different one.');
      expect(mockSet).not.toHaveBeenCalled();
    });

    it('requires authentication', async () => {
      (requireUser as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      await expect(reserveSlug('thrivesyracuse', 'org-123')).rejects.toThrow('Unauthorized');
    });

    it('uses org name when available', async () => {
      (createSlug as jest.Mock).mockReturnValue('newslug');
      mockGet
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Org Display Name' }) });

      await reserveSlug('newslug', 'org-123');

      const brandsSetCall = mockSet.mock.calls[0];
      expect(brandsSetCall[0].name).toBe('Org Display Name');
    });

    it('falls back to user displayName when org name unavailable', async () => {
      (createSlug as jest.Mock).mockReturnValue('newslug');
      mockGet
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: false }); // org doc doesn't exist

      await reserveSlug('newslug', 'org-123');

      const brandsSetCall = mockSet.mock.calls[0];
      expect(brandsSetCall[0].name).toBe('Test User'); // from mockUser.displayName
    });

    it('falls back to slug itself when no org or user name available', async () => {
      const userWithoutName = { ...mockUser, displayName: undefined };
      (requireUser as jest.Mock).mockResolvedValue(userWithoutName);
      (createSlug as jest.Mock).mockReturnValue('newslug');
      mockGet
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: false });

      await reserveSlug('newslug', 'org-123');

      const brandsSetCall = mockSet.mock.calls[0];
      expect(brandsSetCall[0].name).toBe('newslug');
    });
  });

  describe('getBrandSlug', () => {
    it('returns slug from organizations collection when present', async () => {
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ slug: 'thrivesyracuse' }) }) // org doc
        .mockResolvedValueOnce({ exists: true, data: () => ({ slug: 'different-slug' }) }); // brands doc

      const slug = await getBrandSlug('org-thrive-123');

      expect(slug).toBe('thrivesyracuse');
      // Verify it doesn't continue to brands doc if org has slug
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('falls back to brands collection when org doc has no slug', async () => {
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Org without slug' }) }) // org doc no slug
        .mockResolvedValueOnce({ exists: true, data: () => ({ slug: 'fallback-slug' }) }); // brands doc

      const slug = await getBrandSlug('org-thrive-123');

      expect(slug).toBe('fallback-slug');
    });

    it('returns brandId when brands doc exists but has no slug', async () => {
      mockGet
        .mockResolvedValueOnce({ exists: false }) // org doc doesn't exist
        .mockResolvedValueOnce({ exists: true, data: () => ({ id: 'org-thrive-123' }) }); // brands doc no slug

      const slug = await getBrandSlug('org-thrive-123');

      expect(slug).toBe('org-thrive-123');
    });

    it('returns null when neither org nor brands doc exist', async () => {
      mockGet
        .mockResolvedValueOnce({ exists: false }) // org doc
        .mockResolvedValueOnce({ exists: false }); // brands doc

      const slug = await getBrandSlug('org-thrive-123');

      expect(slug).toBeNull();
    });

    it('returns null when org doc exists but neither collections have slug', async () => {
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ name: 'Org only' }) }) // org doc no slug
        .mockResolvedValueOnce({ exists: false }); // brands doc doesn't exist

      const slug = await getBrandSlug('org-thrive-123');

      expect(slug).toBeNull();
    });
  });

  describe('Firestore Collection Access', () => {
    it('always accesses brands collection correctly', async () => {
      (createSlug as jest.Mock).mockReturnValue('test');
      mockGet.mockResolvedValue({ exists: false });

      await checkSlugAvailability('test');

      expect(mockCollection).toHaveBeenCalledWith('brands');
      expect(mockDoc).toHaveBeenCalledWith('test');
    });

    it('accesses users collection when checking ownership', async () => {
      (createSlug as jest.Mock).mockReturnValue('test');
      mockGet
        .mockResolvedValueOnce({ exists: true, data: () => ({ originalBrandId: 'org-123' }) })
        .mockResolvedValueOnce({ exists: true, data: () => ({ orgId: 'org-123' }) });

      await checkSlugAvailability('test');

      expect(mockCollection).toHaveBeenCalledWith('users');
      expect(mockDoc).toHaveBeenCalledWith('test-user-123');
    });

    it('accesses organizations collection when reserving', async () => {
      (createSlug as jest.Mock).mockReturnValue('test');
      mockGet
        .mockResolvedValueOnce({ exists: false })
        .mockResolvedValueOnce({ exists: true, data: () => ({}) });

      await reserveSlug('test', 'org-123');

      expect(mockCollection).toHaveBeenCalledWith('organizations');
      expect(mockDoc).toHaveBeenCalledWith('org-123');
    });
  });
});
