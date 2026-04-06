import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { logger } from '@/lib/logger';

/**
 * Google Cloud Text-to-Speech Service
 *
 * Provides high-quality, natural-sounding automated voices.
 * Uses the same service account as Firebase Admin for authentication.
 */

let client: TextToSpeechClient | null = null;

function getClient(): TextToSpeechClient {
    if (client) return client;

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    let credentials;

    if (serviceAccountKey) {
        try {
            const json = serviceAccountKey.startsWith('{')
                ? serviceAccountKey
                : Buffer.from(serviceAccountKey, 'base64').toString('utf8');
            credentials = JSON.parse(json);
        } catch (err) {
            logger.error('[GoogleTTS] Failed to parse credentials', { err });
        }
    }

    client = new TextToSpeechClient({
        credentials,
        projectId: credentials?.project_id || 'studio-567050101-bc6e8',
    });

    return client;
}

export interface TTSOptions {
    text: string;
    voiceName?: string; // e.g., 'en-US-Neural2-D' (Male) or 'en-US-Neural2-F' (Female)
    languageCode?: string;
    ssml?: boolean;
}

/**
 * Synthesize text to speech and return base64 encoded audio (MP3).
 */
export async function synthesizeSpeech(options: TTSOptions): Promise<string> {
    const { text, voiceName = 'en-US-Neural2-D', languageCode = 'en-US', ssml = false } = options;

    const tts = getClient();

    try {
        const [response] = await tts.synthesizeSpeech({
            input: ssml ? { ssml: text } : { text },
            voice: { name: voiceName, languageCode },
            audioConfig: { audioEncoding: 'MP3', pitch: 0, speakingRate: 1.0 },
        });

        if (!response.audioContent) {
            throw new Error('No audio content returned from Google TTS');
        }

        // audioContent is a Buffer or Uint8Array
        const base64 = Buffer.from(response.audioContent as Uint8Array).toString('base64');
        return base64;
    } catch (err) {
        logger.error('[GoogleTTS] Synthesis failed', { text: text.slice(0, 50), err });
        throw err;
    }
}
