import {
  getPricingAlerts,
  updatePricingAlerts,
  getRecentPricingAlerts,
  triggerPriceCheck,
} from '../pricing-alerts';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import {
  getPricingAlertConfig,
  savePricingAlertConfig,
  checkCompetitorPriceChanges,
  sendPricingAlertEmails,
} from '@/server/services/pricing-alerts';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/server/services/pricing-alerts', () => ({
  getPricingAlertConfig: jest.fn(),
  savePricingAlertConfig: jest.fn(),
  checkCompetitorPriceChanges: jest.fn(),
  sendPricingAlertEmails: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('pricing-alerts actions security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from reading cross-tenant pricing alert config', async () => {
    const result = await getPricingAlerts('org-b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getPricingAlertConfig).not.toHaveBeenCalled();
  });

  it('blocks non-super users from updating cross-tenant pricing alert config', async () => {
    const result = await updatePricingAlerts({
      tenantId: 'org-b',
      enabled: true,
      emailRecipients: ['owner@example.com'],
      alertThreshold: 10,
      checkFrequency: 360,
      alertTypes: ['price_gap'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(savePricingAlertConfig).not.toHaveBeenCalled();
  });

  it('blocks non-super users from reading cross-tenant alert history', async () => {
    const result = await getRecentPricingAlerts('org-b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('blocks non-super users from triggering cross-tenant price checks', async () => {
    const result = await triggerPriceCheck('org-b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(checkCompetitorPriceChanges).not.toHaveBeenCalled();
    expect(sendPricingAlertEmails).not.toHaveBeenCalled();
  });

  it('allows super users to update pricing alert config for any tenant', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });
    (savePricingAlertConfig as jest.Mock).mockResolvedValue(true);

    const result = await updatePricingAlerts({
      tenantId: 'org-b',
      enabled: true,
      emailRecipients: ['owner@example.com'],
      alertThreshold: 10,
      checkFrequency: 360,
      alertTypes: ['price_gap'],
    });

    expect(result.success).toBe(true);
    expect(savePricingAlertConfig).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'org-b' }),
    );
  });
});

