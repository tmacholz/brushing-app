import { useState, useCallback, useRef, useEffect } from 'react';
import { generateSpeech, clearAudioCache, type TTSOptions } from '../services/elevenLabs';
import { unlockAudio, isAudioUnlocked } from '../utils/iosAudioUnlock';

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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    // Don't re-speak the same text if already speaking it
    if (currentTextRef.current === text && isSpeaking) {
      return;
    }

    // Stop any current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    currentTextRef.current = text;
    setIsLoading(true);
    setError(null);
    setIsPaused(false);

    try {
      // Ensure audio is unlocked for iOS silent mode
      if (!isAudioUnlocked()) {
        await unlockAudio();
      }

      const audioUrl = await generateSpeech(text, options);

      // Check if we've been stopped while loading
      if (currentTextRef.current !== text) {
        return;
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsSpeaking(true);
        setIsLoading(false);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        currentTextRef.current = null;
      };

      audio.onerror = () => {
        setError('Failed to play audio');
        setIsSpeaking(false);
        setIsLoading(false);
        currentTextRef.current = null;
      };

      await audio.play();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate speech');
      setIsLoading(false);
      setIsSpeaking(false);
      currentTextRef.current = null;
    }
  }, [options, isSpeaking]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    currentTextRef.current = null;
    setIsSpeaking(false);
    setIsLoading(false);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause();
      setIsPaused(true);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play();
      setIsPaused(false);
      setIsSpeaking(true);
    }
  }, [isPaused]);

  const clearCache = useCallback(() => {
    clearAudioCache();
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
