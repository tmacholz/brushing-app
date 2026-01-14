import { useState, useCallback, useRef, useEffect } from 'react';
import type { AudioSplicePoint } from '../types';

interface AudioSplicingOptions {
  childNameAudioUrl: string | null;
  petNameAudioUrl: string | null;
}

interface UseAudioSplicingReturn {
  play: (baseAudioUrl: string, splicePoints: AudioSplicePoint[]) => Promise<void>;
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
  const pausedAtRef = useRef<number>(0);
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
    async (baseAudioUrl: string, splicePoints: AudioSplicePoint[]) => {
      // Stop any current playback
      sourceNodesRef.current.forEach((node) => {
        try {
          node.stop();
        } catch {
          // Already stopped
        }
      });
      sourceNodesRef.current = [];

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

        // Load all required audio buffers in parallel
        const buffersToLoad: Promise<AudioBuffer | null>[] = [
          getAudioBuffer(ctx, baseAudioUrl),
        ];

        // Pre-load name audio if we have splice points that need them
        const needsChildName = splicePoints.some((sp) => sp.placeholder === 'CHILD');
        const needsPetName = splicePoints.some((sp) => sp.placeholder === 'PET');

        if (needsChildName && childNameAudioUrl) {
          buffersToLoad.push(getAudioBuffer(ctx, childNameAudioUrl));
        } else {
          buffersToLoad.push(Promise.resolve(null));
        }

        if (needsPetName && petNameAudioUrl) {
          buffersToLoad.push(getAudioBuffer(ctx, petNameAudioUrl));
        } else {
          buffersToLoad.push(Promise.resolve(null));
        }

        const [baseBuffer, childNameBuffer, petNameBuffer] = await Promise.all(buffersToLoad);

        if (!baseBuffer) {
          throw new Error('Failed to load base audio');
        }

        // Sort splice points by timestamp
        const sortedSplicePoints = [...splicePoints].sort(
          (a, b) => a.timestampMs - b.timestampMs
        );

        // Schedule audio playback
        let scheduleTime = ctx.currentTime;
        let basePosition = 0; // Current position in base buffer (seconds)
        const sources: AudioBufferSourceNode[] = [];

        for (const splicePoint of sortedSplicePoints) {
          const spliceTimeSec = splicePoint.timestampMs / 1000;

          // Play base audio from current position to splice point
          if (spliceTimeSec > basePosition) {
            const source = ctx.createBufferSource();
            source.buffer = baseBuffer;
            source.connect(ctx.destination);

            const duration = spliceTimeSec - basePosition;
            source.start(scheduleTime, basePosition, duration);
            sources.push(source);

            scheduleTime += duration;
          }

          // Insert name audio
          const nameBuffer =
            splicePoint.placeholder === 'CHILD' ? childNameBuffer : petNameBuffer;

          if (nameBuffer) {
            const source = ctx.createBufferSource();
            source.buffer = nameBuffer;
            source.connect(ctx.destination);
            source.start(scheduleTime);
            sources.push(source);

            scheduleTime += nameBuffer.duration;
          }

          basePosition = spliceTimeSec;
        }

        // Play remaining base audio after last splice point
        if (basePosition < baseBuffer.duration) {
          const source = ctx.createBufferSource();
          source.buffer = baseBuffer;
          source.connect(ctx.destination);
          source.start(scheduleTime, basePosition);
          sources.push(source);

          scheduleTime += baseBuffer.duration - basePosition;
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
        }
      } catch (err) {
        console.error('Audio splicing error:', err);
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
      pausedAtRef.current = audioContextRef.current.currentTime - startTimeRef.current;
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
