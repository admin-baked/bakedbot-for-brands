import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireUser = jest.fn();
const mockGetAdminFirestore = jest.fn();
const mockAlertsGet = jest.fn();
const mockAlertSet = jest.fn();
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

describe('POST /api/smokey/alert/create security', () => {
  let POST: typeof import('../route').POST;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });

    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'alerts') {
          return {
            where: jest.fn(() => ({
              where: jest.fn(() => ({
                get: mockAlertsGet,
              })),
            })),
            doc: jest.fn(() => ({
              id: 'alert-1',
              set: mockAlertSet,
            })),
          };
        }
        if (name === 'events') {
          return {
            add: mockEventAdd,
          };
        }
        return { where: jest.fn(), doc: jest.fn(), add: jest.fn() };
      }),
    };

    mockGetAdminFirestore.mockReturnValue(firestore);
    mockAlertsGet.mockResolvedValue({ size: 0 });
    mockAlertSet.mockResolvedValue(undefined);
    mockEventAdd.mockResolvedValue(undefined);

    ({ POST } = await import('../route'));
  });

  it('requires authentication', async () => {
    mockRequireUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await POST({
      json: async () => ({
        type: 'inStock',
        scope: 'dispensary',
        dispId: 'disp_1',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Authentication required');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('enforces scope-specific identifiers', async () => {
    const response = await POST({
      json: async () => ({
        type: 'inStock',
        scope: 'product',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('productKey is required');
    expect(mockAlertSet).not.toHaveBeenCalled();
  });

  it('rejects invalid identifier format', async () => {
    const response = await POST({
      json: async () => ({
        type: 'inStock',
        scope: 'dispensary',
        dispId: 'bad/id',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid dispId');
    expect(mockGetAdminFirestore).not.toHaveBeenCalled();
  });

  it('binds created alert to authenticated user', async () => {
    const response = await POST({
      json: async () => ({
        type: 'inStock',
        scope: 'dispensary',
        dispId: 'disp_1',
      }),
    } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockAlertSet).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      scope: 'dispensary',
      dispId: 'disp_1',
    }));
  });
});

