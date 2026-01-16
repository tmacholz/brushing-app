import { useState, useCallback, useRef, useEffect } from 'react';
import type { NarrationSequenceItem } from '../types';

interface AudioSplicingOptions {
  childNameAudioUrl: string | null;
  petNameAudioUrl: string | null;
}

interface UseAudioSplicingReturn {
  play: (narrationSequence: NarrationSequenceItem[]) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isLoading: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  error: string | null;
  progress: number; // 0-1 progress through current audio
}

// Helper to load audio buffer from URL
async function loadAudioBuffer(
  audioContext: AudioContext,
  url: string
): Promise<AudioBuffer> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

// Cache for loaded audio buffers
const bufferCache = new Map<string, AudioBuffer>();

async function getAudioBuffer(
  audioContext: AudioContext,
  url: string
): Promise<AudioBuffer> {
  // Check cache first
  const cached = bufferCache.get(url);
  if (cached) return cached;

  const buffer = await loadAudioBuffer(audioContext, url);
  bufferCache.set(url, buffer);
  return buffer;
}

/**
 * Hook for playing narration sequences with gapless audio.
 * Uses Web Audio API to schedule clips precisely without gaps.
 */
export function useAudioSplicing(options: AudioSplicingOptions): UseAudioSplicingReturn {
  const { childNameAudioUrl, petNameAudioUrl } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const startTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      sourceNodesRef.current.forEach((node) => {
        try {
          node.stop();
        } catch {
          // Already stopped
        }
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const updateProgress = useCallback(() => {
    if (!audioContextRef.current || !isPlaying || totalDurationRef.current === 0) {
      return;
    }

    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    const newProgress = Math.min(elapsed / totalDurationRef.current, 1);
    setProgress(newProgress);

    if (newProgress < 1) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying]);

  const play = useCallback(
    async (narrationSequence: NarrationSequenceItem[]) => {
      // Stop any current playback
      sourceNodesRef.current.forEach((node) => {
        try {
          node.stop();
        } catch {
          // Already stopped
        }
      });
      sourceNodesRef.current = [];

      if (!narrationSequence || narrationSequence.length === 0) {
        console.log('[AudioSplicing] No narration sequence provided');
        return;
      }

      setIsLoading(true);
      setError(null);
      setIsPaused(false);
      setProgress(0);

      try {
        // Create or reuse audio context
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContext();
        }
        const ctx = audioContextRef.current;

        // Resume context if suspended (browser autoplay policy)
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // Collect all URLs we need to load
        const urlsToLoad = new Set<string>();

        for (const item of narrationSequence) {
          if (item.type === 'audio') {
            urlsToLoad.add(item.url);
          } else if (item.type === 'name') {
            if (item.placeholder === 'CHILD' && childNameAudioUrl) {
              urlsToLoad.add(childNameAudioUrl);
            } else if (item.placeholder === 'PET' && petNameAudioUrl) {
              urlsToLoad.add(petNameAudioUrl);
            }
          }
        }

        // Load all audio buffers in parallel
        const loadPromises: Promise<[string, AudioBuffer]>[] = [];
        for (const url of urlsToLoad) {
          loadPromises.push(
            getAudioBuffer(ctx, url).then((buffer) => [url, buffer] as [string, AudioBuffer])
          );
        }

        const loadedBuffers = await Promise.all(loadPromises);
        const bufferMap = new Map<string, AudioBuffer>(loadedBuffers);

        // Schedule audio playback - all clips scheduled on the same timeline for gapless playback
        // Use overlap around name clips to reduce perceived gaps from audio silence padding
        const NAME_OVERLAP_BEFORE = 0.25; // Overlap before name clips (tighten lead-in)
        const NAME_OVERLAP_AFTER = 0.20; // Overlap after name clips (tighten follow-up)
        let scheduleTime = ctx.currentTime;
        const sources: AudioBufferSourceNode[] = [];

        for (let i = 0; i < narrationSequence.length; i++) {
          const item = narrationSequence[i];
          const prevItem = i > 0 ? narrationSequence[i - 1] : null;
          let buffer: AudioBuffer | undefined;

          if (item.type === 'audio') {
            buffer = bufferMap.get(item.url);
          } else if (item.type === 'name') {
            const url = item.placeholder === 'CHILD' ? childNameAudioUrl : petNameAudioUrl;
            if (url) {
              buffer = bufferMap.get(url);
            }
          }

          if (buffer) {
            // Apply overlap to tighten transitions around names
            const isName = item.type === 'name';
            const followsName = prevItem?.type === 'name';

            // Overlap before name clips (name starts sooner after previous audio)
            if (isName && scheduleTime > ctx.currentTime + NAME_OVERLAP_BEFORE) {
              scheduleTime -= NAME_OVERLAP_BEFORE;
            }
            // Overlap after name clips (next audio starts sooner after name)
            else if (followsName && scheduleTime > ctx.currentTime + NAME_OVERLAP_AFTER) {
              scheduleTime -= NAME_OVERLAP_AFTER;
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(scheduleTime);
            sources.push(source);

            scheduleTime += buffer.duration;
          }
        }

        // Calculate total duration
        totalDurationRef.current = scheduleTime - ctx.currentTime;
        startTimeRef.current = ctx.currentTime;

        sourceNodesRef.current = sources;
        setIsLoading(false);
        setIsPlaying(true);

        // Start progress updates
        animationFrameRef.current = requestAnimationFrame(updateProgress);

        // Set up end handler on last source
        const lastSource = sources[sources.length - 1];
        if (lastSource) {
          lastSource.onended = () => {
            setIsPlaying(false);
            setProgress(1);
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }
          };
        } else {
          // No sources scheduled (no audio)
          setIsLoading(false);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error('Audio playback error:', err);
        setError(err instanceof Error ? err.message : 'Failed to play audio');
        setIsLoading(false);
        setIsPlaying(false);
      }
    },
    [childNameAudioUrl, petNameAudioUrl, updateProgress]
  );

  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    sourceNodesRef.current.forEach((node) => {
      try {
        node.stop();
      } catch {
        // Already stopped
      }
    });
    sourceNodesRef.current = [];
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
  }, []);

  const pause = useCallback(() => {
    if (audioContextRef.current && isPlaying) {
      audioContextRef.current.suspend();
      setIsPaused(true);
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  }, [isPlaying]);

  const resume = useCallback(() => {
    if (audioContextRef.current && isPaused) {
      audioContextRef.current.resume();
      setIsPaused(false);
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPaused, updateProgress]);

  return {
    play,
    stop,
    pause,
    resume,
    isLoading,
    isPlaying,
    isPaused,
    error,
    progress,
  };
}

// Helper to clear the audio buffer cache (useful for memory management)
export function clearAudioBufferCache(): void {
  bufferCache.clear();
}

export default useAudioSplicing;
