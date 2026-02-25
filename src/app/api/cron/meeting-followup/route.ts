/**
 * Meeting Follow-Up Cron Job
 * Runs every 15 minutes. Finds meetings that ended 10-20 minutes ago.
 * Craig generates a follow-up email and sends it to the external guest via Mailjet.
 *
 * Cloud Scheduler: POST /api/cron/meeting-followup  (every 15 min)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getMeetingsNeedingFollowUp,
    markFollowUpSent,
    getExecutiveProfile,
} from '@/server/actions/executive-calendar';
import { sendFollowUpEmail } from '@/server/services/executive-calendar/booking-emails';
import { logger } from '@/lib/logger';

export const maxDuration = 120;

async function handleFollowUps() {
    const meetings = await getMeetingsNeedingFollowUp();
    if (meetings.length === 0) return { processed: 0 };

    let processed = 0;

    for (const booking of meetings) {
        try {
            const profile = await getExecutiveProfile(booking.profileSlug);
            if (!profile) continue;

            // Use stored notes if Felisha already processed the transcript,
            // otherwise generate a generic follow-up via Craig
            const meetingNotes = booking.meetingNotes ?? await generateFollowUpNotes(booking, profile.displayName);
            const actionItems = booking.actionItems ?? [];

            await sendFollowUpEmail(booking, profile, meetingNotes, actionItems);
            await markFollowUpSent(booking.id);
            processed++;

            logger.info(`[MeetingFollowUp] Follow-up sent for booking: ${booking.id}`);
        } catch (err) {
            logger.error(`[MeetingFollowUp] Failed for booking ${booking.id}: ${String(err)}`);
        }
    }

    return { processed };
}

async function generateFollowUpNotes(
    booking: Awaited<ReturnType<typeof getMeetingsNeedingFollowUp>>[0],
    execName: string,
): Promise<string> {
    try {
        const { callClaude } = await import('@/ai/claude');

        const followUp = await callClaude({
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 400,
            systemPrompt: `You are Craig, BakedBot's Marketer. Write a warm, professional follow-up email body (no subject line, no greeting — just the body paragraphs).
Be concise. Keep it human. Maximum 3 short paragraphs.`,
            userMessage: `Write a follow-up email body after a meeting between ${execName} and ${booking.externalName}.

Meeting details:
- Type: ${booking.meetingTypeName} (${booking.durationMinutes} min)
- Their purpose: ${booking.purpose}

Reference what was likely discussed based on the meeting purpose. Offer a clear next step.`,
        });

        return followUp || 'Thank you for your time. We look forward to connecting further.';
    } catch {
        return `Thank you for taking the time to meet with ${execName}. We appreciated the conversation and will follow up shortly with next steps.`;
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

        const result = await handleFollowUps();
        return NextResponse.json({ success: true, ...result });
    } catch (err) {
        logger.error(`[CRON meeting-followup] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Follow-up cron failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
