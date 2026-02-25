/**
 * Executive Calendar & Meeting Hub
 * Types for Martez (CEO) and Jack (Head of Revenue) booking system
 */

export type ExecProfileSlug = 'martez' | 'jack';

export interface AvailabilityWindow {
    /** 0=Sunday, 1=Monday, ..., 6=Saturday */
    dayOfWeek: number;
    /** 24-hour format: 'HH:MM' */
    startTime: string;
    /** 24-hour format: 'HH:MM' */
    endTime: string;
}

export interface MeetingType {
    id: string;
    name: string;
    durationMinutes: number;
    description: string;
    color?: string;
}

export interface AvailabilityConfig {
    timezone: string;
    /** Minutes of buffer between meetings */
    bufferMinutes: number;
    windows: AvailabilityWindow[];
}

export interface GoogleCalendarTokens {
    access_token: string | null;
    refresh_token: string | null;
    expiry_date: number | null;
    token_type: string | null;
}

export interface ExecutiveProfile {
    profileSlug: ExecProfileSlug;
    userId?: string;
    displayName: string;
    title: string;
    bio: string;
    avatarUrl?: string;
    emailAddress: string;
    availability: AvailabilityConfig;
    meetingTypes: MeetingType[];
    /** Hex color for calendar display */
    themeColor: string;
    /** OAuth2 tokens for Google Calendar 2-way sync. Set after exec completes OAuth flow. */
    googleCalendarTokens?: GoogleCalendarTokens;
    createdAt: Date;
    updatedAt: Date;
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

export interface MeetingBooking {
    id: string;
    profileSlug: ExecProfileSlug;
    meetingTypeId: string;
    meetingTypeName: string;
    durationMinutes: number;
    externalName: string;
    externalEmail: string;
    purpose: string;
    startAt: Date;
    endAt: Date;
    status: BookingStatus;
    videoRoomUrl: string;
    livekitRoomName: string;
    /** Google Calendar event ID — stored after successful calendar event creation */
    calendarEventId?: string | null;
    prepBriefGenerated: boolean;
    prepBriefSentAt: Date | null;
    followUpSentAt: Date | null;
    transcript: string | null;
    meetingNotes: string | null;
    actionItems: string[];
    confirmationEmailSentAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface TimeSlot {
    startAt: Date;
    endAt: Date;
    available: boolean;
}

export interface CreateBookingInput {
    meetingTypeId: string;
    externalName: string;
    externalEmail: string;
    purpose: string;
    /** ISO string */
    startAt: string;
    /** ISO string */
    endAt: string;
}

export interface BookingConfirmation {
    bookingId: string;
    videoRoomUrl: string;
    startAt: string;
    endAt: string;
    displayName: string;
    durationMinutes: number;
    timezone: string;
}

export interface PrepBriefContext {
    booking: MeetingBooking;
    profile: ExecutiveProfile;
    meetingType: MeetingType;
}
