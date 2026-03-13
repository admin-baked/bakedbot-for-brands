import { extractQuestionsExecutor } from '@/server/services/playbook-stages/extract-questions';
import { ArtifactPersistenceService } from '@/server/services/playbook-artifact-service';

jest.mock('@/server/services/playbook-artifact-service', () => ({
    ArtifactPersistenceService: jest.fn().mockImplementation(() => ({
        persist: jest.fn().mockResolvedValue({
            artifact: { id: 'art_123', storagePath: 'test/path.json' }
        })
    }))
}));

describe('extractQuestionsExecutor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should extract correct questions based on objectives', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: {
                objectives: ['detect_price_changes', 'detect_promo_changes'],
                scope: { orgId: 'org_1' }
            }
        };

        const result = await extractQuestionsExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.stageOutput.questions).toContain('which_price_changes_exceed_threshold');
        expect(result.stageOutput.questions).toContain('which_promos_are_new');
        expect(result.stageOutput.questions).toContain('what_changed_vs_yesterday');
        expect(result.artifactsCreated).toHaveLength(1);
    });

    it('should provide default questions if no specific objectives', async () => {
        const input: any = {
            run: { id: 'run_1', playbookId: 'pb_1' },
            spec: {
                objectives: [],
                scope: { orgId: 'org_1' }
            }
        };

        const result = await extractQuestionsExecutor.run(input);

        expect(result.status).toBe('completed');
        expect(result.stageOutput.questions).toContain('what_changed_vs_yesterday');
        expect(result.stageOutput.questions).not.toContain('which_price_changes_exceed_threshold');
    });
});
