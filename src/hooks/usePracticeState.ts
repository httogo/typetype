import { useReducer, useRef, useEffect, useMemo, useTransition } from 'react';
import { useLocation } from 'react-router-dom';
import { getRandomText } from '../utils/textSelection';
import type { Settings } from '../types';

type Difficulty = Settings['difficulty'];

export const RENDER_WINDOW = 1500;
export const PRACTICE_CHUNK_SIZE = 5000;
export const PRACTICE_LOAD_THRESHOLD = 2000;

/** Align a split position to the nearest word boundary (space/newline) */
export function alignToWordBoundary(text: string, pos: number): number {
  if (pos >= text.length) return text.length;
  for (let i = pos; i < Math.min(pos + 100, text.length); i++) {
    if (text[i] === ' ' || text[i] === '\n') return i + 1;
  }
  return pos;
}

export function computeInitialLoadedLength(text: string): number {
  return text.length <= PRACTICE_CHUNK_SIZE
    ? text.length
    : alignToWordBoundary(text, PRACTICE_CHUNK_SIZE);
}

export type PracticePhase = 'loading' | 'ready' | 'typing' | 'finished';

export interface PracticeState {
  phase: PracticePhase;
  currentText: string;
  loadedLength: number;
  resultSaved: boolean;
}

export type PracticeAction =
  | { type: 'LOAD_TEXT'; text: string; loadedLength: number }
  | { type: 'EXTEND_TEXT'; loadedLength: number }
  | { type: 'START_TYPING' }
  | { type: 'FINISH' }
  | { type: 'SAVE_RESULT' }
  | { type: 'RESET'; text: string; loadedLength: number };

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'LOAD_TEXT':
      return { phase: 'ready', currentText: action.text, loadedLength: action.loadedLength, resultSaved: false };
    case 'EXTEND_TEXT':
      return { ...state, loadedLength: action.loadedLength };
    case 'START_TYPING':
      return state.phase === 'ready' ? { ...state, phase: 'typing' } : state;
    case 'FINISH':
      return { ...state, phase: 'finished' };
    case 'SAVE_RESULT':
      return { ...state, resultSaved: true };
    case 'RESET':
      return { phase: 'ready', currentText: action.text, loadedLength: action.loadedLength, resultSaved: false };
    default:
      return state;
  }
}

const initialPracticeState: PracticeState = {
  phase: 'loading',
  currentText: '',
  loadedLength: 0,
  resultSaved: false,
};

export interface UsePracticeStateReturn {
  state: PracticeState;
  dispatch: React.Dispatch<PracticeAction>;
  isPending: boolean;
  activeText: string;
  fullTextRef: React.MutableRefObject<string>;
  loadMoreRef: React.MutableRefObject<(() => void) | undefined>;
  loadRandomText: (diff: Difficulty) => void;
}

export function usePracticeState(settings: Settings): UsePracticeStateReturn {
  const location = useLocation();
  const { difficulty, mode, timedDuration } = settings;

  const [state, dispatch] = useReducer(practiceReducer, initialPracticeState);
  const { currentText, loadedLength } = state;

  const fullTextRef = useRef('');
  const [isPending, startTransition] = useTransition();

  // Compute the active text (progressively loaded portion)
  const activeText = useMemo(() => {
    if (currentText.length <= PRACTICE_CHUNK_SIZE) return currentText;
    return currentText.substring(0, loadedLength);
  }, [currentText, loadedLength]);

  // Sync fullTextRef when currentText changes
  useEffect(() => {
    fullTextRef.current = currentText;
  }, [currentText]);

  const loadRandomText = (diff: Difficulty) => {
    const item = getRandomText(diff);
    if (!item || !item.content.trim()) {
      startTransition(() => {
        dispatch({ type: 'LOAD_TEXT', text: 'The quick brown fox jumps over the lazy dog.', loadedLength: 44 });
      });
      return;
    }
    const text = item.content;
    startTransition(() => {
      dispatch({ type: 'LOAD_TEXT', text, loadedLength: computeInitialLoadedLength(text) });
    });
  };

  // Load initial text
  useEffect(() => {
    const locState = location.state as { text?: string; title?: string } | null;
    if (locState?.text) {
      const text = locState.text!;
      startTransition(() => {
        dispatch({ type: 'LOAD_TEXT', text, loadedLength: computeInitialLoadedLength(text) });
      });
      window.history.replaceState({}, document.title);
    } else {
      loadRandomText(difficulty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload text when difficulty or mode changes from settings
  const prevDiffRef = useRef(difficulty);
  const prevModeRef = useRef(mode);
  const prevTimedRef = useRef(timedDuration);
  useEffect(() => {
    if (
      prevDiffRef.current !== difficulty ||
      prevModeRef.current !== mode ||
      prevTimedRef.current !== timedDuration
    ) {
      prevDiffRef.current = difficulty;
      prevModeRef.current = mode;
      prevTimedRef.current = timedDuration;
      loadRandomText(difficulty);
    }
  }, [difficulty, mode, timedDuration]);

  // Progressive load helper
  const loadMoreRef = useRef<(() => void) | undefined>(undefined);
  const isLoadingMoreRef = useRef(false);
  loadMoreRef.current = () => {
    if (isLoadingMoreRef.current) return;
    if (loadedLength >= fullTextRef.current.length) return;
    isLoadingMoreRef.current = true;

    const newLength = alignToWordBoundary(
      fullTextRef.current,
      Math.min(loadedLength + PRACTICE_CHUNK_SIZE, fullTextRef.current.length)
    );
    dispatch({ type: 'EXTEND_TEXT', loadedLength: newLength });

    requestAnimationFrame(() => {
      isLoadingMoreRef.current = false;
    });
  };

  return {
    state,
    dispatch,
    isPending,
    activeText,
    fullTextRef,
    loadMoreRef,
    loadRandomText,
  };
}
