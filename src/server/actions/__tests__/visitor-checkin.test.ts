import { captureVisitorCheckin, getVisitorCheckinContext } from '../visitor-checkin';
import { getAdminFirestore } from '@/firebase/admin';
import { getGoogleReviewUrl } from '@/lib/reviews/google-review-url';
import { logger } from '@/lib/logger';
import { captureEmailLead } from '../email-capture';
import { dispatchPlaybookEvent } from '@/server/services/playbook-event-dispatcher';
import { getCustomerHistory } from '@/server/tools/crm-tools';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/reviews/google-review-url', () => ({
  getGoogleReviewUrl: jest.fn(),
}));

jest.mock('../email-capture', () => ({
  captureEmailLead: jest.fn(),
}));

jest.mock('@/server/services/playbook-event-dispatcher', () => ({
  dispatchPlaybookEvent: jest.fn(),
}));

jest.mock('@/server/tools/crm-tools', () => ({
  getCustomerHistory: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type CollectionName = 'customers' | 'checkin_visits' | 'email_leads';

function createFirestore(args?: {
  customers?: Record<string, Record<string, unknown>>;
  emailLeads?: Record<string, Record<string, unknown>>;
}) {
  const customers = new Map<string, Record<string, unknown>>(Object.entries(args?.customers ?? {}));
  const visits = new Map<string, Record<string, unknown>>();
  const emailLeads = new Map<string, Record<string, unknown>>(Object.entries(args?.emailLeads ?? {}));

  const getStore = (collectionName: CollectionName) => {
    if (collectionName === 'customers') return customers;
    if (collectionName === 'checkin_visits') return visits;
    return emailLeads;
  };

  const makeDocRef = (collectionName: CollectionName, id: string) => ({
    id,
    __collectionName: collectionName,
    get: jest.fn(async () => {
      const data = getStore(collectionName).get(id);
      return {
        id,
        exists: data !== undefined,
        data: () => data,
      };
    }),
    set: jest.fn(async (data: Record<string, unknown>) => {
      getStore(collectionName).set(id, data);
    }),
  });

  const makeQueryDoc = (collectionName: CollectionName, id: string, data: Record<string, unknown>) => ({
    id,
    data: () => data,
    get: (field: string) => data[field],
    ref: {
      ...makeDocRef(collectionName, id),
      update: jest.fn(async (updates: Record<string, unknown>) => {
        const current = getStore(collectionName).get(id) ?? {};
        getStore(collectionName).set(id, { ...current, ...updates });
      }),
    },
  });

  const batchOps: Array<() => void> = [];
  const batch = {
    set: jest.fn((ref: { id: string; __collectionName: CollectionName }, data: Record<string, unknown>) => {
      batchOps.push(() => {
        getStore(ref.__collectionName).set(ref.id, data);
      });
      return batch;
    }),
    update: jest.fn((ref: { id: string; __collectionName: CollectionName }, updates: Record<string, unknown>) => {
      batchOps.push(() => {
        const current = getStore(ref.__collectionName).get(ref.id) ?? {};
        getStore(ref.__collectionName).set(ref.id, { ...current, ...updates });
      });
      return batch;
    }),
    commit: jest.fn(async () => {
      batchOps.forEach((operation) => operation());
    }),
  };

  const makeWhere = (collectionName: 'customers' | 'email_leads', field: string, value: string) => ({
    limit: () => ({
      get: jest.fn(async () => {
        const docs = Array.from(getStore(collectionName).entries())
          .filter(([, data]) => data[field] === value)
          .map(([id, data]) => makeQueryDoc(collectionName, id, data));
        return { empty: docs.length === 0, docs };
      }),
    }),
    get: jest.fn(async () => {
      const docs = Array.from(getStore(collectionName).entries())
        .filter(([, data]) => data[field] === value)
        .map(([id, data]) => makeQueryDoc(collectionName, id, data));
      return { empty: docs.length === 0, docs };
    }),
  });

  const firestore = {
    batch: jest.fn(() => batch),
    collection: jest.fn((name: string) => {
      if (name === 'customers') {
        return {
          doc: (id: string) => makeDocRef('customers', id),
          where: (field: string, _operator: string, value: string) => makeWhere('customers', field, value),
        };
      }

      if (name === 'email_leads') {
        return {
          where: (field: string, _operator: string, value: string) => makeWhere('email_leads', field, value),
          doc: (id: string) => makeDocRef('email_leads', id),
        };
      }

      if (name === 'checkin_visits') {
        return {
          doc: (id: string) => makeDocRef('checkin_visits', id),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return { firestore, customers, visits, emailLeads };
}

describe('visitor check-in actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-26T15:00:00.000Z'));
    (getGoogleReviewUrl as jest.Mock).mockResolvedValue('https://reviews.example.com/thrive');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves returning-customer context with last purchase, saved email, and review URL', async () => {
    const state = createFirestore({
      customers: {
        alleaves_42: {
          orgId: 'org_thrive_syracuse',
          phone: '+13155551212',
          email: 'vip@example.com',
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (getCustomerHistory as jest.Mock).mockResolvedValue({
      summary: 'history',
      orders: [
        {
          id: 'alleaves_order_100',
          date: '2026-03-20T10:00:00.000Z',
          total: 54,
          items: [{ name: 'Blue Dream Pre-Roll' }, { name: 'Gummies' }],
        },
      ],
    });

    const result = await getVisitorCheckinContext({
      orgId: 'org_thrive_syracuse',
      phone: '(315) 555-1212',
    });

    expect(result).toMatchObject({
      success: true,
      isReturningCustomer: true,
      customerId: 'alleaves_42',
      savedEmail: 'vip@example.com',
      savedEmailConsent: false,
      enrichmentMode: 'favorite_categories',
      googleReviewUrl: 'https://reviews.example.com/thrive',
      lastPurchase: expect.objectContaining({
        primaryItemName: 'Blue Dream Pre-Roll',
        itemCount: 2,
        total: 54,
      }),
    });
    expect(logger.info).toHaveBeenCalledWith(
      '[VisitorCheckin] Resolved public check-in context',
      expect.objectContaining({
        customerId: 'alleaves_42',
        isReturningCustomer: true,
        lastPurchaseFound: true,
        reviewUrlFound: true,
        enrichmentMode: 'favorite_categories',
      }),
    );
  });

  it('uses scoped email-lead history when there is no customer record yet', async () => {
    const state = createFirestore({
      emailLeads: {
        lead_1: {
          phone: '+13155550000',
          email: 'known@example.com',
          brandId: 'org_thrive_syracuse',
          dispensaryId: 'org_thrive_syracuse',
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (getCustomerHistory as jest.Mock).mockResolvedValue({ summary: '', orders: [] });

    const result = await getVisitorCheckinContext({
      orgId: 'org_thrive_syracuse',
      phone: '3155550000',
    });

    expect(result).toMatchObject({
      success: true,
      isReturningCustomer: true,
      savedEmail: 'known@example.com',
      savedEmailConsent: false,
      enrichmentMode: 'favorite_categories',
    });
  });

  it('creates a new check-in with additive Thrive metadata', async () => {
    const state = createFirestore();
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-1',
      isNewLead: true,
    });
    (dispatchPlaybookEvent as jest.Mock).mockResolvedValue(undefined);

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Jane',
      phone: '(315) 555-1212',
      email: 'jane@example.com',
      emailConsent: true,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
      mood: 'relaxed',
      favoriteCategories: ['flower', 'vapes'],
      uiVersion: 'thrive_checkin_v2',
      offerType: 'email',
    });

    expect(result).toMatchObject({
      success: true,
      isNewLead: true,
      isReturningCustomer: false,
      customerId: 'org_thrive_syracuse_phone_13155551212',
    });
    expect(state.customers.get('org_thrive_syracuse_phone_13155551212')).toMatchObject({
      firstName: 'Jane',
      email: 'jane@example.com',
      phone: '+13155551212',
      preferredCategories: ['flower', 'vapes'],
      firstCheckinMood: 'relaxed',
      lastCheckinMood: 'relaxed',
      lastCheckinUiVersion: 'thrive_checkin_v2',
    });

    const visit = Array.from(state.visits.values())[0];
    expect(visit).toMatchObject({
      orgId: 'org_thrive_syracuse',
      leadId: 'lead-1',
      emailConsent: true,
      smsConsent: true,
      favoriteCategories: ['flower', 'vapes'],
      uiVersion: 'thrive_checkin_v2',
      offerType: 'email',
      reviewSequence: expect.objectContaining({
        status: 'pending',
      }),
    });
    expect(logger.info).toHaveBeenCalledWith(
      '[VisitorCheckin] Captured visitor check-in',
      expect.objectContaining({
        favoriteCategories: ['flower', 'vapes'],
        offerType: 'email',
        uiVersion: 'thrive_checkin_v2',
        mood: 'relaxed',
      }),
    );
  });

  it('merges favorite categories onto an existing customer without dispatching signup twice', async () => {
    const state = createFirestore({
      customers: {
        customer_1: {
          orgId: 'org_thrive_syracuse',
          firstName: 'Jane',
          phone: '+13155551212',
          preferredCategories: ['flower'],
          emailConsent: false,
          smsConsent: false,
          points: 42,
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-2',
      isNewLead: false,
    });

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Jane',
      phone: '3155551212',
      emailConsent: false,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
      favoriteCategories: ['pre-rolls'],
      offerType: 'favorite_categories',
      uiVersion: 'thrive_checkin_v2',
    });

    expect(result).toMatchObject({
      success: true,
      isReturningCustomer: true,
      loyaltyPoints: 42,
      customerId: 'customer_1',
    });
    expect(state.customers.get('customer_1')).toMatchObject({
      preferredCategories: ['flower', 'pre-rolls'],
      smsConsent: true,
      lastCheckinUiVersion: 'thrive_checkin_v2',
    });
    expect(dispatchPlaybookEvent).not.toHaveBeenCalled();
  });

  it('logs dispatch failures without failing the visit capture', async () => {
    const state = createFirestore();
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-4',
      isNewLead: true,
    });
    (dispatchPlaybookEvent as jest.Mock).mockRejectedValue(new Error('dispatch failed'));

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Alex',
      phone: '3155559999',
      email: 'alex@example.com',
      emailConsent: true,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result.success).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      '[VisitorCheckin] Failed to dispatch customer signup event',
      expect.objectContaining({
        error: 'dispatch failed',
        leadId: 'lead-4',
      }),
    );
  });
});
