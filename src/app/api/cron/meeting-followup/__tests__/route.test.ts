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
    getMeetingsNeedingFollowUp,
    markFollowUpSent,
} from '@/server/actions/executive-calendar';
import { dispatchPlaybookEventSync } from '@/server/services/playbook-event-dispatcher';
import type { ExecutiveProfile, MeetingBooking } from '@/types/executive-calendar';

jest.mock('@/server/actions/executive-calendar', () => ({
    getExecutiveProfile: jest.fn(),
    getMeetingsNeedingFollowUp: jest.fn(),
    markFollowUpSent: jest.fn(),
}));

jest.mock('@/server/services/playbook-event-dispatcher', () => ({
    dispatchPlaybookEventSync: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockGetExecutiveProfile = getExecutiveProfile as jest.MockedFunction<typeof getExecutiveProfile>;
const mockGetMeetingsNeedingFollowUp = getMeetingsNeedingFollowUp as jest.MockedFunction<typeof getMeetingsNeedingFollowUp>;
const mockMarkFollowUpSent = markFollowUpSent as jest.MockedFunction<typeof markFollowUpSent>;
const mockDispatchPlaybookEventSync = dispatchPlaybookEventSync as jest.MockedFunction<typeof dispatchPlaybookEventSync>;

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
        id: 'booking-123',
        profileSlug: 'jack',
        meetingTypeId: 'discovery',
        meetingTypeName: 'Discovery Call',
        durationMinutes: 30,
        externalName: 'Shianne Mclean',
        externalEmail: 'shianne@stoneluxmarketing.com',
        purpose: 'Talk through BakedBot adoption',
        startAt: new Date('2026-03-27T15:00:00Z'),
        endAt: new Date('2026-03-27T15:30:00Z'),
        status: 'completed',
        videoRoomUrl: 'https://bakedbot.daily.co/demo-room',
        livekitRoomName: 'demo-room',
        prepBriefGenerated: true,
        prepBriefSentAt: new Date('2026-03-27T14:30:00Z'),
        followUpSentAt: null,
        transcript: null,
        meetingNotes: null,
        actionItems: [],
        confirmationEmailSentAt: new Date('2026-03-26T15:00:00Z'),
        hostNotificationEmailSentAt: new Date('2026-03-26T15:00:00Z'),
        twentyFourHourReminderSentAt: new Date('2026-03-26T15:00:00Z'),
        oneHourReminderSentAt: new Date('2026-03-27T14:00:00Z'),
        startNotificationSentAt: new Date('2026-03-27T14:55:00Z'),
        createdAt: new Date('2026-03-20T14:00:00Z'),
        updatedAt: new Date('2026-03-27T15:31:00Z'),
        ...overrides,
    };
}

describe('POST /api/cron/meeting-followup', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv, CRON_SECRET: 'test-secret' };

        mockGetMeetingsNeedingFollowUp.mockResolvedValue([]);
        mockGetExecutiveProfile.mockResolvedValue(buildProfile());
        mockDispatchPlaybookEventSync.mockResolvedValue({
            delivered: true,
            deduped: false,
            results: [{ playbookId: 'jack-booking-emails', status: 'success' }],
        });
        mockMarkFollowUpSent.mockResolvedValue(undefined);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('does not mark the booking sent when follow-up delivery fails', async () => {
        mockGetMeetingsNeedingFollowUp.mockResolvedValue([buildBooking()]);
        mockDispatchPlaybookEventSync.mockResolvedValue({
            delivered: false,
            deduped: false,
            results: [{ playbookId: 'jack-booking-emails', status: 'failed', error: 'provider outage' }],
        });

        const response = await POST(new NextRequest('http://localhost/api/cron/meeting-followup', {
            method: 'POST',
            headers: {
                authorization: 'Bearer test-secret',
            },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true, processed: 0 });
        expect(mockMarkFollowUpSent).not.toHaveBeenCalled();
    });

    it('marks the booking sent after successful follow-up delivery', async () => {
        mockGetMeetingsNeedingFollowUp.mockResolvedValue([buildBooking()]);

        const response = await POST(new NextRequest('http://localhost/api/cron/meeting-followup', {
            method: 'POST',
            headers: {
                authorization: 'Bearer test-secret',
            },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true, processed: 1 });
        expect(mockMarkFollowUpSent).toHaveBeenCalledWith('booking-123');
    });

    it('marks the booking sent after a deduped follow-up dispatch', async () => {
        mockGetMeetingsNeedingFollowUp.mockResolvedValue([buildBooking()]);
        mockDispatchPlaybookEventSync.mockResolvedValue({
            delivered: true,
            deduped: true,
            results: [{ playbookId: 'jack-booking-emails', status: 'deduped' }],
        });

        const response = await POST(new NextRequest('http://localhost/api/cron/meeting-followup', {
            method: 'POST',
            headers: {
                authorization: 'Bearer test-secret',
            },
        }));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ success: true, processed: 1 });
        expect(mockMarkFollowUpSent).toHaveBeenCalledWith('booking-123');
    });
});
