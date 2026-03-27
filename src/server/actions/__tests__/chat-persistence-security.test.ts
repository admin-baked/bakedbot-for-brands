import { getChatSessions, saveChatSession } from '../chat-persistence';
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

  it('allows super users with role array to read another users chat sessions', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: ['super_user'],
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

  it('rejects blank explicit user ids', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'super_user',
    });

    const result = await getChatSessions('   ');

    expect(result).toEqual({
      success: false,
      error: 'Invalid user id',
    });
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('serializes nested Firestore timestamps before returning chat sessions', async () => {
    const iso = '2026-03-26T19:15:00.000Z';
    const firestoreTimestamp = {
      toDate: () => new Date(iso),
    };

    get.mockResolvedValueOnce({
      docs: [
        {
          id: 'session-1',
          data: () => ({
            title: 'CEO CRM Session',
            preview: 'Preview text',
            timestamp: firestoreTimestamp,
            messages: [
              {
                id: 'message-1',
                type: 'agent',
                content: 'hello',
                timestamp: firestoreTimestamp,
                artifacts: [
                  {
                    id: 'artifact-1',
                    type: 'markdown',
                    title: 'Nested Artifact',
                    content: 'artifact body',
                    createdAt: firestoreTimestamp,
                    updatedAt: firestoreTimestamp,
                  },
                ],
              },
            ],
            artifacts: [
              {
                id: 'artifact-2',
                type: 'markdown',
                title: 'Top Level Artifact',
                content: 'top level body',
                createdAt: firestoreTimestamp,
                updatedAt: firestoreTimestamp,
              },
            ],
          }),
        },
      ],
    });

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });

    const result = await getChatSessions();

    expect(result).toEqual({
      success: true,
      sessions: [
        {
          id: 'session-1',
          title: 'CEO CRM Session',
          preview: 'Preview text',
          timestamp: iso,
          messages: [
            {
              id: 'message-1',
              type: 'agent',
              content: 'hello',
              timestamp: iso,
              artifacts: [
                {
                  id: 'artifact-1',
                  type: 'markdown',
                  title: 'Nested Artifact',
                  content: 'artifact body',
                  createdAt: iso,
                  updatedAt: iso,
                },
              ],
            },
          ],
          role: undefined,
          projectId: undefined,
          artifacts: [
            {
              id: 'artifact-2',
              type: 'markdown',
              title: 'Top Level Artifact',
              content: 'top level body',
              createdAt: iso,
              updatedAt: iso,
            },
          ],
        },
      ],
    });
  });

  it('returns a structured error when Firestore throws a circular error object', async () => {
    const circularError = new Error('Firestore read failed') as Error & {
      code?: number;
      self?: unknown;
    };
    circularError.code = 13;
    circularError.self = circularError;

    get.mockRejectedValueOnce(circularError);

    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'super-1',
      role: 'super_user',
    });

    const result = await getChatSessions();

    expect(result).toEqual({
      success: false,
      error: 'Firestore read failed',
    });
  });

  it('rejects invalid chat session ids on save', async () => {
    (requireUser as jest.Mock).mockResolvedValue({
      uid: 'user-1',
      role: 'dispensary_admin',
    });

    const result = await saveChatSession({
      id: 'bad/session-id',
      title: 'Hello',
      preview: '',
      timestamp: new Date().toISOString(),
      messages: [],
      role: 'smokey',
      projectId: 'p1',
      artifacts: [],
    } as any);

    expect(result).toEqual({
      success: false,
      error: 'Invalid session id',
    });
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
