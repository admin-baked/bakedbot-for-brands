'use client';

import '@livekit/components-styles';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';

interface Props {
    roomName: string;
    token: string;
    livekitUrl: string;
    meetingTypeName: string;
    externalName: string;
    profileSlug: string;
}

export function MeetingRoomClient({
    token,
    livekitUrl,
    meetingTypeName,
    externalName,
}: Props) {
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#000' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 24px',
                background: '#111',
                borderBottom: '1px solid #222',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: '#16a34a', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 14, fontWeight: 700,
                        fontFamily: 'sans-serif',
                    }}>B</div>
                    <div>
                        <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0, fontFamily: 'sans-serif' }}>
                            {meetingTypeName}
                        </p>
                        <p style={{ color: '#9ca3af', fontSize: 12, margin: 0, fontFamily: 'sans-serif' }}>
                            with {externalName}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#16a34a',
                        animation: 'pulse 2s infinite',
                    }} />
                    <span style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'sans-serif' }}>Live</span>
                </div>
            </div>

            {/* LiveKit Room */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                <LiveKitRoom
                    video={true}
                    audio={true}
                    token={token}
                    serverUrl={livekitUrl}
                    data-lk-theme="default"
                    style={{ height: '100%' }}
                >
                    <VideoConference />
                    <RoomAudioRenderer />
                </LiveKitRoom>
            </div>
        </div>
    );
}
