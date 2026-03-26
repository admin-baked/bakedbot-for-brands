import { getAdminFirestore } from '@/firebase/admin';
import { grantManualAIStudioCredits } from '../ai-studio-billing-service';

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/ai-studio/entitlements', () => ({
  getEffectiveAIStudioEntitlement: jest.fn().mockResolvedValue({
    monthlyCreditsIncluded: 500,
    monthlyAutomationCreditBudget: 200,
    rolloverCapPct: 0.25,
  }),
  canUseAIStudioAction: jest.fn(),
  canRunPlaybookAIAction: jest.fn(),
}));

describe('grantManualAIStudioCredits', () => {
  const cycleKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  let store: Map<string, any>;
  let balanceMutationCount: number;
  let mockDb: any;

  const setDoc = (path: string, data: any, merge?: boolean) => {
    if (path.startsWith('org_ai_studio_balances/')) {
      balanceMutationCount += 1;
    }

    if (merge) {
      const current = store.get(path) || {};
      store.set(path, { ...current, ...data });
      return;
    }

    store.set(path, data);
  };

  const makeDocRef = (collectionName: string, docId: string) => ({
    id: docId,
    _path: `${collectionName}/${docId}`,
    get: jest.fn(async () => {
      const data = store.get(`${collectionName}/${docId}`);
      return {
        exists: data !== undefined,
        data: () => data,
      };
    }),
    set: jest.fn(async (data: any, options?: { merge?: boolean }) => {
      setDoc(`${collectionName}/${docId}`, data, options?.merge);
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    store = new Map();
    balanceMutationCount = 0;

    store.set(`org_ai_studio_balances/org_test-${cycleKey}`, {
      orgId: 'org_test',
      billingCycleKey: cycleKey,
      includedCreditsTotal: 500,
      includedCreditsUsed: 0,
      rolloverCreditsTotal: 0,
      rolloverCreditsUsed: 0,
      topUpCreditsTotal: 0,
      topUpCreditsUsed: 0,
      automationBudgetTotal: 200,
      automationBudgetUsed: 0,
      manualCreditsUsed: 0,
      automationCreditsUsed: 0,
      alertsSent: {},
      cycleStartedAt: Date.now(),
      cycleEndsAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    mockDb = {
      collection: jest.fn((collectionName: string) => ({
        doc: jest.fn((docId: string) => makeDocRef(collectionName, docId)),
      })),
      runTransaction: jest.fn(async (callback: any) =>
        callback({
          get: async (docRef: any) => docRef.get(),
          set: (docRef: any, data: any, options?: { merge?: boolean }) => {
            setDoc(docRef._path, data, options?.merge);
          },
        })
      ),
    };

    (getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
  });

  it('writes a manual purchase record and balance mutation on the first grant', async () => {
    const result = await grantManualAIStudioCredits({
      orgId: 'org_test',
      credits: 150,
      grantKey: 'mcba_power_hour_ama_150',
      purchasedByUserId: 'user_test',
      externalChargeId: 'campaign:mcba_power_hour_ama',
    });

    expect(result).toEqual({
      applied: true,
      duplicate: false,
      purchaseId: 'manual_grant_org_test_mcba_power_hour_ama_150',
    });
    expect(store.get('ai_studio_topup_purchases/manual_grant_org_test_mcba_power_hour_ama_150')).toEqual(
      expect.objectContaining({
        packId: 'manual_grant_mcba_power_hour_ama_150',
        creditsAdded: 150,
        billingProvider: 'manual',
        externalChargeId: 'campaign:mcba_power_hour_ama',
        purchasedByUserId: 'user_test',
      })
    );
    expect(balanceMutationCount).toBe(1);
  });

  it('returns duplicate on the second grant and skips another balance mutation', async () => {
    store.set('ai_studio_topup_purchases/manual_grant_org_test_mcba_power_hour_ama_150', {
      id: 'manual_grant_org_test_mcba_power_hour_ama_150',
      orgId: 'org_test',
    });

    const result = await grantManualAIStudioCredits({
      orgId: 'org_test',
      credits: 150,
      grantKey: 'mcba_power_hour_ama_150',
      purchasedByUserId: 'user_test',
      externalChargeId: 'campaign:mcba_power_hour_ama',
    });

    expect(result).toEqual({
      applied: false,
      duplicate: true,
      purchaseId: 'manual_grant_org_test_mcba_power_hour_ama_150',
    });
    expect(balanceMutationCount).toBe(0);
  });
});
