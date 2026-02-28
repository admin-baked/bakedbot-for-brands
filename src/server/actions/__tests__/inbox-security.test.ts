import { createInboxThread, injectAgentMessage } from '../inbox';
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

describe('inbox security', () => {
  const create = jest.fn().mockResolvedValue(undefined);
  const get = jest.fn().mockResolvedValue({ exists: true });
  const update = jest.fn().mockResolvedValue(undefined);
  const doc = jest.fn().mockImplementation(() => ({ create, get, update }));
  const collection = jest.fn().mockImplementation(() => ({ doc }));
  const originalInjectToken = process.env.INBOX_AGENT_INJECT_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INBOX_AGENT_INJECT_TOKEN = originalInjectToken;
    (getAdminFirestore as jest.Mock).mockReturnValue({ collection });
  });

  afterAll(() => {
    process.env.INBOX_AGENT_INJECT_TOKEN = originalInjectToken;
  });

  it('rejects thread creation when org context is missing', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await createInboxThread({
      type: 'campaign',
      title: 'Test',
    });

    expect(result).toEqual({
      success: false,
      error: 'Missing organization context',
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it('rejects invalid requested org ids', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-a',
    });

    const result = await createInboxThread({
      type: 'campaign',
      brandId: 'bad/org',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid organization context',
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it('uses currentOrgId for non-super users and blocks cross-org overrides', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
      orgId: 'org-fallback',
      brandId: 'brand-fallback',
    });

    const blocked = await createInboxThread({
      type: 'campaign',
      brandId: 'org-other',
    });
    expect(blocked).toEqual({
      success: false,
      error: 'Unauthorized org context',
    });

    const allowed = await createInboxThread({
      type: 'campaign',
      title: 'Allowed',
    });
    expect(allowed.success).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-current',
      })
    );
  });

  it('rejects invalid client thread ids', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
    });

    const result = await createInboxThread({
      id: 'bad/thread',
      type: 'campaign',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid thread id',
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it('fails closed if the requested thread id already exists', async () => {
    (getServerSessionUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
      currentOrgId: 'org-current',
    });
    create.mockRejectedValueOnce({ code: 6, message: 'already exists' });

    const result = await createInboxThread({
      id: 'thread-fixed-id',
      type: 'campaign',
    });

    expect(result).toEqual({
      success: false,
      error: 'Thread ID already exists',
    });
  });

  it('blocks internal message injection when token is missing', async () => {
    delete process.env.INBOX_AGENT_INJECT_TOKEN;

    const result = await injectAgentMessage('thread-1', 'Smokey', 'hello');

    expect(result).toBe(false);
    expect(collection).not.toHaveBeenCalled();
  });

  it('blocks internal message injection for invalid thread ids', async () => {
    process.env.INBOX_AGENT_INJECT_TOKEN = 'test-token';

    const result = await injectAgentMessage('bad/thread', 'Smokey', 'hello', {
      internalToken: 'test-token',
    });

    expect(result).toBe(false);
    expect(collection).not.toHaveBeenCalled();
  });

  it('allows internal message injection with a valid token', async () => {
    process.env.INBOX_AGENT_INJECT_TOKEN = 'test-token';

    const result = await injectAgentMessage('thread-1', 'Smokey', ' hello ', {
      internalToken: 'test-token',
    });

    expect(result).toBe(true);
    expect(doc).toHaveBeenCalledWith('thread-1');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        preview: 'hello',
      })
    );
  });
});
