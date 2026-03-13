import { validateExecutor } from '@/server/services/playbook-stages/validate';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';
import { runValidationHarness } from '@/server/services/playbook-validation';

jest.mock('@/server/services/playbook-artifact-service', () => ({
    ArtifactPersistenceService: jest.fn().mockImplementation(() => ({
        persist: jest.fn().mockResolvedValue({
            artifact: { id: 'art_123', storagePath: 'test/path.json' }
        })
    }))
}));

jest.mock('@/server/services/playbook-validation', () => ({
    runValidationHarness: jest.fn(),
    DAILY_CI_VALIDATORS: []
}));

describe('validateExecutor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (runValidationHarness as jest.Mock).mockResolvedValue({
            overallStatus: 'pass',
            requiresApproval: false,
            results: []
        });
    });

    it('should run harness and persist report', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: { scope: { orgId: 'org_1' } },
            priorArtifacts: [],
            policyBundle: { id: 'pol_1' }
        };

        const result = await validateExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.artifactsCreated).toHaveLength(1);
        expect(runValidationHarness).toHaveBeenCalledWith(
            expect.objectContaining({ run: { id: 'run_1', playbookId: 'pb_1' } }),
            expect.any(Array)
        );
        expect(result.stageOutput.overallStatus).toBe('pass');
    });
});
