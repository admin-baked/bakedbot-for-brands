/**
 * Booking Email Service
 * Sends confirmation, notification, prep brief, and follow-up emails
 * via the existing Mailjet/SendGrid dispatcher.
 */

import { sendGenericEmail } from '@/lib/email/dispatcher';
import { MeetingBooking, ExecutiveProfile } from '@/types/executive-calendar';
import { logger } from '@/lib/logger';

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

/**
 * Sends a booking confirmation to the external guest + notification to the exec.
 */
export async function sendConfirmationEmail(
    booking: MeetingBooking,
    profile: ExecutiveProfile,
): Promise<void> {
    const formattedTime = formatDatetime(booking.startAt, profile.availability.timezone);

    // Email to the external guest
    const guestResult = await sendGenericEmail({
        to: booking.externalEmail,
        name: booking.externalName,
        subject: `Your meeting with ${profile.displayName} is confirmed ✓`,
        htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                <div style="background: #000; padding: 24px; text-align: center;">
                    <h1 style="color: #fff; font-size: 22px; margin: 0;">Meeting Confirmed</h1>
                </div>
                <div style="padding: 32px 24px;">
                    <p style="font-size: 16px; color: #444;">Hi ${booking.externalName},</p>
                    <p>Your meeting with <strong>${profile.displayName}</strong> (${profile.title}) has been confirmed.</p>

                    <div style="background: #f9f9f9; border-left: 4px solid #16a34a; padding: 16px 20px; margin: 24px 0; border-radius: 4px;">
                        <p style="margin: 0 0 8px;"><strong>📅 When:</strong> ${formattedTime}</p>
                        <p style="margin: 0 0 8px;"><strong>⏱ Duration:</strong> ${booking.durationMinutes} minutes</p>
                        <p style="margin: 0 0 8px;"><strong>📋 Topic:</strong> ${booking.purpose}</p>
                    </div>

                    <div style="text-align: center; margin: 32px 0;">
                        <a href="${booking.videoRoomUrl}"
                           style="background: #16a34a; color: white; padding: 14px 32px; text-decoration: none;
                                  border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                            🎥 Join Meeting
                        </a>
                    </div>

                    <p style="color: #666; font-size: 14px;">
                        Use the button above at meeting time. No downloads required — runs in your browser.
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        Need to cancel? Reply to this email or contact us at hello@bakedbot.ai
                    </p>
                </div>
                <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
                    Powered by BakedBot AI · bakedbot.ai
                </div>
            </div>
        `,
        communicationType: 'transactional',
    });

    if (!guestResult.success) {
        logger.error(`[BookingEmails] Failed to send confirmation to guest: ${guestResult.error}`);
    }

    // Notification to the exec
    const execResult = await sendGenericEmail({
        to: profile.emailAddress,
        name: profile.displayName,
        subject: `📅 New meeting: ${booking.externalName} — ${booking.meetingTypeName}`,
        htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                <div style="padding: 24px;">
                    <h2 style="margin: 0 0 16px;">New Meeting Booked</h2>
                    <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                        <tr><td style="padding: 8px 0; color: #666; width: 120px;">Guest</td><td><strong>${booking.externalName}</strong> (${booking.externalEmail})</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">When</td><td>${formattedTime}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Type</td><td>${booking.meetingTypeName} · ${booking.durationMinutes} min</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Topic</td><td>${booking.purpose}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Room</td><td><a href="${booking.videoRoomUrl}">${booking.videoRoomUrl}</a></td></tr>
                    </table>
                    <p style="margin-top: 24px; color: #666; font-size: 13px;">Leo will send you a prep brief 30 minutes before the meeting.</p>
                </div>
            </div>
        `,
        communicationType: 'transactional',
    });

    if (!execResult.success) {
        logger.warn(`[BookingEmails] Failed to send exec notification: ${execResult.error}`);
    }
}

/**
 * Sends an AI-generated follow-up email to the guest after the meeting.
 */
export async function sendFollowUpEmail(
    booking: MeetingBooking,
    profile: ExecutiveProfile,
    meetingNotes: string,
    actionItems: string[],
): Promise<void> {
    const actionItemsHtml = actionItems.length > 0
        ? `<ul style="margin: 8px 0; padding-left: 20px;">${actionItems.map(a => `<li>${a}</li>`).join('')}</ul>`
        : '<p style="color: #666;">No specific action items captured.</p>';

    const result = await sendGenericEmail({
        to: booking.externalEmail,
        name: booking.externalName,
        subject: `Great connecting, ${booking.externalName.split(' ')[0]}! Here's your meeting recap`,
        htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
                <div style="background: #000; padding: 24px; text-align: center;">
                    <h1 style="color: #fff; font-size: 20px; margin: 0;">Meeting Recap</h1>
                </div>
                <div style="padding: 32px 24px;">
                    <p>Hi ${booking.externalName.split(' ')[0]},</p>
                    <p>Thanks for meeting with <strong>${profile.displayName}</strong> today. Here's a quick recap:</p>

                    <h3 style="margin: 24px 0 8px; color: #111;">📝 Meeting Notes</h3>
                    <div style="background: #f9f9f9; padding: 16px; border-radius: 4px; white-space: pre-line; font-size: 14px; color: #444;">
                        ${meetingNotes || 'Notes are being prepared.'}
                    </div>

                    <h3 style="margin: 24px 0 8px; color: #111;">✅ Action Items</h3>
                    ${actionItemsHtml}

                    <div style="margin: 32px 0; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; text-align: center;">
                        <p style="margin: 0 0 12px; font-size: 14px; color: #666;">Ready for a follow-up?</p>
                        <a href="https://bakedbot.ai/book/${booking.profileSlug}"
                           style="background: #111; color: white; padding: 10px 24px; text-decoration: none;
                                  border-radius: 6px; font-size: 14px; display: inline-block;">
                            Schedule Another Meeting
                        </a>
                    </div>
                </div>
                <div style="background: #f3f4f6; padding: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
                    Powered by BakedBot AI · bakedbot.ai
                </div>
            </div>
        `,
        communicationType: 'transactional',
    });

    if (!result.success) {
        logger.error(`[BookingEmails] Failed to send follow-up: ${result.error}`);
    }
}
