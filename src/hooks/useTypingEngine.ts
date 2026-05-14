import { useState, useCallback, useEffect, useRef } from 'react';
import type { CharState, PracticeMode, TimedDuration, TypingResult } from '../types';
import { useTimer } from './useTimer';
import { calculateWPM, calculateAccuracy, generateId } from '../utils/typing';
import { soundService } from '../services/sound';
import { useSettings } from '../context/SettingsContext';

interface UseTypingEngineOptions {
  text: string;
  mode: PracticeMode;
  timedDuration?: TimedDuration;
}

interface UseTypingEngineReturn {
  chars: CharState[];
  currentIndex: number;
  isStarted: boolean;
  isFinished: boolean;
  isPaused: boolean;
  wpm: number;
  accuracy: number;
  elapsed: number;
  remaining: number | null;
  errorMap: Record<string, { errors: number; total: number }>;
  handleKeyDown: (e: KeyboardEvent) => void;
  reset: () => void;
  getResult: () => TypingResult;
  jumpTo: (index: number) => void;
}

// Character equivalence mapping for typographic variants
function isCharEquivalent(input: string, target: string): boolean {
  if (input === target) return true;

  const singleQuotes = ["'", "\u2018", "\u2019"]; // ' \u2018 \u2019
  const doubleQuotes = ['"', "\u201C", "\u201D"]; // " \u201C \u201D
  const dashes = ["-", "\u2013", "\u2014"];        // - \u2013 \u2014

  if (singleQuotes.includes(input) && singleQuotes.includes(target)) return true;
  if (doubleQuotes.includes(input) && doubleQuotes.includes(target)) return true;
  if (dashes.includes(input) && dashes.includes(target)) return true;

  return false;
}

function initChars(text: string): CharState[] {
  return text.split('').map((char, index) => ({
    char,
    status: index === 0 ? 'current' : 'pending',
  }));
}

/**
 * Core typing engine hook managing character states, input handling,
 * timing, and result calculation.
 *
 * @param text - The text to type (supports dynamic extension for progressive loading)
 * @param mode - Practice mode: 'full' (complete text) or 'timed' (time-limited)
 * @param timedDuration - Duration in seconds for timed mode
 * @returns Engine state and control methods
 */
export function useTypingEngine({
  text,
  mode,
  timedDuration,
}: UseTypingEngineOptions): UseTypingEngineReturn {
  const { settings } = useSettings();
  const [chars, setChars] = useState<CharState[]>(() => initChars(text));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [totalTyped, setTotalTyped] = useState(0);
  const errorMapRef = useRef<Record<string, { errors: number; total: number }>>({});
  const [errorMap, setErrorMap] = useState<Record<string, { errors: number; total: number }>>({});

  // Ref for sound settings to avoid re-creating callbacks
  const soundRef = useRef({ enabled: settings.soundEnabled, volume: settings.soundVolume });
  useEffect(() => {
    soundRef.current = { enabled: settings.soundEnabled, volume: settings.soundVolume };
    soundService.setVolume(settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume]);

  // Refs for mode/timedDuration to avoid handleKeyDown re-creation
  const modeRef = useRef(mode);
  const timedDurationRef = useRef(timedDuration);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    timedDurationRef.current = timedDuration;
  }, [timedDuration]);

  const handleTimeUp = useCallback(() => {
    setIsFinished(true);
    setErrorMap({ ...errorMapRef.current });
    if (soundRef.current.enabled) soundService.playComplete();
  }, []);

  const timer = useTimer({ onTimeUp: handleTimeUp });

  // Stable refs for values that change frequently
  const timerRef = useRef(timer);
  useEffect(() => {
    timerRef.current = timer;
  });

  const stateRef = useRef({
    chars,
    currentIndex,
    isStarted,
    isFinished,
    correctCount,
    incorrectCount,
    totalTyped,
  });
  useEffect(() => {
    stateRef.current = {
      chars,
      currentIndex,
      isStarted,
      isFinished,
      correctCount,
      incorrectCount,
      totalTyped,
    };
  });

  // Compute WPM and accuracy
  const wpm = calculateWPM(correctCount, timer.elapsed);
  const accuracy = calculateAccuracy(correctCount, totalTyped);

  const reset = useCallback(() => {
    setChars(initChars(text));
    setCurrentIndex(0);
    setIsStarted(false);
    setIsFinished(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setTotalTyped(0);
    errorMapRef.current = {};
    setErrorMap({});
    timerRef.current.reset();
  }, [text]);

  // Track previous text for progressive loading detection
  const prevTextRef = useRef(text);

  // Handle text changes: append if text grows (progressive loading) or reset if completely different
  useEffect(() => {
    const prevText = prevTextRef.current;
    prevTextRef.current = text;

    if (text === prevText) return;

    // If new text is a superset (starts with old text), append new chars
    if (text.length > prevText.length && text.startsWith(prevText)) {
      const newPart = text.substring(prevText.length);
      const newChars: CharState[] = newPart.split('').map(c => ({
        char: c,
        status: 'pending' as const,
      }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChars(prev => [...prev, ...newChars]);
    } else {
      // Completely different text - full reset
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { isFinished: finished, chars: currentChars, isStarted: started } = stateRef.current;

      // Tab key: reset current text (works anytime, including when finished)
      if (e.key === 'Tab') {
        e.preventDefault();
        reset();
        return;
      }

      if (finished) return;

      // Ignore modifier keys and special keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Shift' || e.key === 'Escape') return;
      if (e.key === 'Enter' || e.key === 'CapsLock') return;

      e.preventDefault();

      if (e.key === 'Backspace') {
        setCurrentIndex((prev) => {
          if (prev <= 0) return 0;
          const newIndex = prev - 1;
          setChars((prevChars) => {
            const updated = [...prevChars];
            // Reset the character we're backing up to
            updated[newIndex] = { ...updated[newIndex], status: 'current', typed: undefined };
            // Reset old current position to pending
            if (prev < updated.length) {
              updated[prev] = { ...updated[prev], status: 'pending' };
            }
            return updated;
          });
          return newIndex;
        });
        return;
      }

      // Only handle single printable characters
      if (e.key.length !== 1) return;

      // Start on first character input
      if (!started) {
        setIsStarted(true);
        const currentMode = modeRef.current;
        const currentDuration = timedDurationRef.current;
        if (currentMode === 'timed' && currentDuration) {
          timerRef.current.start(currentDuration);
        } else {
          timerRef.current.start();
        }
      }

      // Record activity for idle pause detection
      timerRef.current.recordActivity();

      setCurrentIndex((prev) => {
        const idx = prev;
        if (idx >= currentChars.length) return prev;

        const isCorrect = isCharEquivalent(e.key, currentChars[idx].char);

        setChars((prevChars) => {
          const updated = [...prevChars];
          updated[idx] = {
            ...updated[idx],
            status: isCorrect ? 'correct' : 'incorrect',
            typed: e.key,
          };
          // Set next char as current if exists
          if (idx + 1 < updated.length) {
            updated[idx + 1] = { ...updated[idx + 1], status: 'current' };
          }
          return updated;
        });

        // Track error map
        const targetChar = currentChars[idx].char.toLowerCase();
        if (!errorMapRef.current[targetChar]) {
          errorMapRef.current[targetChar] = { errors: 0, total: 0 };
        }
        errorMapRef.current[targetChar].total += 1;
        if (!isCorrect) {
          errorMapRef.current[targetChar].errors += 1;
        }

        if (isCorrect) {
          setCorrectCount((c) => c + 1);
          if (soundRef.current.enabled) soundService.playKeyPress();
        } else {
          setIncorrectCount((c) => c + 1);
          if (soundRef.current.enabled) soundService.playError();
        }
        setTotalTyped((t) => t + 1);

        const newIndex = idx + 1;

        // Check completion for full mode
        if (modeRef.current === 'full' && newIndex >= currentChars.length) {
          setIsFinished(true);
          setErrorMap({ ...errorMapRef.current });
          timerRef.current.stop();
          if (soundRef.current.enabled) soundService.playComplete();
        }

        return newIndex;
      });
    },
    [reset],
  );

  // Bind global keydown listener using ref pattern to avoid re-registration
  const handleKeyDownRef = useRef(handleKeyDown);
  useEffect(() => {
    handleKeyDownRef.current = handleKeyDown;
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Stop timer when finished
  useEffect(() => {
    if (isFinished && timerRef.current.isRunning) {
      timerRef.current.stop();
    }
  }, [isFinished]);

  const jumpTo = useCallback((index: number) => {
    const targetIndex = Math.max(0, Math.min(index, text.length));
    setCurrentIndex((prev) => {
      setChars((prevChars) => {
        const updated = [...prevChars];
        // Remove current marker from old position
        if (prev < updated.length && updated[prev].status === 'current') {
          updated[prev] = { ...updated[prev], status: 'pending' };
        }
        // Set new current position
        if (targetIndex < updated.length) {
          updated[targetIndex] = { ...updated[targetIndex], status: 'current' };
        }
        return updated;
      });
      return targetIndex;
    });
  }, [text.length]);

  const getResult = useCallback((): TypingResult => {
    const { correctCount: cc, incorrectCount: ic, totalTyped: tt, chars: ch } = stateRef.current;
    const duration = timerRef.current.elapsed;
    return {
      id: generateId(),
      timestamp: Date.now(),
      wpm: calculateWPM(cc, duration),
      accuracy: calculateAccuracy(cc, tt),
      duration,
      totalChars: ch.length,
      correctChars: cc,
      incorrectChars: ic,
      mode,
      timedDuration: mode === 'timed' ? timedDuration : undefined,
      textPreview: text.substring(0, 30),
      errorMap: errorMapRef.current,
    };
  }, [mode, timedDuration, text]);

  return {
    chars,
    currentIndex,
    isStarted,
    isFinished,
    isPaused: timer.isPaused,
    wpm,
    accuracy,
    elapsed: timer.elapsed,
    remaining: timer.remaining,
    errorMap,
    handleKeyDown,
    reset,
    getResult,
    jumpTo,
  };
}
