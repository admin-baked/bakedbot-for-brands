import { logger } from '@/lib/logger';
import type { PlaybookStep } from '@/types/playbook';

export interface ExecutePlaybookCronStepInput {
    playbookId: string;
    playbookName: string;
    orgId: string;
    step: PlaybookStep | Record<string, any>;
    triggeredBy: 'manual' | 'schedule' | 'event';
    eventData?: Record<string, unknown>;
}

export interface ExecutePlaybookCronStepResult {
    action: string;
    message: string;
    data?: unknown;
}

function getBaseUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL
        || process.env.APP_URL
        || 'http://localhost:3000';
}

function getDescription(step: PlaybookStep | Record<string, any>, endpoint: string): string {
    if (typeof step.params?.description === 'string' && step.params.description.trim().length > 0) {
        return step.params.description.trim();
    }

    return `Executed ${endpoint}`;
}

export async function executePlaybookCronStep(
    input: ExecutePlaybookCronStepInput,
): Promise<ExecutePlaybookCronStepResult> {
    const endpoint = typeof input.step.params?.endpoint === 'string'
        ? input.step.params.endpoint.trim()
        : '';

    if (!endpoint) {
        throw new Error('run_cron step requires params.endpoint');
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        throw new Error('CRON_SECRET not configured');
    }

    const requestBody = {
        triggeredBy: input.triggeredBy,
        playbookId: input.playbookId,
        orgId: input.orgId,
        eventData: input.eventData || {},
        step: input.step,
    };

    logger.info('[PlaybookCronStep] Invoking cron endpoint', {
        playbookId: input.playbookId,
        orgId: input.orgId,
        endpoint,
        triggeredBy: input.triggeredBy,
    });

    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${cronSecret}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

    if (!response.ok || (typeof payload === 'object' && payload && (payload as { success?: boolean }).success === false)) {
        const errorMessage =
            typeof payload === 'object' && payload && typeof (payload as { error?: string }).error === 'string'
                ? (payload as { error: string }).error
                : `Cron endpoint failed with status ${response.status}`;
        throw new Error(errorMessage);
    }

    return {
        action: String(input.step.action || 'run_cron'),
        message: getDescription(input.step, endpoint),
        data: payload,
    };
}
