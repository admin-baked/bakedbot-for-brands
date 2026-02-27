import { getChatSessions } from '../chat-persistence';
import { requireUser } from '@/server/auth/auth';
import { createServerClient } from '@/firebase/server-client';

jest.mock('@/server/auth/auth', () => ({
  requireUser: jest.fn(),
}));

jest.mock('@/firebase/server-client', () => ({
  createServerClient: jest.fn(),
}));

jest.mock('@/lib/monitoring', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('chat-persistence security', () => {
  const get = jest.fn().mockResolvedValue({ docs: [] });
  const limit = jest.fn().mockImplementation(() => ({ get }));
  const orderBy = jest.fn().mockImplementation(() => ({ limit }));
  const collection = jest.fn().mockImplementation(() => ({ orderBy }));
  const doc = jest.fn().mockImplementation(() => ({ collection }));

  beforeEach(() => {
    jest.clearAllMocks();
    (createServerClient as jest.Mock).mockResolvedValue({
      firestore: {
        collection: jest.fn().mockImplementation((name: string) => {
          if (name === 'users') return { doc };
          return { doc: jest.fn() };
        }),
      },
    });
  });

  it('blocks non-super users from reading another users chat sessions', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await getChatSessions('user-2');

    expect(result).toEqual({
      success: false,
      error: 'Unauthorized',
    });
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('allows super users to read another users chat sessions', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });

    const result = await getChatSessions('user-2');

    expect(result.success).toBe(true);
    expect(doc).toHaveBeenCalledWith('user-2');
    expect(get).toHaveBeenCalled();
  });

  it('rejects invalid user ids', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'super_user',
    });

    const result = await getChatSessions('bad/user');

    expect(result).toEqual({
      success: false,
      error: 'Invalid user id',
    });
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
