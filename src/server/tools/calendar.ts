'use server';

/**
 * Google Calendar Tool
 * 
 * Allows agents to list and create events.
 * Uses User-Scoped Authentication via `requireUser`.
 */

import { google } from 'googleapis';
import { requireUser } from '@/server/auth/auth';
import { getCalendarToken } from '@/server/integrations/calendar/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';

export type CalendarAction = 'list' | 'create';

export interface CalendarParams {
    action: CalendarAction;
    timeMin?: string;    // ISO string for 'list'
    maxResults?: number; // For 'list'
    summary?: string;    // For 'create'
    startTime?: string;  // ISO string for 'create'
    endTime?: string;    // ISO string for 'create'
    description?: string;// For 'create'
}

export interface CalendarResult {
    success: boolean;
    data?: any;
    error?: string;
}

import { DecodedIdToken } from 'firebase-admin/auth';

export async function calendarAction(params: CalendarParams, injectedUser?: DecodedIdToken): Promise<CalendarResult> {
    try {
        // 1. Authenticate User
        const user = injectedUser || await requireUser();
        
        // 2. Get User-Specific Token
        const credentials = await getCalendarToken(user.uid);

        if (!credentials || (!credentials.access_token && !credentials.refresh_token)) {
            return {
                success: false,
                error: 'Calendar is not connected. Please connect your account in Settings > Integrations.'
            };
        }

        // 3. Initialize OAuth Client
        const authClient = await getOAuth2ClientAsync();
        authClient.setCredentials(credentials);

        // 4. Initialize Calendar API
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        switch (params.action) {
            case 'list':
                const timeMin = params.timeMin || new Date().toISOString();
                const max = params.maxResults || 10;
                
                const listRes = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin,
                    maxResults: max,
                    orderBy: 'startTime',
                    singleEvents: true
                });

                return { success: true, data: listRes.data.items || [] };

            case 'create':
                if (!params.summary || !params.startTime || !params.endTime) {
                    return { success: false, error: 'Missing summary, startTime, or endTime' };
                }

                const createRes = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: {
                        summary: params.summary,
                        description: params.description || 'Created by BakedBot',
                        start: { dateTime: params.startTime },
                        end: { dateTime: params.endTime }
                    }
                });

                return { success: true, data: createRes.data };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[calendarAction] Error:', error);
        
        if (error.message.includes('invalid_grant') || error.code === 401) {
             return { success: false, error: 'Calendar session expired. Please reconnect in Settings.' };
        }

        return { success: false, error: error.message };
    }
}
