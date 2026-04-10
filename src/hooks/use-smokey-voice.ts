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
    autoListening: boolean;    // true when auto-listen is active
    startRecording: () => void;
    stopAndSend: () => void;
    startAutoListen: () => void;
    stopAutoListen: () => void;
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

    const [autoListening, setAutoListening] = useState(false);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const abortRef = useRef(false);
    const autoListenRef = useRef(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const silenceRafRef = useRef<number | null>(null);
    const speechDetectedRef = useRef(false);
    const silenceStartRef = useRef<number | null>(null);
    const recordingStartRef = useRef<number>(0);
    const stopAndSendRef = useRef<() => void>(() => {});
    const beginRecordingRef = useRef<(withSilenceDetection: boolean) => void>(() => {});

    // Check support on mount
    useEffect(() => {
        setIsSupported(
            typeof navigator !== 'undefined' &&
            typeof navigator.mediaDevices?.getUserMedia === 'function' &&
            typeof MediaRecorder !== 'undefined',
        );
    }, []);

    const cleanupSilenceDetection = useCallback(() => {
        if (silenceRafRef.current) {
            cancelAnimationFrame(silenceRafRef.current);
            silenceRafRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
        }
        speechDetectedRef.current = false;
        silenceStartRef.current = null;
    }, []);

    const cancel = useCallback(() => {
        abortRef.current = true;
        autoListenRef.current = false;
        setAutoListening(false);
        cleanupSilenceDetection();
        recorderRef.current?.stop();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setState('idle');
        setError(null);
    }, [cleanupSilenceDetection]);

    // Silence detection constants
    const SILENCE_THRESHOLD = 20;      // amplitude threshold (0-128 scale)
    const SILENCE_DURATION_MS = 2000;  // 2s silence after speech → auto-send
    const MAX_LISTEN_NO_SPEECH_MS = 15_000; // 15s with no speech → restart

    const beginRecording = useCallback(async (withSilenceDetection: boolean) => {
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
            if (autoListenRef.current) {
                autoListenRef.current = false;
                setAutoListening(false);
            }
            return;
        }

        chunksRef.current = [];
        speechDetectedRef.current = false;
        silenceStartRef.current = null;
        recordingStartRef.current = Date.now();

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

        // Set up silence detection for auto-listen mode
        if (withSilenceDetection) {
            try {
                const audioCtx = new AudioContext();
                audioContextRef.current = audioCtx;
                const source = audioCtx.createMediaStreamSource(stream);
                const analyser = audioCtx.createAnalyser();
                analyser.fftSize = 2048;
                source.connect(analyser);

                const dataArray = new Uint8Array(analyser.fftSize);

                const checkAudio = () => {
                    if (abortRef.current || !autoListenRef.current) return;
                    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;

                    analyser.getByteTimeDomainData(dataArray);
                    let maxAmp = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const amp = Math.abs(dataArray[i] - 128);
                        if (amp > maxAmp) maxAmp = amp;
                    }

                    const now = Date.now();

                    if (maxAmp > SILENCE_THRESHOLD) {
                        // Speech detected
                        speechDetectedRef.current = true;
                        silenceStartRef.current = null;
                    } else if (speechDetectedRef.current) {
                        // Silence after speech — start counting
                        if (!silenceStartRef.current) {
                            silenceStartRef.current = now;
                        } else if (now - silenceStartRef.current > SILENCE_DURATION_MS) {
                            // 2s silence after speech → auto-send
                            cleanupSilenceDetection();
                            stopAndSendRef.current();
                            return;
                        }
                    } else if (now - recordingStartRef.current > MAX_LISTEN_NO_SPEECH_MS) {
                        // 15s with no speech at all → restart to keep mic fresh
                        cleanupSilenceDetection();
                        stream.getTracks().forEach(t => t.stop());
                        if (recorderRef.current) {
                            recorderRef.current.stop();
                        }
                        setState('idle');
                        // Restart auto-listen after a brief pause
                        if (autoListenRef.current) {
                            setTimeout(() => {
                                if (autoListenRef.current) beginRecordingRef.current(true);
                            }, 300);
                        }
                        return;
                    }

                    silenceRafRef.current = requestAnimationFrame(checkAudio);
                };

                silenceRafRef.current = requestAnimationFrame(checkAudio);
            } catch {
                // Silence detection failed — fall back to manual mode
            }
        }
    }, [isSupported, cleanupSilenceDetection]);

    const startRecording = useCallback(() => {
        void beginRecording(false);
    }, [beginRecording]);

    const sendRecording = useCallback((recorder: MediaRecorder, stream: MediaStream) => {
        recorder.onstop = async () => {
            stream.getTracks().forEach((t) => t.stop());

            if (abortRef.current) return;

            const mimeType = recorder.mimeType;
            const blob = new Blob(chunksRef.current, { type: mimeType });
            chunksRef.current = [];

            if (blob.size < 1000) {
                // Too short — in auto-listen mode, silently restart
                if (autoListenRef.current) {
                    setState('idle');
                    setTimeout(() => {
                        if (autoListenRef.current) beginRecordingRef.current(true);
                    }, 300);
                    return;
                }
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

            // Fetch with 25s timeout to prevent hanging
            const controller = new AbortController();
            const fetchTimeout = setTimeout(() => controller.abort(), 25_000);

            let response: Response;
            try {
                response = await fetch('/api/voice/smokey', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
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
            } catch (fetchError) {
                clearTimeout(fetchTimeout);
                const isTimeout = fetchError instanceof DOMException && fetchError.name === 'AbortError';
                setError(isTimeout ? 'Smokey took too long — try again.' : 'Network error. Please try again.');
                setState('error');
                // Restart auto-listen on error
                if (autoListenRef.current) {
                    setTimeout(() => {
                        if (autoListenRef.current) {
                            setState('idle');
                            beginRecordingRef.current(true);
                        }
                    }, 2000);
                }
                return;
            }
            clearTimeout(fetchTimeout);

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
                audioSrc = pcmToWav(data.audioParts);
            } else {
                const combined = data.audioParts.join('');
                audioSrc = `data:${data.audioMimeType};base64,${combined}`;
            }

            setState('speaking');

            const audio = new Audio(audioSrc);
            audioRef.current = audio;

            audio.onended = () => {
                if (abortRef.current) return;
                setState('idle');
                // Auto-listen: restart recording after Smokey finishes speaking
                if (autoListenRef.current) {
                    setTimeout(() => {
                        if (autoListenRef.current) beginRecordingRef.current(true);
                    }, 600);
                }
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
    }, [orgId, customerName, customerId, mood, cartItems, beginRecording]);

    const stopAndSend = useCallback(() => {
        cleanupSilenceDetection();
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === 'inactive') return;
        sendRecording(recorder, recorder.stream as MediaStream);
    }, [sendRecording, cleanupSilenceDetection]);

    // Keep refs in sync for circular callback access
    stopAndSendRef.current = stopAndSend;
    beginRecordingRef.current = (withSilence: boolean) => void beginRecording(withSilence);

    const startAutoListen = useCallback(() => {
        autoListenRef.current = true;
        setAutoListening(true);
        void beginRecording(true);
    }, [beginRecording]);

    const stopAutoListen = useCallback(() => {
        autoListenRef.current = false;
        setAutoListening(false);
        cleanupSilenceDetection();
        const recorder = recorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
            (recorder.stream as MediaStream).getTracks().forEach(t => t.stop());
            recorder.stop();
        }
        setState('idle');
    }, [cleanupSilenceDetection]);

    return {
        state,
        transcript,
        inputTranscript,
        error,
        isSupported,
        autoListening,
        startRecording,
        stopAndSend,
        startAutoListen,
        stopAutoListen,
        cancel,
    };
}
