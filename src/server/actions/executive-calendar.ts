'use server';

/**
 * Executive Calendar Server Actions
 * CRUD for executive profiles, bookings, and availability settings.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import {
    ExecutiveProfile,
    MeetingBooking,
    TimeSlot,
    CreateBookingInput,
    BookingConfirmation,
    ExecProfileSlug,
    AvailabilityConfig,
    BookingStatus,
} from '@/types/executive-calendar';
import { calculateAvailableSlots } from '@/server/services/executive-calendar/availability';
import { createMeetingRoom, buildRoomName } from '@/server/services/executive-calendar/livekit';
import { sendConfirmationEmail } from '@/server/services/executive-calendar/booking-emails';
import {
    getGoogleCalendarBusyTimes,
    createGoogleCalendarEvent,
    deleteGoogleCalendarEvent,
} from '@/server/services/executive-calendar/google-calendar';

// ─── Helpers ────────────────────────────────────────────────────────────────

function firestoreToProfile(data: Record<string, unknown>): ExecutiveProfile {
    return {
        profileSlug: data.profileSlug as ExecProfileSlug,
        userId: data.userId as string | undefined,
        displayName: data.displayName as string,
        title: data.title as string,
        bio: data.bio as string,
        avatarUrl: data.avatarUrl as string | undefined,
        emailAddress: data.emailAddress as string,
        availability: data.availability as ExecutiveProfile['availability'],
        meetingTypes: data.meetingTypes as ExecutiveProfile['meetingTypes'],
        themeColor: (data.themeColor as string) || '#16a34a',
        googleCalendarTokens: data.googleCalendarTokens as ExecutiveProfile['googleCalendarTokens'] | undefined,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    };
}

function firestoreToBooking(id: string, data: Record<string, unknown>): MeetingBooking {
    return {
        id,
        profileSlug: data.profileSlug as ExecProfileSlug,
        meetingTypeId: data.meetingTypeId as string,
        meetingTypeName: data.meetingTypeName as string,
        durationMinutes: data.durationMinutes as number,
        externalName: data.externalName as string,
        externalEmail: data.externalEmail as string,
        purpose: data.purpose as string,
        startAt: (data.startAt as Timestamp)?.toDate() ?? new Date(),
        endAt: (data.endAt as Timestamp)?.toDate() ?? new Date(),
        status: data.status as BookingStatus,
        videoRoomUrl: data.videoRoomUrl as string,
        livekitRoomName: (data.livekitRoomName ?? data.dailyRoomName) as string,
        prepBriefGenerated: Boolean(data.prepBriefGenerated),
        prepBriefSentAt: data.prepBriefSentAt ? (data.prepBriefSentAt as Timestamp).toDate() : null,
        followUpSentAt: data.followUpSentAt ? (data.followUpSentAt as Timestamp).toDate() : null,
        transcript: (data.transcript as string) || null,
        meetingNotes: (data.meetingNotes as string) || null,
        actionItems: (data.actionItems as string[]) || [],
        calendarEventId: (data.calendarEventId as string) || null,
        confirmationEmailSentAt: data.confirmationEmailSentAt
            ? (data.confirmationEmailSentAt as Timestamp).toDate()
            : null,
        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate() ?? new Date(),
    };
}

// ─── Public Reads (no auth required) ────────────────────────────────────────

/**
 * Fetches an executive profile by slug. Returns null if not found.
 */
export async function getExecutiveProfile(
    profileSlug: string,
): Promise<ExecutiveProfile | null> {
    try {
        const firestore = getAdminFirestore();
        const doc = await firestore.collection('executive_profiles').doc(profileSlug).get();
        if (!doc.exists) return null;
        return firestoreToProfile(doc.data() as Record<string, unknown>);
    } catch (err) {
        logger.error('[ExecCalendar] getExecutiveProfile error:', err instanceof Error ? { message: err.message } : { error: String(err) });
        return null;
    }
}

/**
 * Returns available time slots for a profile on a given date.
 * Public — no auth required.
 */
export async function getAvailableSlots(
    profileSlug: string,
    dateIso: string,
    durationMinutes: number,
): Promise<TimeSlot[]> {
    try {
        const profile = await getExecutiveProfile(profileSlug);
        if (!profile) return [];

        // Parse as noon UTC so the date lands on the correct day in all timezones.
        // new Date("YYYY-MM-DD") parses as midnight UTC, which is the previous day
        // in UTC-5 (Eastern) — causing slots to calculate for the wrong date.
        const date = new Date(`${dateIso}T12:00:00Z`);
        const bookings = await getBookingsForDate(profileSlug, date);

        // Merge Google Calendar freebusy — gracefully degrades if not connected
        let allBookings = bookings;
        if (profile.googleCalendarTokens?.refresh_token) {
            const startOfDay = new Date(`${dateIso}T00:00:00Z`);
            const endOfDay = new Date(`${dateIso}T23:59:59Z`);
            const busyTimes = await getGoogleCalendarBusyTimes(
                profile.googleCalendarTokens,
                startOfDay,
                endOfDay,
            );
            // Convert Google busy intervals to fake bookings so hasConflict() reuses existing logic
            const googleBlocks: MeetingBooking[] = busyTimes.map((b, i) => ({
                id: `gcal-block-${i}`,
                profileSlug: profileSlug as ExecProfileSlug,
                meetingTypeId: 'gcal-block',
                meetingTypeName: 'Busy (Google Calendar)',
                durationMinutes: Math.round((b.end.getTime() - b.start.getTime()) / 60000),
                externalName: '',
                externalEmail: '',
                purpose: '',
                startAt: b.start,
                endAt: b.end,
                status: 'confirmed' as BookingStatus,
                videoRoomUrl: '',
                livekitRoomName: '',
                prepBriefGenerated: false,
                prepBriefSentAt: null,
                followUpSentAt: null,
                transcript: null,
                meetingNotes: null,
                actionItems: [],
                calendarEventId: null,
                confirmationEmailSentAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            }));
            allBookings = [...bookings, ...googleBlocks];
        }

        return calculateAvailableSlots(profile, date, allBookings, durationMinutes);
    } catch (err) {
        logger.error('[ExecCalendar] getAvailableSlots error:', err instanceof Error ? { message: err.message } : { error: String(err) });
        return [];
    }
}

async function getBookingsForDate(
    profileSlug: string,
    date: Date,
): Promise<MeetingBooking[]> {
    const firestore = getAdminFirestore();

    // Query by profileSlug only (single-field index — always available, no composite needed).
    // The (profileSlug, startAt) range query requires a composite index that Firestore
    // won't auto-create when a 3-field index already exists. Filter by date range in
    // memory instead — executive calendars have at most a few dozen bookings.
    const snap = await firestore
        .collection('meeting_bookings')
        .where('profileSlug', '==', profileSlug)
        .get();

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return snap.docs
        .map(d => firestoreToBooking(d.id, d.data() as Record<string, unknown>))
        .filter(b => {
            if (b.status === 'cancelled') return false;
            return b.startAt >= startOfDay && b.startAt <= endOfDay;
        });
}

/**
 * Creates a confirmed booking with a Daily.co video room.
 * Public — no auth required (self-service booking).
 */
export async function createBooking(
    profileSlug: string,
    input: CreateBookingInput,
): Promise<BookingConfirmation> {
    const profile = await getExecutiveProfile(profileSlug);
    if (!profile) throw new Error(`Profile not found: ${profileSlug}`);

    const meetingType = profile.meetingTypes.find(mt => mt.id === input.meetingTypeId);
    if (!meetingType) throw new Error(`Meeting type not found: ${input.meetingTypeId}`);

    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);

    const firestore = getAdminFirestore();
    const bookingRef = firestore.collection('meeting_bookings').doc();
    const bookingId = bookingRef.id;

    // Create Daily.co room (expires 30 min after meeting end)
    const roomExpiry = new Date(endAt.getTime() + 30 * 60 * 1000);
    const roomName = buildRoomName(profileSlug, bookingId);

    let videoRoomUrl = `https://bakedbot.daily.co/${roomName}`;
    try {
        const room = await createMeetingRoom(roomName, roomExpiry);
        videoRoomUrl = room.url;
    } catch (err) {
        logger.warn('[ExecCalendar] Daily.co room creation failed, using fallback URL:', err instanceof Error ? { message: err.message } : { error: String(err) });
    }

    const now = Timestamp.now();
    const booking: Omit<MeetingBooking, 'id' | 'createdAt' | 'updatedAt' | 'startAt' | 'endAt'> & {
        createdAt: Timestamp;
        updatedAt: Timestamp;
        startAt: Timestamp;
        endAt: Timestamp;
    } = {
        profileSlug: profileSlug as ExecProfileSlug,
        meetingTypeId: input.meetingTypeId,
        meetingTypeName: meetingType.name,
        durationMinutes: meetingType.durationMinutes,
        externalName: input.externalName,
        externalEmail: input.externalEmail,
        purpose: input.purpose,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        status: 'confirmed',
        videoRoomUrl,
        livekitRoomName: roomName,
        prepBriefGenerated: false,
        prepBriefSentAt: null,
        followUpSentAt: null,
        transcript: null,
        meetingNotes: null,
        actionItems: [],
        confirmationEmailSentAt: null,
        createdAt: now,
        updatedAt: now,
    };

    await bookingRef.set(booking);
    logger.info(`[ExecCalendar] Booking created: ${bookingId} for ${profileSlug}`);

    // Send confirmation emails (non-blocking)
    const fullBooking = firestoreToBooking(bookingId, {
        ...booking,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
    });
    setImmediate(async () => {
        try {
            await sendConfirmationEmail(fullBooking, profile);
            await bookingRef.update({
                confirmationEmailSentAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } catch (err) {
            logger.error('[ExecCalendar] Confirmation email failed:', err instanceof Error ? { message: err.message } : { error: String(err) });
        }
    });

    // Create Google Calendar event (non-blocking — booking confirmed regardless)
    if (profile.googleCalendarTokens?.refresh_token) {
        setImmediate(async () => {
            try {
                const eventId = await createGoogleCalendarEvent(profile.googleCalendarTokens!, {
                    summary: `${meetingType.name} with ${input.externalName}`,
                    description: input.purpose || `Meeting booked via BakedBot — ${meetingType.name}`,
                    startAt,
                    endAt,
                    timezone: profile.availability.timezone,
                    attendeeEmails: [input.externalEmail, profile.emailAddress],
                    videoRoomUrl,
                });
                if (eventId) {
                    await bookingRef.update({ calendarEventId: eventId, updatedAt: Timestamp.now() });
                    logger.info(`[ExecCalendar] Google Calendar event linked: ${eventId} → ${bookingId}`);
                }
            } catch (err) {
                logger.error(`[ExecCalendar] Google Calendar event creation failed for ${bookingId}: ${String(err)}`);
            }
        });
    }

    return {
        bookingId,
        videoRoomUrl,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        displayName: profile.displayName,
        durationMinutes: meetingType.durationMinutes,
        timezone: profile.availability.timezone,
    };
}

// ─── Authenticated Reads ─────────────────────────────────────────────────────

/**
 * Returns upcoming confirmed meetings for a profile. Super User only.
 */
export async function getUpcomingMeetings(
    profileSlug: string,
    limit = 10,
): Promise<MeetingBooking[]> {
    await requireSuperUser();
    try {
        const firestore = getAdminFirestore();
        const snap = await firestore
            .collection('meeting_bookings')
            .where('profileSlug', '==', profileSlug)
            .where('startAt', '>=', Timestamp.fromDate(new Date()))
            .where('status', '==', 'confirmed')
            .orderBy('startAt', 'asc')
            .limit(limit)
            .get();

        return snap.docs.map(d =>
            firestoreToBooking(d.id, d.data() as Record<string, unknown>),
        );
    } catch (err) {
        logger.error('[ExecCalendar] getUpcomingMeetings error:', err instanceof Error ? { message: err.message } : { error: String(err) });
        return [];
    }
}

/**
 * Returns all bookings for both profiles in a date range. Super User only.
 */
export async function getAllMeetingsInRange(
    fromDate: Date,
    toDate: Date,
): Promise<MeetingBooking[]> {
    await requireSuperUser();
    try {
        const firestore = getAdminFirestore();
        const snap = await firestore
            .collection('meeting_bookings')
            .where('startAt', '>=', Timestamp.fromDate(fromDate))
            .where('startAt', '<=', Timestamp.fromDate(toDate))
            .where('status', '!=', 'cancelled')
            .orderBy('startAt', 'asc')
            .get();

        return snap.docs.map(d =>
            firestoreToBooking(d.id, d.data() as Record<string, unknown>),
        );
    } catch (err) {
        logger.error('[ExecCalendar] getAllMeetingsInRange error:', err instanceof Error ? { message: err.message } : { error: String(err) });
        return [];
    }
}

/**
 * Cancels a booking and deletes the Daily.co room. Super User only.
 */
export async function cancelBooking(bookingId: string): Promise<void> {
    await requireSuperUser();
    try {
        const firestore = getAdminFirestore();
        const ref = firestore.collection('meeting_bookings').doc(bookingId);

        // Read before cancellation to capture calendarEventId + profileSlug
        const snap = await ref.get();
        const bookingData = snap.exists ? (snap.data() as Record<string, unknown>) : null;

        await ref.update({
            status: 'cancelled',
            updatedAt: Timestamp.now(),
        });
        logger.info(`[ExecCalendar] Booking cancelled: ${bookingId}`);

        // Delete Google Calendar event (non-blocking)
        if (bookingData?.calendarEventId && bookingData?.profileSlug) {
            setImmediate(async () => {
                try {
                    const profile = await getExecutiveProfile(bookingData.profileSlug as string);
                    if (profile?.googleCalendarTokens?.refresh_token) {
                        await deleteGoogleCalendarEvent(
                            profile.googleCalendarTokens,
                            bookingData.calendarEventId as string,
                        );
                    }
                } catch (err) {
                    logger.error(`[ExecCalendar] Google Calendar delete failed for ${bookingId}: ${String(err)}`);
                }
            });
        }
    } catch (err) {
        logger.error('[ExecCalendar] cancelBooking error:', err instanceof Error ? { message: err.message } : { error: String(err) });
        throw err;
    }
}

/**
 * Updates availability settings for an executive profile. Super User only.
 */
export async function updateAvailabilitySettings(
    profileSlug: string,
    config: AvailabilityConfig,
): Promise<void> {
    await requireSuperUser();
    try {
        const firestore = getAdminFirestore();
        await firestore.collection('executive_profiles').doc(profileSlug).update({
            availability: config,
            updatedAt: Timestamp.now(),
        });
        logger.info(`[ExecCalendar] Availability updated for ${profileSlug}`);
    } catch (err) {
        logger.error('[ExecCalendar] updateAvailabilitySettings error:', err instanceof Error ? { message: err.message } : { error: String(err) });
        throw err;
    }
}

/**
 * Returns all bookings across both profiles for the CEO calendar view.
 * Super User only. Defaults to current month.
 */
export async function getCalendarMeetings(
    year: number,
    month: number,
): Promise<MeetingBooking[]> {
    await requireSuperUser();
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month, 0, 23, 59, 59);
    return getAllMeetingsInRange(from, to);
}

/**
 * Finds meetings that need a prep brief (starting in 20-40 min, brief not yet sent).
 * Used by the cron job.
 */
export async function getMeetingsNeedingPrepBrief(): Promise<MeetingBooking[]> {
    const firestore = getAdminFirestore();
    const now = new Date();
    const windowStart = new Date(now.getTime() + 20 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 40 * 60 * 1000);

    const snap = await firestore
        .collection('meeting_bookings')
        .where('status', '==', 'confirmed')
        .where('prepBriefGenerated', '==', false)
        .where('startAt', '>=', Timestamp.fromDate(windowStart))
        .where('startAt', '<=', Timestamp.fromDate(windowEnd))
        .get();

    return snap.docs.map(d =>
        firestoreToBooking(d.id, d.data() as Record<string, unknown>),
    );
}

/**
 * Marks prep brief as sent for a booking.
 */
export async function markPrepBriefSent(bookingId: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('meeting_bookings').doc(bookingId).update({
        prepBriefGenerated: true,
        prepBriefSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
}

/**
 * Finds meetings that ended 10-20 minutes ago and haven't received a follow-up.
 * Used by the cron job.
 */
export async function getMeetingsNeedingFollowUp(): Promise<MeetingBooking[]> {
    const firestore = getAdminFirestore();
    const now = new Date();
    const windowStart = new Date(now.getTime() - 20 * 60 * 1000);
    const windowEnd = new Date(now.getTime() - 10 * 60 * 1000);

    const snap = await firestore
        .collection('meeting_bookings')
        .where('status', '==', 'confirmed')
        .where('followUpSentAt', '==', null)
        .where('endAt', '>=', Timestamp.fromDate(windowStart))
        .where('endAt', '<=', Timestamp.fromDate(windowEnd))
        .get();

    return snap.docs.map(d =>
        firestoreToBooking(d.id, d.data() as Record<string, unknown>),
    );
}

/**
 * Saves Felisha's transcript + meeting notes after a Daily.co webhook fires.
 */
export async function saveMeetingTranscript(
    bookingId: string,
    transcript: string,
    meetingNotes: string,
    actionItems: string[],
): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('meeting_bookings').doc(bookingId).update({
        transcript,
        meetingNotes,
        actionItems,
        status: 'completed',
        updatedAt: Timestamp.now(),
    });
}

/**
 * Marks follow-up as sent for a booking.
 */
export async function markFollowUpSent(bookingId: string): Promise<void> {
    const firestore = getAdminFirestore();
    await firestore.collection('meeting_bookings').doc(bookingId).update({
        followUpSentAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    });
}
