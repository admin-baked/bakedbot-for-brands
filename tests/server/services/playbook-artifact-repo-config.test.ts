describe('playbook artifact repo config logging', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.PLAYBOOK_ARTIFACT_REPO_OWNER;
    delete process.env.PLAYBOOK_ARTIFACT_REPO_NAME;
  });

  it('does not warn until the mock artifact repo is actually used', async () => {
    const warn = jest.fn();

    jest.doMock('@/firebase/admin', () => ({
      getAdminFirestore: jest.fn(),
      getAdminStorage: jest.fn(),
    }));

    jest.doMock('@/server/utils/secrets', () => ({
      getSecret: jest.fn(),
    }));

    jest.doMock('@/server/jobs/dispatch', () => ({
      dispatchAgentJob: jest.fn(),
    }));

    jest.doMock('@/lib/logger', () => ({
      logger: {
        info: jest.fn(),
        warn,
        error: jest.fn(),
        debug: jest.fn(),
      },
    }));

    const { createPlaybookArtifactRepoStore } = require('@/server/services/playbook-infra-adapters');
    const repoStore = createPlaybookArtifactRepoStore();

    expect(warn).not.toHaveBeenCalled();

    await repoStore.writeFile({
      repoPath: 'artifacts/test.json',
      body: '{}',
      message: 'test artifact',
    });

    expect(warn).toHaveBeenCalledWith(
      '[ArtifactRepoStore] Artifact repo not configured; using mock store',
      { operation: 'writeFile' },
    );
  });
});
