import {
    send24HourReminderEmail,
    sendConfirmationEmail,
    sendFollowUpEmail,
    sendMeetingStartedEmail,
    sendOneHourReminderEmail,
} from './booking-emails';
import { sendGenericEmail } from '@/lib/email/dispatcher';
import { getAdminAuth } from '@/firebase/admin';
import type { ExecutiveProfile, MeetingBooking } from '@/types/executive-calendar';

jest.mock('@/lib/email/dispatcher', () => ({
    sendGenericEmail: jest.fn(),
}));

jest.mock('@/firebase/admin', () => ({
    getAdminAuth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

const mockSendGenericEmail = sendGenericEmail as jest.MockedFunction<typeof sendGenericEmail>;
const mockGetAdminAuth = getAdminAuth as jest.MockedFunction<typeof getAdminAuth>;

function buildProfile(overrides: Partial<ExecutiveProfile> = {}): ExecutiveProfile {
    return {
        profileSlug: 'martez',
        displayName: 'Martez',
        title: 'Founder',
        bio: 'CEO',
        emailAddress: 'martez@bakedbot.ai',
        availability: {
            timezone: 'America/New_York',
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
        meetingTypeId: '30min',
        meetingTypeName: 'Discovery Call',
        durationMinutes: 30,
        externalName: 'Jane Guest',
        externalEmail: 'jane@example.com',
        purpose: 'Investigate booking email issues',
        startAt: new Date('2026-03-25T15:00:00Z'),
        endAt: new Date('2026-03-25T15:30:00Z'),
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

describe('sendConfirmationEmail', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAdminAuth.mockReset();
        mockSendGenericEmail.mockReset();
        mockSendGenericEmail.mockResolvedValue({ success: true });
    });

    it('uses the explicit executive userId when the profile already has one', async () => {
        const profile = buildProfile({ userId: 'exec-user-123' });

        const result = await sendConfirmationEmail(buildBooking(), profile);

        expect(mockGetAdminAuth).not.toHaveBeenCalled();
        expect(mockSendGenericEmail).toHaveBeenNthCalledWith(1, expect.objectContaining({
            to: 'jane@example.com',
        }));
        expect(mockSendGenericEmail.mock.calls[0]?.[0].userId).toBeUndefined();
        expect(mockSendGenericEmail).toHaveBeenNthCalledWith(2, expect.objectContaining({
            to: 'martez@bakedbot.ai',
            userId: 'exec-user-123',
        }));
        expect(result.senderUserId).toBe('exec-user-123');
    });

    it('resolves the executive Firebase user by email when profile.userId is missing', async () => {
        const getUserByEmail = jest.fn().mockResolvedValue({ uid: 'resolved-exec-uid' });
        mockGetAdminAuth.mockReturnValue({ getUserByEmail } as any);

        const result = await sendConfirmationEmail(buildBooking(), buildProfile());

        expect(getUserByEmail).toHaveBeenCalledWith('martez@bakedbot.ai');
        expect(mockSendGenericEmail).toHaveBeenNthCalledWith(1, expect.objectContaining({
            to: 'jane@example.com',
        }));
        expect(mockSendGenericEmail.mock.calls[0]?.[0].userId).toBeUndefined();
        expect(mockSendGenericEmail).toHaveBeenNthCalledWith(2, expect.objectContaining({
            to: 'martez@bakedbot.ai',
            userId: 'resolved-exec-uid',
        }));
        expect(result.senderUserId).toBe('resolved-exec-uid');
    });

    it('falls back to provider-only delivery when the executive auth user cannot be resolved', async () => {
        const getUserByEmail = jest.fn().mockRejectedValue(new Error('auth/user-not-found'));
        mockGetAdminAuth.mockReturnValue({ getUserByEmail } as any);

        const result = await sendConfirmationEmail(buildBooking(), buildProfile());

        expect(getUserByEmail).toHaveBeenCalledWith('martez@bakedbot.ai');
        expect(mockSendGenericEmail).toHaveBeenNthCalledWith(1, expect.objectContaining({
            to: 'jane@example.com',
        }));
        expect(mockSendGenericEmail.mock.calls[0]?.[0].userId).toBeUndefined();
        expect(mockSendGenericEmail).toHaveBeenNthCalledWith(2, expect.objectContaining({
            to: 'martez@bakedbot.ai',
            userId: undefined,
        }));
        expect(result.senderUserId).toBeNull();
    });

    it('returns per-recipient delivery status for partial failures', async () => {
        mockSendGenericEmail
            .mockResolvedValueOnce({ success: true })
            .mockResolvedValueOnce({ success: false, error: 'host mailbox unavailable' });

        const result = await sendConfirmationEmail(
            buildBooking(),
            buildProfile({ userId: 'exec-user-123' }),
        );

        expect(result.guest.success).toBe(true);
        expect(result.host.success).toBe(false);
        expect(result.host.error).toBe('host mailbox unavailable');
    });
});

describe('retryable booking email delivery', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetAdminAuth.mockReset();
        mockSendGenericEmail.mockReset();
    });

    it('returns provider failures for follow-up emails so callers can retry', async () => {
        mockSendGenericEmail.mockResolvedValue({ success: false, error: 'provider outage' });

        const result = await sendFollowUpEmail(
            buildBooking(),
            buildProfile(),
            'Recap notes',
            ['Send deck'],
        );

        expect(result).toEqual({ success: false, error: 'provider outage' });
        expect(mockSendGenericEmail).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['24-hour reminder', send24HourReminderEmail],
        ['1-hour reminder', sendOneHourReminderEmail],
        ['start notification', sendMeetingStartedEmail],
    ] as const)('returns provider failures for %s emails so callers can retry', async (_label, sendEmail) => {
        mockSendGenericEmail.mockResolvedValue({ success: false, error: 'provider outage' });

        const result = await sendEmail(buildBooking(), buildProfile());

        expect(result).toEqual({ success: false, error: 'provider outage' });
        expect(mockSendGenericEmail).toHaveBeenCalledTimes(1);
    });
});
