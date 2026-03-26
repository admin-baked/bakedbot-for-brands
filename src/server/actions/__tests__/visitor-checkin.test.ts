import { captureVisitorCheckin } from '../visitor-checkin';
import { getAdminFirestore } from '@/firebase/admin';
import { captureEmailLead } from '../email-capture';
import { dispatchPlaybookEvent } from '@/server/services/playbook-event-dispatcher';
import { logger } from '@/lib/logger';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('../email-capture', () => ({
  captureEmailLead: jest.fn(),
}));

jest.mock('@/server/services/playbook-event-dispatcher', () => ({
  dispatchPlaybookEvent: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type CollectionName = 'customers' | 'checkin_visits';

function createFirestore(initialCustomers: Record<string, Record<string, unknown>> = {}) {
  const customers = new Map<string, Record<string, unknown>>(Object.entries(initialCustomers));
  const visits = new Map<string, Record<string, unknown>>();

  const getStore = (collectionName: CollectionName) =>
    collectionName === 'customers' ? customers : visits;

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
  });

  const makeQueryDoc = (collectionName: CollectionName, id: string, data: Record<string, unknown>) => ({
    id,
    data: () => data,
    ref: makeDocRef(collectionName, id),
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

  const firestore = {
    batch: jest.fn(() => batch),
    collection: jest.fn((name: string) => {
      if (name === 'customers') {
        return {
          doc: (id: string) => makeDocRef('customers', id),
          where: (field: 'phone' | 'email', _operator: string, value: string) => ({
            limit: () => ({
              get: jest.fn(async () => {
                const docs = Array.from(customers.entries())
                  .filter(([, data]) => data[field] === value)
                  .map(([id, data]) => makeQueryDoc('customers', id, data));
                return { empty: docs.length === 0, docs };
              }),
            }),
          }),
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

  return { firestore, customers, visits, batch };
}

describe('captureVisitorCheckin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-26T15:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a new phone-first customer, visit, and signup dispatch for rewards check-in', async () => {
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
    });

    expect(result).toMatchObject({
      success: true,
      isNewLead: true,
      isReturningCustomer: false,
      customerId: 'org_thrive_syracuse_phone_13155551212',
      leadId: 'lead-1',
    });
    expect(captureEmailLead).toHaveBeenCalledWith(expect.objectContaining({
      phone: '+13155551212',
      email: 'jane@example.com',
      source: 'brand_rewards_checkin',
    }));
    expect(state.customers.get('org_thrive_syracuse_phone_13155551212')).toMatchObject({
      firstName: 'Jane',
      email: 'jane@example.com',
      phone: '+13155551212',
      source: 'brand_rewards_checkin',
      emailConsent: true,
      smsConsent: true,
    });

    const visit = Array.from(state.visits.values())[0];
    expect(visit).toMatchObject({
      orgId: 'org_thrive_syracuse',
      customerId: 'org_thrive_syracuse_phone_13155551212',
      leadId: 'lead-1',
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
      reviewSequence: expect.objectContaining({
        status: 'pending',
      }),
    });
    expect(dispatchPlaybookEvent).toHaveBeenCalledWith(
      'org_thrive_syracuse',
      'customer.signup',
      expect.objectContaining({
        customerId: 'org_thrive_syracuse_phone_13155551212',
        customerEmail: 'jane@example.com',
        customerPhone: '+13155551212',
        leadId: 'lead-1',
      }),
    );
  });

  it('reuses an existing customer by normalized phone and does not dispatch signup again', async () => {
    const state = createFirestore({
      customer_1: {
        orgId: 'org_thrive_syracuse',
        firstName: 'Jane',
        phone: '+13155551212',
        emailConsent: false,
        smsConsent: false,
        source: 'pos',
        points: 42,
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-1',
      isNewLead: false,
    });

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Jane',
      phone: '315-555-1212',
      emailConsent: false,
      smsConsent: true,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
    });

    expect(result).toMatchObject({
      success: true,
      isNewLead: false,
      isReturningCustomer: true,
      customerId: 'customer_1',
      loyaltyPoints: 42,
    });
    expect(state.customers.get('customer_1')).toMatchObject({
      source: 'pos',
      smsConsent: true,
      phone: '+13155551212',
    });
    expect(dispatchPlaybookEvent).not.toHaveBeenCalled();
  });

  it('falls back to an email-matched legacy customer and fills in the normalized phone', async () => {
    const state = createFirestore({
      legacy_customer: {
        orgId: 'org_thrive_syracuse',
        firstName: null,
        email: 'legacy@example.com',
        phone: null,
        emailConsent: false,
        smsConsent: false,
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
      firstName: 'Legacy',
      phone: '(315) 555-1212',
      email: 'legacy@example.com',
      emailConsent: true,
      smsConsent: false,
      source: 'brand_rewards_checkin',
      ageVerifiedMethod: 'staff_attested_public_flow',
    });

    expect(result).toMatchObject({
      success: true,
      customerId: 'legacy_customer',
      isReturningCustomer: true,
    });
    expect(state.customers.get('legacy_customer')).toMatchObject({
      firstName: 'Legacy',
      email: 'legacy@example.com',
      phone: '+13155551212',
      emailConsent: true,
      source: 'brand_rewards_checkin',
    });
  });

  it('marks review follow-up as skipped when no email is captured', async () => {
    const state = createFirestore();
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (captureEmailLead as jest.Mock).mockResolvedValue({
      success: true,
      leadId: 'lead-3',
      isNewLead: true,
    });
    (dispatchPlaybookEvent as jest.Mock).mockResolvedValue(undefined);

    const result = await captureVisitorCheckin({
      orgId: 'org_thrive_syracuse',
      firstName: 'Pat',
      phone: '3155550000',
      emailConsent: false,
      smsConsent: true,
      source: 'loyalty_tablet_checkin',
      ageVerifiedMethod: 'staff_visual_check',
    });

    expect(result.followupEligibility).toEqual({
      emailWelcome: false,
      smsWelcome: true,
      reviewSequence: false,
    });
    const visit = Array.from(state.visits.values())[0];
    expect(visit.reviewSequence.status).toBe('skipped_no_email');
  });

  it('logs dispatch failures without failing the captured visit', async () => {
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
