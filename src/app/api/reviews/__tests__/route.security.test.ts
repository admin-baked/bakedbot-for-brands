import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockGetAdminFirestore = jest.fn();
const mockDuplicateReviewGet = jest.fn();
const mockReviewSet = jest.fn();
const mockEventsAdd = jest.fn();

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: (...args: unknown[]) => mockGetAdminFirestore(...args),
}));

jest.mock('@/lib/monitoring', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/reviews security', () => {
  let POST: typeof import('../route').POST;
  let GET: typeof import('../route').GET;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRequireUser.mockResolvedValue({
      uid: 'session-user-1',
      email: 'owner@example.com',
    });

    const reviewsQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: mockDuplicateReviewGet,
    };

    mockDuplicateReviewGet.mockResolvedValue({ empty: true });
    mockReviewSet.mockResolvedValue(undefined);
    mockEventsAdd.mockResolvedValue(undefined);

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'reviews') {
          return {
            where: jest.fn(() => reviewsQuery),
            doc: jest.fn(() => ({
              id: 'review_1',
              set: mockReviewSet,
            })),
          };
        }

        if (name === 'events') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
            })),
            add: mockEventsAdd,
          };
        }

        if (name === 'reviewAggregates') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({ exists: false }),
              set: jest.fn().mockResolvedValue(undefined),
            })),
          };
        }

        return { where: jest.fn(), doc: jest.fn(), add: jest.fn() };
      }),
    };

    mockGetAdminFirestore.mockReturnValue(firestore);

    ({ POST, GET } = await import('../route'));
  });

  it('requires authentication for review creation', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await POST({
      json: async () => ({
        entityType: 'product',
        entityId: 'prod_1',
        rating: 5,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Authentication required');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('rejects invalid entity ids', async () => {
    const response = await POST({
      json: async () => ({
        entityType: 'product',
        entityId: 'bad/id',
        rating: 4,
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid entityId');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('rejects unexpected payload fields', async () => {
    const response = await POST({
      json: async () => ({
        entityType: 'product',
        entityId: 'prod_1',
        rating: 4,
        userId: 'forged-user',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(typeof body.error).toBe('string');
    expect(mockReviewSet).not.toHaveBeenCalled();
  });

  it('binds created reviews to the authenticated user id', async () => {
    const response = await POST({
      json: async () => ({
        entityType: 'product',
        entityId: 'prod_1',
        rating: 5,
        text: 'buy now',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockReviewSet).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'session-user-1',
      entityId: 'prod_1',
    }));
  });

  it('validates GET query bounds', async () => {
    const response = await GET({
      url: 'https://example.com/api/reviews?entityType=product&entityId=prod_1&limit=5000',
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('less than or equal to 100');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });
});
