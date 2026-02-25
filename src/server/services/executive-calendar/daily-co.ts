/**
 * Daily.co Video Conferencing Service
 * Handles room creation, management, and transcription for executive meetings.
 */

import { logger } from '@/lib/logger';

const DAILY_API_BASE = 'https://api.daily.co/v1';

function getDailyApiKey(): string {
    const key = process.env.DAILY_API_KEY;
    if (!key) throw new Error('[Daily.co] DAILY_API_KEY not configured');
    return key;
}

async function dailyFetch<T>(path: string, method: string, body?: unknown): Promise<T> {
    const res = await fetch(`${DAILY_API_BASE}${path}`, {
        method,
        headers: {
            'Authorization': `Bearer ${getDailyApiKey()}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`[Daily.co] ${method} ${path} → ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
}

export interface DailyRoom {
    id: string;
    name: string;
    url: string;
    privacy: string;
    created_at: number;
    config: Record<string, unknown>;
}

export interface DailyTranscriptResult {
    transcriptText?: string;
    status: string;
}

/**
 * Creates a meeting room with cloud recording + transcription enabled.
 * Room expires 30 minutes after the meeting end time.
 */
export async function createMeetingRoom(
    roomName: string,
    expiresAt: Date,
): Promise<DailyRoom> {
    logger.info(`[Daily.co] Creating room: ${roomName}, expires: ${expiresAt.toISOString()}`);

    return dailyFetch<DailyRoom>('/rooms', 'POST', {
        name: roomName,
        privacy: 'public',
        properties: {
            exp: Math.floor(expiresAt.getTime() / 1000),
            enable_recording: 'cloud',
            enable_transcription: true,
            start_audio_off: false,
            start_video_off: false,
            enable_chat: true,
            enable_screenshare: true,
        },
    });
}

/**
 * Deletes a meeting room (called on cancellation).
 */
export async function deleteMeetingRoom(roomName: string): Promise<void> {
    logger.info(`[Daily.co] Deleting room: ${roomName}`);
    await dailyFetch(`/rooms/${roomName}`, 'DELETE');
}

/**
 * Gets room info. Returns null if room doesn't exist.
 */
export async function getRoomInfo(roomName: string): Promise<DailyRoom | null> {
    try {
        return await dailyFetch<DailyRoom>(`/rooms/${roomName}`, 'GET');
    } catch {
        return null;
    }
}

/**
 * Builds the room name for a booking.
 * Format: {profileSlug}-{shortBookingId}
 */
export function buildRoomName(profileSlug: string, bookingId: string): string {
    const short = bookingId.replace(/-/g, '').slice(0, 8);
    return `${profileSlug}-${short}`;
}
