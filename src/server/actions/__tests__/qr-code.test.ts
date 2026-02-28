import {
  getQRCodes,
  getQRCodeAnalytics,
  updateQRCode,
  deleteQRCode,
  generateQRCode,
} from '../qr-code';
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
      uid: 'user-1',
      currentOrgId: 'org-a',
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

  it('uses super user org context when no orgId filter is provided', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      currentOrgId: 'org-super',
    });

    const result = await getQRCodes();

    expect(result.success).toBe(true);
    expect(query.where).toHaveBeenCalledWith('orgId', '==', 'org-super');
  });

  it('returns an error when org context is missing', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await getQRCodes();

    expect(result).toEqual({
      success: false,
      error: 'Missing organization context',
    });
    expect(query.where).not.toHaveBeenCalled();
  });

  it('rejects invalid QR code ids in analytics/update/delete actions', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      currentOrgId: 'org-a',
      role: 'dispensary_admin',
    });

    await expect(getQRCodeAnalytics('bad/id')).resolves.toEqual({
      success: false,
      error: 'Invalid QR code id',
    });
    await expect(updateQRCode('bad/id', { title: 'x' })).resolves.toEqual({
      success: false,
      error: 'Invalid QR code id',
    });
    await expect(deleteQRCode('bad/id')).resolves.toEqual({
      success: false,
      error: 'Invalid QR code id',
    });
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('rejects non-http target URLs during QR generation', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      currentOrgId: 'org-a',
      role: 'dispensary_admin',
    });

    const result = await generateQRCode({
      type: 'menu',
      title: 'Bad URL',
      targetUrl: 'javascript:alert(1)',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid target URL',
    });
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });
});
