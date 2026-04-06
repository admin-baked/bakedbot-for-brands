
import * as admin from 'firebase-admin';
import { sendHostBookingNotificationEmail, sendConfirmationEmail } from '../src/server/services/executive-calendar/booking-emails';
import { createGoogleCalendarEvent } from '../src/server/services/executive-calendar/google-calendar';
import { logger } from '../src/lib/logger';

// Initialize Admin SDK
if (!admin.apps.length) {
    admin.initializeApp();
}

const firestore = admin.firestore();

async function run() {
    const profileSlug = 'martez';
    console.log(`🚀 Starting manual reconciliation for ${profileSlug}...`);

    try {
        // 1. Fetch Profile
        const profileDoc = await firestore.collection('executive_profiles').doc(profileSlug).get();
        if (!profileDoc.exists) {
            console.error('❌ Profile not found');
            return;
        }
        const profile = { profileSlug, ...profileDoc.data() } as any;

        // 2. Fetch today's bookings
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setUTCHours(0, 0, 0, 0);
        const endOfToday = new Date(now);
        endOfToday.setUTCHours(23, 59, 59, 999);

        console.log(`📅 Checking range: ${startOfToday.toISOString()} to ${endOfToday.toISOString()}`);

        const snap = await firestore
            .collection('meeting_bookings')
            .where('profileSlug', '==', profileSlug)
            .where('status', '==', 'confirmed')
            .where('startAt', '>=', admin.firestore.Timestamp.fromDate(startOfToday))
            .where('startAt', '<=', admin.firestore.Timestamp.fromDate(endOfToday))
            .get();

        console.log(`📈 Found ${snap.size} bookings for today.`);

        for (const doc of snap.docs) {
            const b = { id: doc.id, ...doc.data() } as any;
            // Convert Firestore Timestamps to Dates for the services
            b.startAt = b.startAt.toDate();
            b.endAt = b.endAt.toDate();
            
            console.log(`\n--- Booking: ${b.id} (${b.externalName}) ---`);
            
            const updates: any = { updatedAt: admin.firestore.Timestamp.now() };

            // Host Email
            if (!b.hostNotificationEmailSentAt) {
                console.log('✉️ Sending Host Notification...');
                const res = await sendHostBookingNotificationEmail(b, profile);
                if (res.success) {
                    updates.hostNotificationEmailSentAt = admin.firestore.Timestamp.now();
                    console.log('✅ Host Email Sent');
                } else {
                    console.error('❌ Host Email Failed:', res.error);
                }
            } else {
                console.log('⏭️ Host Email already sent.');
            }

            // Guest Email
            if (!b.confirmationEmailSentAt) {
                console.log('✉️ Sending Guest Confirmation...');
                const res = await sendConfirmationEmail(b, profile);
                if (res.guest.success) {
                    updates.confirmationEmailSentAt = admin.firestore.Timestamp.now();
                    console.log('✅ Guest Email Sent');
                } else {
                    console.error('❌ Guest Email Failed:', res.guest.error);
                }
            } else {
                console.log('⏭️ Guest Email already sent.');
            }

            // GCal Sync
            if (!b.calendarEventId && profile.googleCalendarTokens?.refresh_token) {
                console.log('📅 Syncing to Google Calendar...');
                try {
                    const eventId = await createGoogleCalendarEvent(profile.googleCalendarTokens, {
                        summary: `${b.meetingTypeName} with ${b.externalName}`,
                        description: b.purpose || 'Meeting booked via BakedBot',
                        startAt: b.startAt,
                        endAt: b.endAt,
                        timezone: profile.availability.timezone,
                        attendeeEmails: [b.externalEmail, profile.emailAddress],
                        videoRoomUrl: b.videoRoomUrl,
                    });
                    if (eventId) {
                        updates.calendarEventId = eventId;
                        console.log('✅ GCal Event Linked:', eventId);
                    }
                } catch (err) {
                    console.error('❌ GCal Sync Failed:', err);
                }
            } else if (b.calendarEventId) {
                console.log('⏭️ GCal already synced.');
            }

            if (Object.keys(updates).length > 1) {
                await doc.ref.update(updates);
                console.log('💾 Updated booking record.');
            }
        }

        console.log('\n🏁 Reconciliation complete.');
    } catch (err) {
        console.error('💥 Fatal error:', err);
    }
}

run().then(() => process.exit(0));
