var mockGetArtifactContent = jest.fn();
var mockPersist = jest.fn();

jest.mock('@/server/services/playbook-artifact-runtime', () => ({
    getPlaybookArtifactRuntime: jest.fn(() => ({
        artifactService: {
            persist: mockPersist,
            getArtifactContent: mockGetArtifactContent,
        },
    })),
}));

const { assembleContextExecutor } = require('@/server/services/playbook-stages/assemble-context');

describe('assembleContextExecutor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPersist.mockResolvedValue({
            artifact: { id: 'art_123' }
        });
        mockGetArtifactContent.mockResolvedValue({
            body: Buffer.from(JSON.stringify({ orgId: 'org_1' }))
        });
    });

    it('should fail if resolved_scope artifact is missing', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            priorArtifacts: []
        };

        const result = await assembleContextExecutor.run(input);

        expect(result.status).toBe('failed');
        expect(result.error?.code).toBe('MISSING_SCOPE');
    });

    it('should generate context diffs and persist them', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: { scope: { orgId: 'org_1' } },
            priorArtifacts: [
                { artifactType: 'resolved_scope', storagePath: 'path/to/scope.json' }
            ]
        };

        const result = await assembleContextExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.stageOutput).toHaveProperty('menuDiff');
        expect(result.stageOutput).toHaveProperty('promoDiff');
        expect(result.stageOutput).toHaveProperty('contextManifest');
        expect(result.artifactsCreated).toHaveLength(4); // menu, promo, research, manifest
    });
});
