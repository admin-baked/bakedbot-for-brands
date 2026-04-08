export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/server/services/voice/google-tts';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const requestSchema = z.object({
    text: z.string().min(1).max(5000),
    voiceName: z.string().optional(),
    languageCode: z.string().optional(),
});

/**
 * POST /api/voice/tts
 * 
 * Simple text-to-speech API.
 * Inputs: { text, voiceName?, languageCode? }
 * Outputs: { audioBase64, mimeType: "audio/mp3" }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json();
        const parsed = requestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        const { text, voiceName, languageCode } = parsed.data;

        logger.info('[TTSAPI] Synthesis requested', {
            text: text.slice(0, 50),
            voice: voiceName,
        });

        const audioBase64 = await synthesizeSpeech({
            text,
            voiceName,
            languageCode,
        });

        return NextResponse.json({
            audioBase64,
            mimeType: 'audio/mp3',
            transcript: text,
        });
    } catch (err) {
        logger.error('[TTSAPI] Request failed', { err });
        return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 500 });
    }
}
