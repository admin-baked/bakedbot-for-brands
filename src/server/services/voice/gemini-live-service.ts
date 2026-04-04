/**
 * Gemini Live Voice Service
 *
 * Single-turn voice sessions using the Gemini Live API.
 * Audio in (WebM/Opus from MediaRecorder) → Smokey responds → audio out (PCM/mp3).
 *
 * Model: gemini-live-2.5-flash-preview
 * Voice: Aoede (warm, conversational — fits Smokey's budtender persona)
 *
 * Architecture: stateless single-turn — each call opens a session, sends audio,
 * collects the full response, and closes. Context is injected via systemInstruction.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { logger } from '@/lib/logger';

// ─── Constants ────────────────────────────────────────────────────────────────

const GEMINI_LIVE_MODEL = 'gemini-live-2.5-flash-preview';
const SMOKEY_VOICE = 'Fenrir'; // Deep, authoritative male voice — fits Smokey's character
const SESSION_TIMEOUT_MS = 20_000; // 20s max — typical counter interaction

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VoiceTurnContext {
    /** Org-scoped brand name (e.g. "Thrive Syracuse") */
    brandName: string;
    /** Customer's first name if known */
    customerName?: string;
    /** Customer's selected mood */
    mood?: string;
    /** Products customer flagged interest in */
    cartItems?: string[];
    /** Compact purchase history summary from getCustomerHistory */
    purchaseHistorySummary?: string;
    /** Free-form extra context (search results, etc.) */
    extraContext?: string;
}

export interface VoiceTurnResult {
    success: boolean;
    /** Base64-encoded audio response (PCM or mp3 depending on Gemini output) */
    audioParts: string[];
    /** MIME type of the audio response */
    audioMimeType: string;
    /** Text transcript of Smokey's response */
    transcript: string;
    /** Input transcript (what Gemini heard) */
    inputTranscript?: string;
    error?: string;
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(ctx: VoiceTurnContext): string {
    const lines: string[] = [
        `You are Smokey, the AI budtender for ${ctx.brandName}.`,
        `You are friendly, knowledgeable, and conversational — like a great budtender who really knows the menu.`,
        `Keep responses SHORT and spoken — 1–3 sentences max. No markdown, no lists. Just natural speech.`,
        `You are speaking aloud to a customer at the dispensary counter. The budtender may also be listening.`,
        `Never make medical claims. Never recommend driving or operating machinery.`,
        `If asked about something you don't know, say so naturally and offer to help the budtender assist.`,
    ];

    if (ctx.customerName) {
        lines.push(`The customer's name is ${ctx.customerName}.`);
    }

    if (ctx.mood) {
        lines.push(`They told us their mood is: ${ctx.mood}.`);
    }

    if (ctx.cartItems && ctx.cartItems.length > 0) {
        lines.push(`They've shown interest in: ${ctx.cartItems.join(', ')}.`);
    }

    if (ctx.purchaseHistorySummary) {
        lines.push(`Purchase history: ${ctx.purchaseHistorySummary}`);
    }

    if (ctx.extraContext) {
        lines.push(`Additional context: ${ctx.extraContext}`);
    }

    return lines.join('\n');
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Run a single voice turn with Smokey via Gemini Live.
 *
 * @param audioBase64 - Base64-encoded audio from MediaRecorder (WebM/Opus)
 * @param audioMimeType - MIME type of the input audio
 * @param context - Customer/session context for Smokey's system prompt
 */
export async function runSmokeyVoiceTurn(
    audioBase64: string,
    audioMimeType: string,
    context: VoiceTurnContext,
): Promise<VoiceTurnResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return {
            success: false,
            audioParts: [],
            audioMimeType: 'audio/pcm',
            transcript: '',
            error: 'GEMINI_API_KEY is not configured',
        };
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemPrompt(context);

    const audioParts: string[] = [];
    const responseMimeTypes: string[] = [];
    let transcript = '';
    let inputTranscript = '';

    return new Promise<VoiceTurnResult>((resolve) => {
        const timeout = setTimeout(() => {
            logger.warn('[GeminiLive] Session timed out', { brandName: context.brandName });
            resolve({
                success: false,
                audioParts: [],
                audioMimeType: 'audio/pcm',
                transcript: '',
                error: 'Voice session timed out',
            });
        }, SESSION_TIMEOUT_MS);

        let session: Awaited<ReturnType<typeof ai.live.connect>>;

        ai.live.connect({
            model: GEMINI_LIVE_MODEL,
            callbacks: {
                onopen: () => {
                    logger.info('[GeminiLive] Session opened', { model: GEMINI_LIVE_MODEL });
                    // Send the audio input, then signal end of turn
                    session.sendRealtimeInput({
                        audio: { data: audioBase64, mimeType: audioMimeType },
                    });
                    session.sendRealtimeInput({ audioStreamEnd: true });
                },

                onmessage: (msg: unknown) => {
                    // Collect audio parts from model turn
                    const msgData = msg as any;
                    const parts = msgData.serverContent?.modelTurn?.parts ?? [];
                    for (const part of parts) {
                        if (part.inlineData?.data && part.inlineData.mimeType) {
                            audioParts.push(part.inlineData.data);
                            if (!responseMimeTypes.includes(part.inlineData.mimeType)) {
                                responseMimeTypes.push(part.inlineData.mimeType);
                            }
                        }
                        if (part.text) {
                            transcript += part.text;
                        }
                    }

                    // Capture input transcript if provided
                    const inputParts = msgData.serverContent?.inputTranscription?.parts ?? [];
                    for (const p of inputParts) {
                        if (p.text) inputTranscript += p.text;
                    }

                    // Turn complete → resolve
                    if (msgData.serverContent?.turnComplete) {
                        clearTimeout(timeout);
                        session.close();
                        logger.info('[GeminiLive] Turn complete', {
                            audioParts: audioParts.length,
                            transcriptLength: transcript.length,
                            brandName: context.brandName,
                        });
                        resolve({
                            success: true,
                            audioParts,
                            audioMimeType: responseMimeTypes[0] ?? 'audio/pcm',
                            transcript: transcript.trim(),
                            inputTranscript: inputTranscript.trim() || undefined,
                        });
                    }
                },

                onerror: (err: unknown) => {
                    clearTimeout(timeout);
                    logger.error('[GeminiLive] Session error', { error: err });
                    resolve({
                        success: false,
                        audioParts: [],
                        audioMimeType: 'audio/pcm',
                        transcript: '',
                        error: err instanceof Error ? err.message : 'Voice session error',
                    });
                },

                onclose: () => {
                    logger.info('[GeminiLive] Session closed');
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction,
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: SMOKEY_VOICE },
                    },
                },
            },
        }).then((s: typeof session) => {
            session = s;
        }).catch((err: unknown) => {
            clearTimeout(timeout);
            logger.error('[GeminiLive] Failed to connect', { error: err });
            resolve({
                success: false,
                audioParts: [],
                audioMimeType: 'audio/pcm',
                transcript: '',
                error: err instanceof Error ? err.message : 'Failed to connect to Gemini Live',
            });
        });
    });
}
