import {
  createBlogPost,
  getBlogPost,
  getBlogPostBySlug,
  updateBlogPost,
  deleteBlogPost,
  getBlogPosts,
  getBlogAnalytics,
  updateBlogSettings,
  generateBlogDraft,
  runComplianceCheck,
} from '../blog';
import { requireUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/firebase/server-client';
import { generateBlogDraft as generateDraftService } from '@/server/services/blog-generator';

jest.mock('@/lib/auth-helpers', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/services/blog-generator', () => ({
  generateBlogDraft: jest.fn(),
}));

jest.mock('@/server/services/blog-compliance', () => ({
  checkBlogCompliance: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('blog actions security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from creating posts in another org', async () => {
    await expect(
      createBlogPost({
        orgId: 'org-b',
        title: 'Cross Org Post',
        excerpt: 'excerpt',
        content: 'content',
        category: 'education',
      }),
    ).rejects.toThrow('Unauthorized');

    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users from updating a post in another org', async () => {
    const update = jest.fn();
    const postDoc = {
      id: 'post-1',
      data: () => ({ orgId: 'org-b' }),
      ref: { update },
    };
    const postQuery = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    postQuery.where.mockReturnValue(postQuery);
    postQuery.limit.mockReturnValue(postQuery);
    postQuery.get.mockResolvedValue({ empty: false, docs: [postDoc] });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collectionGroup: jest.fn().mockReturnValue(postQuery),
      },
    });

    await expect(updateBlogPost('post-1', { title: 'Updated' })).rejects.toThrow('Unauthorized');
    expect(update).not.toHaveBeenCalled();
  });

  it('blocks non-super users from deleting a post in another org', async () => {
    const del = jest.fn();
    const postDoc = {
      id: 'post-1',
      data: () => ({ orgId: 'org-b' }),
      ref: { delete: del },
    };
    const postQuery = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    postQuery.where.mockReturnValue(postQuery);
    postQuery.limit.mockReturnValue(postQuery);
    postQuery.get.mockResolvedValue({ empty: false, docs: [postDoc] });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collectionGroup: jest.fn().mockReturnValue(postQuery),
      },
    });

    await expect(deleteBlogPost('post-1')).rejects.toThrow('Unauthorized');
    expect(del).not.toHaveBeenCalled();
  });

  it('requires auth for non-published getBlogPosts access', async () => {
    await expect(
      getBlogPosts({
        orgId: 'org-b',
      }),
    ).rejects.toThrow('Unauthorized');

    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('allows public published-only getBlogPosts without auth context', async () => {
    const query = {
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      offset: jest.fn(),
      get: jest.fn(),
    };
    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.offset.mockReturnValue(query);
    query.get.mockResolvedValue({ docs: [] });

    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue(query),
        }),
      }),
    };
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await getBlogPosts({ orgId: 'org-public', status: 'published' });

    expect(result).toEqual([]);
    expect(requireUser).not.toHaveBeenCalled();
  });

  it('blocks non-super users from cross-org analytics and settings writes', async () => {
    await expect(getBlogAnalytics('org-b')).rejects.toThrow('Unauthorized');
    await expect(updateBlogSettings('org-b', { enabled: true } as any)).rejects.toThrow('Unauthorized');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users from cross-org blog draft generation', async () => {
    await expect(
      generateBlogDraft({
        orgId: 'org-b',
        userId: 'user-1',
        category: 'education',
        topic: 'New York compliance basics',
        tone: 'professional',
        length: 'short',
      }),
    ).rejects.toThrow('Unauthorized');

    expect(generateDraftService).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks non-super users from cross-org compliance checks', async () => {
    const postDoc = {
      id: 'post-1',
      data: () => ({ orgId: 'org-b' }),
      ref: { get: jest.fn() },
    };
    const postQuery = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    postQuery.where.mockReturnValue(postQuery);
    postQuery.limit.mockReturnValue(postQuery);
    postQuery.get.mockResolvedValue({ empty: false, docs: [postDoc] });

    const firestore = {
      collectionGroup: jest.fn().mockReturnValue(postQuery),
      collection: jest.fn(),
    };
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    await expect(runComplianceCheck('post-1')).rejects.toThrow('Unauthorized');
    expect(firestore.collection).not.toHaveBeenCalledWith('brands');
  });

  it('allows super users to update settings for any org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });

    const set = jest.fn().mockResolvedValue(undefined);
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({ set }),
          }),
        }),
      }),
    };
    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const result = await updateBlogSettings('org-b', { enabled: true } as any);

    expect(result.orgId).toBe('org-b');
    expect(set).toHaveBeenCalledWith({ enabled: true }, { merge: true });
  });

  it('rejects invalid org ids before creating posts', async () => {
    await expect(
      createBlogPost({
        orgId: 'org/bad',
        title: 'Invalid Org',
        excerpt: 'excerpt',
        content: 'content',
        category: 'education',
      }),
    ).rejects.toThrow('Failed to create blog post');

    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('blocks reading unpublished posts across orgs', async () => {
    const postDoc = {
      id: 'post-1',
      data: () => ({ orgId: 'org-b', status: 'draft' }),
    };
    const postQuery = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    postQuery.where.mockReturnValue(postQuery);
    postQuery.limit.mockReturnValue(postQuery);
    postQuery.get.mockResolvedValue({ empty: false, docs: [postDoc] });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collectionGroup: jest.fn().mockReturnValue(postQuery),
      },
    });

    await expect(getBlogPost('post-1')).rejects.toThrow('Unauthorized');
  });

  it('returns published posts without requiring org auth', async () => {
    const postDoc = {
      id: 'post-1',
      data: () => ({ orgId: 'org-b', status: 'published' }),
    };
    const postQuery = {
      where: jest.fn(),
      limit: jest.fn(),
      get: jest.fn(),
    };
    postQuery.where.mockReturnValue(postQuery);
    postQuery.limit.mockReturnValue(postQuery);
    postQuery.get.mockResolvedValue({ empty: false, docs: [postDoc] });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collectionGroup: jest.fn().mockReturnValue(postQuery),
      },
    });

    const result = await getBlogPost('post-1');

    expect(result?.status).toBe('published');
    expect(requireUser).not.toHaveBeenCalled();
  });

  it('returns null for invalid slug format', async () => {
    const result = await getBlogPostBySlug('org-a', 'bad/slug');
    expect(result).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
