import { getAdminFirestore } from '@/firebase/admin';
import {
  activateCompetitiveIntelDelivery,
  getCompetitiveIntelActivationRun,
  maybeSendCompetitiveIntelSlackDigest,
} from '../competitive-intel-activation';
import { autoSetupCompetitors } from '../auto-competitor';
import { elroySlackService, SlackService } from '../communications/slack';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('../auto-competitor', () => ({
  autoSetupCompetitors: jest.fn(),
}));

jest.mock('../communications/slack', () => {
  class MockSlackService {
    static formatAgentResponse = jest.fn(() => [{ type: 'section' }]);
  }

  return {
    SlackService: MockSlackService,
    elroySlackService: {
      postMessage: jest.fn(),
    },
  };
});

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

type DocRecord = Record<string, unknown>;

function createDocSnapshot(id: string, data: DocRecord | undefined) {
  return {
    id,
    exists: data !== undefined,
    data: () => data,
  };
}

function createQuerySnapshot(entries: Array<{ id: string; data: DocRecord }>) {
  return {
    empty: entries.length === 0,
    size: entries.length,
    docs: entries.map((entry) => ({
      id: entry.id,
      data: () => entry.data,
    })),
  };
}

function createFirestoreState(args?: {
  organizations?: Record<string, DocRecord>;
  tenants?: Record<string, DocRecord>;
  users?: Record<string, DocRecord>;
  locations?: Record<string, DocRecord>;
  brands?: Record<string, DocRecord>;
  tenantCompetitors?: Record<string, Array<{ id: string; data: DocRecord }>>;
  orgCompetitors?: Record<string, Array<{ id: string; data: DocRecord }>>;
  activationRuns?: Record<string, DocRecord>;
}) {
  const organizations = new Map(Object.entries(args?.organizations ?? {}));
  const tenants = new Map(Object.entries(args?.tenants ?? {}));
  const users = new Map(Object.entries(args?.users ?? {}));
  const locations = new Map(Object.entries(args?.locations ?? {}));
  const brands = new Map(Object.entries(args?.brands ?? {}));
  const activationRuns = new Map(Object.entries(args?.activationRuns ?? {}));
  const tenantCompetitors = new Map(
    Object.entries(args?.tenantCompetitors ?? {}),
  );
  const orgCompetitors = new Map(
    Object.entries(args?.orgCompetitors ?? {}),
  );

  const firestore = {
    collection: jest.fn((name: string) => {
      if (name === 'competitive_intel_activation_runs') {
        return {
          doc: (id: string) => ({
            get: jest.fn(async () => createDocSnapshot(id, activationRuns.get(id))),
            set: jest.fn(async (data: DocRecord, options?: { merge?: boolean }) => {
              const current = activationRuns.get(id) ?? {};
              activationRuns.set(id, options?.merge ? { ...current, ...data } : data);
            }),
          }),
        };
      }

      if (name === 'organizations') {
        return {
          doc: (id: string) => ({
            get: jest.fn(async () => createDocSnapshot(id, organizations.get(id))),
            collection: jest.fn((child: string) => {
              if (child !== 'competitors') {
                throw new Error(`Unexpected organizations child collection: ${child}`);
              }

              const docs = orgCompetitors.get(id) ?? [];
              return {
                get: jest.fn(async () => createQuerySnapshot(docs)),
              };
            }),
          }),
        };
      }

      if (name === 'tenants') {
        return {
          doc: (id: string) => ({
            get: jest.fn(async () => createDocSnapshot(id, tenants.get(id))),
            collection: jest.fn((child: string) => {
              if (child !== 'competitors') {
                throw new Error(`Unexpected tenants child collection: ${child}`);
              }

              const docs = tenantCompetitors.get(id) ?? [];
              return {
                where: jest.fn(() => ({
                  get: jest.fn(async () => createQuerySnapshot(docs)),
                })),
              };
            }),
          }),
        };
      }

      if (name === 'users') {
        return {
          where: jest.fn((field: string, _op: string, value: string) => ({
            limit: jest.fn(() => ({
              get: jest.fn(async () => createQuerySnapshot(
                Array.from(users.entries())
                  .filter(([, data]) => data[field] === value)
                  .map(([id, data]) => ({ id, data })),
              )),
            })),
          })),
          doc: (id: string) => ({
            get: jest.fn(async () => createDocSnapshot(id, users.get(id))),
          }),
        };
      }

      if (name === 'locations') {
        return {
          where: jest.fn((field: string, _op: string, value: string) => ({
            limit: jest.fn(() => ({
              get: jest.fn(async () => createQuerySnapshot(
                Array.from(locations.entries())
                  .filter(([, data]) => data[field] === value)
                  .map(([id, data]) => ({ id, data }))
                  .slice(0, 1),
              )),
            })),
          })),
        };
      }

      if (name === 'brands') {
        return {
          doc: (id: string) => ({
            get: jest.fn(async () => createDocSnapshot(id, brands.get(id))),
          }),
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    }),
  };

  return {
    firestore,
    activationRuns,
    tenantCompetitors,
  };
}

describe('competitive intel activation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(Date.parse('2026-04-08T22:30:00.000Z'));
    (SlackService.formatAgentResponse as jest.Mock).mockReturnValue([{ type: 'section' }]);
    (elroySlackService.postMessage as jest.Mock).mockResolvedValue({ sent: true, ts: '12345.678' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('activates Thrive delivery, auto-discovers competitors, and enables Uncle Elroy Slack', async () => {
    const state = createFirestoreState({
      organizations: {
        org_thrive_syracuse: {
          ownerId: 'user_1',
          zipCode: '13224',
        },
      },
      users: {
        user_1: {
          orgId: 'org_thrive_syracuse',
          email: 'owner@thrive.com',
          role: 'dispensary_owner',
        },
      },
      tenantCompetitors: {
        org_thrive_syracuse: [],
      },
      orgCompetitors: {
        org_thrive_syracuse: [],
      },
    });

    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    (autoSetupCompetitors as jest.Mock).mockImplementation(async (orgId: string) => {
      state.tenantCompetitors.set(orgId, [
        {
          id: 'comp_1',
          data: {
            name: 'FlynnStoned',
            city: 'Syracuse',
            state: 'NY',
            active: true,
          },
        },
      ]);

      return {
        success: true,
        competitors: [{ id: 'comp_1', name: 'FlynnStoned' }],
      };
    });

    const result = await activateCompetitiveIntelDelivery('org_thrive_syracuse', {
      entryPoint: 'competitive_intel_page',
    });

    expect(result.autoDiscovered).toBe(1);
    expect(result.run.competitorCount).toBe(1);
    expect(result.run.steps.report.enabled).toBe(true);
    expect(result.run.steps.email.enabled).toBe(true);
    expect(result.run.steps.slack.enabled).toBe(true);
    expect(result.run.steps.slack.target).toBe('#thrive-syracuse-pilot');
    expect(result.run.status).toBe('pending');
  });

  it('marks email delivery blocked when no admin email exists', async () => {
    const state = createFirestoreState({
      organizations: {
        org_test: {
          zipCode: '13224',
        },
      },
      tenantCompetitors: {
        org_test: [
          {
            id: 'comp_1',
            data: {
              name: 'Competitor',
              city: 'Syracuse',
              state: 'NY',
              active: true,
            },
          },
        ],
      },
      orgCompetitors: {
        org_test: [],
      },
    });

    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);

    const run = await getCompetitiveIntelActivationRun('org_test');

    expect(run.steps.email.status).toBe('pending');

    const activated = await activateCompetitiveIntelDelivery('org_test', {
      entryPoint: 'setup_checklist',
    });

    expect(activated.run.steps.email.status).toBe('blocked');
    expect(activated.run.steps.email.blockedReason).toBe('missing_admin_email');
    expect(activated.run.status).toBe('blocked');
  });

  it('posts the latest report to Slack through Uncle Elroy once activation is enabled', async () => {
    const state = createFirestoreState({
      organizations: {
        org_thrive_syracuse: {
          ownerId: 'user_1',
          zipCode: '13224',
        },
      },
      users: {
        user_1: {
          orgId: 'org_thrive_syracuse',
          email: 'owner@thrive.com',
          role: 'dispensary_owner',
        },
      },
      tenantCompetitors: {
        org_thrive_syracuse: [
          {
            id: 'comp_1',
            data: {
              name: 'FlynnStoned',
              city: 'Syracuse',
              state: 'NY',
              active: true,
            },
          },
        ],
      },
      orgCompetitors: {
        org_thrive_syracuse: [],
      },
    });

    (getAdminFirestore as jest.Mock).mockReturnValue(state.firestore);
    await activateCompetitiveIntelDelivery('org_thrive_syracuse', {
      entryPoint: 'competitive_intel_page',
    });

    const result = await maybeSendCompetitiveIntelSlackDigest({
      orgId: 'org_thrive_syracuse',
      reportId: 'report_1',
      report: {
        generatedAt: new Date('2026-04-08T22:30:00.000Z'),
        insights: {
          marketTrends: ['FlynnStoned is leaning harder into vape discounts.'],
          recommendations: ['Review premium vape pricing before open.'],
          topDeals: [
            {
              competitorName: 'FlynnStoned',
              dealName: 'Vape Cart Special',
              price: 30,
            },
          ],
        },
        competitors: [
          {
            competitorName: 'FlynnStoned',
            dealCount: 12,
            priceStrategy: 'discount',
          },
        ],
      },
    });

    expect(result.sent).toBe(true);
    expect(elroySlackService.postMessage).toHaveBeenCalledWith(
      '#thrive-syracuse-pilot',
      expect.stringContaining('[DAILY INTEL]'),
      [{ type: 'section' }],
    );

    const run = await getCompetitiveIntelActivationRun('org_thrive_syracuse');
    expect(run.steps.slack.status).toBe('active');
    expect(run.steps.slack.lastReportId).toBe('report_1');
  });
});
