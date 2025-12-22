/**
 * Voice Output Hook
 * Uses Web Speech API for text-to-speech
 */

import { useState, useEffect, useRef } from 'react';

export function useVoiceOutput() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        // Check if Speech Synthesis is supported
        setIsSupported('speechSynthesis' in window);

        return () => {
            // Cleanup: stop any ongoing speech
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const speak = (text: string) => {
        if (!window.speechSynthesis) {
            console.error('Speech synthesis not supported');
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            setIsSpeaking(true);
        };

        utterance.onend = () => {
            setIsSpeaking(false);
        };

        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            setIsSpeaking(false);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const stop = () => {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    };

    const toggle = () => {
        setIsEnabled(!isEnabled);
        if (isSpeaking) {
            stop();
        }
    };

    return {
        isSpeaking,
        isEnabled,
        isSupported,
        speak,
        stop,
        toggle,
        setIsEnabled
    };
}
