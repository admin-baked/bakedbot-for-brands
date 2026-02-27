import { getQRCodes } from '../qr-code';
import { getServerSessionUser } from '@/server/auth/session';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/server/auth/session', () => ({
  getServerSessionUser: jest.fn(),
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

describe('qr-code actions: getQRCodes access control', () => {
  const query = {
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    query.where.mockReturnValue(query);
    query.orderBy.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.get.mockResolvedValue({ docs: [] });

    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn(() => query),
    });
  });

  it('ignores caller-provided orgId for non-super users', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'org-a',
      role: 'dispensary_admin',
    });

    const result = await getQRCodes({ orgId: 'org-b' });

    expect(result.success).toBe(true);
    expect(query.where).toHaveBeenCalledWith('orgId', '==', 'org-a');
  });

  it('allows super users to query a specific orgId', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });

    const result = await getQRCodes({ orgId: 'org-b' });

    expect(result.success).toBe(true);
    expect(query.where).toHaveBeenCalledWith('orgId', '==', 'org-b');
  });
});
