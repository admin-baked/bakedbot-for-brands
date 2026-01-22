'use client';

/**
 * useServerTTS Hook
 *
 * Client-side hook for using server-side OpenAI TTS.
 * Complements the browser-based use-voice-output.ts hook.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

export interface ServerTTSOptions {
  /** Voice to use (default: nova) */
  voice?: OpenAIVoice;
  /** Speech speed 0.25-4.0 (default: 1.0) */
  speed?: number;
  /** Brand ID for voice customization */
  brandId?: string;
  /** Auto-play when speech is generated */
  autoPlay?: boolean;
}

export interface ServerTTSState {
  /** Whether audio is being generated */
  isLoading: boolean;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Error message if any */
  error: string | null;
  /** URL of the current audio */
  audioUrl: string | null;
  /** Duration of the audio in seconds */
  duration: number | null;
  /** Whether the audio was served from cache */
  cached: boolean;
}

export interface ServerTTSActions {
  /** Generate and optionally play speech */
  speak: (text: string, options?: ServerTTSOptions) => Promise<string | null>;
  /** Stop current playback */
  stop: () => void;
  /** Pause current playback */
  pause: () => void;
  /** Resume paused playback */
  resume: () => void;
  /** Play a specific audio URL */
  playUrl: (url: string) => void;
  /** Clear error state */
  clearError: () => void;
}

export type ServerTTSReturn = ServerTTSState & ServerTTSActions & {
  /** Audio element for custom control */
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for server-side TTS using OpenAI.
 *
 * @example
 * ```tsx
 * function VoiceDemo() {
 *   const { speak, isLoading, isPlaying, stop } = useServerTTS();
 *
 *   const handleSpeak = async () => {
 *     await speak('Hello, welcome to our dispensary!', {
 *       voice: 'nova',
 *       autoPlay: true,
 *     });
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleSpeak} disabled={isLoading}>
 *         {isLoading ? 'Generating...' : 'Speak'}
 *       </button>
 *       {isPlaying && <button onClick={stop}>Stop</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useServerTTS(defaultOptions?: ServerTTSOptions): ServerTTSReturn {
  const [state, setState] = useState<ServerTTSState>({
    isLoading: false,
    isPlaying: false,
    error: null,
    audioUrl: null,
    duration: null,
    cached: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();

      audioRef.current.addEventListener('ended', () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      });

      audioRef.current.addEventListener('error', () => {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          error: 'Audio playback error',
        }));
      });

      audioRef.current.addEventListener('play', () => {
        setState((prev) => ({ ...prev, isPlaying: true }));
      });

      audioRef.current.addEventListener('pause', () => {
        setState((prev) => ({ ...prev, isPlaying: false }));
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  /**
   * Generate speech from text.
   */
  const speak = useCallback(
    async (text: string, options?: ServerTTSOptions): Promise<string | null> => {
      const mergedOptions = { ...defaultOptions, ...options };

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice: mergedOptions.voice,
            speed: mergedOptions.speed,
            brandId: mergedOptions.brandId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();

        setState((prev) => ({
          ...prev,
          isLoading: false,
          audioUrl: data.audioUrl,
          duration: data.duration,
          cached: data.cached,
        }));

        // Auto-play if requested
        if (mergedOptions.autoPlay !== false && audioRef.current) {
          audioRef.current.src = data.audioUrl;
          await audioRef.current.play();
        }

        return data.audioUrl;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'TTS generation failed';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        return null;
      }
    },
    [defaultOptions]
  );

  /**
   * Stop playback.
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  /**
   * Pause playback.
   */
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  /**
   * Resume playback.
   */
  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, []);

  /**
   * Play a specific URL.
   */
  const playUrl = useCallback((url: string) => {
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
      setState((prev) => ({ ...prev, audioUrl: url }));
    }
  }, []);

  /**
   * Clear error state.
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    speak,
    stop,
    pause,
    resume,
    playUrl,
    clearError,
    audioRef,
  };
}

export default useServerTTS;
