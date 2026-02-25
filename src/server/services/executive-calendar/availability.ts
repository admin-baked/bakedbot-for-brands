/**
 * Availability Calculation Service
 * Computes open time slots for executive booking pages.
 */

import { ExecutiveProfile, MeetingBooking, TimeSlot } from '@/types/executive-calendar';

/**
 * Returns YYYY-MM-DD for a given date in a specific timezone.
 */
function formatDateYMD(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

/**
 * Gets the day-of-week (0=Sun) for a date in a specific timezone.
 */
function getDayOfWeekInTimezone(date: Date, timezone: string): number {
    const dayName = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: timezone,
    }).format(date);
    const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[dayName] ?? 0;
}

/**
 * Converts a local date-time string (YYYY-MM-DDTHH:MM:00) + timezone to a UTC Date.
 * Uses the Intl offset trick which is reliable across environments.
 */
function localToUtc(dateStr: string, timeStr: string, timezone: string): Date {
    const naiveIso = `${dateStr}T${timeStr}:00`;
    const naive = new Date(naiveIso + 'Z'); // treat as UTC first

    // Get timezone offset at this naive time
    const utcStr = naive.toLocaleString('en-US', { timeZone: 'UTC' });
    const tzStr = naive.toLocaleString('en-US', { timeZone: timezone });
    const utcDate = new Date(utcStr);
    const tzDate = new Date(tzStr);
    const offsetMs = utcDate.getTime() - tzDate.getTime();

    return new Date(naive.getTime() + offsetMs);
}

/**
 * Checks if a proposed slot conflicts with existing bookings (including buffer).
 */
function hasConflict(
    start: Date,
    end: Date,
    bookings: MeetingBooking[],
    bufferMs: number,
): boolean {
    return bookings.some(b => {
        if (b.status === 'cancelled') return false;
        const bStart = new Date(b.startAt.getTime() - bufferMs);
        const bEnd = new Date(b.endAt.getTime() + bufferMs);
        return start < bEnd && end > bStart;
    });
}

/**
 * Returns available time slots for a given profile on a given date.
 *
 * @param profile - The executive profile with availability config
 * @param date - The date to calculate slots for (any time within that day)
 * @param existingBookings - Confirmed/pending bookings to avoid conflicts
 * @param durationMinutes - Duration of the meeting type being requested
 */
export function calculateAvailableSlots(
    profile: ExecutiveProfile,
    date: Date,
    existingBookings: MeetingBooking[],
    durationMinutes: number,
): TimeSlot[] {
    const { availability } = profile;
    const { timezone, bufferMinutes, windows } = availability;

    const dayOfWeek = getDayOfWeekInTimezone(date, timezone);
    const window = windows.find(w => w.dayOfWeek === dayOfWeek);
    if (!window) return [];

    const dateStr = formatDateYMD(date, timezone);
    const windowStart = localToUtc(dateStr, window.startTime, timezone);
    const windowEnd = localToUtc(dateStr, window.endTime, timezone);

    const now = new Date();
    // Don't show slots in the past or within 2 hours
    const minStart = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const slotMs = durationMinutes * 60 * 1000;
    const bufferMs = bufferMinutes * 60 * 1000;

    const slots: TimeSlot[] = [];
    let cursor = windowStart;

    while (cursor.getTime() + slotMs <= windowEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + slotMs);
        const isPast = cursor < minStart;
        const conflicts = hasConflict(cursor, slotEnd, existingBookings, bufferMs);

        if (!isPast && !conflicts) {
            slots.push({ startAt: new Date(cursor), endAt: slotEnd, available: true });
        }

        cursor = new Date(cursor.getTime() + slotMs);
    }

    return slots;
}

/**
 * Returns the next N available dates (skipping days with no windows).
 */
export function getAvailableDates(
    profile: ExecutiveProfile,
    fromDate: Date,
    count: number,
): Date[] {
    const { timezone, windows } = profile.availability;
    const availableDays = windows.map(w => w.dayOfWeek);

    const dates: Date[] = [];
    const cursor = new Date(fromDate);
    cursor.setHours(12, 0, 0, 0); // midday to avoid DST issues

    let attempts = 0;
    while (dates.length < count && attempts < 90) {
        const dow = getDayOfWeekInTimezone(cursor, timezone);
        if (availableDays.includes(dow)) {
            dates.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
        attempts++;
    }

    return dates;
}
