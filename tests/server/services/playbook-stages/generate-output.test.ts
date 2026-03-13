import { generateOutputExecutor } from '@/server/services/playbook-stages/generate-output';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';

jest.mock('@/server/services/playbook-artifact-service', () => ({
    ArtifactPersistenceService: jest.fn().mockImplementation(() => ({
        persist: jest.fn().mockResolvedValue({
            artifact: { id: 'art_123', storagePath: 'test/path.json' }
        })
    }))
}));

describe('generateOutputExecutor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fail if research artifact is missing', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            priorArtifacts: []
        };

        const result = await generateOutputExecutor.run(input);

        expect(result.status).toBe('failed');
        expect(result.error?.code).toBe('MISSING_RESEARCH');
    });

    it('should generate output and recommendations, and persist them', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: { scope: { orgId: 'org_1' } },
            priorArtifacts: [
                { artifactType: 'research_pack', storagePath: 'path/to/research.md' }
            ]
        };

        const result = await generateOutputExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.artifactsCreated).toHaveLength(2); // output, recommendations
        expect(result.stageOutput).toHaveProperty('report');
        expect(result.stageOutput).toHaveProperty('recommendations');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.metrics?.tokenInput).toBeDefined();
    });
});
