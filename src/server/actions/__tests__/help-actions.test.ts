describe('help actions build fallbacks', () => {
  const originalNextPhase = process.env.NEXT_PHASE;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PHASE = 'phase-production-build';
  });

  afterAll(() => {
    process.env.NEXT_PHASE = originalNextPhase;
  });

  it('returns file-backed article content when Firestore metadata is unavailable during build', async () => {
    const createServerClient = jest.fn().mockRejectedValue({
      code: 14,
      message: 'UNAVAILABLE: Name resolution failed for target dns:firestore.googleapis.com:443',
    });
    const info = jest.fn();

    jest.doMock('@/content/help/_index', () => ({
      articles: {
        'getting-started/brand-quick-start': {
          slug: 'brand-quick-start',
          category: 'getting-started',
          title: 'Brand Quick Start Guide',
          description: 'A help article used in tests.',
          roles: [],
          tags: ['setup'],
          difficulty: 'beginner',
          estimatedTime: '3 min',
          filePath: 'getting-started/brand-quick-start.mdx',
          lastUpdated: '2026-03-19',
          author: 'BakedBot',
        },
      },
    }));

    jest.doMock('@/firebase/server-client', () => ({
      createServerClient,
    }));

    jest.doMock('@/lib/logger', () => ({
      logger: {
        info,
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    }));

    const { getArticleBySlug } = await import('../help-actions');
    const article = await getArticleBySlug('getting-started', 'brand-quick-start');

    expect(article).toEqual(
      expect.objectContaining({
        slug: 'brand-quick-start',
        content: expect.stringContaining('# Brand Quick Start Guide'),
        views: 0,
        avgRating: 0,
        totalRatings: 0,
      }),
    );
    expect(info).toHaveBeenCalledWith(
      '[HelpArticles] Firestore unavailable during production build, using file metadata defaults',
      expect.objectContaining({
        category: 'getting-started',
        slug: 'brand-quick-start',
      }),
    );
  });

  it('skips article view tracking during production builds', async () => {
    const createServerClient = jest.fn();

    jest.doMock('@/firebase/server-client', () => ({
      createServerClient,
    }));

    const { trackArticleView } = await import('../help-actions');
    await trackArticleView('getting-started/test-article', 'user-1');

    expect(createServerClient).not.toHaveBeenCalled();
  });
});
