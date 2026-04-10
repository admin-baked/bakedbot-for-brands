export const dynamic = 'force-dynamic';
/**
 * Marty Meeting Reminder Cron
 * POST /api/cron/marty-meeting-reminder
 *
 * Runs every 5 minutes. Checks for CEO meetings needing:
 * 1. 30-minute Slack confirmation ping
 * 2. 15-minute Slack confirmation ping (final warning)
 * 3. Auto-reschedule if CEO didn't confirm at 15 minutes
 *
 * Tracks confirmation state in Firestore on the booking doc:
 *   - martyReminder30Sent: boolean
 *   - martyReminder15Sent: boolean
 *   - ceoConfirmed: boolean (set by Slack button action)
 *
 * Cloud Scheduler:
 *   gcloud scheduler jobs create http marty-meeting-reminder \
 *     --schedule="*\/5 * * * *" --time-zone="America/New_York" \
 *     --uri="https://bakedbot-prod--studio-567050101-bc6e8.us-central1.hosted.app/api/cron/marty-meeting-reminder" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer $CRON_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/auth/cron';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { postLinusIncidentSlack } from '@/server/services/incident-notifications';
import { sendGenericEmail } from '@/lib/email/dispatcher';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const authError = await requireCronSecret(request, 'marty-meeting-reminder');
    if (authError) return authError;

    try {
        const result = await checkMeetingReminders();
        return NextResponse.json({ success: true, ...result });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error('[MartyMeetingReminder] Failed', { error: msg });
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}

async function checkMeetingReminders() {
    const db = getAdminFirestore();
    const now = new Date();

    // Find all confirmed meetings for Martez starting in the next 35 minutes
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000);

    const snap = await db.collection('meeting_bookings')
        .where('profileSlug', '==', 'martez')
        .where('status', '==', 'confirmed')
        .where('startAt', '>=', Timestamp.fromDate(now))
        .where('startAt', '<=', Timestamp.fromDate(windowEnd))
        .orderBy('startAt', 'asc')
        .get();

    let sent30 = 0;
    let sent15 = 0;
    let rescheduled = 0;

    for (const doc of snap.docs) {
        const data = doc.data();
        const startAt = data.startAt?.toDate?.() as Date;
        if (!startAt) continue;

        const minutesUntil = (startAt.getTime() - now.getTime()) / 60000;
        const meetingTime = startAt.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: '2-digit',
        });

        // 30-minute reminder (25-35 min window)
        if (minutesUntil >= 25 && minutesUntil <= 35 && !data.martyReminder30Sent) {
            await postLinusIncidentSlack({
                source: 'marty-meeting-reminder',
                channelName: 'ceo',
                fallbackText: `Meeting in 30 minutes: ${data.meetingTypeName} with ${data.externalName}`,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `:alarm_clock: *Meeting in 30 minutes*\n\n• *${meetingTime}* — ${data.meetingTypeName} with *${data.externalName}*\n• Purpose: ${data.purpose || 'Not specified'}\n• :video_camera: ${data.videoRoomUrl || 'Link pending'}\n\nReply *"confirmed"* or *"yes"* to confirm you'll be there.\n_If you don't confirm by 15 minutes before, I'll email ${data.externalName} to reschedule._`,
                        },
                    },
                ],
            });

            await doc.ref.update({
                martyReminder30Sent: true,
                martyReminder30SentAt: Timestamp.now(),
            });
            sent30++;
            logger.info('[MartyMeetingReminder] 30-min reminder sent', { bookingId: doc.id, meeting: data.externalName });
        }

        // 15-minute reminder (10-20 min window)
        if (minutesUntil >= 10 && minutesUntil <= 20 && data.martyReminder30Sent && !data.martyReminder15Sent) {
            if (data.ceoConfirmed) {
                // CEO already confirmed — just send a heads up
                await postLinusIncidentSlack({
                    source: 'marty-meeting-reminder',
                    channelName: 'ceo',
                    fallbackText: `Meeting in 15 minutes — you're confirmed!`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `:white_check_mark: *Meeting in 15 minutes — you're confirmed*\n• *${meetingTime}* — ${data.meetingTypeName} with *${data.externalName}*\n• :video_camera: ${data.videoRoomUrl || 'Link pending'}\n\n_Get ready — I'll have your prep brief ready._`,
                            },
                        },
                    ],
                });
            } else {
                // CEO has NOT confirmed — final warning
                await postLinusIncidentSlack({
                    source: 'marty-meeting-reminder',
                    channelName: 'ceo',
                    fallbackText: `⚠️ 15 minutes — no confirmation for ${data.externalName}`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `:warning: *15 minutes — you haven't confirmed*\n• *${meetingTime}* — ${data.meetingTypeName} with *${data.externalName}*\n\n:rotating_light: *Reply "confirmed" NOW or I will email ${data.externalName} to apologize and reschedule.*\n_I'm protecting your reputation — no-shows hurt trust._`,
                            },
                        },
                    ],
                });
            }

            await doc.ref.update({
                martyReminder15Sent: true,
                martyReminder15SentAt: Timestamp.now(),
            });
            sent15++;
        }

        // Auto-reschedule (5-10 min before meeting, 15-min reminder sent, no confirmation)
        if (minutesUntil >= 5 && minutesUntil <= 10
            && data.martyReminder15Sent && !data.ceoConfirmed && !data.martyAutoRescheduled) {
            // Send apology + reschedule email to the guest
            try {
                const bookingUrl = `https://bakedbot.ai/book/martez`;
                await sendGenericEmail({
                    to: data.externalEmail,
                    name: data.externalName,
                    fromEmail: 'martez@bakedbot.ai',
                    fromName: 'Martez Knox — BakedBot AI',
                    subject: `Rescheduling our meeting — my apologies`,
                    htmlBody: `<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
<p>Hi ${data.externalName},</p>

<p>I sincerely apologize — something came up and I need to reschedule our meeting that was set for today at ${meetingTime}.</p>

<p>I value your time and want to make sure we can connect properly. Would you mind picking a new time that works for you?</p>

<p style="margin: 24px 0;">
  <a href="${bookingUrl}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
    Reschedule Meeting →
  </a>
</p>

<p>Again, my apologies for the inconvenience. Looking forward to connecting.</p>

<p>Best,<br>
<strong>Martez Knox</strong><br>
CEO & Founder, BakedBot AI</p>
</div>`,
                    communicationType: 'transactional',
                    agentName: 'marty-auto-reschedule',
                });

                await doc.ref.update({
                    martyAutoRescheduled: true,
                    martyAutoRescheduledAt: Timestamp.now(),
                    status: 'cancelled',
                    updatedAt: Timestamp.now(),
                });

                // Notify CEO on Slack
                await postLinusIncidentSlack({
                    source: 'marty-meeting-reminder',
                    channelName: 'ceo',
                    fallbackText: `Auto-rescheduled: ${data.externalName}`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `:no_entry_sign: *Meeting auto-rescheduled*\n\nYou didn't confirm for your *${meetingTime}* meeting with *${data.externalName}*, so I:\n1. Sent them a professional apology email\n2. Included a link to rebook: ${bookingUrl}\n3. Cancelled this booking\n\n_No-shows hurt trust. I've got your back — but try to confirm next time._`,
                            },
                        },
                    ],
                });

                rescheduled++;
                logger.info('[MartyMeetingReminder] Auto-rescheduled', {
                    bookingId: doc.id,
                    guest: data.externalName,
                    email: data.externalEmail,
                });
            } catch (err) {
                logger.error('[MartyMeetingReminder] Auto-reschedule failed', {
                    bookingId: doc.id,
                    error: String(err),
                });
            }
        }
    }

    return { checked: snap.size, sent30, sent15, rescheduled };
}
