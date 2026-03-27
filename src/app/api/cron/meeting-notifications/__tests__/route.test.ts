jest.mock('next/server', () => {
    class MockNextRequest {
        headers: Headers;

        constructor(_input: string, init?: { headers?: HeadersInit }) {
            this.headers = new Headers(init?.headers);
        }
    }

    return {
        NextRequest: MockNextRequest,
        NextResponse: {
            json: (body: unknown, init?: { status?: number }) => ({
                status: init?.status ?? 200,
                json: async () => body,
            }),
        },
    };
});

import { NextRequest } from 'next/server';
import { POST } from '../route';
import {
    getExecutiveProfile,
    getMeetingsNeeding24HourReminder,
    getMeetingsNeedingOneHourReminder,
    getMeetingsNeedingStartNotification,
    mark24HourReminderSent,
    markOneHourReminderSent,
    markStartNotificationSent,
} from '@/server/actions/executive-calendar';
import {
    send24HourReminderEmail,
    sendMeetingStartedEmail,
    sendOneHourReminderEmail,
} from '@/server/services/executive-calendar/booking-emails';
import type { ExecutiveProfile, MeetingBooking } from '@/types/executive-calendar';

jest.mock('@/server/actions/executive-calendar', () => ({
    getExecutiveProfile: jest.fn(),
    getMeetingsNeeding24HourReminder: jest.fn(),
    getMeetingsNeedingOneHourReminder: jest.fn(),
    getMeetingsNeedingStartNotification: jest.fn(),
    mark24HourReminderSent: jest.fn(),
    markOneHourReminderSent: jest.fn(),
    markStartNotificationSent: jest.fn(),
}));

jest.mock('@/server/services/executive-calendar/booking-emails', () => ({
    send24HourReminderEmail: jest.fn(),
    sendOneHourReminderEmail: jest.fn(),
    sendMeetingStartedEmail: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockGetExecutiveProfile = getExecutiveProfile as jest.MockedFunction<typeof getExecutiveProfile>;
const mockGetMeetingsNeeding24HourReminder = getMeetingsNeeding24HourReminder as jest.MockedFunction<typeof getMeetingsNeeding24HourReminder>;
const mockGetMeetingsNeedingOneHourReminder = getMeetingsNeedingOneHourReminder as jest.MockedFunction<typeof getMeetingsNeedingOneHourReminder>;
const mockGetMeetingsNeedingStartNotification = getMeetingsNeedingStartNotification as jest.MockedFunction<typeof getMeetingsNeedingStartNotification>;
const mockMark24HourReminderSent = mark24HourReminderSent as jest.MockedFunction<typeof mark24HourReminderSent>;
const mockMarkOneHourReminderSent = markOneHourReminderSent as jest.MockedFunction<typeof markOneHourReminderSent>;
const mockMarkStartNotificationSent = markStartNotificationSent as jest.MockedFunction<typeof markStartNotificationSent>;
const mockSend24HourReminderEmail = send24HourReminderEmail as jest.MockedFunction<typeof send24HourReminderEmail>;
const mockSendOneHourReminderEmail = sendOneHourReminderEmail as jest.MockedFunction<typeof sendOneHourReminderEmail>;
const mockSendMeetingStartedEmail = sendMeetingStartedEmail as jest.MockedFunction<typeof sendMeetingStartedEmail>;

function buildProfile(overrides: Partial<ExecutiveProfile> = {}): ExecutiveProfile {
    return {
        profileSlug: 'jack',
        userId: 'jack-user-id',
        displayName: 'Jack',
        title: 'Head of Revenue',
        bio: 'Revenue leader',
        emailAddress: 'jack@bakedbot.ai',
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
        id: 'booking-456',
        profileSlug: 'jack',
        meetingTypeId: 'discovery',
        meetingTypeName: 'Discovery Call',
        durationMinutes: 30,
        externalName: 'Shianne Mclean',
        externalEmail: 'shianne@stoneluxmarketing.com',
        purpose: 'Talk through BakedBot adoption',
        startAt: new Date('2026-03-28T15:00:00Z'),
        endAt: new Date('2026-03-28T15:30:00Z'),
        status: 'confirmed',
        videoRoomUrl: 'https://bakedbot.daily.co/demo-room',
        livekitRoomName: 'demo-room',
        prepBriefGenerated: true,
        prepBriefSentAt: new Date('2026-03-28T14:30:00Z'),
        followUpSentAt: null,
        transcript: null,
        meetingNotes: null,
        actionItems: [],
        confirmationEmailSentAt: new Date('2026-03-27T15:00:00Z'),
        hostNotificationEmailSentAt: new Date('2026-03-27T15:00:00Z'),
        twentyFourHourReminderSentAt: null,
        oneHourReminderSentAt: null,
        startNotificationSentAt: null,
        createdAt: new Date('2026-03-20T14:00:00Z'),
        updatedAt: new Date('2026-03-27T15:31:00Z'),
        ...overrides,
    };
}

describe('POST /api/cron/meeting-notifications', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, CRON_SECRET: 'test-secret' };

        mockGetExecutiveProfile.mockResolvedValue(buildProfile());
        mockGetMeetingsNeeding24HourReminder.mockResolvedValue([]);
        mockGetMeetingsNeedingOneHourReminder.mockResolvedValue([]);
        mockGetMeetingsNeedingStartNotification.mockResolvedValue([]);
        mockSend24HourReminderEmail.mockResolvedValue({ success: true });
        mockSendOneHourReminderEmail.mockResolvedValue({ success: true });
        mockSendMeetingStartedEmail.mockResolvedValue({ success: true });
        mockMark24HourReminderSent.mockResolvedValue(undefined);
        mockMarkOneHourReminderSent.mockResolvedValue(undefined);
        mockMarkStartNotificationSent.mockResolvedValue(undefined);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('does not mark a 24-hour reminder sent when delivery fails', async () => {
        mockGetMeetingsNeeding24HourReminder.mockResolvedValue([buildBooking()]);
        mockSend24HourReminderEmail.mockResolvedValue({ success: false, error: 'provider outage' });

        const response = await POST(new NextRequest('http://localhost/api/cron/meeting-notifications', {
            method: 'POST',
            headers: {
                authorization: 'Bearer test-secret',
            },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true, reminders24h: 0, reminders1h: 0, startingNow: 0 });
        expect(mockMark24HourReminderSent).not.toHaveBeenCalled();
    });

    it('marks a 24-hour reminder sent after successful delivery', async () => {
        mockGetMeetingsNeeding24HourReminder.mockResolvedValue([buildBooking()]);

        const response = await POST(new NextRequest('http://localhost/api/cron/meeting-notifications', {
            method: 'POST',
            headers: {
                authorization: 'Bearer test-secret',
            },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true, reminders24h: 1, reminders1h: 0, startingNow: 0 });
        expect(mockMark24HourReminderSent).toHaveBeenCalledWith('booking-456');
    });
});
