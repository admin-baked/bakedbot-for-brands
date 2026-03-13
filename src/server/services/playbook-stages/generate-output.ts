import { logger } from '@/lib/logger';
import type { StageExecutor, StageExecutionInput, StageExecutionResult } from '@/types/playbook-v2';
import { getPlaybookArtifactRuntime } from '@/server/services/playbook-artifact-runtime';

const { artifactService } = getPlaybookArtifactRuntime();

export const generateOutputExecutor: StageExecutor = {
    stageName: 'generating_output',

    async run(input: StageExecutionInput): Promise<StageExecutionResult> {
        logger.info(`[Stage: generating_output] Run ${input.run.id}`);
        const startTime = Date.now();

        const researchArtifact = input.priorArtifacts.find(a => a.artifactType === 'research_pack');
        if (!researchArtifact) {
            return {
                status: 'failed',
                error: { code: 'MISSING_RESEARCH', message: 'No research pack artifact found', retryable: false }
            };
        }

        const scope = input.spec.scope as Record<string, unknown>;

        // Placeholder: Call AI with bounded prompt and the research pack
        const report = `# Daily Competitive Intelligence Report\n\nExecutive Summary based on the research pack.`;
        const recommendations = [
            { id: 'rec_1', title: 'Match Verilife Pricing on Vapes', priority: 'high' }
        ];

        // Persist Artifacts
        const p1 = artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scope.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'generated_output',
            filename: 'output.md',
            body: report,
            contentType: 'text/markdown',
            commitToRepo: true,
            metadata: { confidence: 0.85 },
            runDate: input.run.startedAt,
        });

        const p2 = artifactService.persist({
            runId: input.run.id,
            workspaceId: String(input.run.orgId || scope.orgId || 'unknown_org'),
            playbookId: input.run.playbookId,
            stageName: this.stageName,
            artifactType: 'recommendations',
            filename: 'recommendations.json',
            body: JSON.stringify(recommendations, null, 2),
            contentType: 'application/json',
            commitToRepo: true,
            metadata: { confidence: 0.85 },
            runDate: input.run.startedAt,
        });

        const [res1, res2] = await Promise.all([p1, p2]);

        return {
            status: 'completed',
            stageOutput: { report, recommendations },
            artifactsCreated: [res1.artifact, res2.artifact],
            confidence: 0.85,
            metrics: {
                durationMs: Date.now() - startTime,
                tokenInput: 1200,
                tokenOutput: 350,
            }
        };
    }
};
