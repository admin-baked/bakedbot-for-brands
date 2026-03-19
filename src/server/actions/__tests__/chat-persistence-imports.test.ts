describe('chat-persistence server action imports', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('does not eagerly import the client chat store at runtime', async () => {
    jest.doMock('@/lib/store/agent-chat-store', () => {
      throw new Error('agent chat store imported eagerly');
    });

    jest.doMock('@/server/auth/auth', () => ({
      requireUser: jest.fn().mockResolvedValue({
        uid: 'super-1',
        role: 'super_user',
      }),
    }));

    jest.doMock('@/firebase/server-client', () => ({
      createServerClient: jest.fn().mockResolvedValue({
        firestore: {
          collection: jest.fn().mockImplementation(() => ({
            doc: jest.fn().mockImplementation(() => ({
              collection: jest.fn().mockImplementation(() => ({
                orderBy: jest.fn().mockImplementation(() => ({
                  limit: jest.fn().mockImplementation(() => ({
                    get: jest.fn().mockResolvedValue({ docs: [] }),
                  })),
                })),
              })),
            })),
          })),
        },
      }),
    }));

    jest.doMock('@/lib/monitoring', () => ({
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
    }));

    const { getChatSessions } = await import('../chat-persistence');
    const result = await getChatSessions();

    expect(result).toEqual({
      success: true,
      sessions: [],
    });
  });
});
