import {
    buildExecutiveBookingEventData,
    buildExecutiveBookingEventName,
} from '../booking-playbook-events';
import type { ExecutiveProfile, MeetingBooking } from '@/types/executive-calendar';

function buildProfile(overrides: Partial<ExecutiveProfile> = {}): ExecutiveProfile {
    return {
        profileSlug: 'martez',
        userId: 'martez-user',
        displayName: 'Martez',
        title: 'Founder',
        bio: 'CEO',
        emailAddress: 'martez@bakedbot.ai',
        availability: {
            timezone: 'America/Chicago',
            bufferMinutes: 15,
            windows: [],
        },
        meetingTypes: [],
        themeColor: '#16a34a',
        createdAt: new Date('2026-03-20T14:00:00Z'),
        updatedAt: new Date('2026-03-20T14:00:00Z'),
        ...overrides,
    };
}

function buildBooking(overrides: Partial<MeetingBooking> = {}): MeetingBooking {
    return {
        id: 'booking-123',
        profileSlug: 'martez',
        meetingTypeId: 'discovery',
        meetingTypeName: 'Discovery Call',
        durationMinutes: 30,
        externalName: 'Shianne Mclean',
        externalEmail: 'shianne@stoneluxmarketing.com',
        purpose: 'Talk through BakedBot adoption',
        startAt: new Date('2026-03-27T15:00:00Z'),
        endAt: new Date('2026-03-27T15:30:00Z'),
        status: 'confirmed',
        videoRoomUrl: 'https://bakedbot.daily.co/demo-room',
        livekitRoomName: 'demo-room',
        prepBriefGenerated: false,
        prepBriefSentAt: null,
        followUpSentAt: null,
        transcript: null,
        meetingNotes: null,
        actionItems: [],
        confirmationEmailSentAt: null,
        hostNotificationEmailSentAt: null,
        twentyFourHourReminderSentAt: null,
        oneHourReminderSentAt: null,
        startNotificationSentAt: null,
        createdAt: new Date('2026-03-20T14:00:00Z'),
        updatedAt: new Date('2026-03-20T14:00:00Z'),
        ...overrides,
    };
}

describe('booking playbook event helpers', () => {
    it('builds the exact event names for both executives and stages', () => {
        expect(buildExecutiveBookingEventName('martez', 'confirmation')).toBe('executive.booking.martez.confirmed');
        expect(buildExecutiveBookingEventName('martez', 'followup')).toBe('executive.booking.martez.followup_ready');
        expect(buildExecutiveBookingEventName('jack', 'confirmation')).toBe('executive.booking.jack.confirmed');
        expect(buildExecutiveBookingEventName('jack', 'followup')).toBe('executive.booking.jack.followup_ready');
    });

    it('builds the required confirmation payload shape', () => {
        const payload = buildExecutiveBookingEventData({
            booking: buildBooking(),
            profile: buildProfile(),
            stage: 'confirmation',
        }) as Record<string, any>;

        expect(payload).toEqual(expect.objectContaining({
            bookingId: 'booking-123',
            customerEmail: 'shianne@stoneluxmarketing.com',
            dedupeKey: 'executive_booking:booking-123:confirmation',
            isConfirmationEvent: true,
            isFollowUpEvent: false,
            guest: expect.objectContaining({
                name: 'Shianne Mclean',
                firstName: 'Shianne',
                email: 'shianne@stoneluxmarketing.com',
            }),
            executive: expect.objectContaining({
                profileSlug: 'martez',
                displayName: 'Martez',
                title: 'Founder',
                emailAddress: 'martez@bakedbot.ai',
                bookingUrl: 'https://bakedbot.ai/book/martez',
            }),
            meeting: expect.objectContaining({
                typeName: 'Discovery Call',
                durationMinutes: 30,
                purpose: 'Talk through BakedBot adoption',
                startAtIso: '2026-03-27T15:00:00.000Z',
                videoRoomUrl: 'https://bakedbot.daily.co/demo-room',
                notes: '',
            }),
            booking: expect.objectContaining({
                id: 'booking-123',
                profileSlug: 'martez',
                externalEmail: 'shianne@stoneluxmarketing.com',
            }),
        }));
    });

    it('builds follow-up payload notes and action items for Jack', () => {
        const payload = buildExecutiveBookingEventData({
            booking: buildBooking({
                profileSlug: 'jack',
                actionItems: ['Send pricing deck'],
                meetingNotes: 'Reviewed rollout plan.',
            }),
            profile: buildProfile({
                profileSlug: 'jack',
                displayName: 'Jack',
                title: 'Head of Revenue',
                emailAddress: 'jack@bakedbot.ai',
            }),
            stage: 'followup',
            meetingNotes: 'Reviewed rollout plan.',
            actionItems: ['Send pricing deck'],
        }) as Record<string, any>;

        expect(payload.dedupeKey).toBe('executive_booking:booking-123:followup');
        expect(payload.isConfirmationEvent).toBe(false);
        expect(payload.isFollowUpEvent).toBe(true);
        expect(payload.executive).toEqual(expect.objectContaining({
            profileSlug: 'jack',
            displayName: 'Jack',
            title: 'Head of Revenue',
            bookingUrl: 'https://bakedbot.ai/book/jack',
        }));
        expect(payload.meeting).toEqual(expect.objectContaining({
            notes: 'Reviewed rollout plan.',
            actionItemsText: '- Send pricing deck',
        }));
        expect(String(payload.meeting.actionItemsHtml)).toContain('<li>Send pricing deck</li>');
    });
});
