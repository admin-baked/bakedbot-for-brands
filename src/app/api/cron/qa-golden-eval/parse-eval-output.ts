import type { QAGoldenSetEvalResult } from '@/types/qa';
import { extractQAGoldenEvalFailures } from '@/server/services/qa-golden-eval-runs';

function normalizeExitCode(exitCode: number | string): number {
    if (typeof exitCode === 'number') return Number.isFinite(exitCode) ? exitCode : -1;
    if (typeof exitCode === 'string') {
        if (exitCode === 'ETIMEDOUT' || exitCode === 'SIGTERM') return -1;
        const parsed = parseInt(exitCode, 10);
        if (Number.isFinite(parsed)) return parsed;
    }
    return -1;
}

export function parseEvalOutput(
    stdout: string,
    agent: QAGoldenSetEvalResult['agent'],
    tier: QAGoldenSetEvalResult['tier'],
    exitCode: number | string = 0,
): QAGoldenSetEvalResult {
    const passedMatch = stdout.match(/Passed:\s*(\d+)\/(\d+)/i);
    const scoreMatch = stdout.match(/Score:\s*(\d+)%/i);
    const thresholdMatch = stdout.match(/Threshold:\s*(\d+)%/i);

    const normalizedExitCode = normalizeExitCode(exitCode);
    const fallbackFailed = normalizedExitCode === 0 ? 0 : 1;

    const passed = passedMatch ? parseInt(passedMatch[1], 10) : 0;
    const total = passedMatch ? parseInt(passedMatch[2], 10) : fallbackFailed;
    const failed = passedMatch ? Math.max(total - passed, 0) : fallbackFailed;
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : (total > 0 ? Math.round((passed / total) * 100) : 0);
    const threshold = thresholdMatch ? parseInt(thresholdMatch[1], 10) : 90;
    const { failingTestIds, failureSummaries } = extractQAGoldenEvalFailures(stdout);

    return {
        agent,
        tier,
        passed,
        failed,
        total,
        score,
        threshold,
        complianceFailed: normalizedExitCode === 1,
        belowThreshold: normalizedExitCode === 2 || (normalizedExitCode !== 0 && normalizedExitCode !== 1),
        stdout: stdout.slice(0, 3000),
        failingTestIds,
        failureSummaries,
        exitCode: normalizedExitCode,
        ranAt: new Date(),
    };
}
