import {
  captureVisitorCheckin,
  findVisitorCheckinCandidates,
  getVisitorCheckinContext,
} from '../visitor-checkin';
import { getAdminFirestore } from '@/firebase/admin';
import { getGoogleReviewUrl } from '@/lib/reviews/google-review-url';
import { logger } from '@/lib/logger';
import { captureEmailLead } from '../email-capture';
import { handleCustomerOnboardingSignal } from '@/server/services/customer-onboarding';
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

jest.mock('@/server/services/customer-onboarding', () => ({
  handleCustomerOnboardingSignal: jest.fn(),
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

type CollectionName = 'customers' | 'checkin_visits' | 'email_leads' | 'orders' | 'tenants';

function getNestedFieldValue(data: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, data);
}

function createFirestore(args?: {
  customers?: Record<string, Record<string, unknown>>;
  emailLeads?: Record<string, Record<string, unknown>>;
  orders?: Record<string, Record<string, unknown>>;
  tenantProducts?: Record<string, { name: string }>;
}) {
  const customers = new Map<string, Record<string, unknown>>(Object.entries(args?.customers ?? {}));
  const visits = new Map<string, Record<string, unknown>>();
  const emailLeads = new Map<string, Record<string, unknown>>(Object.entries(args?.emailLeads ?? {}));
  const orders = new Map<string, Record<string, unknown>>(Object.entries(args?.orders ?? {}));
  const tenantProducts = new Map(Object.entries(args?.tenantProducts ?? {}));
  const kioskPicks: Record<string, unknown>[] = [];

  const getStore = (collectionName: CollectionName) => {
    if (collectionName === 'customers') return customers;
    if (collectionName === 'checkin_visits') return visits;
    if (collectionName === 'email_leads') return emailLeads;
    return orders;
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

  const makeWhere = (collectionName: 'customers' | 'email_leads' | 'orders', field: string, value: string) => ({
    limit: () => ({
      get: jest.fn(async () => {
        const docs = Array.from(getStore(collectionName).entries())
          .filter(([, data]) => getNestedFieldValue(data, field) === value)
          .map(([id, data]) => makeQueryDoc(collectionName, id, data));
        return { empty: docs.length === 0, docs };
      }),
    }),
    get: jest.fn(async () => {
      const docs = Array.from(getStore(collectionName).entries())
        .filter(([, data]) => getNestedFieldValue(data, field) === value)
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

      if (name === 'orders') {
        return {
          doc: (id: string) => makeDocRef('orders', id),
          where: (field: string, _operator: string, value: string) => makeWhere('orders', field, value),
        };
      }

      if (name === 'tenants') {
        return {
          doc: (_orgId: string) => ({
            collection: (subCol: string) => {
              if (subCol === 'publicViews') {
                return {
                  doc: (_: string) => ({
                    collection: (_2: string) => ({
                      doc: (itemId: string) => ({
                        get: jest.fn(async () => {
                          const data = tenantProducts.get(itemId);
                          return { exists: !!data, data: () => data, id: itemId };
                        }),
                      }),
                    }),
                  }),
                };
              }
              if (subCol === 'kioskPicks') {
                return {
                  add: jest.fn(async (data: Record<string, unknown>) => {
                    kioskPicks.push(data);
                    return { id: `kiosk_pick_${kioskPicks.length}` };
                  }),
                };
              }
              throw new Error(`Unexpected tenants sub-collection: ${subCol}`);
            },
          }),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return { firestore, customers, visits, emailLeads, orders, kioskPicks };
}

describe('visitor check-in actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(Date.parse('2026-03-26T15:00:00.000Z'));
    (getGoogleReviewUrl as jest.Mock).mockResolvedValue('https://reviews.example.com/thrive');
    (handleCustomerOnboardingSignal as jest.Mock).mockResolvedValue({ success: true, runId: 'run_1', status: 'scheduled' });
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
      enrichmentMode: 'email',
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
        enrichmentMode: 'email',
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
      enrichmentMode: 'email',
    });
  });

  it('prefers a consented lead email over an unconsented customer email in check-in context', async () => {
    const state = createFirestore({
      customers: {
        customer_1: {
          orgId: 'org_thrive_syracuse',
          phone: '+13155550000',
          email: 'stale@example.com',
          emailConsent: false,
        },
      },
      emailLeads: {
        lead_1: {
          phone: '+13155550000',
          email: 'fresh@example.com',
          emailConsent: true,
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
      savedEmail: 'fresh@example.com',
      savedEmailConsent: true,
      enrichmentMode: 'favorite_categories',
    });
  });

  it('treats a scoped online order as returning context without requiring an existing CRM profile', async () => {
    const state = createFirestore({
      orders: {
        order_1: {
          brandId: 'org_thrive_syracuse',
          customer: {
            name: 'Martez Anderson',
            email: 'martezandco@gmail.com',
            phone: '3126840522',
          },
          items: [{ name: 'Gelonade 3.5g' }, { name: 'Blue Dream Pre-Roll' }],
          totals: { total: 72 },
          createdAt: new Date('2026-03-29T16:00:00.000Z'),
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (getCustomerHistory as jest.Mock).mockResolvedValue({ summary: '', orders: [] });

    const result = await getVisitorCheckinContext({
      orgId: 'org_thrive_syracuse',
      phone: '3126840522',
    });

    expect(result).toMatchObject({
      success: true,
      isReturningCustomer: true,
      returningSource: 'online_order',
      savedEmail: 'martezandco@gmail.com',
      savedEmailConsent: false,
      enrichmentMode: 'email',
      lastPurchase: expect.objectContaining({
        primaryItemName: 'Gelonade 3.5g',
        itemCount: 2,
        total: 72,
      }),
    });
    expect(logger.info).toHaveBeenCalledWith(
      '[VisitorCheckin] Resolved public check-in context',
      expect.objectContaining({
        returningSource: 'online_order',
        lastPurchaseFound: true,
      }),
    );
  });

  it('finds masked staff-assisted candidates by first name and phone last 4', async () => {
    const state = createFirestore({
      customers: {
        customer_1: {
          orgId: 'org_thrive_syracuse',
          firstName: 'Martez',
          phone: '+13126840522',
          phoneLast4: '0522',
          lastCheckinAt: new Date('2026-03-30T09:00:00.000Z'),
        },
      },
      orders: {
        order_1: {
          brandId: 'org_thrive_syracuse',
          phoneLast4: '0522',
          customer: {
            name: 'Martez Anderson',
            email: 'martezandco@gmail.com',
            phone: '3126840522',
          },
          items: [{ name: 'Gelonade 3.5g' }],
          totals: { total: 48 },
          createdAt: new Date('2026-03-29T16:00:00.000Z'),
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const result = await findVisitorCheckinCandidates({
      orgId: 'org_thrive_syracuse',
      firstName: 'Martez',
      phoneLast4: '0522',
    });

    expect(result).toMatchObject({
      success: true,
      candidates: [
        expect.objectContaining({
          candidate: { kind: 'customer', id: 'customer_1' },
          phoneLast4: '0522',
          returningSource: 'customer',
          title: 'Martez - Known customer',
        }),
      ],
    });
  });

  it('resolves returning context from an opaque order lookup candidate', async () => {
    const state = createFirestore({
      orders: {
        order_1: {
          brandId: 'org_thrive_syracuse',
          phoneLast4: '0522',
          customer: {
            name: 'Martez Anderson',
            email: 'martezandco@gmail.com',
            phone: '3126840522',
          },
          items: [{ name: 'Gelonade 3.5g' }],
          totals: { total: 48 },
          createdAt: new Date('2026-03-29T16:00:00.000Z'),
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (getCustomerHistory as jest.Mock).mockResolvedValue({ summary: '', orders: [] });

    const result = await getVisitorCheckinContext({
      orgId: 'org_thrive_syracuse',
      lookupCandidate: { kind: 'order', id: 'order_1' },
    });

    expect(result).toMatchObject({
      success: true,
      normalizedPhone: '+13126840522',
      isReturningCustomer: true,
      returningSource: 'online_order',
      savedEmail: 'martezandco@gmail.com',
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
    expect(handleCustomerOnboardingSignal).toHaveBeenCalledWith(expect.objectContaining({
      type: 'tablet_checkin_captured',
      context: expect.objectContaining({
        visitId: result.visitId,
        customerId: 'org_thrive_syracuse_phone_13155551212',
        email: 'jane@example.com',
      }),
    }));
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
    
    await Promise.resolve();
    await Promise.resolve();

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
    expect(dispatchPlaybookEvent).toHaveBeenCalledWith(
      'org_thrive_syracuse',
      'customer.checkin',
      expect.objectContaining({
        eventName: 'customer.checkin',
        customerId: 'customer_1',
        customerName: 'Jane',
        priorVisits: 1,
      }),
    );
  });

  it('updates a returning customer email when a corrected opted-in address is provided', async () => {
    const state = createFirestore({
      customers: {
        customer_1: {
          orgId: 'org_thrive_syracuse',
          firstName: 'Martez',
          phone: '+13126840522',
          email: 'martez@bakedbot.ai',
          emailConsent: false,
          smsConsent: true,
          visitCount: 3,
          points: 12,
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-3',
      isNewLead: false,
    });
    (dispatchPlaybookEvent as jest.Mock).mockResolvedValue(undefined);

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Martez',
      phone: '3126840522',
      email: 'martezandco@gmail.com',
      emailConsent: true,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
      uiVersion: 'thrive_checkin_v2',
      offerType: 'email',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result).toMatchObject({
      success: true,
      isNewLead: false,
      isReturningCustomer: true,
      customerId: 'customer_1',
      loyaltyPoints: 12,
    });
    expect(state.customers.get('customer_1')).toMatchObject({
      email: 'martezandco@gmail.com',
      emailConsent: true,
      lastCheckinUiVersion: 'thrive_checkin_v2',
    });

    const visit = Array.from(state.visits.values())[0];
    expect(visit).toMatchObject({
      email: 'martezandco@gmail.com',
      emailConsent: true,
      isReturning: true,
      offerType: 'email',
      reviewSequence: expect.objectContaining({
        status: 'pending',
      }),
    });

    expect(dispatchPlaybookEvent).toHaveBeenCalledWith(
      'org_thrive_syracuse',
      'customer.checkin',
      expect.objectContaining({
        customerEmail: 'martezandco@gmail.com',
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      '[VisitorCheckin] Updated customer email during check-in',
      expect.objectContaining({
        customerId: 'customer_1',
        previousEmail: 'martez@bakedbot.ai',
        nextEmail: 'martezandco@gmail.com',
      }),
    );
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

  it('dispatches customer.checkin for returning leads without a full customer record', async () => {
    const state = createFirestore({
      emailLeads: {
        lead_know: {
          phone: '+13155557777',
          email: 'returning@example.com',
          brandId: 'org_thrive_syracuse',
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead_know',
      isNewLead: false,
    });

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Bob',
      phone: '3155557777',
      emailConsent: true,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result.success).toBe(true);
    expect(dispatchPlaybookEvent).toHaveBeenCalledWith(
      'org_thrive_syracuse',
      'customer.checkin',
      expect.objectContaining({
        eventName: 'customer.checkin',
        customerEmail: 'returning@example.com',
        customerName: 'Bob',
        priorVisits: 1,
      }),
    );
  });

  it('treats prior online-order history as returning during capture and skips signup dispatch', async () => {
    const state = createFirestore({
      orders: {
        order_1: {
          brandId: 'org_thrive_syracuse',
          customer: {
            name: 'Jordan',
            email: 'jordan@example.com',
            phone: '3155553333',
          },
          items: [{ name: 'Night Cap Gummies' }],
          totals: { total: 45 },
          createdAt: new Date('2026-03-28T18:15:00.000Z'),
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-order-1',
      isNewLead: true,
    });
    (dispatchPlaybookEvent as jest.Mock).mockResolvedValue(undefined);

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Jordan',
      phone: '3155553333',
      emailConsent: false,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
      uiVersion: 'thrive_checkin_v2',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result).toMatchObject({
      success: true,
      isNewLead: true,
      isReturningCustomer: true,
      customerId: 'org_thrive_syracuse_phone_13155553333',
    });
    expect(state.customers.get('org_thrive_syracuse_phone_13155553333')).toMatchObject({
      email: 'jordan@example.com',
      orderCount: 1,
      totalSpent: 45,
      lifetimeValue: 45,
      visitCount: 1,
    });

    const visit = Array.from(state.visits.values())[0];
    expect(visit).toMatchObject({
      isReturning: true,
      returningSource: 'online_order',
      email: null,
      reviewSequence: expect.objectContaining({
        status: 'skipped_no_email',
      }),
    });

    expect(dispatchPlaybookEvent).toHaveBeenCalledTimes(1);
    expect(dispatchPlaybookEvent).toHaveBeenCalledWith(
      'org_thrive_syracuse',
      'customer.checkin',
      expect.objectContaining({
        eventName: 'customer.checkin',
        customerId: 'org_thrive_syracuse_phone_13155553333',
        customerEmail: 'jordan@example.com',
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      '[VisitorCheckin] Captured visitor check-in',
      expect.objectContaining({
        returningSource: 'online_order',
      }),
    );
  });

  it('captures a staff-confirmed customer candidate without a raw phone in the request', async () => {
    const state = createFirestore({
      customers: {
        customer_1: {
          orgId: 'org_thrive_syracuse',
          firstName: 'Martez',
          phone: '+13126840522',
          phoneLast4: '0522',
          email: 'martezandco@gmail.com',
          emailConsent: true,
          visitCount: 2,
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead_5',
      isNewLead: false,
    });
    (dispatchPlaybookEvent as jest.Mock).mockResolvedValue(undefined);

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Martez',
      emailConsent: false,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
      lookupCandidate: { kind: 'customer', id: 'customer_1' },
      uiVersion: 'thrive_checkin_v2',
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(result).toMatchObject({
      success: true,
      isReturningCustomer: true,
      customerId: 'customer_1',
    });
    expect(captureEmailLead).toHaveBeenCalledWith(expect.objectContaining({
      phone: '+13126840522',
    }));

    const visit = Array.from(state.visits.values())[0];
    expect(visit).toMatchObject({
      phone: '+13126840522',
      phoneLast4: '0522',
      isReturning: true,
    });
  });

  it('writes a kiosk pick notification when cartProductIds are present', async () => {
    const state = createFirestore({
      tenantProducts: {
        'prod-flower': { name: 'Blue Dream' },
        'prod-vape': { name: 'Sunny Side Cart' },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-kiosk',
      isNewLead: true,
    });
    (dispatchPlaybookEvent as jest.Mock).mockResolvedValue(undefined);

    await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Tamika',
      phone: '3155550101',
      email: 'tamika@example.com',
      emailConsent: true,
      smsConsent: true,
      source: 'loyalty_tablet_checkin',
      ageVerifiedMethod: 'staff_visual_check',
      mood: 'relaxed',
      cartProductIds: ['prod-flower', 'prod-vape'],
    });

    // flush fire-and-forget chain
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(logger.info).toHaveBeenCalledWith(
      '[VisitorCheckin] Kiosk pick written for backoffice',
      expect.objectContaining({
        orgId: 'org_thrive_syracuse',
        productCount: 2,
      }),
    );
    expect(state.kioskPicks).toHaveLength(1);
    expect(state.kioskPicks[0]).toMatchObject({
      orgId: 'org_thrive_syracuse',
      firstName: 'Tamika',
      mood: 'relaxed',
      productIds: ['prod-flower', 'prod-vape'],
      productNames: ['Blue Dream', 'Sunny Side Cart'],
      status: 'pending',
    });
  });

  it('does not write a kiosk pick when cartProductIds is empty', async () => {
    const state = createFirestore();
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-nokiosk',
      isNewLead: true,
    });
    (dispatchPlaybookEvent as jest.Mock).mockResolvedValue(undefined);

    await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Dana',
      phone: '3155550202',
      email: 'dana@example.com',
      emailConsent: true,
      smsConsent: true,
      source: 'loyalty_tablet_checkin',
      ageVerifiedMethod: 'staff_visual_check',
      cartProductIds: [],
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(logger.info).not.toHaveBeenCalledWith(
      '[VisitorCheckin] Kiosk pick written for backoffice',
      expect.anything(),
    );
    expect(state.kioskPicks).toHaveLength(0);
  });
});
