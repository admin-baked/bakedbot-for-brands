import { createSubscription } from '../subscription';
import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { isCompanyPlanCheckoutEnabled } from '@/lib/feature-flags';
import {
  createCustomerProfile,
  createSubscriptionFromProfile,
} from '@/lib/payments/authorize-net';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/lib/feature-flags', () => ({
  isCompanyPlanCheckoutEnabled: jest.fn(),
}));

jest.mock('@/lib/payments/authorize-net', () => ({
  createCustomerProfile: jest.fn(),
  createSubscriptionFromProfile: jest.fn(),
  cancelARBSubscription: jest.fn(),
  updateARBSubscription: jest.fn(),
}));

jest.mock('../promos', () => ({
  validatePromoCode: jest.fn(),
}));

jest.mock('../playbooks', () => ({
  assignTierPlaybooks: jest.fn(),
}));

jest.mock('@/server/events/emitter', () => ({
  emitEvent: jest.fn(),
}));

jest.mock('@/server/services/billing-notifications', () => ({
  notifySubscriptionCreated: jest.fn().mockResolvedValue(undefined),
  notifySubscriptionCanceled: jest.fn().mockResolvedValue(undefined),
  notifySubscriptionPaymentFailed: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    critical: jest.fn(),
  },
}));

describe('createSubscription auth + billing validation hardening', () => {
  const validInput = {
    orgId: 'org_1',
    tierId: 'pro' as const,
    opaqueData: {
      dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
      dataValue: 'opaque-token',
    },
    billTo: {
      firstName: 'Owner',
      lastName: 'Example',
      address: '1 Main St',
      city: 'Syracuse',
      state: 'NY',
      zip: '13224',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (isCompanyPlanCheckoutEnabled as jest.Mock).mockReturnValue(true);
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.com',
    });
  });

  it('returns disabled when company checkout is off', async () => {
    (isCompanyPlanCheckoutEnabled as jest.Mock).mockReturnValueOnce(false);

    const result = await createSubscription(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('disabled');
    expect(requireUser).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('requires verified email before paid subscription setup', async () => {
    (requireUser as jest.Mock).mockResolvedValueOnce({
      uid: 'user-1',
      email: 'owner@example.com',
      email_verified: false,
    });

    const result = await createSubscription(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Email verification');
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('rejects invalid billTo ZIP format at schema layer', async () => {
    const result = await createSubscription({
      ...validInput,
      billTo: {
        ...validInput.billTo,
        zip: '13',
      },
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('ZIP');
    expect(requireUser).not.toHaveBeenCalled();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('reuses an existing active subscription on the same tier and skips gateway calls', async () => {
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'organizations') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ ownerId: 'user-1' }),
              }),
            })),
          };
        }

        if (name === 'subscriptions') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  status: 'active',
                  tierId: 'pro',
                  authorizeNetSubscriptionId: 'arb_existing_123',
                  amount: 199,
                }),
              }),
            })),
          };
        }

        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          })),
        };
      }),
    };

    (createServerClient as jest.Mock).mockResolvedValueOnce({ firestore });

    const result = await createSubscription(validInput);

    expect(result.success).toBe(true);
    expect(result.subscriptionId).toBe('arb_existing_123');
    expect((result as any).reused).toBe(true);
    expect(createCustomerProfile).not.toHaveBeenCalled();
    expect(createSubscriptionFromProfile).not.toHaveBeenCalled();
  });

  it('blocks creating a second active subscription when tier differs', async () => {
    const firestore = {
      collection: jest.fn((name: string) => {
        if (name === 'organizations') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ ownerId: 'user-1' }),
              }),
            })),
          };
        }

        if (name === 'subscriptions') {
          return {
            doc: jest.fn(() => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  status: 'active',
                  tierId: 'growth',
                  authorizeNetSubscriptionId: 'arb_existing_456',
                }),
              }),
            })),
          };
        }

        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          })),
        };
      }),
    };

    (createServerClient as jest.Mock).mockResolvedValueOnce({ firestore });

    const result = await createSubscription(validInput);

    expect(result.success).toBe(false);
    expect(result.error).toContain('active subscription already exists');
    expect(createCustomerProfile).not.toHaveBeenCalled();
    expect(createSubscriptionFromProfile).not.toHaveBeenCalled();
  });
});
