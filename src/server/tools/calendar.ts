'use server';

/**
 * Google Calendar Tool
 * 
 * Allows agents to list and create events.
 * Requires an access token stored in Firestore at `integrations/calendar`.
 */

import { getAdminFirestore } from '@/firebase/admin';

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

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary';

async function getAccessToken(): Promise<string | null> {
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('integrations').doc('calendar').get();
        return doc.data()?.accessToken || null;
    } catch (e) {
        console.error('Failed to fetch Calendar token', e);
        return null;
    }
}

export async function calendarAction(params: CalendarParams): Promise<CalendarResult> {
    const token = await getAccessToken();

    if (!token) {
        return {
            success: false,
            error: 'Authentication required. Please connect Calendar in Integrations.'
        };
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        switch (params.action) {
            case 'list':
                const timeMin = params.timeMin || new Date().toISOString();
                const max = params.maxResults || 10;
                const listUrl = `${CALENDAR_API_BASE}/events?timeMin=${timeMin}&maxResults=${max}&orderBy=startTime&singleEvents=true`;

                const listRes = await fetch(listUrl, { headers });
                if (!listRes.ok) throw new Error(`Calendar API error: ${listRes.statusText}`);

                const listData = await listRes.json();
                const events = listData.items || [];

                return { success: true, data: events };

            case 'create':
                if (!params.summary || !params.startTime || !params.endTime) {
                    return { success: false, error: 'Missing summary, startTime, or endTime' };
                }

                const eventBody = {
                    summary: params.summary,
                    description: params.description || 'Created by BakedBot',
                    start: { dateTime: params.startTime },
                    end: { dateTime: params.endTime }
                };

                const createRes = await fetch(`${CALENDAR_API_BASE}/events`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(eventBody)
                });

                if (!createRes.ok) throw new Error(`Calendar API error: ${createRes.statusText}`);
                const createData = await createRes.json();

                return { success: true, data: createData };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[calendarAction] Error:', error);
        return { success: false, error: error.message };
    }
}
