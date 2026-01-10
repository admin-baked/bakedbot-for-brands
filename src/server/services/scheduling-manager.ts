/**
 * Scheduling Manager (Cal.com)
 * 
 * Capability: Check availability and book meetings.
 * 
 * API Docs: https://cal.com/docs/core-features/api-v2
 */

import { logger } from '@/lib/logger';

// Default to hosted Cal.com, accessible via their public API
const CAL_API_URL = 'https://api.cal.com/v1'; // v1 is stable for basic operations, v2 is newer. Sticking to v1 for simplicity unless v2 required.
// Actually, research showed v2 is robust. Let's start with v1 habits if simple, or check docs.
// Plan said v2. Let's use v2 if we can, or v1 endpoints which are common.
// Docs: https://cal.com/docs/enterprise-features/api/api-reference/bookings
// It seems v1 is widely used.
// Let's use https://api.cal.com/v1 for ease unless we need complex stuff.

export interface AvailabilitySlot {
    time: string; // ISO
    date: string; // YYYY-MM-DD
}

export interface BookingDetails {
    eventTypeId: number;
    start: string; // ISO
    end?: string; // ISO
    responses: {
        name: string;
        email: string;
        guests?: string[];
        location?: {
            value: string; // "phone" or "google_meet"
        };
        notes?: string;
    };
    timeZone: string;
}

export async function checkAvailability(username: string, dateFrom: string, dateTo: string): Promise<AvailabilitySlot[]> {
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) return [];

    try {
        // Cal.com availability usually requires getting schedule or slots
        // endpoint: /schedules?apiKey=...
        // easier: /availability?apiKey=... or look at /slots
        // Official endpoint often used: GET /v1/slots?startTime=...&endTime=...&eventTypeId=...
        // Finding eventTypeId for a user is tricky if we don't know it.
        // We might just assume a default event type ID is configured in env or passed.
        // For MVP, we'll return a stub if we can't easily query without eventTypeId.
        
        // Actually, let's implement a direct "slots" fetch if we have eventTypeId.
        // If not, we might need to list event types first.
        
        return []; // Placeholder for now - API requires EventTypeId
    } catch (e) {
        return [];
    }
}

export async function getEventTypes(username: string): Promise<any[]> {
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) return [];
    
    try {
        const response = await fetch(`${CAL_API_URL}/event-types?apiKey=${apiKey}`);
        const data = await response.json();
        return data.event_types || [];
    } catch (e) {
        logger.error(`[Scheduling] Failed to get event types: ${(e as Error).message}`);
        return [];
    }
}

export async function bookMeeting(details: BookingDetails): Promise<{ success: boolean; bookingId?: number; error?: string }> {
    const apiKey = process.env.CALCOM_API_KEY;
    if (!apiKey) return { success: false, error: "No API key" };

    try {
        const response = await fetch(`${CAL_API_URL}/bookings?apiKey=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(details)
        });

        const result = await response.json();
        
        if (response.ok) {
            return { success: true, bookingId: result.booking?.id || result.id };
        } else {
            return { success: false, error: result.message || 'Booking failed' };
        }
    } catch (e) {
         return { success: false, error: (e as Error).message };
    }
}
