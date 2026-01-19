import { useState, useCallback, useRef, useEffect } from 'react';
import { generateSpeech, clearAudioCache, type TTSOptions } from '../services/elevenLabs';
import {
  playAudioUrl,
  clearAudioBufferCache,
  type AudioPlaybackControl,
} from '../utils/iosAudioUnlock';

interface UseTextToSpeechReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isLoading: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  error: string | null;
  clearCache: () => void;
}

export function useTextToSpeech(options?: TTSOptions): UseTextToSpeechReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use Web Audio API control instead of HTMLAudioElement
  const playbackRef = useRef<AudioPlaybackControl | null>(null);
  const currentTextRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) {
        playbackRef.current.stop();
        playbackRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    // Don't re-speak the same text if already speaking it
    if (currentTextRef.current === text && isSpeaking) {
      return;
    }

    // Stop any current playback
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }

    currentTextRef.current = text;
    setIsLoading(true);
    setError(null);
    setIsPaused(false);

    try {
      // Generate the speech audio URL
      const audioUrl = await generateSpeech(text, options);

      // Check if we've been stopped while loading
      if (currentTextRef.current !== text) {
        return;
      }

      // Play through Web Audio API (bypasses iOS mute switch)
      const playback = await playAudioUrl(audioUrl);
      playbackRef.current = playback;

      setIsSpeaking(true);
      setIsLoading(false);

      // Handle playback end
      playback.onEnded = () => {
        setIsSpeaking(false);
        currentTextRef.current = null;
        playbackRef.current = null;
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
      setIsLoading(false);
      setIsSpeaking(false);
      currentTextRef.current = null;
    }
  }, [options, isSpeaking]);

  const stop = useCallback(() => {
    if (playbackRef.current) {
      playbackRef.current.stop();
      playbackRef.current = null;
    }
    currentTextRef.current = null;
    setIsSpeaking(false);
    setIsLoading(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (playbackRef.current && isSpeaking) {
      playbackRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (playbackRef.current && isPaused) {
      playbackRef.current.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    }
  }, [isPaused]);

  const clearCache = useCallback(() => {
    clearAudioCache();
    clearAudioBufferCache();
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    isLoading,
    isSpeaking,
    isPaused,
    error,
    clearCache,
  };
}

export default useTextToSpeech;
