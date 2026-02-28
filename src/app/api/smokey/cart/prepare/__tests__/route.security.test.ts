import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockGetAdminFirestore = jest.fn();
const mockDispGet = jest.fn();
const mockProductGet = jest.fn();
const mockDraftSet = jest.fn();
const mockEventAdd = jest.fn();

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

describe('POST /api/smokey/cart/prepare security', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    mockDispGet.mockResolvedValue({
      data: () => ({
        id: 'disp_1',
        website: 'https://example.com',
      }),
    });

    mockProductGet.mockResolvedValue({
      data: () => ({
        name: 'Product A',
        price: 20,
      }),
    });

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'dispensaries') {
          return {
            doc: jest.fn(() => ({
              get: mockDispGet,
              collection: jest.fn(() => ({
                doc: jest.fn(() => ({
                  get: mockProductGet,
                })),
              })),
            })),
          };
        }
        if (name === 'draftCarts') {
          return {
            doc: jest.fn(() => ({
              id: 'cart-1',
              set: mockDraftSet,
            })),
          };
        }
        if (name === 'events') {
          return {
            add: mockEventAdd,
          };
        }
        return { doc: jest.fn(), add: jest.fn() };
      }),
    };
    mockGetAdminFirestore.mockReturnValue(firestore);
    mockDraftSet.mockResolvedValue(undefined);
    mockEventAdd.mockResolvedValue(undefined);

    ({ POST } = await import('../route'));
  });

  it('requires authentication', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await POST({
      json: async () => ({
        dispId: 'disp_1',
        items: [{ productId: 'prod_1', qty: 1 }],
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Authentication required');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('rejects invalid dispensary id format', async () => {
    const response = await POST({
      json: async () => ({
        dispId: 'bad/id',
        items: [{ productId: 'prod_1', qty: 1 }],
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid dispId');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('binds draft cart to authenticated user', async () => {
    const response = await POST({
      json: async () => ({
        dispId: 'disp_1',
        items: [{ productId: 'prod_1', qty: 1 }],
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockDraftSet).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      dispId: 'disp_1',
    }));
  });
});

