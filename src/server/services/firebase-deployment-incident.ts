import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { dispatchLinusIncidentResponse } from '@/server/services/linus-incident-response';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';

const DEFAULT_CHANNEL_NAME = 'linus-deployment';
const DEFAULT_MAX_ITERATIONS = 8;
const INCIDENT_COLLECTION = 'firebase_deployment_incidents';
const SUPER_USER_ORG = 'bakedbot-internal';

type DeploymentEventName = 'deployment.firebase.failed' | 'deployment.firebase.succeeded';

interface FirebaseDeploymentPlaybookRequest {
    orgId?: string;
    playbookId?: string;
    triggeredBy?: 'manual' | 'schedule' | 'event';
    eventData?: Record<string, unknown>;
    step?: {
        params?: Record<string, unknown>;
    } | null;
}

interface FirebaseDeploymentIncidentResponse {
    success: true;
    accepted: boolean;
    mode: 'failure' | 'success' | 'ignored';
    incidentId: string | null;
}

type IncidentRecord = Record<string, unknown>;

interface NormalizedFirebaseDeploymentEvent {
    eventName: DeploymentEventName;
    workflowName: string;
    workflowFile: string | null;
    runId: string | null;
    runNumber: string | null;
    runUrl: string | null;
    jobName: string | null;
    attempt: number | null;
    sha: string | null;
    shortSha: string | null;
    branch: string | null;
    error: string | null;
    failureSummary: string;
    failureStep: string | null;
    deployTarget: string | null;
    provider: string | null;
    actor: string | null;
    triggeredAt: string;
    deployedUrl: string | null;
    durationMs: number | null;
}

function asString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function normalizeEventName(eventName: unknown): DeploymentEventName | null {
    return eventName === 'deployment.firebase.failed' || eventName === 'deployment.firebase.succeeded'
        ? eventName
        : null;
}

function slugify(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'deployment';
}

function getConfiguredChannelName(step: FirebaseDeploymentPlaybookRequest['step']): string {
    const configured = asString(step?.params?.channelName);
    return configured || DEFAULT_CHANNEL_NAME;
}

function getConfiguredMaxIterations(step: FirebaseDeploymentPlaybookRequest['step']): number {
    const configured = asNumber(step?.params?.maxIterations);
    if (!configured || configured < 1) {
        return DEFAULT_MAX_ITERATIONS;
    }

    return Math.min(Math.floor(configured), 15);
}

function normalizeFirebaseDeploymentEvent(
    eventData: Record<string, unknown> | undefined,
): NormalizedFirebaseDeploymentEvent | null {
    const eventName = normalizeEventName(eventData?.eventName);
    if (!eventName) {
        return null;
    }

    const sha = asString(eventData?.sha);
    const summary =
        asString(eventData?.failureSummary)
        || asString(eventData?.error)
        || asString(eventData?.buildSummary)
        || 'GitHub Actions reported a Firebase deployment failure.';

    return {
        eventName,
        workflowName: asString(eventData?.workflowName) || 'Firebase Deploy',
        workflowFile: asString(eventData?.workflowFile),
        runId: asString(eventData?.runId),
        runNumber: asString(eventData?.runNumber),
        runUrl: asString(eventData?.runUrl),
        jobName: asString(eventData?.jobName),
        attempt: asNumber(eventData?.attempt),
        sha,
        shortSha: asString(eventData?.shortSha) || (sha ? sha.slice(0, 7) : null),
        branch: asString(eventData?.branch) || asString(eventData?.ref),
        error: asString(eventData?.error),
        failureSummary: summary,
        failureStep: asString(eventData?.failureStep),
        deployTarget: asString(eventData?.deployTarget),
        provider: asString(eventData?.provider),
        actor: asString(eventData?.actor),
        triggeredAt: asString(eventData?.triggeredAt) || new Date().toISOString(),
        deployedUrl: asString(eventData?.deployedUrl),
        durationMs: asNumber(eventData?.durationMs),
    };
}

function buildIncidentId(event: NormalizedFirebaseDeploymentEvent): string {
    const workflowKey = slugify(event.workflowName || event.workflowFile || 'firebase-deploy');
    const runKey = event.runId || Date.now().toString();
    const attempt = event.attempt ?? 1;
    return `firebase-deployment-${workflowKey}-${runKey}-${attempt}`;
}

function buildRunLabel(event: NormalizedFirebaseDeploymentEvent): string {
    if (event.runUrl && event.runNumber) {
        return `<${event.runUrl}|Run #${event.runNumber}>`;
    }

    if (event.runUrl) {
        return `<${event.runUrl}|View run>`;
    }

    if (event.runNumber) {
        return `Run #${event.runNumber}`;
    }

    return 'Run unavailable';
}

function buildFailureFallbackText(event: NormalizedFirebaseDeploymentEvent): string {
    return `Firebase deployment failed — ${event.workflowName}${event.shortSha ? ` (${event.shortSha})` : ''}`;
}

function buildFailureBlocks(
    event: NormalizedFirebaseDeploymentEvent,
    incidentId: string,
): Record<string, unknown>[] {
    const fields: Array<{ type: string; text: string }> = [
        { type: 'mrkdwn', text: `*Workflow*\n${event.workflowName}` },
        { type: 'mrkdwn', text: `*Run*\n${buildRunLabel(event)}` },
    ];

    if (event.shortSha) {
        fields.push({ type: 'mrkdwn', text: `*Commit*\n\`${event.shortSha}\`` });
    }
    if (event.branch) {
        fields.push({ type: 'mrkdwn', text: `*Branch*\n${event.branch}` });
    }
    if (event.failureStep) {
        fields.push({ type: 'mrkdwn', text: `*Failure Step*\n${event.failureStep}` });
    }
    if (event.deployTarget) {
        fields.push({ type: 'mrkdwn', text: `*Target*\n${event.deployTarget}` });
    }

    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: '🚨 Firebase Deployment Failed', emoji: true },
        },
        {
            type: 'section',
            fields,
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*Failure Summary*\n${event.failureSummary}`,
            },
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Incident \`${incidentId}\` • Linus has been dispatched to diagnose, fix, and redeploy.`,
                },
            ],
        },
    ];
}

function buildSuccessBlocks(
    event: NormalizedFirebaseDeploymentEvent,
    incidentId: string,
    linusSummary: string | null,
): Record<string, unknown>[] {
    const fields: Array<{ type: string; text: string }> = [
        { type: 'mrkdwn', text: `*Workflow*\n${event.workflowName}` },
        { type: 'mrkdwn', text: `*Run*\n${buildRunLabel(event)}` },
    ];

    if (event.shortSha) {
        fields.push({ type: 'mrkdwn', text: `*Commit*\n\`${event.shortSha}\`` });
    }
    if (event.deployTarget) {
        fields.push({ type: 'mrkdwn', text: `*Target*\n${event.deployTarget}` });
    }
    if (event.deployedUrl) {
        fields.push({ type: 'mrkdwn', text: `*Firebase URL*\n<${event.deployedUrl}|Open deployment>` });
    }

    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: '✅ Firebase Deployment Recovered', emoji: true },
        },
        {
            type: 'section',
            fields,
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: linusSummary
                    ? `*What Linus Fixed*\n${linusSummary}`
                    : '*What Linus Fixed*\nRepair summary is still pending; deployment succeeded before the final report landed.',
            },
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Incident \`${incidentId}\` marked resolved.`,
                },
            ],
        },
    ];
}

function buildLinusPrompt(event: NormalizedFirebaseDeploymentEvent, incidentId: string): string {
    return `You are responding to a failed Firebase deployment.

Incident ID: ${incidentId}
Workflow: ${event.workflowName}
${event.workflowFile ? `Workflow file: ${event.workflowFile}` : ''}
Run: ${event.runUrl || event.runNumber || 'unavailable'}
${event.shortSha ? `Commit: ${event.shortSha}` : ''}
${event.branch ? `Branch: ${event.branch}` : ''}
${event.failureStep ? `Failure step: ${event.failureStep}` : ''}
${event.deployTarget ? `Deploy target: ${event.deployTarget}` : ''}
${event.provider ? `Provider: ${event.provider}` : ''}
Failed at: ${event.triggeredAt}

Failure summary:
${event.failureSummary}

Directive:
1. Inspect the failing workflow and reproduce the root cause from the codebase.
2. Implement the smallest correct fix.
3. Verify the fix with the narrowest relevant tests or type checks.
4. Push the repair if needed so Firebase deployment can proceed.
5. Reply with a concise repair report that includes:
   - root cause
   - files changed
   - validation run
   - deployment status or next blocker

Keep the response crisp and operational.`;
}

async function findLatestOpenIncident(
    orgId: string,
    event: NormalizedFirebaseDeploymentEvent,
): Promise<{ id: string; data: IncidentRecord } | null> {
    const snapshot = await getAdminFirestore()
        .collection(INCIDENT_COLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(25)
        .get();

    for (const doc of snapshot.docs) {
        const data = doc.data() as IncidentRecord;
        if (data.orgId !== orgId) {
            continue;
        }
        if (data.resolvedAt) {
            continue;
        }
        if (data.workflowName && data.workflowName !== event.workflowName) {
            continue;
        }

        return { id: doc.id, data };
    }

    return null;
}

function getIncidentNestedRecord(record: IncidentRecord, key: string): IncidentRecord | null {
    const value = record[key];
    return value && typeof value === 'object' ? value as IncidentRecord : null;
}

async function handleDeploymentFailure(
    request: FirebaseDeploymentPlaybookRequest,
    event: NormalizedFirebaseDeploymentEvent,
): Promise<FirebaseDeploymentIncidentResponse> {
    const orgId = request.orgId || SUPER_USER_ORG;
    const channelName = getConfiguredChannelName(request.step);
    const incidentId = buildIncidentId(event);
    const incidentsRef = getAdminFirestore().collection(INCIDENT_COLLECTION);
    const incidentRef = incidentsRef.doc(incidentId);
    const existingIncident = await incidentRef.get();

    if (existingIncident.exists) {
        logger.info('[FirebaseDeploymentIncident] Duplicate failure event ignored', {
            incidentId,
            workflowName: event.workflowName,
            runId: event.runId,
        });
        return {
            success: true,
            accepted: true,
            mode: 'failure',
            incidentId,
        };
    }

    const slackResult = await postLinusIncidentSlack({
        source: 'auto-escalator',
        incidentId,
        channelName,
        fallbackText: buildFailureFallbackText(event),
        blocks: buildFailureBlocks(event, incidentId),
    });

    await incidentRef.set({
        id: incidentId,
        orgId,
        playbookId: request.playbookId || null,
        workflowName: event.workflowName,
        workflowFile: event.workflowFile,
        deployTarget: event.deployTarget,
        provider: event.provider,
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolvedAt: null,
        failure: event,
        slack: {
            channelId: slackResult.channelId,
            channelName: channelName,
            threadTs: slackResult.ts,
            initialDelivery: slackResult.delivery,
            initialMessageSent: slackResult.sent,
        },
        linus: {
            status: 'queued',
            summary: null,
            decision: null,
            model: null,
            lastUpdatedAt: new Date(),
        },
    });

    setImmediate(() => {
        void (async () => {
            try {
                await incidentRef.set({
                    status: 'repairing',
                    updatedAt: new Date(),
                    linus: {
                        status: 'running',
                        lastUpdatedAt: new Date(),
                    },
                }, { merge: true });

                const linusResult = await dispatchLinusIncidentResponse({
                    prompt: buildLinusPrompt(event, incidentId),
                    source: 'auto-escalator',
                    incidentId,
                    channelName,
                    threadTs: slackResult.ts ?? undefined,
                    maxIterations: getConfiguredMaxIterations(request.step),
                    analysisHeader: '🛠️ Linus — Firebase Repair Summary',
                    analysisFallbackPrefix: '🛠️ Linus repair summary',
                });

                const latestIncident = await incidentRef.get();
                const latestData = latestIncident.exists && typeof latestIncident.data === 'function'
                    ? latestIncident.data() as IncidentRecord
                    : undefined;
                const nextStatus = latestData?.resolvedAt
                    ? 'resolved'
                    : linusResult.status === 'posted'
                        ? 'repaired'
                        : 'repair_failed';

                await incidentRef.set({
                    status: nextStatus,
                    updatedAt: new Date(),
                    linus: {
                        status: linusResult.status,
                        summary: linusResult.content,
                        decision: linusResult.decision || null,
                        model: linusResult.model || null,
                        channelId: linusResult.channelId || null,
                        channelName: linusResult.channelName || channelName,
                        threadTs: linusResult.threadTs || slackResult.ts || null,
                        delivery: linusResult.delivery || 'none',
                        lastUpdatedAt: new Date(),
                    },
                }, { merge: true });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);

                logger.error('[FirebaseDeploymentIncident] Linus repair dispatch failed', {
                    incidentId,
                    error: message,
                });

                const latestIncident = await incidentRef.get();
                const latestData = latestIncident.exists && typeof latestIncident.data === 'function'
                    ? latestIncident.data() as IncidentRecord
                    : undefined;

                await incidentRef.set({
                    status: latestData?.resolvedAt ? 'resolved' : 'repair_failed',
                    updatedAt: new Date(),
                    linus: {
                        status: 'failed',
                        summary: message,
                        lastUpdatedAt: new Date(),
                    },
                }, { merge: true });
            }
        })();
    });

    return {
        success: true,
        accepted: true,
        mode: 'failure',
        incidentId,
    };
}

function buildCleanDeploySuccessBlocks(
    event: NormalizedFirebaseDeploymentEvent,
): Record<string, unknown>[] {
    const fields: Array<{ type: string; text: string }> = [
        { type: 'mrkdwn', text: `*Branch*\n${event.branch || 'main'}` },
        { type: 'mrkdwn', text: `*Run*\n${buildRunLabel(event)}` },
    ];

    if (event.shortSha) {
        fields.push({ type: 'mrkdwn', text: `*Commit*\n\`${event.shortSha}\`` });
    }
    if (event.actor) {
        fields.push({ type: 'mrkdwn', text: `*Pushed by*\n${event.actor}` });
    }
    if (event.deployedUrl) {
        fields.push({ type: 'mrkdwn', text: `*Live*\n<${event.deployedUrl}|bakedbot.ai>` });
    }

    return [
        {
            type: 'header',
            text: { type: 'plain_text', text: '🚀 Push Deployed Successfully', emoji: true },
        },
        {
            type: 'section',
            fields,
        },
    ];
}

async function handleDeploymentSuccess(
    request: FirebaseDeploymentPlaybookRequest,
    event: NormalizedFirebaseDeploymentEvent,
): Promise<FirebaseDeploymentIncidentResponse> {
    const orgId = request.orgId || SUPER_USER_ORG;
    const incident = await findLatestOpenIncident(orgId, event);

    if (!incident) {
        // No open incident — notify #linus-deployment and persist a record so the dashboard tracks every deploy.
        const cleanIncidentId = buildIncidentId(event);
        const slackResult = await postLinusIncidentSlack({
            source: 'auto-escalator',
            incidentId: cleanIncidentId,
            channelName: DEFAULT_CHANNEL_NAME,
            fallbackText: `Push deployed — ${event.workflowName}${event.shortSha ? ` (${event.shortSha})` : ''}${event.actor ? ` by ${event.actor}` : ''}`,
            blocks: buildCleanDeploySuccessBlocks(event),
        });

        await getAdminFirestore()
            .collection(INCIDENT_COLLECTION)
            .doc(cleanIncidentId)
            .set({
                id: cleanIncidentId,
                orgId,
                playbookId: request.playbookId || null,
                workflowName: event.workflowName,
                workflowFile: event.workflowFile,
                deployTarget: event.deployTarget,
                provider: event.provider,
                status: 'clean_success',
                createdAt: new Date(),
                updatedAt: new Date(),
                resolvedAt: new Date(),
                success: event,
                slack: {
                    channelId: slackResult.channelId,
                    channelName: DEFAULT_CHANNEL_NAME,
                    threadTs: slackResult.ts,
                    initialDelivery: slackResult.delivery,
                    initialMessageSent: slackResult.sent,
                },
            });

        logger.info('[FirebaseDeploymentIncident] Clean deploy recorded to #linus-deployment', {
            incidentId: cleanIncidentId,
            workflowName: event.workflowName,
            runId: event.runId,
            shortSha: event.shortSha,
        });
        return {
            success: true,
            accepted: true,
            mode: 'success',
            incidentId: cleanIncidentId,
        };
    }

    const slackRecord = getIncidentNestedRecord(incident.data, 'slack');
    const linusRecord = getIncidentNestedRecord(incident.data, 'linus');
    const slackThreadTs = asString(slackRecord?.threadTs);
    const channelName = asString(slackRecord?.channelName) || getConfiguredChannelName(request.step);
    const linusSummary = asString(linusRecord?.summary);

    await postLinusIncidentSlack({
        source: 'auto-escalator',
        incidentId: incident.id,
        channelName,
        threadTs: slackThreadTs || undefined,
        fallbackText: `Firebase deployment recovered — ${event.workflowName}${event.shortSha ? ` (${event.shortSha})` : ''}`,
        blocks: buildSuccessBlocks(event, incident.id, linusSummary),
    });

    await getAdminFirestore()
        .collection(INCIDENT_COLLECTION)
        .doc(incident.id)
        .set({
            status: 'resolved',
            updatedAt: new Date(),
            resolvedAt: new Date(),
            success: event,
        }, { merge: true });

    return {
        success: true,
        accepted: true,
        mode: 'success',
        incidentId: incident.id,
    };
}

export async function queueFirebaseDeploymentPlaybookEvent(
    request: FirebaseDeploymentPlaybookRequest,
): Promise<FirebaseDeploymentIncidentResponse> {
    const event = normalizeFirebaseDeploymentEvent(request.eventData);
    if (!event) {
        logger.warn('[FirebaseDeploymentIncident] Ignoring unsupported deployment event payload', {
            orgId: request.orgId || SUPER_USER_ORG,
            playbookId: request.playbookId || null,
            eventName: request.eventData?.eventName || null,
        });
        return {
            success: true,
            accepted: true,
            mode: 'ignored',
            incidentId: null,
        };
    }

    if (event.eventName === 'deployment.firebase.failed') {
        return handleDeploymentFailure(request, event);
    }

    return handleDeploymentSuccess(request, event);
}
