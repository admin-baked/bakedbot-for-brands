import {
  createCampaign,
  getCampaigns,
  updateCampaignPerformance,
} from '../campaigns';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('campaigns security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks createCampaign when user has no org context and no explicit orgId', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary',
    });

    const add = jest.fn();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockReturnValue({ add }),
      },
    });

    const result = await createCampaign({
      name: 'No Org Campaign',
      goal: 'drive_sales',
      channels: ['email'],
    });

    expect(result).toBeNull();
    expect(add).not.toHaveBeenCalled();
  });

  it('blocks getCampaigns when actor org context is missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary',
    });

    const where = jest.fn();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockReturnValue({ where }),
      },
    });

    const result = await getCampaigns();

    expect(result).toEqual([]);
    expect(where).not.toHaveBeenCalled();
  });

  it('prefers currentOrgId when creating a campaign without explicit orgId', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary',
      orgId: 'org-legacy',
      currentOrgId: 'org-current',
    });

    const add = jest.fn().mockResolvedValue({ id: 'camp-1' });
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockReturnValue({ add }),
      },
    });

    const result = await createCampaign({
      name: 'Scoped Campaign',
      goal: 'drive_sales',
      channels: ['email'],
    });

    expect(result?.orgId).toBe('org-current');
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-current',
      }),
    );
  });

  it('blocks updateCampaignPerformance for cross-org campaigns', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary',
      orgId: 'org-a',
    });

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: 'org-b' }),
      });
    const update = jest.fn();
    const doc = jest.fn().mockReturnValue({ get, update });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockReturnValue({ doc }),
      },
    });

    const result = await updateCampaignPerformance('camp-1', { sent: 20 });

    expect(result).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows updateCampaignPerformance for super users across orgs', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: 'org-b' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: 'org-b',
          performance: { sent: 10, opened: 2, clicked: 1, bounced: 0 },
        }),
      });
    const update = jest.fn().mockResolvedValue(undefined);
    const doc = jest.fn().mockReturnValue({ get, update });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockReturnValue({ doc }),
      },
    });

    const result = await updateCampaignPerformance('camp-1', { sent: 12, opened: 3 });

    expect(result).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        performance: expect.objectContaining({
          sent: 12,
          opened: 3,
          openRate: 25,
        }),
      }),
    );
  });

  it('allows updateCampaignPerformance for super_admin across orgs', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-admin-1',
      role: 'super_admin',
      orgId: 'org-a',
    });

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: 'org-b' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: 'org-b',
          performance: { sent: 0 },
        }),
      });
    const update = jest.fn().mockResolvedValue(undefined);
    const doc = jest.fn().mockReturnValue({ get, update });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockReturnValue({ doc }),
      },
    });

    const result = await updateCampaignPerformance('camp-1', { sent: 7 });

    expect(result).toBe(true);
    expect(update).toHaveBeenCalled();
  });

  it('normalizes performance rates to zero when denominator fields are missing', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary',
      currentOrgId: 'org-a',
    });

    const get = jest
      .fn()
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ orgId: 'org-a' }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({
          orgId: 'org-a',
          performance: {},
        }),
      });
    const update = jest.fn().mockResolvedValue(undefined);
    const doc = jest.fn().mockReturnValue({ get, update });

    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockReturnValue({ doc }),
      },
    });

    const result = await updateCampaignPerformance('camp-1', { sent: 5 });

    expect(result).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        performance: expect.objectContaining({
          sent: 5,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0,
          conversionRate: 0,
        }),
      }),
    );
  });

  it('rejects invalid campaign path segments before firestore access', async () => {
    const result = await updateCampaignPerformance('camp/1', { sent: 1 });
    expect(result).toBe(false);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(requireUser).not.toHaveBeenCalled();
  });
});
