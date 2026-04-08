export const dynamic = 'force-dynamic';
/**
 * POST /api/voice/smokey
 *
 * Public voice endpoint for the loyalty tablet and budtender panel.
 * Accepts base64-encoded audio, streams it through a Gemini Live session
 * as Smokey, and returns base64 audio + text transcript.
 *
 * No auth required — tablet and counter are unauthenticated surfaces.
 * Rate-limited by orgId presence + audio size cap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { runSmokeyVoiceTurn, type VoiceTurnContext } from '@/server/services/voice/gemini-live-service';
import { getPublicBrandTheme } from '@/server/actions/checkin-management';
import { getCustomerHistory } from '@/server/tools/crm-tools';

// ─── Validation ────────────────────────────────────────────────────────────────

const requestSchema = z.object({
    orgId: z.string().min(1).max(100),
    /** Base64-encoded audio from MediaRecorder */
    audioBase64: z.string().min(1).max(2_000_000), // ~1.5MB max — ~30s WebM/Opus
    /** MIME type of the audio, e.g. "audio/webm;codecs=opus" */
    audioMimeType: z.string().min(1).max(80),
    /** Optional: preloaded customer context */
    customerName: z.string().max(100).optional(),
    customerId: z.string().max(200).optional(),
    mood: z.string().max(50).optional(),
    /** Product names the customer flagged interest in */
    cartItems: z.array(z.string().max(200)).max(10).optional(),
});

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const { orgId, audioBase64, audioMimeType, customerName, customerId, mood, cartItems } = parsed.data;

    // Fetch brand name + optional purchase history in parallel
    const [theme, historyResult] = await Promise.all([
        getPublicBrandTheme(orgId),
        customerId
            ? getCustomerHistory(customerId, orgId, 5).catch(() => null)
            : Promise.resolve(null),
    ]);

    const brandName = theme.brandName ?? orgId;

    const context: VoiceTurnContext = {
        brandName,
        customerName,
        mood,
        cartItems,
        purchaseHistorySummary: historyResult?.summary,
    };

    logger.info('[VoiceSmokey] Turn requested', {
        orgId,
        hasCustomer: Boolean(customerId),
        hasMood: Boolean(mood),
        audioMimeType,
        audioBytes: Math.round((audioBase64.length * 3) / 4),
    });

    const result = await runSmokeyVoiceTurn(audioBase64, audioMimeType, context);

    if (!result.success) {
        logger.warn('[VoiceSmokey] Turn failed', { orgId, error: result.error });
        return NextResponse.json({ error: result.error ?? 'Voice turn failed' }, { status: 500 });
    }

    return NextResponse.json({
        audioParts: result.audioParts,
        audioMimeType: result.audioMimeType,
        transcript: result.transcript,
        inputTranscript: result.inputTranscript,
    });
}
