import {
  getPublicMenuSettings,
  getLoyaltySettings,
  updateLoyaltySettings,
} from '../loyalty-settings';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('loyalty-settings security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from reading loyalty settings of another org', async () => {
    const result = await getLoyaltySettings('org-b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('blocks non-super users from updating loyalty settings of another org', async () => {
    const result = await updateLoyaltySettings('org-b', { pointsPerDollar: 2 });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('keeps public menu settings endpoint unauthenticated', async () => {
    const get = jest.fn().mockResolvedValue({ exists: false });
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({ get }),
          }),
        }),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);

    const result = await getPublicMenuSettings('org-public');

    expect(result).not.toBeNull();
    expect(requireUser).not.toHaveBeenCalled();
  });

  it('allows super users to update loyalty settings for any org', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });

    const set = jest.fn().mockResolvedValue(undefined);
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({
          collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({ set }),
          }),
        }),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);

    const result = await updateLoyaltySettings('org-b', { pointsPerDollar: 3 });

    expect(result.success).toBe(true);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ pointsPerDollar: 3 }),
      { merge: true },
    );
  });

  it('rejects malformed org ids in public menu settings', async () => {
    const result = await getPublicMenuSettings('bad/id');
    expect(result).toBeNull();
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });
});
