import {
  getOAuthUrl,
  connectPlatform,
  refreshPlatformToken,
} from '../platform-connections';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import {
  exchangeCodeForToken,
  generateAuthUrl,
  generateOAuthState,
} from '@/lib/integrations/oauth-handler';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
  getAdminFirestore: jest.fn(),
}));

jest.mock('@/lib/integrations/oauth-handler', () => ({
  exchangeCodeForToken: jest.fn(),
  refreshAccessToken: jest.fn(),
  revokeAccessToken: jest.fn(),
  calculateTokenExpiration: jest.fn(() => Date.now() + 3600_000),
  isTokenExpired: jest.fn(() => false),
  generateAuthUrl: jest.fn(),
  generateOAuthState: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('platform-connections security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      orgId: 'org-a',
    });
  });

  it('blocks non-super users from generating oauth urls for another tenant', async () => {
    const result = await getOAuthUrl('meta', 'org-b');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
    expect(generateOAuthState).not.toHaveBeenCalled();
  });

  it('blocks non-super users from connecting platforms for another tenant', async () => {
    const result = await connectPlatform({
      platform: 'meta',
      tenantId: 'org-b',
      authCode: 'code-123',
      state: 'state-1',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(exchangeCodeForToken).not.toHaveBeenCalled();
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('blocks non-super users from refreshing another tenant token without fallback writes', async () => {
    const result = await refreshPlatformToken('org-b', 'meta');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unauthorized');
    expect(getAdminFirestore).not.toHaveBeenCalled();
  });

  it('allows super users to generate oauth urls for any tenant', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
      orgId: 'org-a',
    });
    (generateOAuthState as jest.Mock).mockReturnValue('state-1');
    (generateAuthUrl as jest.Mock).mockReturnValue({ authUrl: 'https://oauth.example' });

    const set = jest.fn().mockResolvedValue(undefined);
    const firestore = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue({ set }),
      }),
    };
    (getAdminFirestore as jest.Mock).mockReturnValue(firestore);

    const result = await getOAuthUrl('meta', 'org-b');

    expect(result).toEqual({
      success: true,
      authUrl: 'https://oauth.example',
      state: 'state-1',
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'meta',
        tenantId: 'org-b',
      }),
    );
  });
});

