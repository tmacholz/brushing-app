import { useState, useCallback, useRef, useEffect } from 'react';

const TOTAL_DURATION_SECONDS = 120; // 2 minutes

export interface BrushingTimerState {
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number; // 0 to 1
  isRunning: boolean;
  isComplete: boolean;
}

export interface UseBrushingTimerReturn extends BrushingTimerState {
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useBrushingTimer(
  onComplete?: () => void,
  onTick?: (elapsedSeconds: number) => void
): UseBrushingTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isComplete) return;

    setIsRunning(true);
    clearTimer();

    intervalRef.current = window.setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;

        onTickRef.current?.(next);

        if (next >= TOTAL_DURATION_SECONDS) {
          clearTimer();
          setIsRunning(false);
          setIsComplete(true);
          onCompleteRef.current?.();
          return TOTAL_DURATION_SECONDS;
        }

        return next;
      });
    }, 1000);
  }, [isComplete, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (!isComplete && !isRunning) {
      start();
    }
  }, [isComplete, isRunning, start]);

  const reset = useCallback(() => {
    clearTimer();
    setElapsedSeconds(0);
    setIsRunning(false);
    setIsComplete(false);
  }, [clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const remainingSeconds = TOTAL_DURATION_SECONDS - elapsedSeconds;
  const progress = elapsedSeconds / TOTAL_DURATION_SECONDS;

  return {
    elapsedSeconds,
    remainingSeconds,
    progress,
    isRunning,
    isComplete,
    start,
    pause,
    resume,
    reset,
  };
}

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TOTAL_DURATION = TOTAL_DURATION_SECONDS;

export default useBrushingTimer;
