/**
 * Meeting Prep Brief Cron Job
 * Runs every 15 minutes. Finds meetings starting in 20-40 minutes.
 * Leo generates a prep brief and posts it to the CEO's inbox as an InboxThread.
 *
 * Cloud Scheduler: POST /api/cron/meeting-prep  (every 15 min)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMeetingsNeedingPrepBrief, markPrepBriefSent, getExecutiveProfile } from '@/server/actions/executive-calendar';
import { logger } from '@/lib/logger';

export const maxDuration = 120;

async function handlePrepBriefs() {
    const meetings = await getMeetingsNeedingPrepBrief();
    if (meetings.length === 0) return { processed: 0 };

    let processed = 0;

    for (const booking of meetings) {
        try {
            const profile = await getExecutiveProfile(booking.profileSlug);
            if (!profile) continue;

            const prepBrief = await generatePrepBrief(booking, profile.displayName, profile.title);

            // Post to inbox as a Leo thread
            await postPrepBriefToInbox(booking, profile.displayName, prepBrief);

            await markPrepBriefSent(booking.id);
            processed++;

            logger.info(`[MeetingPrep] Prep brief sent for booking: ${booking.id}`);
        } catch (err) {
            logger.error(`[MeetingPrep] Failed for booking ${booking.id}: ${String(err)}`);
        }
    }

    return { processed };
}

async function generatePrepBrief(
    booking: Awaited<ReturnType<typeof getMeetingsNeedingPrepBrief>>[0],
    execName: string,
    execTitle: string,
): Promise<string> {
    const { callClaude } = await import('@/ai/claude');

    const startFormatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(booking.startAt);

    const brief = await callClaude({
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 800,
        systemPrompt: `You are Leo, Chief Operating Officer. You're generating a pre-meeting prep brief for ${execName} (${execTitle}).
Keep it tight — 30 seconds to read before a meeting. Use markdown formatting.`,
        userMessage: `Generate a meeting prep brief for this upcoming meeting:

**Who:** ${booking.externalName} <${booking.externalEmail}>
**When:** Today at ${startFormatted} (${booking.durationMinutes} min)
**Type:** ${booking.meetingTypeName}
**Their stated purpose:** ${booking.purpose}

Include:
1. **Goal** — What ${execName} should aim to accomplish
2. **Key Talking Points** — 3 bullets based on the meeting purpose
3. **Questions to Ask** — 2 good discovery/qualification questions
4. **Quick Notes** — Any relevant context about this type of meeting`,
    });

    return brief || 'Prep brief could not be generated.';
}

async function postPrepBriefToInbox(
    booking: Awaited<ReturnType<typeof getMeetingsNeedingPrepBrief>>[0],
    execName: string,
    briefContent: string,
): Promise<void> {
    try {
        const { getAdminFirestore } = await import('@/firebase/admin');
        const { Timestamp } = await import('@google-cloud/firestore');

        const firestore = getAdminFirestore();
        const threadRef = firestore.collection('inbox_threads').doc();
        const now = Timestamp.now();

        const startFormatted = new Intl.DateTimeFormat('en-US', {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
        }).format(booking.startAt);

        await threadRef.set({
            id: threadRef.id,
            orgId: 'org_bakedbot_platform',
            userId: 'system',
            type: 'daily_standup',
            status: 'active',
            title: `📋 Prep: ${booking.externalName} @ ${startFormatted}`,
            preview: `Meeting prep brief for ${booking.externalName}. Video: ${booking.videoRoomUrl}`,
            primaryAgent: 'leo',
            assignedAgents: ['leo'],
            artifactIds: [],
            messages: [
                {
                    id: `msg_${Date.now()}`,
                    type: 'agent',
                    content: briefContent,
                    timestamp: now.toDate(),
                    metadata: {
                        agentName: 'Leo (COO)',
                        type: 'meeting_prep',
                    },
                },
            ],
            createdAt: now,
            updatedAt: now,
            lastActivityAt: now,
        });
    } catch (err) {
        logger.warn(`[MeetingPrep] Failed to post to inbox: ${String(err)}`);
    }
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }
        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await handlePrepBriefs();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error(`[CRON meeting-prep] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Prep cron failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
