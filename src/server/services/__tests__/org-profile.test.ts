import { getOrgProfileFromLegacy } from '../org-profile';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../intent-profile', () => ({
  getDefaultProfile: jest.fn().mockReturnValue({
    strategicFoundation: {
      archetype: 'community_hub',
      weightedObjectives: [],
    },
    valueHierarchies: {},
    agentConfigs: {},
    hardBoundaries: {},
    feedbackConfig: {},
  }),
}));

const mockGet = jest.fn();

const { getAdminFirestore } = require('@/firebase/admin');

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReset();
  (getAdminFirestore as jest.Mock).mockReturnValue({
    collection: jest.fn((name: string) => ({
      doc: jest.fn(() => ({
        get: () => mockGet(name),
      })),
    })),
  });
});

describe('getOrgProfileFromLegacy', () => {
  it('builds a minimal org profile from tenants when brand docs are missing', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'brands') {
        return Promise.resolve({ exists: false });
      }
      if (name === 'org_intent_profiles') {
        return Promise.resolve({ exists: false });
      }
      if (name === 'tenants') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            name: 'Thrive Syracuse',
            city: 'Syracuse',
            state: 'NY',
            type: 'dispensary',
            websiteUrl: 'https://thrivesyracuse.example',
          }),
        });
      }
      return Promise.resolve({ exists: false });
    });

    const profile = await getOrgProfileFromLegacy('org_thrive_syracuse');

    expect(profile).not.toBeNull();
    expect(profile?.brand.name).toBe('Thrive Syracuse');
    expect(profile?.brand.city).toBe('Syracuse');
    expect(profile?.brand.state).toBe('NY');
    expect(profile?.brand.organizationType).toBe('dispensary');
    expect(profile?.brand.businessModel).toBe('retail');
    expect(profile?.brand.websiteUrl).toBe('https://thrivesyracuse.example');
  });
});
