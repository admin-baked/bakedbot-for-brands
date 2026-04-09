import { getAdminFirestore } from '@/firebase/admin';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import {
  getCustomerOnboardingStatusSummary,
  handleCustomerOnboardingSignal,
} from '../customer-onboarding';
import {
  getWelcomeAutomationState,
  syncCustomerOnboardingRunGap,
} from '../customer-signup-proactive';
import { queueReturningWelcomeEmail } from '../mrs-parker-returning';
import { sendWelcomeEmail } from '../mrs-parker-welcome';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/email/dispatcher', () => ({
  sendGenericEmail: jest.fn(),
}));

jest.mock('../customer-signup-proactive', () => ({
  getWelcomeAutomationState: jest.fn(),
  syncCustomerOnboardingRunGap: jest.fn(),
}));

jest.mock('../mrs-parker-returning', () => ({
  queueReturningWelcomeEmail: jest.fn(),
}));

jest.mock('../mrs-parker-welcome', () => ({
  sendWelcomeEmail: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type CollectionName = 'checkin_visits' | 'customer_onboarding_runs' | 'customer_communications';

function getNestedFieldValue(data: Record<string, unknown>, field: string): unknown {
  return field.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, data);
}

function mergeRecords(
  current: Record<string, unknown>,
  updates: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...current };

  for (const [key, value] of Object.entries(updates)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      current[key] &&
      typeof current[key] === 'object' &&
      !Array.isArray(current[key]) &&
      !(current[key] instanceof Date)
    ) {
      next[key] = mergeRecords(
        current[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      next[key] = value;
    }
  }

  return next;
}

function createFirestore(args?: {
  visits?: Record<string, Record<string, unknown>>;
  runs?: Record<string, Record<string, unknown>>;
  communications?: Record<string, Record<string, unknown>>;
}) {
  const visits = new Map<string, Record<string, unknown>>(Object.entries(args?.visits ?? {}));
  const runs = new Map<string, Record<string, unknown>>(Object.entries(args?.runs ?? {}));
  const communications = new Map<string, Record<string, unknown>>(Object.entries(args?.communications ?? {}));

  const getStore = (name: CollectionName) => {
    if (name === 'checkin_visits') return visits;
    if (name === 'customer_onboarding_runs') return runs;
    return communications;
  };

  const makeDocRef = (collectionName: CollectionName, id: string) => ({
    id,
    get: jest.fn(async () => {
      const data = getStore(collectionName).get(id);
      return {
        id,
        exists: data !== undefined,
        data: () => data,
      };
    }),
    set: jest.fn(async (data: Record<string, unknown>, options?: { merge?: boolean }) => {
      const current = getStore(collectionName).get(id) ?? {};
      getStore(collectionName).set(id, options?.merge ? mergeRecords(current, data) : data);
    }),
  });

  const makeQueryDoc = (collectionName: CollectionName, id: string, data: Record<string, unknown>) => ({
    id,
    data: () => data,
    ref: makeDocRef(collectionName, id),
  });

  const makeQuery = (
    collectionName: CollectionName,
    conditions: Array<{ field: string; operator: string; value: unknown }> = [],
  ) => ({
    where: (field: string, operator: string, value: unknown) => makeQuery(collectionName, [...conditions, { field, operator, value }]),
    limit: (count: number) => ({
      get: jest.fn(async () => {
        const docs = Array.from(getStore(collectionName).entries())
          .filter(([, data]) => conditions.every((condition) => {
            const fieldValue = getNestedFieldValue(data, condition.field);
            if (condition.operator === '==') return fieldValue === condition.value;
            if (condition.operator === '>=') return fieldValue instanceof Date && condition.value instanceof Date && fieldValue >= condition.value;
            if (condition.operator === '<=') return fieldValue instanceof Date && condition.value instanceof Date && fieldValue <= condition.value;
            return false;
          }))
          .slice(0, count)
          .map(([id, data]) => makeQueryDoc(collectionName, id, data));

        return { empty: docs.length === 0, docs, size: docs.length };
      }),
    }),
    get: jest.fn(async () => {
      const docs = Array.from(getStore(collectionName).entries())
        .filter(([, data]) => conditions.every((condition) => {
          const fieldValue = getNestedFieldValue(data, condition.field);
          if (condition.operator === '==') return fieldValue === condition.value;
          if (condition.operator === '>=') return fieldValue instanceof Date && condition.value instanceof Date && fieldValue >= condition.value;
          if (condition.operator === '<=') return fieldValue instanceof Date && condition.value instanceof Date && fieldValue <= condition.value;
          return false;
        }))
        .map(([id, data]) => makeQueryDoc(collectionName, id, data));

      return { empty: docs.length === 0, docs, size: docs.length };
    }),
  });

  const firestore = {
    collection: jest.fn((name: string) => {
      if (name === 'checkin_visits' || name === 'customer_onboarding_runs' || name === 'customer_communications') {
        return {
          doc: (id: string) => makeDocRef(name, id),
          where: (field: string, operator: string, value: unknown) => makeQuery(name, [{ field, operator, value }]),
          get: jest.fn(async () => {
            const docs = Array.from(getStore(name).entries()).map(([id, data]) => makeQueryDoc(name, id, data));
            return { empty: docs.length === 0, docs, size: docs.length };
          }),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return { firestore, visits, runs, communications };
}

describe('customer onboarding orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(Date.parse('2026-04-08T15:00:00.000Z'));
    (getWelcomeAutomationState as jest.Mock).mockResolvedValue({ state: 'active' });
    (sendWelcomeEmail as jest.Mock).mockResolvedValue({ success: true });
    (sendGenericEmail as jest.Mock).mockResolvedValue({ success: true });
    (queueReturningWelcomeEmail as jest.Mock).mockResolvedValue({ success: true, jobId: 'job_1' });
    (syncCustomerOnboardingRunGap as jest.Mock).mockResolvedValue({ success: true, taskId: 'task_1' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sends welcome + checkout, then finishes on the day-3 review tick without creating a task', async () => {
    const state = createFirestore({
      visits: {
        visit_1: {
          visitId: 'visit_1',
          orgId: 'org_thrive_syracuse',
          customerId: 'customer_1',
          firstName: 'Jane',
          email: 'jane@example.com',
          emailConsent: true,
          smsConsent: true,
          isReturning: false,
          source: 'loyalty_tablet_checkin',
          reviewSequence: {
            reviewLeft: false,
          },
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const captureResult = await handleCustomerOnboardingSignal({
      type: 'tablet_checkin_captured',
      context: {
        orgId: 'org_thrive_syracuse',
        customerId: 'customer_1',
        visitId: 'visit_1',
        leadId: 'lead_1',
        firstName: 'Jane',
        email: 'jane@example.com',
        emailConsent: true,
        smsConsent: true,
        isReturning: false,
        source: 'loyalty_tablet_checkin',
      },
    });

    expect(captureResult).toMatchObject({ success: true, status: 'scheduled' });
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(sendGenericEmail).toHaveBeenCalledTimes(1);
    expect(syncCustomerOnboardingRunGap).not.toHaveBeenCalled();

    await handleCustomerOnboardingSignal({ type: 'review_sequence_tick', runId: 'visit_1' });
    expect(sendGenericEmail).toHaveBeenCalledTimes(1);

    jest.setSystemTime(Date.parse('2026-04-12T16:00:00.000Z'));
    const reviewResult = await handleCustomerOnboardingSignal({ type: 'review_sequence_tick', runId: 'visit_1' });

    expect(reviewResult).toMatchObject({ success: true, status: 'completed' });
    expect(sendGenericEmail).toHaveBeenCalledTimes(2);
    expect(state.runs.get('visit_1')).toMatchObject({
      status: 'completed',
      proactiveTaskId: null,
      steps: {
        welcome: expect.objectContaining({ status: 'succeeded' }),
        checkoutEmail: expect.objectContaining({ status: 'succeeded' }),
        reviewNudge: expect.objectContaining({ status: 'succeeded' }),
      },
    });
  });

  it('blocks the run and creates an operator task when email is missing', async () => {
    const state = createFirestore({
      visits: {
        visit_2: {
          visitId: 'visit_2',
          orgId: 'org_thrive_syracuse',
          customerId: 'customer_2',
          firstName: 'Alex',
          email: null,
          emailConsent: false,
          smsConsent: true,
          isReturning: false,
          source: 'loyalty_tablet_checkin',
          reviewSequence: {
            reviewLeft: false,
          },
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const result = await handleCustomerOnboardingSignal({
      type: 'tablet_checkin_captured',
      context: {
        orgId: 'org_thrive_syracuse',
        customerId: 'customer_2',
        visitId: 'visit_2',
        firstName: 'Alex',
        email: null,
        emailConsent: false,
        smsConsent: true,
        isReturning: false,
        source: 'loyalty_tablet_checkin',
      },
    });

    expect(result).toMatchObject({ success: true, status: 'blocked' });
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(sendGenericEmail).not.toHaveBeenCalled();
    expect(syncCustomerOnboardingRunGap).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'visit_2',
      blockedReason: 'missing_email',
    }));
    expect(state.runs.get('visit_2')).toMatchObject({
      status: 'blocked',
      blockedReason: 'missing_email',
      proactiveTaskId: 'task_1',
    });
  });

  it.each([
    ['paused'],
    ['unassigned'],
    ['missing'],
  ])('keeps checkout running while flagging the welcome automation gap when automation is %s', async (automationState) => {
    const state = createFirestore({
      visits: {
        visit_3: {
          visitId: 'visit_3',
          orgId: 'org_thrive_syracuse',
          customerId: 'customer_3',
          firstName: 'Jamie',
          email: 'jamie@example.com',
          emailConsent: true,
          smsConsent: true,
          isReturning: false,
          source: 'loyalty_tablet_checkin',
          reviewSequence: {
            reviewLeft: false,
          },
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (getWelcomeAutomationState as jest.Mock).mockResolvedValue({ state: automationState });

    const result = await handleCustomerOnboardingSignal({
      type: 'tablet_checkin_captured',
      context: {
        orgId: 'org_thrive_syracuse',
        customerId: 'customer_3',
        visitId: 'visit_3',
        firstName: 'Jamie',
        email: 'jamie@example.com',
        emailConsent: true,
        smsConsent: true,
        isReturning: false,
        source: 'loyalty_tablet_checkin',
      },
    });

    expect(result).toMatchObject({ success: true, status: 'blocked' });
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(sendGenericEmail).toHaveBeenCalledTimes(1);
    expect(syncCustomerOnboardingRunGap).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'visit_3',
      blockedReason: `welcome_automation_${automationState}`,
    }));
  });

  it('dedupes the returning welcome queue to once per customer per day', async () => {
    const state = createFirestore({
      visits: {
        visit_4: {
          visitId: 'visit_4',
          orgId: 'org_thrive_syracuse',
          customerId: 'customer_4',
          firstName: 'Morgan',
          email: 'morgan@example.com',
          emailConsent: true,
          smsConsent: true,
          isReturning: true,
          source: 'loyalty_tablet_checkin',
          reviewSequence: {
            reviewLeft: false,
          },
        },
      },
      communications: {
        comm_1: {
          customerId: 'customer_4',
          type: 'returning_welcome_email',
          sentAt: new Date('2026-04-08T10:00:00.000Z'),
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const result = await handleCustomerOnboardingSignal({
      type: 'tablet_checkin_captured',
      context: {
        orgId: 'org_thrive_syracuse',
        customerId: 'customer_4',
        visitId: 'visit_4',
        firstName: 'Morgan',
        email: 'morgan@example.com',
        emailConsent: true,
        smsConsent: true,
        isReturning: true,
        source: 'loyalty_tablet_checkin',
      },
    });

    expect(result.success).toBe(true);
    expect(queueReturningWelcomeEmail).not.toHaveBeenCalled();
    expect(state.runs.get('visit_4')).toMatchObject({
      steps: {
        returningWelcome: expect.objectContaining({ status: 'succeeded' }),
      },
    });
  });

  it('writes failed delivery state, creates a task, and reflects it in the summary', async () => {
    const state = createFirestore({
      visits: {
        visit_5: {
          visitId: 'visit_5',
          orgId: 'org_thrive_syracuse',
          customerId: 'customer_5',
          firstName: 'Taylor',
          email: 'taylor@example.com',
          emailConsent: true,
          smsConsent: true,
          isReturning: false,
          source: 'loyalty_tablet_checkin',
          reviewSequence: {
            reviewLeft: false,
          },
        },
      },
    });
    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (sendGenericEmail as jest.Mock).mockResolvedValueOnce({ success: false, error: 'smtp_down' });

    const result = await handleCustomerOnboardingSignal({
      type: 'tablet_checkin_captured',
      context: {
        orgId: 'org_thrive_syracuse',
        customerId: 'customer_5',
        visitId: 'visit_5',
        firstName: 'Taylor',
        email: 'taylor@example.com',
        emailConsent: true,
        smsConsent: true,
        isReturning: false,
        source: 'loyalty_tablet_checkin',
      },
    });

    expect(result).toMatchObject({ success: true, status: 'failed' });
    expect(syncCustomerOnboardingRunGap).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'visit_5',
      blockedReason: 'delivery_failed',
    }));

    const summary = await getCustomerOnboardingStatusSummary('org_thrive_syracuse');
    expect(summary).toMatchObject({
      failed: 1,
      blocked: 0,
    });
  });
});
