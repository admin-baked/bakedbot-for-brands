/**
 * Meeting Room Page
 * URL: meet.bakedbot.ai/{roomId}  (also accessible as bakedbot.ai/meet/{roomId})
 * No auth required — access controlled by signed LiveKit JWT token.
 */

import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@/firebase/admin';
import { generateAccessToken } from '@/server/services/executive-calendar/livekit';
import { MeetingRoomClient } from './components/meeting-room-client';
import type { Metadata } from 'next';

interface Props {
    params: Promise<{ roomId: string }>;
    searchParams: Promise<{ name?: string; host?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { roomId } = await params;
    return {
        title: `Meeting Room — BakedBot`,
        description: 'Secure video meeting powered by BakedBot',
        robots: { index: false, follow: false },
    };
}

export default async function MeetingRoomPage({ params, searchParams }: Props) {
    const { roomId } = await params;
    const sp = await searchParams;
    const participantName = sp.name || 'Guest';
    const isHost = sp.host === 'true';

    if (!roomId) notFound();

    // Look up booking to confirm this is a valid room
    const firestore = getAdminFirestore();
    const snap = await firestore
        .collection('meeting_bookings')
        .where('livekitRoomName', '==', roomId)
        .where('status', 'in', ['confirmed', 'completed'])
        .limit(1)
        .get();

    if (snap.empty) notFound();

    const bookingData = snap.docs[0].data();

    // Generate participant token server-side (keeps API secret out of the browser)
    const token = await generateAccessToken(roomId, participantName, isHost);
    const livekitUrl = process.env.LIVEKIT_URL ?? 'wss://bakedbot-ai-oz7ikexv.livekit.cloud';

    return (
        <MeetingRoomClient
            roomName={roomId}
            token={token}
            livekitUrl={livekitUrl}
            meetingTypeName={bookingData.meetingTypeName as string}
            externalName={bookingData.externalName as string}
            profileSlug={bookingData.profileSlug as string}
        />
    );
}
