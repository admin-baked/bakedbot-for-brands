import {
  getPostPurchaseFeedbackContext,
  submitPostPurchaseFeedback,
} from '../post-purchase-feedback';
import { getAdminFirestore } from '@/firebase/admin';
import { getGoogleReviewUrl } from '@/lib/reviews/google-review-url';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/reviews/google-review-url', () => ({
  getGoogleReviewUrl: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

function createFirestore(args?: {
  orders?: Record<string, Record<string, unknown>>;
  feedback?: Record<string, Record<string, unknown>>;
}) {
  const orders = new Map<string, Record<string, unknown>>(Object.entries(args?.orders ?? {}));
  const feedback = new Map<string, Record<string, unknown>>(Object.entries(args?.feedback ?? {}));
  const notifications = new Map<string, Record<string, unknown>>();

  let notificationCount = 0;

  const firestore = {
    collection: jest.fn((name: string) => {
      if (name === 'orders') {
        return {
          doc: (id: string) => ({
            id,
            get: jest.fn(async () => {
              const data = orders.get(id);
              return {
                id,
                exists: data !== undefined,
                data: () => data,
              };
            }),
          }),
        };
      }

      if (name === 'customer_feedback') {
        return {
          doc: (id: string) => ({
            id,
            get: jest.fn(async () => {
              const data = feedback.get(id);
              return {
                id,
                exists: data !== undefined,
                data: () => data,
              };
            }),
            set: jest.fn(async (data: Record<string, unknown>) => {
              feedback.set(id, data);
            }),
          }),
        };
      }

      if (name === 'heartbeat_notifications') {
        return {
          add: jest.fn(async (data: Record<string, unknown>) => {
            notificationCount += 1;
            notifications.set(`notification_${notificationCount}`, data);
            return { id: `notification_${notificationCount}` };
          }),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return { firestore, feedback, notifications };
}

describe('post-purchase feedback actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getGoogleReviewUrl as jest.Mock).mockResolvedValue('https://reviews.example.com/thrive');
  });

  it('loads context for a completed matching order', async () => {
    const state = createFirestore({
      orders: {
        alleaves_order_1: {
          brandId: 'org_thrive_syracuse',
          status: 'completed',
          customer: {
            name: 'Jane',
            email: 'jane@example.com',
          },
          items: [
            { name: 'Nightcap Gummies' },
            { name: 'Blue Dream Pre-Roll' },
          ],
          totals: { total: 48 },
          createdAt: '2026-03-20T12:00:00.000Z',
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const result = await getPostPurchaseFeedbackContext({
      orgId: 'org_thrive_syracuse',
      orderId: 'alleaves_order_1',
      email: 'jane@example.com',
    });

    expect(result).toMatchObject({
      success: true,
      orderId: 'alleaves_order_1',
      customerName: 'Jane',
      primaryItemName: 'Nightcap Gummies',
      itemCount: 2,
      total: 48,
      googleReviewUrl: 'https://reviews.example.com/thrive',
      alreadySubmitted: false,
    });
  });

  it('stores positive feedback and returns the Google review URL', async () => {
    const state = createFirestore({
      orders: {
        alleaves_123: {
          brandId: 'org_thrive_syracuse',
          status: 'completed',
          customer: {
            name: 'Jane',
            email: 'jane@example.com',
          },
          items: [{ name: 'Blue Dream Pre-Roll' }],
          totals: { total: 22 },
          createdAt: '2026-03-20T12:00:00.000Z',
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const result = await submitPostPurchaseFeedback({
      orgId: 'org_thrive_syracuse',
      orderId: '123',
      email: 'jane@example.com',
      rating: 5,
      reviewText: 'Loved it',
    });

    expect(result).toEqual({
      success: true,
      googleReviewUrl: 'https://reviews.example.com/thrive',
      googleReviewEligible: true,
      managerAlertCreated: false,
    });
    expect(Array.from(state.feedback.values())[0]).toMatchObject({
      orderId: 'alleaves_123',
      rating: 5,
      reviewText: 'Loved it',
      googleReviewEligible: true,
    });
    expect(state.notifications.size).toBe(0);
  });

  it('creates a manager alert for low ratings and suppresses public review', async () => {
    const state = createFirestore({
      orders: {
        alleaves_456: {
          brandId: 'org_thrive_syracuse',
          status: 'completed',
          customer: {
            name: 'Pat',
            email: 'pat@example.com',
          },
          items: [{ name: 'Heavy Hitter Vape' }],
          totals: { total: 35 },
          createdAt: '2026-03-20T12:00:00.000Z',
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const result = await submitPostPurchaseFeedback({
      orgId: 'org_thrive_syracuse',
      orderId: '456',
      email: 'pat@example.com',
      rating: 2,
      reviewText: 'Too harsh for me',
    });

    expect(result).toEqual({
      success: true,
      googleReviewEligible: false,
      managerAlertCreated: true,
    });
    expect(state.notifications.size).toBe(1);
    expect(Array.from(state.notifications.values())[0]).toMatchObject({
      orgId: 'org_thrive_syracuse',
      type: 'customer_feedback',
      metadata: expect.objectContaining({
        rating: 2,
        reviewText: 'Too harsh for me',
      }),
    });
  });

  it('prevents duplicate submissions for the same order and email', async () => {
    const state = createFirestore({
      orders: {
        alleaves_789: {
          brandId: 'org_thrive_syracuse',
          status: 'completed',
          customer: {
            name: 'Alex',
            email: 'alex@example.com',
          },
          items: [{ name: 'Daytime Gummies' }],
          totals: { total: 18 },
          createdAt: '2026-03-20T12:00:00.000Z',
        },
      },
      feedback: {
        'org_thrive_syracuse_alleaves_789_alex%40example.com': {
          rating: 4,
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const result = await submitPostPurchaseFeedback({
      orgId: 'org_thrive_syracuse',
      orderId: '789',
      email: 'alex@example.com',
      rating: 4,
    });

    expect(result).toEqual({
      success: false,
      managerAlertCreated: false,
      error: 'Feedback already submitted',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      '[PostPurchaseFeedback] Duplicate feedback prevented',
      expect.objectContaining({
        email: 'alex@example.com',
        orderId: 'alleaves_789',
      }),
    );
  });
});
