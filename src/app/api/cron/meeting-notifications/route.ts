/**
 * Meeting Notifications Cron Job
 * Runs every 5-10 minutes. 
 * 1. Finds meetings starting in ~1 hour for reminders.
 * 2. Finds meetings starting now for "Starting Now" alerts.
 *
 * Cloud Scheduler: POST /api/cron/meeting-notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getMeetingsNeeding24HourReminder,
    mark24HourReminderSent,
    getMeetingsNeedingOneHourReminder,
    markOneHourReminderSent,
    getMeetingsNeedingStartNotification,
    markStartNotificationSent,
    getExecutiveProfile
} from '@/server/actions/executive-calendar';
import {
    send24HourReminderEmail,
    sendOneHourReminderEmail,
    sendMeetingStartedEmail
} from '@/server/services/executive-calendar/booking-emails';
import { logger } from '@/lib/logger';

export const maxDuration = 120;

async function handleNotifications() {
    let reminder24Count = 0;
    let reminderCount = 0;
    let startCount = 0;

    // 1. Handle 24-hour reminders
    const reminder24Meetings = await getMeetingsNeeding24HourReminder();
    for (const booking of reminder24Meetings) {
        try {
            const profile = await getExecutiveProfile(booking.profileSlug);
            if (!profile) continue;

            await send24HourReminderEmail(booking, profile);
            await mark24HourReminderSent(booking.id);
            reminder24Count++;

            logger.info(`[MeetingNotifications] 24-hour reminder sent: ${booking.id}`);
        } catch (err) {
            logger.error(`[MeetingNotifications] 24h reminder failed for ${booking.id}: ${String(err)}`);
        }
    }

    // 2. Handle 1-hour reminders
    const reminderMeetings = await getMeetingsNeedingOneHourReminder();
    for (const booking of reminderMeetings) {
        try {
            const profile = await getExecutiveProfile(booking.profileSlug);
            if (!profile) continue;

            await sendOneHourReminderEmail(booking, profile);
            await markOneHourReminderSent(booking.id);
            reminderCount++;
            
            logger.info(`[MeetingNotifications] 1-hour reminder sent: ${booking.id}`);
        } catch (err) {
            logger.error(`[MeetingNotifications] Reminder failed for ${booking.id}: ${String(err)}`);
        }
    }

    // 2. Handle "Starting Now" notifications
    const startMeetings = await getMeetingsNeedingStartNotification();
    for (const booking of startMeetings) {
        try {
            const profile = await getExecutiveProfile(booking.profileSlug);
            if (!profile) continue;

            await sendMeetingStartedEmail(booking, profile);
            await markStartNotificationSent(booking.id);
            startCount++;

            logger.info(`[MeetingNotifications] Start notification sent: ${booking.id}`);
        } catch (err) {
            logger.error(`[MeetingNotifications] Start notification failed for ${booking.id}: ${String(err)}`);
        }
    }

    return { reminders24h: reminder24Count, reminders1h: reminderCount, startingNow: startCount };
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

        const stats = await handleNotifications();
        return NextResponse.json({ success: true, ...stats });
    } catch (err) {
        logger.error(`[CRON meeting-notifications] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Notifications cron failed' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    return POST(request);
}
