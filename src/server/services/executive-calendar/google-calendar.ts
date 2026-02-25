/**
 * Google Calendar 2-Way Sync Service
 *
 * Provides:
 *   - OAuth2 URL generation (connect flow)
 *   - Token exchange + refresh (stored per executive in Firestore)
 *   - Freebusy queries (blocks slots already occupied in Google Calendar)
 *   - Event create / delete (syncs bookings to exec's Google Calendar)
 *
 * Requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET (already in Secret Manager @1).
 * Redirect URI: https://bakedbot.ai/api/calendar/google/callback
 */

import { google } from 'googleapis';
import { logger } from '@/lib/logger';
import { GoogleCalendarTokens, ExecProfileSlug } from '@/types/executive-calendar';

const REDIRECT_URI =
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    'https://bakedbot.ai/api/calendar/google/callback';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// ─── OAuth2 Client Factory ───────────────────────────────────────────────────

function makeOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('[GCal] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

// ─── Auth URL Generation ─────────────────────────────────────────────────────

/**
 * Returns the Google OAuth2 consent URL for an executive.
 * The profileSlug is passed as `state` so the callback knows which exec to update.
 */
export function getGoogleAuthUrl(profileSlug: ExecProfileSlug): string {
    const oauth2Client = makeOAuthClient();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        state: profileSlug,
        prompt: 'consent', // Always show consent so we get a refresh_token
    });
}

// ─── Token Exchange ──────────────────────────────────────────────────────────

/**
 * Exchanges an authorization code for access + refresh tokens.
 * Called from the OAuth callback route.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleCalendarTokens> {
    const oauth2Client = makeOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    return {
        access_token: tokens.access_token ?? null,
        refresh_token: tokens.refresh_token ?? null,
        expiry_date: tokens.expiry_date ?? null,
        token_type: tokens.token_type ?? null,
    };
}

// ─── Authenticated Calendar Client ───────────────────────────────────────────

/**
 * Builds an authenticated Google Calendar API client using stored tokens.
 * Automatically refreshes access tokens when expired.
 * Returns the client and a potentially-updated tokens object (for Firestore update).
 */
async function makeCalendarClient(tokens: GoogleCalendarTokens) {
    const oauth2Client = makeOAuthClient();
    oauth2Client.setCredentials({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type ?? undefined,
    });

    // Track token refreshes so we can persist the new access_token
    let updatedTokens: GoogleCalendarTokens | null = null;
    oauth2Client.on('tokens', (newTokens) => {
        updatedTokens = {
            access_token: newTokens.access_token ?? tokens.access_token,
            refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
            expiry_date: newTokens.expiry_date ?? tokens.expiry_date,
            token_type: newTokens.token_type ?? tokens.token_type,
        };
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    return { calendar, getUpdatedTokens: () => updatedTokens };
}

// ─── Freebusy Query ──────────────────────────────────────────────────────────

export interface BusyInterval {
    start: Date;
    end: Date;
}

/**
 * Returns busy intervals from the executive's primary Google Calendar for a time range.
 * Returns [] if tokens are missing or the API call fails (graceful degradation).
 */
export async function getGoogleCalendarBusyTimes(
    tokens: GoogleCalendarTokens,
    timeMin: Date,
    timeMax: Date,
): Promise<BusyInterval[]> {
    try {
        const { calendar } = await makeCalendarClient(tokens);
        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                items: [{ id: 'primary' }],
            },
        });

        const busy = response.data.calendars?.primary?.busy ?? [];
        return busy
            .filter(b => b.start && b.end)
            .map(b => ({
                start: new Date(b.start!),
                end: new Date(b.end!),
            }));
    } catch (err) {
        logger.warn(`[GCal] freebusy query failed: ${String(err)}`);
        return []; // Graceful degradation — slots still served from BakedBot bookings
    }
}

// ─── Event Create ────────────────────────────────────────────────────────────

export interface CalendarEventInput {
    summary: string;
    description: string;
    startAt: Date;
    endAt: Date;
    timezone: string;
    attendeeEmails: string[];
    videoRoomUrl: string;
}

/**
 * Creates a Google Calendar event on the executive's primary calendar.
 * Returns the event ID (store in meeting_bookings.calendarEventId).
 * Returns null if creation fails (non-blocking caller pattern).
 */
export async function createGoogleCalendarEvent(
    tokens: GoogleCalendarTokens,
    event: CalendarEventInput,
): Promise<string | null> {
    try {
        const { calendar, getUpdatedTokens } = await makeCalendarClient(tokens);

        const response = await calendar.events.insert({
            calendarId: 'primary',
            sendUpdates: 'all', // Sends email invitations to attendees
            requestBody: {
                summary: event.summary,
                description: `${event.description}\n\n🎥 Video call: ${event.videoRoomUrl}`,
                start: {
                    dateTime: event.startAt.toISOString(),
                    timeZone: event.timezone,
                },
                end: {
                    dateTime: event.endAt.toISOString(),
                    timeZone: event.timezone,
                },
                attendees: event.attendeeEmails.map(email => ({ email })),
                conferenceData: {
                    createRequest: {
                        requestId: `bakedbot-${Date.now()}`,
                        conferenceSolutionKey: { type: 'hangoutsMeet' },
                    },
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 },
                        { method: 'popup', minutes: 15 },
                    ],
                },
            },
        });

        const eventId = response.data.id ?? null;
        if (eventId) {
            logger.info(`[GCal] Event created: ${eventId}`);
        }

        // If the access token was refreshed, log so caller can persist if needed
        const updated = getUpdatedTokens();
        if (updated) {
            logger.info('[GCal] Access token refreshed during event creation');
        }

        return eventId;
    } catch (err) {
        logger.warn(`[GCal] createEvent failed: ${String(err)}`);
        return null;
    }
}

// ─── Event Delete ────────────────────────────────────────────────────────────

/**
 * Deletes a Google Calendar event when a booking is cancelled.
 * Non-blocking — caller should use setImmediate().
 */
export async function deleteGoogleCalendarEvent(
    tokens: GoogleCalendarTokens,
    eventId: string,
): Promise<void> {
    try {
        const { calendar } = await makeCalendarClient(tokens);
        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
            sendUpdates: 'all', // Notifies attendees of cancellation
        });
        logger.info(`[GCal] Event deleted: ${eventId}`);
    } catch (err) {
        logger.warn(`[GCal] deleteEvent failed for ${eventId}: ${String(err)}`);
    }
}
