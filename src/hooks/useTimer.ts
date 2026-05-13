import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

interface UseTimerOptions {
  onTimeUp?: () => void;
}

interface UseTimerReturn {
  elapsed: number;
  remaining: number | null;
  isRunning: boolean;
  isPaused: boolean;
  start: (duration?: number) => void;
  stop: () => void;
  reset: () => void;
  recordActivity: () => void;
}

const IDLE_THRESHOLD = 3000; // 3 seconds

export function useTimer(options?: UseTimerOptions): UseTimerReturn {
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<number | null>(null);
  const onTimeUpRef = useRef(options?.onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = options?.onTimeUp;
  });

  // Accumulated time segments (ms) before pauses
  const accumulatedRef = useRef(0);
  // Start of current active segment
  const segmentStartRef = useRef<number | null>(null);
  // Last activity time
  const lastActivityRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const recordActivity = useCallback(() => {
    const now = Date.now();
    const lastActivity = lastActivityRef.current;

    // If was paused (segmentStart is null), start a new segment
    if (segmentStartRef.current === null && lastActivity !== null) {
      // We were paused, resume with a new segment
      segmentStartRef.current = now;
    }

    lastActivityRef.current = now;
    setIsPaused(false);
  }, []);

  const start = useCallback((duration?: number) => {
    clearTimer();
    const now = Date.now();
    durationRef.current = duration ?? null;
    accumulatedRef.current = 0;
    segmentStartRef.current = now;
    lastActivityRef.current = now;
    setElapsed(0);
    setRemaining(duration ?? null);
    setIsRunning(true);
    setIsPaused(false);

    intervalRef.current = setInterval(() => {
      const tick = Date.now();
      const lastAct = lastActivityRef.current ?? tick;
      const idleTime = tick - lastAct;

      if (idleTime > IDLE_THRESHOLD) {
        // Paused: accumulate only up to last activity time
        if (segmentStartRef.current !== null) {
          accumulatedRef.current += lastAct - segmentStartRef.current;
          segmentStartRef.current = null; // Mark as paused
        }
        const elapsedMs = accumulatedRef.current;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        setElapsed(elapsedSec);
        setIsPaused(true);

        if (durationRef.current !== null) {
          const rem = Math.max(0, durationRef.current - elapsedSec);
          setRemaining(rem);
        }
      } else {
        // Active: elapsed = accumulated + current segment
        const segStart = segmentStartRef.current ?? tick;
        const elapsedMs = accumulatedRef.current + (tick - segStart);
        const elapsedSec = Math.floor(elapsedMs / 1000);
        setElapsed(elapsedSec);
        setIsPaused(false);

        if (durationRef.current !== null) {
          const rem = Math.max(0, durationRef.current - elapsedSec);
          setRemaining(rem);
          if (rem <= 0) {
            clearTimer();
            setIsRunning(false);
            onTimeUpRef.current?.();
          }
        }
      }
    }, 200);
  }, [clearTimer]);

  const stop = useCallback(() => {
    // Finalize elapsed before stopping
    if (segmentStartRef.current !== null && lastActivityRef.current !== null) {
      const now = Date.now();
      const lastAct = lastActivityRef.current;
      const idleTime = now - lastAct;
      if (idleTime > IDLE_THRESHOLD) {
        accumulatedRef.current += lastAct - segmentStartRef.current;
      } else {
        accumulatedRef.current += now - segmentStartRef.current;
      }
      segmentStartRef.current = null;
    }
    const finalElapsed = Math.floor(accumulatedRef.current / 1000);
    setElapsed(finalElapsed);
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    accumulatedRef.current = 0;
    segmentStartRef.current = null;
    lastActivityRef.current = null;
    setElapsed(0);
    setRemaining(durationRef.current);
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  return useMemo(
    () => ({ elapsed, remaining, isRunning, isPaused, start, stop, reset, recordActivity }),
    [elapsed, remaining, isRunning, isPaused, start, stop, reset, recordActivity],
  );
}
