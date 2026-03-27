import { createServerClient } from '@/firebase/server-client';
import {
  buildIntegrationStatusSummaryForOrg,
  resolveIntegrationStatusesForOrg,
} from '@/server/services/org-integration-status';

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

type FirestoreMockOptions = {
  brandPosConfig?: Record<string, unknown> | null;
  locationPosConfig?: Record<string, unknown> | null;
  posIntegration?: Record<string, unknown> | null;
};

function buildFirestoreMock(options: FirestoreMockOptions) {
  return {
    collection: jest.fn((collectionName: string) => {
      if (collectionName === 'brands') {
        return {
          doc: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({
              exists: Boolean(options.brandPosConfig),
              data: () => ({ posConfig: options.brandPosConfig }),
            }),
          })),
        };
      }

      if (collectionName === 'locations') {
        return {
          where: jest.fn((field: string) => ({
            limit: jest.fn(() => ({
              get: jest.fn().mockResolvedValue(
                field === 'orgId' && options.locationPosConfig
                  ? {
                      empty: false,
                      docs: [{ data: () => ({ posConfig: options.locationPosConfig }) }],
                    }
                  : {
                      empty: true,
                      docs: [],
                    }
              ),
            })),
          })),
        };
      }

      if (collectionName === 'tenants') {
        return {
          doc: jest.fn(() => ({
            collection: jest.fn(() => ({
              doc: jest.fn(() => ({
                get: jest.fn().mockResolvedValue({
                  exists: Boolean(options.posIntegration),
                  data: () => options.posIntegration,
                }),
              })),
            })),
          })),
        };
      }

      throw new Error(`Unexpected collection: ${collectionName}`);
    }),
  };
}

describe('resolveIntegrationStatusesForOrg', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks Alleaves as active when the org has an active Alleaves POS config', async () => {
    const firestore = buildFirestoreMock({
      locationPosConfig: {
        provider: 'alleaves',
        status: 'active',
      },
      posIntegration: {
        status: 'active',
        lastSyncAt: {
          toDate: () => new Date('2026-03-26T12:00:00.000Z'),
        },
      },
    });

    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const integrations = await resolveIntegrationStatusesForOrg('org_thrive_syracuse');
    const alleaves = integrations.find((integration) => integration.id === 'alleaves');
    const dutchie = integrations.find((integration) => integration.id === 'dutchie');

    expect(alleaves).toBeDefined();
    expect(alleaves?.status).toBe('active');
    expect(alleaves?.description).toContain('menu, orders, and customer records');
    expect(alleaves?.description).toContain('2026-03-26T12:00:00.000Z');
    expect(dutchie?.status).toBe('not_configured');
  });

  it('builds an integration summary that reflects the tenant-specific POS provider', async () => {
    const firestore = buildFirestoreMock({
      locationPosConfig: {
        provider: 'alleaves',
        status: 'active',
      },
    });

    (createServerClient as jest.Mock).mockResolvedValue({ firestore });

    const summary = await buildIntegrationStatusSummaryForOrg('org_thrive_syracuse');

    expect(summary).toContain('Alleaves POS');
    expect(summary).toContain('customer records');
    expect(summary).toMatch(/\*\*ACTIVE INTEGRATIONS:\*\*[\s\S]*Alleaves POS/);
  });
});
