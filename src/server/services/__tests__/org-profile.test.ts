import {
  buildEzalContextBlock,
  getOrgProfile,
  getOrgProfileFromLegacy,
} from '../org-profile';

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
      growthStage: 'growth',
      competitivePosture: 'defensive',
      geographicStrategy: 'hyperlocal',
      weightedObjectives: [],
    },
    valueHierarchies: {
      speedVsEducation: 0.5,
      volumeVsMargin: 0.3,
      acquisitionVsRetention: 0.4,
      complianceConservatism: 0.6,
      automationVsHumanTouch: 0.7,
      brandVoiceFormality: 0.2,
    },
    agentConfigs: {
      smokey: {
        recommendationPhilosophy: 'effect_first',
        upsellAggressiveness: 0.5,
        newUserProtocol: 'guided',
        productEducationDepth: 'moderate',
      },
      craig: {
        campaignFrequencyCap: 3,
        preferredChannels: ['sms', 'email'],
        toneArchetype: 'hero',
        promotionStrategy: 'value_led',
      },
    },
    hardBoundaries: { neverDoList: [], escalationTriggers: [] },
    feedbackConfig: {
      captureNegativeFeedback: true,
      requestExplicitFeedback: false,
      minimumInteractionsForAdjustment: 50,
    },
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

describe('getOrgProfile', () => {
  it('normalizes partial org_profiles documents before agents consume them', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'org_profiles') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            id: 'org_thrive_syracuse',
            orgId: 'org_thrive_syracuse',
            version: '1.0.0',
            isDefault: false,
            completionPct: 12,
            lastModifiedBy: 'user_123',
            createdAt: '2026-04-18T12:00:00.000Z',
            updatedAt: '2026-04-18T12:05:00.000Z',
            brand: {
              name: 'Thrive Syracuse',
            },
            intent: {},
          }),
        });
      }
      return Promise.resolve({ exists: false });
    });

    const profile = await getOrgProfile('org_thrive_syracuse');

    expect(profile).not.toBeNull();
    expect(profile?.intent.strategicFoundation.archetype).toBe('community_hub');
    expect(profile?.intent.agentConfigs.smokey.recommendationPhilosophy).toBe('effect_first');
    expect(profile?.intent.hardBoundaries.neverDoList).toEqual([]);
    expect(() => buildEzalContextBlock(profile!)).not.toThrow();
    expect(buildEzalContextBlock(profile!)).toContain('Organization: Thrive Syracuse');
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

  it('fills missing legacy intent fields from defaults when only strategic foundation exists', async () => {
    mockGet.mockImplementation((name: string) => {
      if (name === 'brands') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            brandName: 'Thrive Syracuse',
          }),
        });
      }
      if (name === 'org_intent_profiles') {
        return Promise.resolve({
          exists: true,
          data: () => ({
            strategicFoundation: {
              archetype: 'community_hub',
              growthStage: 'growth',
              competitivePosture: 'defensive',
              geographicStrategy: 'hyperlocal',
              weightedObjectives: [{ objective: 'improve_retention', weight: 1 }],
            },
          }),
        });
      }
      if (name === 'tenants') {
        return Promise.resolve({ exists: false });
      }
      return Promise.resolve({ exists: false });
    });

    const profile = await getOrgProfileFromLegacy('org_thrive_syracuse');

    expect(profile).not.toBeNull();
    expect(profile?.intent.valueHierarchies.complianceConservatism).toBe(0.6);
    expect(profile?.intent.agentConfigs.craig.promotionStrategy).toBe('value_led');
    expect(() => buildEzalContextBlock(profile!)).not.toThrow();
  });
});
