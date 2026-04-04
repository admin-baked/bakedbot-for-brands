/**
 * Voice Output Hook
 * Uses Web Speech API for text-to-speech.
 * Selects the most natural voice available on the device.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Ordered preference list — first match wins.
// iOS Safari "Samantha" is far more natural than the default robotic voice.
const PREFERRED_VOICE_NAMES = [
    'Samantha',           // iOS Safari — best natural voice on iPad
    'Google US English',
    'Microsoft Aria',
    'Microsoft Jenny',
    'Microsoft Zira',
    'Alex',               // macOS
];

function pickBestVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    for (const name of PREFERRED_VOICE_NAMES) {
        const match = enVoices.find(v => v.name.includes(name));
        if (match) return match;
    }
    // Fallback: first English voice, or null
    return enVoices[0] ?? null;
}

export function useVoiceOutput() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const bestVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

    useEffect(() => {
        if (!('speechSynthesis' in window)) return;
        setIsSupported(true);

        const loadVoices = () => {
            bestVoiceRef.current = pickBestVoice(window.speechSynthesis.getVoices());
        };

        // Voices may already be loaded (desktop Chrome) or arrive async (iOS)
        loadVoices();
        window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (bestVoiceRef.current) {
            utterance.voice = bestVoiceRef.current;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const stop = useCallback(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
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
