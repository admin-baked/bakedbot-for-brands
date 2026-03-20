describe('blog platform reads', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('falls back to client-side published filtering when the Firestore index is missing', async () => {
    const primaryQuery = {
      limit: jest.fn(),
      offset: jest.fn(),
      get: jest.fn(),
    };
    primaryQuery.limit.mockReturnValue(primaryQuery);
    primaryQuery.offset.mockReturnValue(primaryQuery);
    primaryQuery.get.mockRejectedValue({
      code: 9,
      message: 'FAILED_PRECONDITION: The query requires an index.',
    });

    const publishedFilterQuery = {
      orderBy: jest.fn(),
    };
    publishedFilterQuery.orderBy.mockReturnValue(primaryQuery);

    const fallbackQuery = {
      get: jest.fn(),
    };
    fallbackQuery.get.mockResolvedValue({
      docs: [
        {
          id: 'draft-1',
          data: () => ({ status: 'draft', title: 'Draft post' }),
        },
        {
          id: 'post-1',
          data: () => ({ status: 'published', title: 'Published post 1' }),
        },
        {
          id: 'post-2',
          data: () => ({ status: 'published', title: 'Published post 2' }),
        },
        {
          id: 'post-3',
          data: () => ({ status: 'published', title: 'Published post 3' }),
        },
      ],
    });

    const blogPostsCollection = {
      where: jest.fn(),
      orderBy: jest.fn(),
    };
    blogPostsCollection.where.mockReturnValue(publishedFilterQuery);
    blogPostsCollection.orderBy.mockReturnValue(fallbackQuery);

    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue(blogPostsCollection),
        }),
      }),
    };

    const warn = jest.fn();

    jest.doMock('@/firebase/server-client', () => ({
      createServerClient: jest.fn().mockResolvedValue({ firestore }),
    }));

    jest.doMock('@/lib/logger', () => ({
      logger: {
        info: jest.fn(),
        warn,
        error: jest.fn(),
        debug: jest.fn(),
      },
    }));

    jest.doMock('@/server/services/blog-generator', () => ({
      generateBlogDraft: jest.fn(),
    }));

    jest.doMock('@/server/services/blog-compliance', () => ({
      checkBlogCompliance: jest.fn(),
    }));

    jest.doMock('@/server/auth/auth', () => ({
      requireUser: jest.fn(),
    }));

    const { getPublishedPlatformPosts } = await import('../blog');
    const result = await getPublishedPlatformPosts({ offset: 1, limit: 2 });

    expect(warn).toHaveBeenCalledWith(
      '[getPublishedPlatformPosts] Missing Firestore index, falling back to client-side status filtering',
      expect.objectContaining({
        orgId: 'org_bakedbot_platform',
        limit: 2,
        offset: 1,
      }),
    );
    expect(blogPostsCollection.orderBy).toHaveBeenCalledWith('publishedAt', 'desc');
    expect(result.map(post => post.id)).toEqual(['post-2', 'post-3']);
  });
});
