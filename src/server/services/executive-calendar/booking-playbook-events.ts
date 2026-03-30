import type {
    ExecProfileSlug,
    ExecutiveProfile,
    MeetingBooking,
} from '@/types/executive-calendar';

export type ExecutiveBookingPlaybookStage = 'confirmation' | 'followup';

const BOOKING_URL_BASE = 'https://bakedbot.ai/book';

function formatDatetime(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
        timeZoneName: 'short',
    }).format(date);
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getFirstName(fullName: string): string {
    const trimmed = fullName.trim();
    if (!trimmed) {
        return 'there';
    }

    return trimmed.split(/\s+/)[0] || 'there';
}

function buildActionItemsHtml(actionItems: string[]): string {
    if (actionItems.length === 0) {
        return '<p style="margin: 0; color: #666;">No specific action items captured.</p>';
    }

    const items = actionItems
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join('');

    return `<ul style="margin: 8px 0; padding-left: 20px;">${items}</ul>`;
}

function buildActionItemsText(actionItems: string[]): string {
    if (actionItems.length === 0) {
        return 'No specific action items captured.';
    }

    return actionItems.map((item) => `- ${item}`).join('\n');
}

function buildExecutiveBookingUrl(profileSlug: ExecProfileSlug): string {
    return `${BOOKING_URL_BASE}/${profileSlug}`;
}

export function buildExecutiveBookingEventName(
    profileSlug: ExecProfileSlug,
    stage: ExecutiveBookingPlaybookStage,
): string {
    const stageSuffix = stage === 'confirmation' ? 'confirmed' : 'followup_ready';
    return `executive.booking.${profileSlug}.${stageSuffix}`;
}

export function buildExecutiveBookingEventData(input: {
    booking: MeetingBooking;
    profile: ExecutiveProfile;
    stage: ExecutiveBookingPlaybookStage;
    meetingNotes?: string | null;
    actionItems?: string[];
}): Record<string, unknown> {
    const { booking, profile, stage } = input;
    const meetingNotes = input.meetingNotes ?? booking.meetingNotes ?? '';
    const actionItems = input.actionItems ?? booking.actionItems ?? [];
    const firstName = getFirstName(booking.externalName);
    const bookingUrl = buildExecutiveBookingUrl(profile.profileSlug);

    return {
        bookingId: booking.id,
        customerEmail: booking.externalEmail,
        dedupeKey: `executive_booking:${booking.id}:${stage}`,
        isConfirmationEvent: stage === 'confirmation',
        isFollowUpEvent: stage === 'followup',
        guest: {
            name: booking.externalName,
            firstName,
            email: booking.externalEmail,
        },
        executive: {
            profileSlug: profile.profileSlug,
            displayName: profile.displayName,
            title: profile.title,
            emailAddress: profile.emailAddress,
            bookingUrl,
        },
        meeting: {
            typeName: booking.meetingTypeName,
            durationMinutes: booking.durationMinutes,
            purpose: booking.purpose,
            formattedStart: formatDatetime(booking.startAt, profile.availability.timezone),
            startAtIso: booking.startAt.toISOString(),
            videoRoomUrl: booking.videoRoomUrl,
            notes: meetingNotes,
            actionItemsHtml: buildActionItemsHtml(actionItems),
            actionItemsText: buildActionItemsText(actionItems),
        },
        booking: {
            id: booking.id,
            profileSlug: booking.profileSlug,
            meetingTypeId: booking.meetingTypeId,
            meetingTypeName: booking.meetingTypeName,
            durationMinutes: booking.durationMinutes,
            externalName: booking.externalName,
            externalEmail: booking.externalEmail,
            purpose: booking.purpose,
            startAtIso: booking.startAt.toISOString(),
            endAtIso: booking.endAt.toISOString(),
            status: booking.status,
            videoRoomUrl: booking.videoRoomUrl,
            livekitRoomName: booking.livekitRoomName,
        },
    };
}
