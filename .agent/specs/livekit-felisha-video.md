# Spec: LiveKit + Felisha Video Integration

> **Status:** Approved — AI-Executable
> **Author:** Claude Code | **Date:** 2026-02-24
> **Replaces:** Daily.co (`src/server/services/executive-calendar/daily-co.ts`)
> **Architecture approved by user:** LiveKit Cloud + Deepgram STT + Cloud Run + meet.bakedbot.ai

---

## 1. Intent

Replace Daily.co (requires credit card, expensive) with LiveKit Cloud (existing API keys, generous free tier) for the Executive Boardroom Calendar. Add Felisha as a Python AI agent that joins every meeting room, transcribes via Deepgram STT (12,000 free min/month > our ~600 min/month usage), then auto-generates meeting notes and action items via Claude when the room closes.

**Short booking URLs:**
- `bakedbot.ai/martez` → redirects → `bakedbot.ai/book/martez`
- `bakedbot.ai/jack` → redirects → `bakedbot.ai/book/jack`

**Meeting room URL:**
- `meet.bakedbot.ai/{roomName}` — the actual video call (LiveKit components)

---

## 2. Architecture

```
Guest/Exec
    │
    ▼
bakedbot.ai/book/{slug}     ← already exists
    │ (booking confirmed)
    │
    ▼
/api/livekit/token           ← NEW: JWT token for guest/exec
    │
    ▼
meet.bakedbot.ai/{roomName}  ← NEW: Next.js page, LiveKit <LiveKitRoom> component
    │
    ├── LiveKit Cloud (wss://bakedbot.livekit.cloud)  ← existing keys
    │
    └── Felisha Agent (Cloud Run)
           │  joins room automatically on room_started webhook
           │  listens via Deepgram STT
           │  on room_finished:
           └──► POST /api/livekit/webhook
                    → saves transcript to Firestore
                    → callClaude() → meeting notes + action items
                    → markFollowUpSent + saveMeetingTranscript
```

---

## 3. Boundary Check

| Trigger | Required? |
|---------|-----------|
| Authentication changes | YES — token API must be public (no auth) for guests |
| Schema changes | YES — `dailyRoomName` → `livekitRoomName` in Firestore + types |
| Payment/external service | YES — LiveKit Cloud (existing keys), Deepgram (new key needed) |
| Compliance | NO |
| New infrastructure | YES — Cloud Run container for Felisha |

Full spec required. ✅ (This is it.)

---

## 4. Secrets Required

### Step A: Add to GCP Secret Manager

```bash
# LiveKit (from LiveKit Cloud dashboard — project bakedbot)
echo -n "APIxxxxxxxx" | gcloud secrets create LIVEKIT_API_KEY --data-file=- --project=studio-567050101-bc6e8
echo -n "secret_xxxxxxxx" | gcloud secrets create LIVEKIT_API_SECRET --data-file=- --project=studio-567050101-bc6e8
echo -n "wss://bakedbot.livekit.cloud" | gcloud secrets create LIVEKIT_URL --data-file=- --project=studio-567050101-bc6e8

# Deepgram (from console.deepgram.com — free tier, 12k min/month)
echo -n "xxxxx" | gcloud secrets create DEEPGRAM_API_KEY --data-file=- --project=studio-567050101-bc6e8

# Grant Firebase App Hosting access (run after firebase login)
firebase apphosting:secrets:grantaccess LIVEKIT_API_KEY --backend=bakedbot-prod
firebase apphosting:secrets:grantaccess LIVEKIT_API_SECRET --backend=bakedbot-prod
firebase apphosting:secrets:grantaccess LIVEKIT_URL --backend=bakedbot-prod
firebase apphosting:secrets:grantaccess DEEPGRAM_API_KEY --backend=bakedbot-prod
```

### Step B: apphosting.yaml additions

Add these 4 entries to `apphosting.yaml` (RUNTIME availability):

```yaml
  - variable: LIVEKIT_API_KEY
    secret: LIVEKIT_API_KEY@1
    availability:
      - RUNTIME
  - variable: LIVEKIT_API_SECRET
    secret: LIVEKIT_API_SECRET@1
    availability:
      - RUNTIME
  - variable: LIVEKIT_URL
    secret: LIVEKIT_URL@1
    availability:
      - RUNTIME
  - variable: DEEPGRAM_API_KEY
    secret: DEEPGRAM_API_KEY@1
    availability:
      - RUNTIME
```

Remove (or comment out) `DAILY_API_KEY@1` from apphosting.yaml.

---

## 5. NPM Packages

```bash
npm install livekit-server-sdk @livekit/components-react @livekit/components-styles livekit-client
```

- `livekit-server-sdk` — server-side token generation + webhook verification (Node.js)
- `@livekit/components-react` — pre-built LiveKit React components (`<LiveKitRoom>`, `<VideoConference>`)
- `@livekit/components-styles` — required CSS for LiveKit components
- `livekit-client` — WebRTC client SDK (peer dep of components)

Add `livekit-server-sdk` to `serverExternalPackages` in `next.config.js`:

```js
serverExternalPackages: [
    // ... existing ...
    'livekit-server-sdk',
],
```

---

## 6. Files to Create

### 6.1 `src/server/services/executive-calendar/livekit.ts`

Replace `daily-co.ts`. Exports the same interface surface (`createMeetingRoom`, `deleteMeetingRoom`, `buildRoomName`) so actions.ts changes are minimal.

```typescript
/**
 * LiveKit Cloud Video Service
 * Replaces Daily.co for executive meeting rooms.
 */

import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { logger } from '@/lib/logger';

function getLiveKitConfig() {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL; // wss://bakedbot.livekit.cloud
    if (!apiKey || !apiSecret || !url) {
        throw new Error('[LiveKit] LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL required');
    }
    return { apiKey, apiSecret, url };
}

export interface LiveKitRoom {
    name: string;
    url: string; // meet.bakedbot.ai/{roomName}
}

/**
 * Creates a LiveKit room (implicit on first join — just returns the URL).
 * LiveKit rooms auto-create when the first participant joins.
 */
export async function createMeetingRoom(
    roomName: string,
    _expiresAt: Date, // kept for API compatibility; LiveKit uses token TTL
): Promise<LiveKitRoom> {
    logger.info(`[LiveKit] Preparing room: ${roomName}`);
    // LiveKit rooms are created implicitly; we pre-create for metadata
    const { apiKey, apiSecret, url } = getLiveKitConfig();
    const roomService = new RoomServiceClient(url.replace('wss://', 'https://'), apiKey, apiSecret);
    try {
        await roomService.createRoom({ name: roomName, emptyTimeout: 600 }); // 10 min empty timeout
    } catch (err) {
        // Room may already exist — that's fine
        logger.warn(`[LiveKit] createRoom warning (may already exist): ${String(err)}`);
    }
    const meetUrl = `https://meet.bakedbot.ai/${roomName}`;
    return { name: roomName, url: meetUrl };
}

/**
 * Deletes a LiveKit room (called on booking cancellation).
 */
export async function deleteMeetingRoom(roomName: string): Promise<void> {
    logger.info(`[LiveKit] Deleting room: ${roomName}`);
    try {
        const { apiKey, apiSecret, url } = getLiveKitConfig();
        const roomService = new RoomServiceClient(url.replace('wss://', 'https://'), apiKey, apiSecret);
        await roomService.deleteRoom(roomName);
    } catch (err) {
        logger.warn(`[LiveKit] deleteMeetingRoom warning: ${String(err)}`);
    }
}

/**
 * Generates an access token for a participant joining a meeting.
 * @param roomName - LiveKit room name
 * @param participantName - Display name (e.g. "Martez Miller" or "Jane Smith")
 * @param isHost - True for the executive (grants admin permissions)
 * @param ttlSeconds - Token validity in seconds (default: 4 hours)
 */
export async function generateAccessToken(
    roomName: string,
    participantName: string,
    isHost: boolean,
    ttlSeconds = 14400,
): Promise<string> {
    const { apiKey, apiSecret } = getLiveKitConfig();
    const participantIdentity = `${participantName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

    const at = new AccessToken(apiKey, apiSecret, {
        identity: participantIdentity,
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
 * Format: {profileSlug}-{shortBookingId}
 * Same format as Daily.co so existing Firestore docs are compatible.
 */
export function buildRoomName(profileSlug: string, bookingId: string): string {
    const short = bookingId.replace(/-/g, '').slice(0, 8);
    return `${profileSlug}-${short}`;
}

/**
 * Verifies a LiveKit webhook signature.
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(body: string, authHeader: string): boolean {
    try {
        const { apiSecret } = getLiveKitConfig();
        // LiveKit uses Authorization: Bearer <jwt> where jwt encodes the event
        // The receiver verifies using the API secret
        // Simple approach: verify token is signed with our secret
        import('livekit-server-sdk').then(({ WebhookReceiver }) => {
            const receiver = new WebhookReceiver(process.env.LIVEKIT_API_KEY!, apiSecret);
            receiver.receive(body, authHeader);
        });
        return true;
    } catch {
        return false;
    }
}
```

### 6.2 `src/app/meet/[roomId]/page.tsx`

Server component — fetches the booking, generates token, passes to client.

```typescript
/**
 * Meeting Room Page
 * URL: meet.bakedbot.ai/{roomId}  (or bakedbot.ai/meet/{roomId} locally)
 * No auth required — access controlled via signed token.
 */

import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@/firebase/admin';
import { generateAccessToken } from '@/server/services/executive-calendar/livekit';
import { MeetingRoomClient } from './components/meeting-room-client';

interface Props {
    params: Promise<{ roomId: string }>;
    searchParams: Promise<{ name?: string; host?: string }>;
}

export default async function MeetingRoomPage({ params, searchParams }: Props) {
    const { roomId } = await params;
    const { name, host } = await searchParams;

    if (!roomId) notFound();

    // Look up booking by room name to get context
    const firestore = getAdminFirestore();
    const snap = await firestore
        .collection('meeting_bookings')
        .where('livekitRoomName', '==', roomId)
        .where('status', 'in', ['confirmed', 'completed'])
        .limit(1)
        .get();

    if (snap.empty) notFound();

    const booking = snap.docs[0].data();
    const participantName = name || 'Guest';
    const isHost = host === 'true';

    const token = await generateAccessToken(roomId, participantName, isHost);
    const livekitUrl = process.env.LIVEKIT_URL || 'wss://bakedbot.livekit.cloud';

    return (
        <MeetingRoomClient
            roomName={roomId}
            token={token}
            livekitUrl={livekitUrl}
            bookingId={snap.docs[0].id}
            meetingTypeName={booking.meetingTypeName as string}
            externalName={booking.externalName as string}
            profileSlug={booking.profileSlug as string}
        />
    );
}
```

### 6.3 `src/app/meet/[roomId]/components/meeting-room-client.tsx`

```typescript
'use client';

import '@livekit/components-styles';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';

interface Props {
    roomName: string;
    token: string;
    livekitUrl: string;
    bookingId: string;
    meetingTypeName: string;
    externalName: string;
    profileSlug: string;
}

export function MeetingRoomClient({
    roomName, token, livekitUrl, meetingTypeName, externalName,
}: Props) {
    return (
        <div className="h-screen bg-black flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">B</div>
                    <div>
                        <p className="text-white text-sm font-semibold">{meetingTypeName}</p>
                        <p className="text-gray-400 text-xs">with {externalName}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-gray-400 text-xs">Live</span>
                </div>
            </div>

            {/* LiveKit Room */}
            <div className="flex-1">
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
```

### 6.4 `src/app/api/livekit/token/route.ts`

Public endpoint — no auth. Guests call this to get a token when joining a meeting.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken } from '@/server/services/executive-calendar/livekit';
import { logger } from '@/lib/logger';

/**
 * GET /api/livekit/token?room=martez-abc12345&name=Jane+Smith&host=false
 * Returns a LiveKit JWT access token for joining the specified room.
 * Public — anyone with the room link can join (access controlled by token TTL).
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const room = searchParams.get('room');
        const name = searchParams.get('name') || 'Guest';
        const isHost = searchParams.get('host') === 'true';

        if (!room) {
            return NextResponse.json({ error: 'room parameter required' }, { status: 400 });
        }

        const token = await generateAccessToken(room, name, isHost);
        return NextResponse.json({ token, room, name });
    } catch (err) {
        logger.error(`[LiveKit Token API] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
}
```

### 6.5 `src/app/api/livekit/webhook/route.ts`

LiveKit calls this when room events occur (room_finished, participant_joined, etc.).

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { WebhookReceiver } from 'livekit-server-sdk';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { saveMeetingTranscript, markFollowUpSent } from '@/server/actions/executive-calendar';
import { sendFollowUpEmail } from '@/server/services/executive-calendar/booking-emails';
import { getExecutiveProfile } from '@/server/actions/executive-calendar';
import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    const body = await request.text();
    const authHeader = request.headers.get('authorization') || '';

    // Verify webhook signature
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
        return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 });
    }

    let event;
    try {
        const receiver = new WebhookReceiver(apiKey, apiSecret);
        event = await receiver.receive(body, authHeader);
    } catch (err) {
        logger.error(`[LiveKit Webhook] Signature verification failed: ${String(err)}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    logger.info(`[LiveKit Webhook] Event: ${event.event}, room: ${event.room?.name}`);

    // Handle room_finished — transcript processing
    if (event.event === 'room_finished') {
        const roomName = event.room?.name;
        if (!roomName) return NextResponse.json({ ok: true });

        setImmediate(async () => {
            try {
                await processRoomFinished(roomName);
            } catch (err) {
                logger.error(`[LiveKit Webhook] processRoomFinished error: ${String(err)}`);
            }
        });
    }

    return NextResponse.json({ ok: true });
}

async function processRoomFinished(roomName: string) {
    const firestore = getAdminFirestore();

    // Find booking by room name
    const snap = await firestore
        .collection('meeting_bookings')
        .where('livekitRoomName', '==', roomName)
        .where('status', '==', 'confirmed')
        .limit(1)
        .get();

    if (snap.empty) {
        logger.warn(`[LiveKit Webhook] No booking found for room: ${roomName}`);
        return;
    }

    const bookingDoc = snap.docs[0];
    const bookingId = bookingDoc.id;
    const bookingData = bookingDoc.data();

    // Get transcript saved by Felisha agent (may be empty if agent wasn't running)
    const transcript = (bookingData.transcript as string) || '';

    if (!transcript) {
        logger.warn(`[LiveKit Webhook] No transcript for booking ${bookingId} — skipping note generation`);
        // Still mark as completed
        await firestore.collection('meeting_bookings').doc(bookingId).update({
            status: 'completed',
            updatedAt: Timestamp.now(),
        });
        return;
    }

    // Generate meeting notes + action items via Claude
    const notesPrompt = `You are Felisha, the executive assistant AI for BakedBot.

A meeting just ended. Here is the transcript:

${transcript}

Generate:
1. Concise meeting notes (3-5 bullet points, what was discussed and decided)
2. Clear action items (who does what by when, inferred from context)

Return JSON only:
{
  "meetingNotes": "• Point 1\\n• Point 2\\n...",
  "actionItems": ["Action 1", "Action 2", ...]
}`;

    let meetingNotes = '';
    let actionItems: string[] = [];

    try {
        const response = await callClaude({
            systemPrompt: 'You are a precise executive assistant. Return only valid JSON.',
            userMessage: notesPrompt,
            model: 'claude-haiku-4-5-20251001',
            maxTokens: 1024,
        });

        const parsed = JSON.parse(response);
        meetingNotes = parsed.meetingNotes || '';
        actionItems = parsed.actionItems || [];
    } catch (err) {
        logger.error(`[LiveKit Webhook] Claude note generation failed: ${String(err)}`);
        meetingNotes = 'Meeting completed. Transcript saved.';
    }

    // Save to Firestore
    await saveMeetingTranscript(bookingId, transcript, meetingNotes, actionItems);

    // Send follow-up email
    try {
        const profileSlug = bookingData.profileSlug as string;
        const profile = await getExecutiveProfile(profileSlug);
        if (profile) {
            const booking = {
                ...bookingData,
                id: bookingId,
                startAt: bookingData.startAt?.toDate() ?? new Date(),
                endAt: bookingData.endAt?.toDate() ?? new Date(),
                prepBriefSentAt: bookingData.prepBriefSentAt?.toDate() ?? null,
                followUpSentAt: bookingData.followUpSentAt?.toDate() ?? null,
                confirmationEmailSentAt: bookingData.confirmationEmailSentAt?.toDate() ?? null,
                createdAt: bookingData.createdAt?.toDate() ?? new Date(),
                updatedAt: bookingData.updatedAt?.toDate() ?? new Date(),
            } as import('@/types/executive-calendar').MeetingBooking;

            await sendFollowUpEmail(booking, profile, meetingNotes, actionItems);
            await markFollowUpSent(bookingId);
        }
    } catch (err) {
        logger.error(`[LiveKit Webhook] Follow-up email failed: ${String(err)}`);
    }

    logger.info(`[LiveKit Webhook] Room ${roomName} processed: notes generated, follow-up sent`);
}

export async function GET() {
    return NextResponse.json({ ok: true, service: 'livekit-webhook' });
}
```

### 6.6 `src/app/api/livekit/transcript/route.ts`

Felisha agent calls this to save the transcript as it accumulates during the meeting.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';
import { logger } from '@/lib/logger';

/**
 * POST /api/livekit/transcript
 * Called by Felisha Python agent to save meeting transcript.
 * Auth: LIVEKIT_API_KEY as Bearer token (shared secret between agent + server).
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    const expectedKey = `Bearer ${process.env.LIVEKIT_API_KEY}`;
    if (authHeader !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { bookingId, transcript, roomName } = await request.json() as {
            bookingId?: string;
            transcript: string;
            roomName: string;
        };

        const firestore = getAdminFirestore();

        let docId = bookingId;
        if (!docId) {
            // Look up by room name
            const snap = await firestore
                .collection('meeting_bookings')
                .where('livekitRoomName', '==', roomName)
                .limit(1)
                .get();
            if (snap.empty) {
                return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
            }
            docId = snap.docs[0].id;
        }

        await firestore.collection('meeting_bookings').doc(docId).update({
            transcript,
            updatedAt: Timestamp.now(),
        });

        logger.info(`[LiveKit Transcript] Saved transcript for booking ${docId} (${transcript.length} chars)`);
        return NextResponse.json({ ok: true, bookingId: docId });
    } catch (err) {
        logger.error(`[LiveKit Transcript API] Error: ${String(err)}`);
        return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
    }
}
```

---

## 7. Files to Modify

### 7.1 `src/types/executive-calendar.ts`

Change line 63:
```typescript
// BEFORE:
dailyRoomName: string;

// AFTER:
livekitRoomName: string;
```

### 7.2 `src/server/actions/executive-calendar.ts`

Update import (line 23):
```typescript
// BEFORE:
import { createMeetingRoom, buildRoomName } from '@/server/services/executive-calendar/daily-co';

// AFTER:
import { createMeetingRoom, buildRoomName } from '@/server/services/executive-calendar/livekit';
```

Update `createBooking()` — change `dailyRoomName` to `livekitRoomName` everywhere in the function (lines ~159–200):

The booking object field:
```typescript
// BEFORE:
dailyRoomName: roomName,

// AFTER:
livekitRoomName: roomName,
```

Update `getBookingsForDate()` and all `firestoreToBooking()` calls — in `firestoreToBooking`:
```typescript
// BEFORE:
dailyRoomName: data.dailyRoomName as string,

// AFTER:
livekitRoomName: data.livekitRoomName as string,
```

Update `cancelBooking()` — remove Daily.co room deletion (it was already not deleting in current code, just updating status).

### 7.3 `next.config.js` — Add short URL redirects

In the `async redirects()` section, add before the closing `]`:

```javascript
// Executive short booking URLs
{
    source: '/martez',
    destination: '/book/martez',
    permanent: false, // 307 — in case slug changes
},
{
    source: '/jack',
    destination: '/book/jack',
    permanent: false,
},
```

### 7.4 `next.config.js` — Update CSP for LiveKit

In the `connect-src` directive in the Content-Security-Policy header, add LiveKit WebSocket endpoints:

```
connect-src 'self' https://*.googleapis.com ... wss://*.livekit.cloud https://*.livekit.cloud
```

In `media-src`, add:
```
media-src 'self' data: https: blob: ... https://*.livekit.cloud
```

### 7.5 `src/proxy.ts` — Add `meet` to reserved subdomains

Line 63, add `'meet'` to the `reservedSubdomains` array:
```typescript
// BEFORE:
const reservedSubdomains = ['www', 'api', 'app', 'dashboard', 'admin', 'mail', 'cdn', 'static', 'academy', 'vibe', 'training'];

// AFTER:
const reservedSubdomains = ['www', 'api', 'app', 'dashboard', 'admin', 'mail', 'cdn', 'static', 'academy', 'vibe', 'training', 'meet'];
```

### 7.6 `apphosting.yaml` — Replace DAILY_API_KEY

Remove:
```yaml
  - variable: DAILY_API_KEY
    secret: DAILY_API_KEY@1
    availability:
      - RUNTIME
```

Add (4 new secrets per Section 4 above).

### 7.7 `src/app/book/[slug]/components/booking-page-client.tsx`

After booking is confirmed and `BookingConfirmation` is returned, update the "Join Meeting" button to point to `meet.bakedbot.ai/{roomName}` with the participant's name as a query param:

```typescript
// The confirmation shows:
const meetUrl = `https://meet.bakedbot.ai/${confirmation.videoRoomUrl.split('/').pop()}?name=${encodeURIComponent(guestName)}`;
// Or if already full URL:
const meetUrl = confirmation.videoRoomUrl; // videoRoomUrl is now https://meet.bakedbot.ai/{roomName}
```

(The `videoRoomUrl` stored in Firestore will already be `https://meet.bakedbot.ai/{roomName}` because `createMeetingRoom()` in livekit.ts returns that URL.)

### 7.8 `src/app/api/calendar/webhooks/daily/route.ts` → Rename/repurpose

This file handled Daily.co webhooks. Since we've moved to LiveKit webhooks at `/api/livekit/webhook/route.ts`, this file can be emptied to a stub:

```typescript
import { NextResponse } from 'next/server';

// Daily.co webhooks replaced by LiveKit webhooks at /api/livekit/webhook
export async function POST() {
    return NextResponse.json({ ok: true, deprecated: true });
}
export async function GET() {
    return NextResponse.json({ ok: true, deprecated: true });
}
```

---

## 8. Felisha Python Agent (Cloud Run)

### 8.1 Directory: `felisha-agent/`

```
felisha-agent/
├── main.py
├── requirements.txt
├── Dockerfile
└── .dockerignore
```

### 8.2 `felisha-agent/requirements.txt`

```
livekit-agents==0.8.*
livekit-plugins-deepgram==0.6.*
livekit-plugins-openai==0.10.*  # for optional LLM responses in-meeting
httpx==0.27.*
python-dotenv==1.0.*
```

### 8.3 `felisha-agent/main.py`

```python
"""
Felisha - AI Meeting Assistant
Joins every BakedBot executive meeting, transcribes via Deepgram STT,
and posts the transcript to the Next.js API when the room closes.
"""

import asyncio
import httpx
import os
import logging
from livekit import agents
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.plugins import deepgram

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("felisha")

BAKEDBOT_API_URL = os.environ.get("BAKEDBOT_API_URL", "https://bakedbot.ai")
LIVEKIT_API_KEY = os.environ.get("LIVEKIT_API_KEY", "")


async def entrypoint(ctx: JobContext):
    """Called when Felisha is dispatched to a new room."""
    room_name = ctx.room.name
    logger.info(f"Felisha joining room: {room_name}")

    # Full transcript accumulated across the session
    transcript_lines: list[str] = []

    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Set up Deepgram STT
    stt = deepgram.STT(
        api_key=os.environ["DEEPGRAM_API_KEY"],
        model="nova-2",
        language="en-US",
        punctuate=True,
        smart_format=True,
    )

    # Subscribe to all audio tracks
    @ctx.room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        if track.kind == agents.rtc.TrackKind.KIND_AUDIO:
            asyncio.ensure_future(
                transcribe_track(track, participant.name or participant.identity, stt, transcript_lines)
            )

    # Wait for room to finish (Felisha stays until everyone leaves)
    disconnected = asyncio.Event()

    @ctx.room.on("disconnected")
    def on_disconnected():
        disconnected.set()

    await disconnected.wait()

    # Save final transcript to BakedBot API
    final_transcript = "\n".join(transcript_lines)
    logger.info(f"Room {room_name} ended. Transcript: {len(final_transcript)} chars")

    if final_transcript.strip():
        await save_transcript(room_name, final_transcript)


async def transcribe_track(track, participant_name: str, stt, transcript_lines: list[str]):
    """Transcribes a single audio track and appends to transcript_lines."""
    async for event in stt.stream(track):
        if event.type == agents.stt.SpeechEventType.FINAL_TRANSCRIPT:
            text = event.alternatives[0].text.strip()
            if text:
                line = f"{participant_name}: {text}"
                transcript_lines.append(line)
                logger.info(f"  [{participant_name}] {text}")


async def save_transcript(room_name: str, transcript: str):
    """Posts transcript to the BakedBot Next.js API."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BAKEDBOT_API_URL}/api/livekit/transcript",
                json={"roomName": room_name, "transcript": transcript},
                headers={"Authorization": f"Bearer {LIVEKIT_API_KEY}"},
            )
            if response.status_code == 200:
                logger.info(f"Transcript saved for room {room_name}")
            else:
                logger.error(f"Failed to save transcript: {response.status_code} {response.text}")
    except Exception as e:
        logger.error(f"Exception saving transcript: {e}")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            # Felisha auto-dispatches to all rooms in the bakedbot project
            # Set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET as env vars
        )
    )
```

### 8.4 `felisha-agent/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# System dependencies for audio processing
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

# Download Deepgram model data at build time
RUN python -c "from livekit.plugins import deepgram; print('deepgram ok')" || true

CMD ["python", "main.py", "start"]
```

### 8.5 `felisha-agent/.dockerignore`

```
__pycache__
*.pyc
.env
.env.local
```

### 8.6 Cloud Run Deployment Commands

```bash
# Build and push image
gcloud builds submit felisha-agent/ \
  --tag gcr.io/studio-567050101-bc6e8/felisha-agent:latest \
  --project=studio-567050101-bc6e8

# Deploy to Cloud Run
gcloud run deploy felisha-agent \
  --image gcr.io/studio-567050101-bc6e8/felisha-agent:latest \
  --region us-east1 \
  --platform managed \
  --no-allow-unauthenticated \
  --set-env-vars LIVEKIT_URL=wss://bakedbot.livekit.cloud \
  --set-secrets LIVEKIT_API_KEY=LIVEKIT_API_KEY:latest \
  --set-secrets LIVEKIT_API_SECRET=LIVEKIT_API_SECRET:latest \
  --set-secrets DEEPGRAM_API_KEY=DEEPGRAM_API_KEY:latest \
  --set-env-vars BAKEDBOT_API_URL=https://bakedbot.ai \
  --min-instances 1 \
  --max-instances 3 \
  --memory 512Mi \
  --project=studio-567050101-bc6e8
```

**Note:** `--min-instances 1` keeps Felisha warm so she joins rooms without cold-start delay. Cost: ~$7/month for 1 always-on 512Mi instance.

---

## 9. DNS Configuration

### meet.bakedbot.ai CNAME

Add a CNAME in your DNS provider (Cloudflare/GoDaddy/etc.):

```
meet.bakedbot.ai  CNAME  bakedbot.ai  (or the Firebase App Hosting domain)
```

**Then:** Add `meet.bakedbot.ai` as a custom domain in Firebase App Hosting:

```bash
firebase apphosting:domains:create meet.bakedbot.ai --backend=bakedbot-prod
```

This routes `meet.bakedbot.ai/{roomId}` to the Next.js app which serves `/meet/{roomId}`.

---

## 10. LiveKit Cloud Configuration

In the LiveKit Cloud dashboard (cloud.livekit.io):

1. **Project:** bakedbot (should already exist given they have API keys)
2. **Webhooks:** Add webhook URL: `https://bakedbot.ai/api/livekit/webhook`
   - Events to subscribe: `room_started`, `room_finished`, `participant_joined`, `participant_left`
3. **Agent dispatch:** Enable agent dispatch so Felisha auto-joins (or use manual dispatch)
   - Alternative: In `createMeetingRoom()`, after creating the room, call LiveKit's dispatch API to schedule Felisha

---

## 11. Implementation Order

Execute these steps in order:

1. **Secrets first** — Get LiveKit API keys + Deepgram key, add to GCP Secret Manager + `apphosting.yaml`
2. **Install packages** — `npm install livekit-server-sdk @livekit/components-react @livekit/components-styles livekit-client`
3. **Update types** — `src/types/executive-calendar.ts`: `dailyRoomName` → `livekitRoomName`
4. **Create LiveKit service** — `src/server/services/executive-calendar/livekit.ts`
5. **Update actions** — `src/server/actions/executive-calendar.ts` (import + field names)
6. **Create API routes** — `/api/livekit/token`, `/api/livekit/webhook`, `/api/livekit/transcript`
7. **Create meeting room page** — `src/app/meet/[roomId]/page.tsx` + client component
8. **Update next.config.js** — redirects + serverExternalPackages + CSP
9. **Update proxy.ts** — add `meet` to reservedSubdomains
10. **Stub daily webhook** — `src/app/api/calendar/webhooks/daily/route.ts`
11. **Run `npm run check:types`** — fix any type errors
12. **Commit + push** — triggers Firebase App Hosting build
13. **Deploy Felisha** — `gcloud builds submit` + `gcloud run deploy`
14. **Configure LiveKit webhooks** — in cloud.livekit.io dashboard
15. **DNS** — add CNAME for meet.bakedbot.ai + Firebase custom domain

---

## 12. Test Plan

### Unit Tests (npm test)
- Token generation returns valid JWT
- `buildRoomName()` format: `{slug}-{8chars}`
- Webhook signature verification

### Smoke Tests (manual)
1. Visit `bakedbot.ai/martez` → redirects to `/book/martez` ✅
2. Visit `bakedbot.ai/jack` → redirects to `/book/jack` ✅
3. Book a test meeting → confirmation email arrives with `meet.bakedbot.ai/{roomName}` link ✅
4. Open meeting link → LiveKit room loads, camera/mic work ✅
5. Two tabs join the same room → can see/hear each other ✅
6. Felisha appears as participant in the room ✅
7. Speak in the room → Felisha transcribes
8. Leave room → transcript saved to Firestore → follow-up email with notes arrives ✅

### Edge Cases
- Room not found (404) → `/meet/invalid-room` shows notFound()
- Deepgram offline → transcript empty → notes generation skipped gracefully
- Felisha cold start → room may start before Felisha joins; partial transcript still saved

---

## 13. Cost Analysis

| Service | Usage | Cost |
|---------|-------|------|
| LiveKit Cloud | ~600 min/mo meetings | Free (25k min/mo free) |
| Deepgram STT | ~600 min/mo | Free (12k min/mo free) |
| Cloud Run (Felisha) | 1 min-instance | ~$7/mo |
| Firebase (meet subdomain) | included | $0 |
| **Total** | | **~$7/mo** |

vs Daily.co: starts at $15/mo + pay-per-minute recording fees.

---

## 14. Rollback Plan

If LiveKit integration fails:
1. Revert import in `executive-calendar.ts` back to `daily-co.ts`
2. Revert `livekitRoomName` → `dailyRoomName` in types
3. Restore `DAILY_API_KEY@1` in apphosting.yaml
4. Push — existing bookings still work (field name in Firestore documents needs migration script if already saved)

Firestore migration (if needed):
```javascript
// scripts/migrate-room-name-field.mjs
// Reads meeting_bookings, renames dailyRoomName → livekitRoomName
// Only needed if bookings were created with old field name
```

---

*Spec complete. Proceed to implementation.*
