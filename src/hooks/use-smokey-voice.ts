/**
 * useSmokeyVoice
 *
 * Client hook for Gemini Live voice sessions with Smokey.
 *
 * Flow:
 *   startRecording() → MediaRecorder captures WebM/Opus
 *   stopAndSend()    → sends audio to /api/voice/smokey → plays PCM response
 *
 * The hook handles:
 *   - MediaRecorder lifecycle (start / stop / collect chunks)
 *   - Base64 encoding for the API
 *   - PCM-to-WAV conversion for browser playback
 *   - Audio element lifecycle (single instance, replaces previous)
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmokeyVoiceOptions {
    orgId: string;
    customerName?: string;
    customerId?: string;
    mood?: string;
    cartItems?: string[];
}

export type SmokeyVoiceState = 'idle' | 'recording' | 'processing' | 'speaking' | 'error';

export interface SmokeyVoiceReturn {
    state: SmokeyVoiceState;
    transcript: string;        // Smokey's text response
    inputTranscript: string;   // What Gemini heard
    error: string | null;
    isSupported: boolean;
    startRecording: () => void;
    stopAndSend: () => void;
    cancel: () => void;
}

// ─── WAV header builder ───────────────────────────────────────────────────────
// Gemini Live returns raw PCM (16-bit, 24kHz, mono). Browsers can't play
// raw PCM, so we wrap it in a minimal WAV container.

function pcmToWav(pcmBase64Parts: string[], sampleRate = 24_000): string {
    const pcmBuffers = pcmBase64Parts.map((b64) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    });

    const totalPcmLength = pcmBuffers.reduce((sum, b) => sum + b.length, 0);
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const headerSize = 44;
    const wav = new Uint8Array(headerSize + totalPcmLength);
    const view = new DataView(wav.buffer);

    const enc = new TextEncoder();
    wav.set(enc.encode('RIFF'), 0);
    view.setUint32(4, 36 + totalPcmLength, true);
    wav.set(enc.encode('WAVE'), 8);
    wav.set(enc.encode('fmt '), 12);
    view.setUint32(16, 16, true);       // PCM chunk size
    view.setUint16(20, 1, true);        // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    wav.set(enc.encode('data'), 36);
    view.setUint32(40, totalPcmLength, true);

    let offset = headerSize;
    for (const buf of pcmBuffers) {
        wav.set(buf, offset);
        offset += buf.length;
    }

    // Return as base64 data URL
    let binary = '';
    for (let i = 0; i < wav.length; i++) {
        binary += String.fromCharCode(wav[i]);
    }
    return 'data:audio/wav;base64,' + btoa(binary);
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the data URL prefix — we only want the base64 payload
            const base64 = result.split(',')[1] ?? '';
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSmokeyVoice(options: SmokeyVoiceOptions): SmokeyVoiceReturn {
    const { orgId, customerName, customerId, mood, cartItems } = options;

    const [state, setState] = useState<SmokeyVoiceState>('idle');
    const [transcript, setTranscript] = useState('');
    const [inputTranscript, setInputTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortRef = useRef(false);

    // Check support on mount
    useEffect(() => {
        setIsSupported(
            typeof navigator !== 'undefined' &&
            typeof navigator.mediaDevices?.getUserMedia === 'function' &&
            typeof MediaRecorder !== 'undefined',
        );
    }, []);

    const cancel = useCallback(() => {
        abortRef.current = true;
        recorderRef.current?.stop();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setState('idle');
        setError(null);
    }, []);

    const startRecording = useCallback(async () => {
        if (!isSupported) {
            setError('Microphone not supported on this browser.');
            setState('error');
            return;
        }

        abortRef.current = false;
        setError(null);
        setTranscript('');
        setInputTranscript('');

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            setError('Microphone permission denied.');
            setState('error');
            return;
        }

        chunksRef.current = [];

        // Prefer Opus — Gemini Live handles it well
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/ogg';

        const recorder = new MediaRecorder(stream, { mimeType });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.start(100); // 100ms chunks
        setState('recording');
    }, [isSupported]);

    const stopAndSend = useCallback(() => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;

        recorder.onstop = async () => {
            // Stop all tracks to release mic
            (recorder.stream as MediaStream).getTracks().forEach((t) => t.stop());

            if (abortRef.current) return;

            const mimeType = recorder.mimeType;
            const blob = new Blob(chunksRef.current, { type: mimeType });
            chunksRef.current = [];

            if (blob.size < 1000) {
                setError('Recording too short. Hold the button while speaking.');
                setState('error');
                return;
            }

            setState('processing');

            let audioBase64: string;
            try {
                audioBase64 = await blobToBase64(blob);
            } catch {
                setError('Failed to encode audio.');
                setState('error');
                return;
            }

            let response: Response;
            try {
                response = await fetch('/api/voice/smokey', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orgId,
                        audioBase64,
                        audioMimeType: mimeType,
                        customerName,
                        customerId,
                        mood,
                        cartItems,
                    }),
                });
            } catch {
                setError('Network error. Please try again.');
                setState('error');
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({})) as { error?: string };
                setError(data.error ?? 'Smokey is temporarily unavailable.');
                setState('error');
                return;
            }

            const data = await response.json() as {
                audioParts: string[];
                audioMimeType: string;
                transcript: string;
                inputTranscript?: string;
            };

            if (abortRef.current) return;

            setTranscript(data.transcript);
            setInputTranscript(data.inputTranscript ?? '');

            // Build playable audio
            let audioSrc: string;
            if (data.audioMimeType.includes('pcm')) {
                // Raw PCM → wrap in WAV container
                audioSrc = pcmToWav(data.audioParts);
            } else {
                // mp3 / opus / wav — decode directly
                const combined = data.audioParts.join('');
                audioSrc = `data:${data.audioMimeType};base64,${combined}`;
            }

            setState('speaking');

            const audio = new Audio(audioSrc);
            audioRef.current = audio;

            audio.onended = () => {
                if (!abortRef.current) setState('idle');
            };
            audio.onerror = () => {
                setError('Audio playback failed.');
                setState('error');
            };

            await audio.play().catch(() => {
                setError('Audio playback was blocked. Tap to play.');
                setState('error');
            });
        };

        recorder.stop();
    }, [orgId, customerName, customerId, mood, cartItems]);

    return {
        state,
        transcript,
        inputTranscript,
        error,
        isSupported,
        startRecording,
        stopAndSend,
        cancel,
    };
}
