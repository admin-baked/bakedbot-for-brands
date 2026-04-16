export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    buildDreamReviewDigest,
    getDreamAgentsForGroup,
    getDreamProfile,
    isDreamModel,
    isDreamRolloutGroup,
    runDreamSession,
    sessionNeedsReview,
    type DreamModel,
    type DreamSession,
    type DreamRolloutGroup,
} from '@/server/services/letta/dream-loop';

export const maxDuration = 600; // 10 min — up to 19 agents × ~15s each with stagger delays

// Sleep between agents to respect Groq free tier (30 req/min).
// Each agent makes ~5-6 GLM calls in a burst; 10s gap keeps us at ~22 req/min across the batch.
const INTER_AGENT_SLEEP_MS = 10_000;

async function handler(req: NextRequest): Promise<NextResponse> {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ success: false, error: 'Server misconfiguration' }, { status: 500 });
    }
    const auth = req.headers.get('Authorization');
    if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: { agent?: string; group?: string; model?: string; orgId?: string } = {};
    if (req.method === 'POST') {
        try {
            body = await req.json();
        } catch {
            // optional
        }
    }

    const agent = body.agent || req.nextUrl.searchParams.get('agent') || undefined;
    const requestedGroup = body.group || req.nextUrl.searchParams.get('group');
    if (requestedGroup && !isDreamRolloutGroup(requestedGroup)) {
        return NextResponse.json(
            { success: false, error: `Invalid dream rollout group "${requestedGroup}".` },
            { status: 400 },
        );
    }
    const group: DreamRolloutGroup = (requestedGroup as DreamRolloutGroup) || 'initial_slack';
    const orgId = body.orgId || req.nextUrl.searchParams.get('orgId') || undefined;
    const requestedModel = body.model || req.nextUrl.searchParams.get('model') || undefined;

    let model: DreamModel | undefined;
    if (isDreamModel(requestedModel)) {
        model = requestedModel;
    }

    let agents: string[] = [];
    try {
        if (agent) {
            agents = [getDreamProfile(agent).agentId];
        } else {
            agents = getDreamAgentsForGroup(group);
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Invalid dream agent request' },
            { status: 400 },
        );
    }

    const sessions: Array<{ agentId: string; sessionId: string; confirmed: number; needsReview: boolean }> = [];
    const failures: Array<{ agentId: string; error: string }> = [];
    const reviewSessions: DreamSession[] = [];

    for (let i = 0; i < agents.length; i++) {
        const agentId = agents[i];
        // Stagger agents to avoid bursting Groq's 30 req/min free-tier limit
        if (i > 0) await new Promise(resolve => setTimeout(resolve, INTER_AGENT_SLEEP_MS));
        try {
            const session = await runDreamSession(agentId, model, { orgId });
            sessions.push({
                agentId: session.agentId,
                sessionId: session.id,
                confirmed: session.hypotheses.filter(h => h.testResult === 'confirmed').length,
                needsReview: sessionNeedsReview(session),
            });
            if (sessionNeedsReview(session)) {
                reviewSessions.push(session);
            }
        } catch (error) {
            failures.push({
                agentId,
                error: error instanceof Error ? error.message : String(error),
            });
            // Still sleep after a failure to protect rate limits
            if (i < agents.length - 1) await new Promise(resolve => setTimeout(resolve, INTER_AGENT_SLEEP_MS));
        }
    }

    if (reviewSessions.length > 0) {
        const { postLinusIncidentSlack } = await import('@/server/services/incident-notifications');
        const digest = buildDreamReviewDigest(reviewSessions, agent ? agents[0] : group, orgId);
        for (const channelName of ['linus-cto', 'ceo']) {
            await postLinusIncidentSlack({
                source: 'agent-dream-batch',
                channelName,
                fallbackText: `Dream rollout review: ${reviewSessions.length} session(s) need signoff`,
                blocks: [
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: digest },
                    },
                ],
            });
        }
    }

    logger.info('[AgentDream] Completed rollout', {
        agent,
        group,
        orgId,
        requestedModel: model || null,
        sessions: sessions.length,
        failures: failures.length,
        reviewSessions: reviewSessions.length,
    });

    return NextResponse.json({
        success: failures.length === 0,
        agent: agent || null,
        group: agent ? null : group,
        orgId: orgId || null,
        model: model || 'default',
        sessions,
        failures,
        review_sessions: reviewSessions.length,
    });
}

export async function GET(req: NextRequest) { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
