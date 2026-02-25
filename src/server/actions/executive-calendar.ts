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
import { createMeetingRoom, buildRoomName } from '@/server/services/executive-calendar/daily-co';
import { sendConfirmationEmail } from '@/server/services/executive-calendar/booking-emails';

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
        dailyRoomName: data.dailyRoomName as string,
        prepBriefGenerated: Boolean(data.prepBriefGenerated),
        prepBriefSentAt: data.prepBriefSentAt ? (data.prepBriefSentAt as Timestamp).toDate() : null,
        followUpSentAt: data.followUpSentAt ? (data.followUpSentAt as Timestamp).toDate() : null,
        transcript: (data.transcript as string) || null,
        meetingNotes: (data.meetingNotes as string) || null,
        actionItems: (data.actionItems as string[]) || [],
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

        const date = new Date(dateIso);
        const bookings = await getBookingsForDate(profileSlug, date);

        return calculateAvailableSlots(profile, date, bookings, durationMinutes);
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
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const snap = await firestore
        .collection('meeting_bookings')
        .where('profileSlug', '==', profileSlug)
        .where('startAt', '>=', Timestamp.fromDate(startOfDay))
        .where('startAt', '<=', Timestamp.fromDate(endOfDay))
        .where('status', '!=', 'cancelled')
        .get();

    return snap.docs.map(d => firestoreToBooking(d.id, d.data() as Record<string, unknown>));
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
        dailyRoomName: roomName,
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
        await ref.update({
            status: 'cancelled',
            updatedAt: Timestamp.now(),
        });
        logger.info(`[ExecCalendar] Booking cancelled: ${bookingId}`);
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
