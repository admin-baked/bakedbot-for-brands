import {
  applyAdvanceToSettlement,
  checkAndActivateAdvance,
  createOffer,
  initiateAdvance,
  updateOffer,
} from '../greenledger';
import { getAdminFirestore } from '@/firebase/admin';
import { createEscrowWallet, getEscrowBalance } from '@/lib/x402/greenledger-escrow';
import { nanoid } from 'nanoid';

const mockCollection = jest.fn();
const mockRunTransaction = jest.fn();

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(() => ({
    collection: mockCollection,
    runTransaction: mockRunTransaction,
  })),
}));

jest.mock('@/lib/x402/greenledger-escrow', () => ({
  createEscrowWallet: jest.fn(),
  getEscrowBalance: jest.fn(),
  refundEscrow: jest.fn(),
}));

jest.mock('@/lib/x402/cdp-wallets', () => ({
  getOrgWallet: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('nanoid', () => ({
  nanoid: jest.fn(),
}));

jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ __serverTimestamp: true })),
    increment: jest.fn((value: number) => ({ __increment: value })),
  },
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
  },
}));

describe('greenledger service hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: mockCollection,
      runTransaction: mockRunTransaction,
    });
    (nanoid as jest.Mock).mockReturnValue('tx-fixed-id');
  });

  it('rejects initiating partners-only offers for non-partners', async () => {
    const offer = {
      id: 'offer-1',
      brandOrgId: 'brand-1',
      status: 'active',
      eligibility: 'partners_only',
      currentCommitmentsUsd: 0,
      tiers: [{ id: 'tier-1', minDepositUsd: 100, discountBps: 1000 }],
    };

    const offerDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => offer,
      }),
    };

    const partnerQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ empty: true }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_offers') {
        return {
          doc: jest.fn(() => offerDoc),
        };
      }
      if (name === 'tenants') {
        return {
          doc: jest.fn(() => ({
            collection: jest.fn(() => partnerQuery),
          })),
        };
      }
      return {};
    });

    await expect(initiateAdvance('disp-1', 'offer-1', 'tier-1')).rejects.toThrow(
      'Offer is only available to existing brand partners',
    );
    expect(createEscrowWallet).not.toHaveBeenCalled();
  });

  it('rejects createOffer when tier discount exceeds 10000 bps', async () => {
    await expect(
      createOffer('brand-1', 'Brand One', {
        description: 'Promo',
        eligibility: 'all',
        tiers: [{ minDepositUsd: 500, discountBps: 10001 }],
      } as any),
    ).rejects.toThrow('Tier 1: discountBps must be between 1 and 10000');

    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('rejects createOffer when eligibility is specific without eligibleOrgIds', async () => {
    await expect(
      createOffer('brand-1', 'Brand One', {
        description: 'Promo',
        eligibility: 'specific',
        tiers: [{ minDepositUsd: 500, discountBps: 800 }],
      } as any),
    ).rejects.toThrow('eligibleOrgIds is required when eligibility is specific');

    expect(mockCollection).not.toHaveBeenCalled();
  });

  it('rejects updateOffer when specific eligibility is set without allowlist', async () => {
    const offerRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ brandOrgId: 'brand-1' }),
      }),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_offers') {
        return {
          doc: jest.fn(() => offerRef),
        };
      }
      return {};
    });

    await expect(
      updateOffer('offer-1', 'brand-1', {
        eligibility: 'specific',
      }),
    ).rejects.toThrow('eligibleOrgIds is required when eligibility is specific');

    expect(offerRef.update).not.toHaveBeenCalled();
  });

  it('rejects updateOffer when maxCommitmentsUsd is non-positive', async () => {
    const offerRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ brandOrgId: 'brand-1' }),
      }),
      update: jest.fn(),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_offers') {
        return {
          doc: jest.fn(() => offerRef),
        };
      }
      return {};
    });

    await expect(
      updateOffer('offer-1', 'brand-1', {
        maxCommitmentsUsd: 0,
      }),
    ).rejects.toThrow('maxCommitmentsUsd must be a positive number');

    expect(offerRef.update).not.toHaveBeenCalled();
  });

  it('rejects initiating allowlisted offers for dispensaries outside the allowlist', async () => {
    const offer = {
      id: 'offer-1',
      brandOrgId: 'brand-1',
      status: 'active',
      eligibility: 'specific',
      eligibleOrgIds: ['disp-2'],
      currentCommitmentsUsd: 0,
      tiers: [{ id: 'tier-1', minDepositUsd: 100, discountBps: 1000 }],
    };

    const offerDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => offer,
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_offers') {
        return {
          doc: jest.fn(() => offerDoc),
        };
      }
      return {};
    });

    await expect(initiateAdvance('disp-1', 'offer-1', 'tier-1')).rejects.toThrow(
      'Offer is not available for this dispensary',
    );
    expect(createEscrowWallet).not.toHaveBeenCalled();
  });

  it('rejects deposit activation when the advance does not belong to the caller org', async () => {
    const advanceRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'adv-1',
          brandOrgId: 'brand-1',
          dispensaryOrgId: 'disp-2',
          offerId: 'offer-1',
          tierId: 'tier-1',
          escrowWalletId: 'escrow-1',
          status: 'pending_deposit',
        }),
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_advances') {
        return {
          doc: jest.fn(() => advanceRef),
        };
      }
      return {};
    });

    await expect(checkAndActivateAdvance('adv-1', 'disp-1')).rejects.toThrow('Access denied');
    expect(getEscrowBalance).not.toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('returns null without writes when settlement deduction exceeds remaining balance', async () => {
    const advanceRef = { path: 'greenledger_advances/adv-1' };
    const advancesQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ ref: advanceRef }],
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_advances') return advancesQuery;
      if (name === 'greenledger_offers') return { doc: jest.fn(() => ({})) };
      if (name === 'greenledger_transactions') return { doc: jest.fn(() => ({})) };
      return {};
    });

    const tx = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'adv-1',
          offerId: 'offer-1',
          status: 'active',
          discountBps: 1000,
          remainingBalanceUsd: 10,
        }),
      }),
      update: jest.fn(),
      set: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (callback: (t: typeof tx) => unknown) => callback(tx));

    const result = await applyAdvanceToSettlement('disp-1', 'brand-1', 100, 'order-1');

    expect(result).toBeNull();
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.set).not.toHaveBeenCalled();
  });

  it('applies settlement in a transaction and decrements offer commitments', async () => {
    const advanceRef = { path: 'greenledger_advances/adv-1' };
    const offerRef = { path: 'greenledger_offers/offer-1' };
    const settlementTxRef = { path: 'greenledger_transactions/tx-fixed-id' };

    const advancesQuery = {
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ ref: advanceRef }],
      }),
    };

    const offersCollection = {
      doc: jest.fn(() => offerRef),
    };

    const txCollection = {
      doc: jest.fn(() => settlementTxRef),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_advances') return advancesQuery;
      if (name === 'greenledger_offers') return offersCollection;
      if (name === 'greenledger_transactions') return txCollection;
      return {};
    });

    const tx = {
      get: jest.fn(async (ref: unknown) => {
        if (ref === advanceRef) {
          return {
            exists: true,
            data: () => ({
              id: 'adv-1',
              offerId: 'offer-1',
              status: 'active',
              discountBps: 1000,
              remainingBalanceUsd: 100,
            }),
          };
        }
        if (ref === offerRef) {
          return {
            exists: true,
            data: () => ({
              currentCommitmentsUsd: 100,
            }),
          };
        }
        return { exists: false, data: () => ({}) };
      }),
      update: jest.fn(),
      set: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (callback: (t: typeof tx) => unknown) => callback(tx));

    const result = await applyAdvanceToSettlement('disp-1', 'brand-1', 50, 'order-1');

    expect(result).toEqual({
      advanceId: 'adv-1',
      discountBps: 1000,
      discountUsd: 5,
      escrowDeductionUsd: 45,
    });
    expect(tx.update).toHaveBeenCalledWith(
      advanceRef,
      expect.objectContaining({
        remainingBalanceUsd: 55,
        status: 'active',
      }),
    );
    expect(tx.update).toHaveBeenCalledWith(
      offerRef,
      expect.objectContaining({
        currentCommitmentsUsd: 55,
      }),
    );
    expect(tx.set).toHaveBeenCalledWith(
      settlementTxRef,
      expect.objectContaining({
        type: 'settlement_deduction',
        amountUsd: 45,
        discountAppliedUsd: 5,
        orderId: 'order-1',
      }),
    );
  });

  it('rejects deposit activation when the selected tier no longer exists on the offer', async () => {
    const advanceRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'adv-1',
          brandOrgId: 'brand-1',
          dispensaryOrgId: 'disp-1',
          offerId: 'offer-1',
          tierId: 'tier-legacy',
          escrowWalletId: 'escrow-1',
          status: 'pending_deposit',
        }),
      }),
    };

    const offerRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'offer-1',
          status: 'active',
          tiers: [{ id: 'tier-current', minDepositUsd: 100, discountBps: 1000 }],
        }),
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_advances') {
        return { doc: jest.fn(() => advanceRef) };
      }
      if (name === 'greenledger_offers') {
        return { doc: jest.fn(() => offerRef) };
      }
      return {};
    });

    await expect(checkAndActivateAdvance('adv-1', 'disp-1')).rejects.toThrow(
      'Tier no longer available on offer',
    );
    expect(getEscrowBalance).not.toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects deposit activation when the offer is no longer active', async () => {
    const advanceRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'adv-1',
          brandOrgId: 'brand-1',
          dispensaryOrgId: 'disp-1',
          offerId: 'offer-1',
          tierId: 'tier-1',
          escrowWalletId: 'escrow-1',
          status: 'pending_deposit',
        }),
      }),
    };

    const offerRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'offer-1',
          status: 'paused',
          tiers: [{ id: 'tier-1', minDepositUsd: 100, discountBps: 1000 }],
        }),
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_advances') {
        return { doc: jest.fn(() => advanceRef) };
      }
      if (name === 'greenledger_offers') {
        return { doc: jest.fn(() => offerRef) };
      }
      return {};
    });

    await expect(checkAndActivateAdvance('adv-1', 'disp-1')).rejects.toThrow(
      'Offer is not currently active',
    );
    expect(getEscrowBalance).not.toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('fails closed when offer is paused during activation transaction race', async () => {
    const advanceRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'adv-1',
          brandOrgId: 'brand-1',
          dispensaryOrgId: 'disp-1',
          offerId: 'offer-1',
          tierId: 'tier-1',
          escrowWalletId: 'escrow-1',
          status: 'pending_deposit',
        }),
      }),
    };

    const offerRef = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'offer-1',
          status: 'active',
          tiers: [{ id: 'tier-1', minDepositUsd: 100, discountBps: 1000 }],
        }),
      }),
    };

    mockCollection.mockImplementation((name: string) => {
      if (name === 'greenledger_advances') {
        return { doc: jest.fn(() => advanceRef) };
      }
      if (name === 'greenledger_offers') {
        return { doc: jest.fn(() => offerRef) };
      }
      if (name === 'greenledger_transactions') {
        return { doc: jest.fn(() => ({})) };
      }
      return {};
    });

    (getEscrowBalance as jest.Mock).mockResolvedValue(200);

    const tx = {
      get: jest.fn(async (ref: unknown) => {
        if (ref === advanceRef) {
          return {
            exists: true,
            data: () => ({
              id: 'adv-1',
              brandOrgId: 'brand-1',
              dispensaryOrgId: 'disp-1',
              offerId: 'offer-1',
              tierId: 'tier-1',
              status: 'pending_deposit',
            }),
          };
        }
        if (ref === offerRef) {
          return {
            exists: true,
            data: () => ({
              id: 'offer-1',
              status: 'paused',
              currentCommitmentsUsd: 0,
              tiers: [{ id: 'tier-1', minDepositUsd: 100, discountBps: 1000 }],
            }),
          };
        }
        return { exists: false, data: () => ({}) };
      }),
      update: jest.fn(),
      set: jest.fn(),
    };
    mockRunTransaction.mockImplementation(async (callback: (t: typeof tx) => unknown) => callback(tx));

    const activated = await checkAndActivateAdvance('adv-1', 'disp-1');

    expect(activated).toBe(false);
    expect(tx.update).not.toHaveBeenCalled();
    expect(tx.set).not.toHaveBeenCalled();
  });
});
