/**
 * LiveKit Cloud Video Service
 * Replaces Daily.co for executive meeting rooms.
 * Rooms auto-create on first participant join; explicit pre-create for metadata.
 */

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { logger } from '@/lib/logger';

function getLiveKitConfig() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL ?? 'wss://bakedbot.livekit.cloud';
    if (!apiKey || !apiSecret) {
        throw new Error('[LiveKit] LIVEKIT_API_KEY and LIVEKIT_API_SECRET are required');
    }
    return { apiKey, apiSecret, url };
}

export interface LiveKitRoom {
    name: string;
    url: string;
}

/**
 * Creates (pre-registers) a LiveKit room and returns the meeting URL.
 * Rooms auto-create when the first participant joins anyway — this just
 * sets metadata like empty timeout.
 */
export async function createMeetingRoom(
    roomName: string,
    _expiresAt: Date, // kept for API compatibility; LiveKit uses token TTL instead
): Promise<LiveKitRoom> {
    logger.info(`[LiveKit] Preparing room: ${roomName}`);
    const { apiKey, apiSecret, url } = getLiveKitConfig();

    try {
        const wsUrl = url.startsWith('wss://') ? url : `wss://${url}`;
        const httpUrl = wsUrl.replace('wss://', 'https://');
        const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
        await roomService.createRoom({
            name: roomName,
            emptyTimeout: 600,       // 10 min empty timeout before auto-close
            maxParticipants: 10,
        });
        logger.info(`[LiveKit] Room created: ${roomName}`);
    } catch (err) {
        // Room may already exist — non-fatal
        logger.warn(`[LiveKit] createRoom (may already exist): ${String(err)}`);
    }

    return {
        name: roomName,
        url: `https://meet.bakedbot.ai/${roomName}`,
    };
}

/**
 * Deletes a LiveKit room (called on booking cancellation).
 */
export async function deleteMeetingRoom(roomName: string): Promise<void> {
    logger.info(`[LiveKit] Deleting room: ${roomName}`);
    try {
        const { apiKey, apiSecret, url } = getLiveKitConfig();
        const httpUrl = url.replace('wss://', 'https://');
        const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
        await roomService.deleteRoom(roomName);
    } catch (err) {
        logger.warn(`[LiveKit] deleteMeetingRoom: ${String(err)}`);
    }
}

/**
 * Generates a signed JWT access token for a participant.
 * @param roomName    LiveKit room name
 * @param participantName  Display name (e.g. "Martez Miller")
 * @param isHost      True for executives (grants canPublishSources + roomAdmin)
 * @param ttlSeconds  Token validity (default 4 hours)
 */
export async function generateAccessToken(
    roomName: string,
    participantName: string,
    isHost: boolean,
    ttlSeconds = 14400,
): Promise<string> {
    const { apiKey, apiSecret } = getLiveKitConfig();
    const identity = `${participantName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const at = new AccessToken(apiKey, apiSecret, {
        identity,
        name: participantName,
        ttl: ttlSeconds,
    });

    at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        roomAdmin: isHost,
    });

    return at.toJwt();
}

/**
 * Builds the room name for a booking.
 * Format: {profileSlug}-{short8chars}
 * Matches the same format previously used with Daily.co.
 */
export function buildRoomName(profileSlug: string, bookingId: string): string {
    const short = bookingId.replace(/-/g, '').slice(0, 8);
    return `${profileSlug}-${short}`;
}
