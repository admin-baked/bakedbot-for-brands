import { checkAdvanceDepositAction } from '../greenledger';
import { requireUser } from '@/server/auth/auth';
import { checkAndActivateAdvance } from '@/server/services/greenledger';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/server/services/greenledger', () => ({
  createOffer: jest.fn(),
  updateOffer: jest.fn(),
  publishOffer: jest.fn(),
  pauseOffer: jest.fn(),
  getBrandOffers: jest.fn(),
  getBrandAdvances: jest.fn(),
  getBrandGreenLedgerSummary: jest.fn(),
  getMarketplaceOffers: jest.fn(),
  initiateAdvance: jest.fn(),
  checkAndActivateAdvance: jest.fn(),
  getMyAdvances: jest.fn(),
  getDispensaryGreenLedgerSummary: jest.fn(),
  requestRefund: jest.fn(),
  processRefund: jest.fn(),
}));

describe('greenledger actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes caller org context into deposit activation checks', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      currentOrgId: 'disp-1',
      orgId: 'fallback-org',
    });
    (checkAndActivateAdvance as jest.Mock).mockResolvedValue(true);

    const result = await checkAdvanceDepositAction('adv-1');

    expect(result).toEqual({ success: true, activated: true });
    expect(checkAndActivateAdvance).toHaveBeenCalledWith('adv-1', 'disp-1');
  });

  it('returns an error when org context is missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      currentOrgId: undefined,
      orgId: undefined,
    });

    const result = await checkAdvanceDepositAction('adv-1');

    expect(result).toEqual({ success: false, error: 'No org context' });
    expect(checkAndActivateAdvance).not.toHaveBeenCalled();
  });
});
