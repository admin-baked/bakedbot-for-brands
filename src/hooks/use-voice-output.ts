/**
 * Voice Output Hook
 * 
 * High-quality Automated Voice Output for the loyalty tablet.
 * Fetches audio from /api/voice/tts (Google Cloud TTS) instead of the 
 * robotic browser SpeechSynthesis.
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export function useVoiceOutput() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isSupported] = useState(true); // Backend-driven, so it's always supported
    
    // Dedicated audio element to prevent overlaps
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                try {
                    audioRef.current.src = "";
                } catch (e) {
                   // Ignore
                }
                audioRef.current = null;
            }
        };
    }, []);

    const speak = useCallback(async (text: string) => {
        if (!isEnabled || !text.trim()) return;

        // Cancel previous speech
        if (audioRef.current) {
            audioRef.current.pause();
            try {
                audioRef.current.src = "";
            } catch (e) {
                console.debug('[VoiceOutput] Failed to clear audio src:', e);
            }
            audioRef.current = null;
        }

        try {
            const resp = await fetch('/api/voice/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!resp.ok) throw new Error('TTS fetch failed');

            const data = await resp.json();
            if (!data.audioBase64) throw new Error('No audio returned');

            const audioSrc = `data:audio/mp3;base64,${data.audioBase64}`;
            const audio = new Audio(audioSrc);
            audioRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
                setIsSpeaking(false);
                audioRef.current = null;
            };
            audio.onerror = () => {
                setIsSpeaking(false);
                audioRef.current = null;
            };

            await audio.play();
        } catch (err) {
            console.error('[VoiceOutput] Synthesis failed', err);
            setIsSpeaking(false);
        }
    }, [isEnabled]);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            try {
                audioRef.current.src = "";
            } catch (e) {
                console.debug('[VoiceOutput] Failed to clear audio src:', e);
            }
            audioRef.current = null;
            setIsSpeaking(false);
        }
    }, []);

    return {
        isSpeaking,
        isEnabled,
        isSupported,
        speak,
        stop,
        setIsEnabled,
    };
}
