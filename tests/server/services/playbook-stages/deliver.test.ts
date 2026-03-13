import { deliverExecutor } from '@/server/services/playbook-stages/deliver';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';

jest.mock('@/server/services/playbook-artifact-service', () => ({
    ArtifactPersistenceService: jest.fn().mockImplementation(() => ({
        persist: jest.fn().mockResolvedValue({
            artifact: { id: 'art_123', storagePath: 'test/path.json' }
        })
    }))
}));

describe('deliverExecutor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should iterate over destinations and create manifest', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: {
                scope: { orgId: 'org_1' },
                outputs: { destinations: ['email:test@bakedbot.ai', 'slack:#marketing'] }
            },
            priorArtifacts: []
        };

        const result = await deliverExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.artifactsCreated).toHaveLength(1);
        expect(result.stageOutput.destinations).toHaveLength(2);
        expect(result.stageOutput.destinations[0].destination).toBe('email:test@bakedbot.ai');
        expect(result.stageOutput.destinations[1].status).toBe('success');
    });
});
