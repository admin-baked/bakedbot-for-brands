/**
 * Calendar Digest Service
 *
 * Fetches meetings for a given day from two sources:
 *   1. BakedBot meeting_bookings (confirmed Martez/Jack bookings)
 *   2. Google Calendar (external events on connected exec profiles)
 *
 * Deduplicates: BakedBot creates GCal events via sync (stored as calendarEventId),
 * so GCal entries whose ID matches a BakedBot booking are skipped.
 *
 * No auth check — callers are responsible for authentication.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { listGoogleCalendarEvents } from './executive-calendar/google-calendar';
import { logger } from '@/lib/logger';
import type { GoogleCalendarTokens } from '@/types/executive-calendar';

// =============================================================================
// Types
// =============================================================================

export interface CalendarMeetingItem {
    title: string;
    startAt: Date;
    endAt: Date;
    /** Formatted as "9:00 AM" in EST */
    startTime: string;
    source: 'bakedbot' | 'google';
    /** Guest name for BakedBot bookings, attendee email for Google events */
    attendee?: string;
    /** 'martez' or 'jack' */
    profileSlug?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatTimeEST(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
        hour12: true,
    }).format(date);
}

function toDateFromFirestore(val: unknown): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    if (typeof val === 'object' && '_seconds' in (val as Record<string, unknown>)) {
        return new Date((val as { _seconds: number })._seconds * 1000);
    }
    if (typeof val === 'object' && 'toDate' in (val as Record<string, unknown>)) {
        return (val as { toDate: () => Date }).toDate();
    }
    if (typeof val === 'string' || typeof val === 'number') return new Date(val);
    return new Date();
}

function isMissingIndexError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('requires an index') || message.includes('FAILED_PRECONDITION');
}

function appendBakedBotMeetings(
    docs: FirebaseFirestore.QueryDocumentSnapshot[],
    meetings: CalendarMeetingItem[],
    bakedBotEventIds: Set<string>,
    confirmedOnly = true,
): void {
    for (const doc of docs) {
        const data = doc.data();
        if (confirmedOnly && data.status !== 'confirmed') {
            continue;
        }

        const startAt = toDateFromFirestore(data.startAt);
        const endAt = toDateFromFirestore(data.endAt);

        if (data.calendarEventId) {
            bakedBotEventIds.add(data.calendarEventId as string);
        }

        meetings.push({
            title: (data.meetingTypeName as string) ?? (data.type as string) ?? 'BakedBot Meeting',
            startAt,
            endAt,
            startTime: formatTimeEST(startAt),
            source: 'bakedbot',
            attendee: (data.guestName as string) ?? (data.guestEmail as string) ?? undefined,
            profileSlug: data.profileSlug as string | undefined,
        });
    }
}

// =============================================================================
// Core Fetcher
// =============================================================================

/**
 * Fetch all confirmed meetings for the given target date.
 * Merges BakedBot bookings + Google Calendar events, deduplicates, and sorts by start time.
 */
export async function getMeetingsForDay(targetDate: Date): Promise<CalendarMeetingItem[]> {
    // Build day boundaries in EST (UTC-5 or UTC-4 depending on DST)
    // Using simple start-of-day UTC as Firestore stores timestamps in UTC
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const db = getAdminFirestore();
    const meetings: CalendarMeetingItem[] = [];
    const bakedBotEventIds = new Set<string>();

    // --- Step 1: BakedBot bookings ---
    try {
        const snap = await db.collection('meeting_bookings')
            .where('startAt', '>=', dayStart)
            .where('startAt', '<=', dayEnd)
            .where('status', '==', 'confirmed')
            .orderBy('startAt', 'asc')
            .get();

        appendBakedBotMeetings(snap.docs, meetings, bakedBotEventIds);
        logger.info('[CalendarDigest] BakedBot bookings loaded', { count: meetings.length });
    } catch (err) {
        if (isMissingIndexError(err)) {
            logger.warn('[CalendarDigest] meeting_bookings index missing, using bounded fallback', { error: String(err) });

            const fallbackSnap = await db.collection('meeting_bookings')
                .where('startAt', '>=', dayStart)
                .where('startAt', '<=', dayEnd)
                .orderBy('startAt', 'asc')
                .get();

            appendBakedBotMeetings(fallbackSnap.docs, meetings, bakedBotEventIds);
            logger.info('[CalendarDigest] BakedBot bookings loaded via fallback', { count: meetings.length });
        } else {
            logger.warn('[CalendarDigest] BakedBot bookings fetch failed', { error: String(err) });
        }
    }

    // --- Step 2: Google Calendar events for each connected exec profile ---
    const PROFILE_SLUGS = ['martez', 'jack'] as const;

    for (const slug of PROFILE_SLUGS) {
        try {
            const profileDoc = await db.collection('executive_profiles').doc(slug).get();
            if (!profileDoc.exists) continue;

            const tokens = profileDoc.data()?.googleCalendarTokens as GoogleCalendarTokens | undefined;
            if (!tokens?.refresh_token) continue;

            const gcalEvents = await listGoogleCalendarEvents(tokens, dayStart, dayEnd);

            for (const event of gcalEvents) {
                if (event.isAllDay) continue; // Skip all-day events (holidays, OOO)
                if (bakedBotEventIds.has(event.id)) continue; // Already shown from BakedBot

                // External attendee — exclude the exec's own email
                const externalAttendee = event.attendees.find(
                    a => !a.endsWith('@bakedbot.ai') && a.length > 0
                );

                meetings.push({
                    title: event.title,
                    startAt: event.startAt,
                    endAt: event.endAt,
                    startTime: formatTimeEST(event.startAt),
                    source: 'google',
                    attendee: externalAttendee,
                    profileSlug: slug,
                });
            }

            logger.info('[CalendarDigest] Google Calendar events loaded', { slug, count: gcalEvents.length });
        } catch (err) {
            logger.warn('[CalendarDigest] Google Calendar fetch failed', { slug, error: String(err) });
        }
    }

    // Sort by start time
    return meetings.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

/**
 * Get only upcoming meetings (from current time onward) for today.
 * Used by midday pulse to show afternoon agenda only.
 */
export async function getUpcomingMeetingsToday(): Promise<CalendarMeetingItem[]> {
    const allToday = await getMeetingsForDay(new Date());
    const now = Date.now();
    return allToday.filter(m => m.startAt.getTime() > now);
}

/**
 * Get meetings for tomorrow (evening pulse preview).
 */
export async function getTomorrowsMeetings(): Promise<CalendarMeetingItem[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getMeetingsForDay(tomorrow);
}
