import { useState, useEffect, useRef, useCallback, useMemo, useReducer, useTransition, Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { useTextRendering } from '../hooks/useTextRendering';
import { useSettings } from '../context/SettingsContext';
import { storageService } from '../services/storage';
import { logger } from '../services/logger';
import { dictionaryService } from '../services/dictionary';
import { getRandomText } from '../utils/textSelection';
import WordTooltip from '../components/WordTooltip';
import { PracticeStatsBar } from '../components/PracticeStatsBar';
import { PracticeResultCard } from '../components/PracticeResultCard';
import type { Settings } from '../types';

type Difficulty = Settings['difficulty'];

const RENDER_WINDOW = 1500;
const PRACTICE_CHUNK_SIZE = 5000;
const PRACTICE_LOAD_THRESHOLD = 2000;

/** Align a split position to the nearest word boundary (space/newline) */
function alignToWordBoundary(text: string, pos: number): number {
  if (pos >= text.length) return text.length;
  // Search forward for a space or newline
  for (let i = pos; i < Math.min(pos + 100, text.length); i++) {
    if (text[i] === ' ' || text[i] === '\n') return i + 1;
  }
  return pos;
}

function computeInitialLoadedLength(text: string): number {
  return text.length <= PRACTICE_CHUNK_SIZE
    ? text.length
    : alignToWordBoundary(text, PRACTICE_CHUNK_SIZE);
}

type PracticePhase = 'loading' | 'ready' | 'typing' | 'finished';

interface PracticeState {
  phase: PracticePhase;
  currentText: string;
  loadedLength: number;
  resultSaved: boolean;
}

type PracticeAction =
  | { type: 'LOAD_TEXT'; text: string; loadedLength: number }
  | { type: 'EXTEND_TEXT'; loadedLength: number }
  | { type: 'START_TYPING' }
  | { type: 'FINISH' }
  | { type: 'SAVE_RESULT' }
  | { type: 'RESET'; text: string; loadedLength: number };

function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
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

export default function Practice() {
  const location = useLocation();
  const { settings } = useSettings();

  const { difficulty, mode, timedDuration } = settings;

  // Combined state machine for practice lifecycle
  const [state, dispatch] = useReducer(practiceReducer, initialPracticeState);
  const { phase, currentText, loadedLength, resultSaved } = state;

  // Progressive loading ref
  const fullTextRef = useRef('');
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Visible center for rendering window when user scrolls away from currentIndex
  const [visibleCenter, setVisibleCenter] = useState<number | undefined>(undefined);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    word: string;
    phonetic: string;
    translation: string;
    position: { x: number; y: number; width: number; top: number };
  } | null>(null);

  // Phrase highlight state: set of wordGroup startIndex values that belong to the highlighted phrase
  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());

  // Load dictionary on mount
  useEffect(() => {
    dictionaryService.load();
  }, []);

  // Compute the active text (progressively loaded portion)
  const activeText = useMemo(() => {
    if (currentText.length <= PRACTICE_CHUNK_SIZE) return currentText;
    return currentText.substring(0, loadedLength);
  }, [currentText, loadedLength]);

  // Sync fullTextRef when currentText changes
  useEffect(() => {
    fullTextRef.current = currentText;
  }, [currentText]);

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

  const loadRandomText = (diff: Difficulty) => {
    const item = getRandomText(diff);
    if (!item || !item.content.trim()) {
      // 重试或使用默认文本
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

  // Progressive load: when user types near end of loaded portion, load more
  // (useEffect placed before useTypingEngine call so currentIndex is from engine below)
  const loadMoreRef = useRef<() => void>(undefined);
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

    // 下一帧重置
    requestAnimationFrame(() => {
      isLoadingMoreRef.current = false;
    });
  };

  const {
    chars,
    currentIndex,
    isStarted,
    isFinished,
    isPaused,
    wpm,
    accuracy,
    elapsed,
    remaining,
    reset,
    getResult,
    jumpTo,
  } = useTypingEngine({ text: activeText, mode, timedDuration });

  // Sync phase to 'typing' when engine starts
  useEffect(() => {
    if (isStarted && phase === 'ready') {
      dispatch({ type: 'START_TYPING' });
    }
  }, [isStarted, phase]);

  // --- Scroll management: allow user manual scroll without auto-scroll interruption ---
  const userScrollingRef = useRef(false);
  const scrollTimerRef = useRef<number | undefined>(undefined);

  const handleWheel = useCallback(() => {
    userScrollingRef.current = true;
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => {
      userScrollingRef.current = false;
      setVisibleCenter(undefined);
    }, 3000); // 3秒后恢复自动滚动
  }, []);

  // Typing resumes auto-scroll and clears visibleCenter
  useEffect(() => {
    if (currentIndex > 0) {
      userScrollingRef.current = false;
      clearTimeout(scrollTimerRef.current);
      setVisibleCenter(undefined);
    }
  }, [currentIndex]);

  // Trigger progressive loading when approaching end of loaded text
  useEffect(() => {
    if (
      currentIndex >= loadedLength - PRACTICE_LOAD_THRESHOLD &&
      loadedLength < fullTextRef.current.length
    ) {
      loadMoreRef.current?.();
    }
  }, [currentIndex, loadedLength]);

  // Auto-focus container on mount and after reset
  useEffect(() => {
    containerRef.current?.focus();
  }, [currentText]);

  // Dynamic scroll-based fade mask
  const [scrollState, setScrollState] = useState({ atTop: true, atBottom: false });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atTop = el.scrollTop < 20;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
    setScrollState(prev => {
      if (prev.atTop === atTop && prev.atBottom === atBottom) return prev;
      return { atTop, atBottom };
    });

    // Estimate visible center character position when user is manually scrolling
    if (userScrollingRef.current) {
      const scrollableHeight = el.scrollHeight - el.clientHeight;
      const scrollRatio = scrollableHeight > 0 ? el.scrollTop / scrollableHeight : 0;
      const estimatedPos = Math.floor(scrollRatio * activeText.length);
      setVisibleCenter(estimatedPos);
    }
  }, [activeText.length]);

  const maskStyle = useMemo(() => {
    const { atTop, atBottom } = scrollState;

    if (atTop && atBottom) {
      return {};
    }

    let gradient: string;
    if (atTop && !atBottom) {
      gradient = 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)';
    } else if (!atTop && atBottom) {
      gradient = 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)';
    } else {
      gradient = 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)';
    }

    return {
      maskImage: gradient,
      WebkitMaskImage: gradient,
    };
  }, [scrollState]);

  // Detect initial scroll state when text changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const atTop = el.scrollTop < 20;
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
      setScrollState({ atTop, atBottom });
    }
  }, [currentText]);

  // Auto-scroll to current character (respects user manual scrolling)
  useEffect(() => {
    if (userScrollingRef.current) return;
    if (textAreaRef.current) {
      const currentSpan = textAreaRef.current.querySelector('[data-current="true"]');
      if (currentSpan) {
        currentSpan.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [currentIndex]);

  // --- Click to jump: click a non-word character to start typing from that position ---
  const handleCharClick = useCallback((charIndex: number, char: string) => {
    if (isFinished || phase === 'finished') return;
    // If the character is a word character, don't handle (let word lookup handle it)
    if (/[a-zA-Z0-9']/.test(char)) return;
    jumpTo(charIndex);
    userScrollingRef.current = false;
    clearTimeout(scrollTimerRef.current);
    containerRef.current?.focus();
  }, [isFinished, phase, jumpTo]);

  const handleFinish = useCallback(() => {
    const result = getResult();
    const saved = result.errorMap
      ? storageService.saveTypingResult(result, result.errorMap)
      : storageService.saveResult(result);
    if (!saved) {
      logger.warn('Practice.handleFinish', '数据保存失败，存储空间可能不足');
    }
    dispatch({ type: 'FINISH' });
    dispatch({ type: 'SAVE_RESULT' });
  }, [getResult]);

  // Handle Escape key to finish early
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStarted && !isFinished && phase !== 'finished') {
          handleFinish();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isStarted, isFinished, phase, handleFinish]);



  // Listen for Enter key when finished to load next text
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (isFinished || phase === 'finished') && resultSaved) {
        e.preventDefault();
        loadNextText();
      }
    };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, phase, resultSaved, difficulty]);

  const loadNextText = () => {
    loadRandomText(difficulty);
  };

  const handleReset = () => {
    dispatch({ type: 'RESET', text: currentText, loadedLength: computeInitialLoadedLength(fullTextRef.current) });
    reset();
    containerRef.current?.focus();
  };

  const timeDisplay = mode === 'timed' && remaining !== null ? remaining : elapsed;

  // Shared text rendering computations
  // When user is scrolling, use visibleCenter as rendering center; otherwise use currentIndex
  const effectiveCenter = visibleCenter !== undefined ? visibleCenter : currentIndex;

  const {
    wordGroups,
    onlyWords,
    windowStartGroupIdx,
    windowEndGroupIdx,
    windowStartCharIdx,
    windowEndCharIdx,
    useWindowing,
    phraseMarkedIndices,
    correlativeMap,
    wordFrequencies,
    wordAnnotations,
  } = useTextRendering({
    text: activeText,
    originalText: currentText,
    currentIndex: effectiveCenter,
    renderWindow: RENDER_WINDOW,
    settings,
  });

  // Map cache: O(1) lookup for word index by startIndex
  const wordIdxMap = useMemo(() => {
    const map = new Map<number, number>();
    onlyWords.forEach((w, idx) => {
      map.set(w.startIndex, idx);
    });
    return map;
  }, [onlyWords]);

  // Cache word strings to avoid creating new arrays on every click
  const wordStrings = useMemo(() => {
    return onlyWords.map(w => w.word);
  }, [onlyWords]);

  const handleWordClick = useCallback((e: React.MouseEvent | MouseEvent, word: string, groupStartIndex: number, targetEl?: HTMLElement) => {
    e.preventDefault();
    e.stopPropagation();

    // Click on word = word lookup (not position jump)
    // Only look up actual words
    if (!/[a-zA-Z]/.test(word)) return;

    const target = targetEl || e.currentTarget as HTMLElement || e.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    // Check if this word is part of a correlative phrase
    const corrInfo = correlativeMap.get(groupStartIndex);
    if (corrInfo) {
      const newHighlight = new Set(corrInfo.indices);
      setHighlightedIndices(newHighlight);
      setTooltip({
        word: corrInfo.patternLabel,
        phonetic: '',
        translation: corrInfo.translation,
        position: { x: rect.left, y: rect.bottom, width: rect.width, top: rect.top },
      });
      return;
    }

    // Find this word's index using O(1) Map lookup
    const wordIdx = wordIdxMap.get(groupStartIndex);
    if (wordIdx !== undefined) {
      const phraseResult = dictionaryService.lookupPhrase(wordStrings, wordIdx);
      if (phraseResult) {
        // Highlight all word groups in the matched phrase
        const phraseWordGroups = onlyWords.slice(wordIdx, wordIdx + phraseResult.length);
        const newHighlight = new Set(phraseWordGroups.map(w => w.startIndex));
        setHighlightedIndices(newHighlight);

        // Calculate bounding rect spanning all phrase words for tooltip position
        const phraseText = phraseWordGroups.map(w => w.word).join(' ');
        setTooltip({
          word: phraseText,
          phonetic: phraseResult.entry.p,
          translation: phraseResult.entry.t,
          position: { x: rect.left, y: rect.bottom, width: rect.width, top: rect.top },
        });
        return;
      }
    }

    // No phrase match, fall back to single word lookup
    setHighlightedIndices(new Set());

    const entry = dictionaryService.lookup(word);
    if (entry) {
      setTooltip({
        word,
        phonetic: entry.p,
        translation: entry.t,
        position: { x: rect.left, y: rect.bottom, width: rect.width, top: rect.top },
      });
    } else {
      setTooltip({
        word,
        phonetic: '',
        translation: '未收录',
        position: { x: rect.left, y: rect.bottom, width: rect.width, top: rect.top },
      });
    }
  }, [correlativeMap, wordIdxMap, wordStrings, onlyWords]);

  // Event delegation: single click handler for the entire text area
  const handleTextAreaClick = useCallback((e: React.MouseEvent) => {
    // Check if clicked on a word span (data-word-start attribute)
    const wordTarget = (e.target as HTMLElement).closest('[data-word-start]') as HTMLElement | null;
    if (wordTarget) {
      const wordStart = parseInt(wordTarget.getAttribute('data-word-start')!, 10);
      const word = wordTarget.getAttribute('data-word')!;
      handleWordClick(e, word, wordStart, wordTarget);
      return;
    }

    // Check if clicked on a character span (data-char-idx attribute)
    const charTarget = e.target as HTMLElement;
    const charIdx = charTarget.getAttribute('data-char-idx');
    const char = charTarget.getAttribute('data-char');
    if (charIdx !== null && char !== null) {
      handleCharClick(parseInt(charIdx, 10), char);
    }
  }, [handleCharClick, handleWordClick]);

  const closeTooltip = useCallback(() => {
    setTooltip(null);
    setHighlightedIndices(new Set());
    // Restore focus to typing area
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="outline-none w-full h-full flex flex-col"
    >
      {/* Top stats bar - compact one line */}
      {settings.showLiveStats && !isFinished && phase !== 'finished' && (
        <PracticeStatsBar
          wpm={wpm}
          accuracy={accuracy}
          elapsed={elapsed}
          timeDisplay={timeDisplay}
          mode={mode}
          currentIndex={currentIndex}
          totalChars={chars.length}
        />
      )}

      {/* Main Content */}
      {isPending ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">加载中...</p>
        </div>
      ) : (isFinished || phase === 'finished') && resultSaved ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <PracticeResultCard result={getResult()} onReset={handleReset} onNext={loadNextText} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col relative min-h-0">
          {/* Pause overlay */}
          {isPaused && isStarted && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="animate-fade-in-scale bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 pointer-events-none">
                <p className="text-sm text-gray-500 dark:text-gray-400">已暂停 — 继续输入恢复</p>
              </div>
            </div>
          )}

          {/* Text Display Area - fills available space */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8"
            style={maskStyle}
            onScroll={handleScroll}
            onWheel={handleWheel}
          >
            <div
              ref={textAreaRef}
              className="font-mono leading-relaxed tracking-wide break-all max-w-4xl mx-auto"
              style={{ fontSize: `${settings.fontSize}px` }}
              onClick={handleTextAreaClick}
            >
              {/* Part 1: Before window - merged span for already-typed text */}
              {useWindowing && windowStartCharIdx > 0 && (
                <span className="text-emerald-500 dark:text-emerald-400">
                  {activeText.substring(0, windowStartCharIdx)}
                </span>
              )}

              {/* Part 2: Active window - full per-character rendering */}
              {wordGroups.slice(windowStartGroupIdx, windowEndGroupIdx).map((group, relIdx) => {
                const groupIdx = windowStartGroupIdx + relIdx;
                const isWord = /[a-zA-Z]/.test(group.word);
                const charSlice = chars.slice(group.startIndex, group.startIndex + group.length);

                // Determine frequency-related styles for this word
                const freq = isWord ? wordFrequencies.get(group.startIndex) : undefined;
                const isPhraseWord = phraseMarkedIndices.has(group.startIndex);

                // Frequency color highlight (only affects pending chars)
                let freqColorClass = '';
                if (isWord && !isPhraseWord && freq) {
                  const colorMap = { h: 'text-green-600 dark:text-green-400', m: 'text-blue-600 dark:text-blue-400', l: 'text-orange-600 dark:text-orange-400' };
                  if (freq !== 'u' && settings.freqHighlight[freq]) {
                    freqColorClass = colorMap[freq];
                  }
                }

                // Frequency dimming removed from Practice (only applies in Reading page)

                const renderedChars = charSlice.map((charState, i) => {
                  const idx = group.startIndex + i;
                  const className = (() => {
                    switch (charState.status) {
                      case 'correct':
                        return 'char-transition text-emerald-500 dark:text-emerald-400 cursor-text';
                      case 'incorrect':
                        return 'char-transition text-red-400 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-sm cursor-text';
                      case 'current':
                        return 'char-transition border-l-2 border-indigo-500 animate-cursor text-gray-800 dark:text-gray-100 cursor-text';
                      case 'pending':
                      default:
                        if (freqColorClass) {
                          return `char-transition ${freqColorClass} cursor-text`;
                        }
                        return 'char-transition text-gray-400 dark:text-gray-500 cursor-text';
                    }
                  })();
                  return (
                    <span
                      key={idx}
                      data-current={charState.status === 'current' ? 'true' : undefined}
                      data-char-idx={idx}
                      data-char={charState.char}
                      className={className}
                    >
                      {charState.char === ' ' ? '\u00A0' : charState.char}
                    </span>
                  );
                });

                if (isWord) {
                  const isHighlighted = highlightedIndices.has(group.startIndex);
                  return (
                    <Fragment key={`w-${group.startIndex}`}>
                      <span
                        data-word-start={group.startIndex}
                        data-word={group.word}
                        className={`cursor-pointer hover:underline hover:decoration-dashed hover:decoration-gray-400/40 dark:hover:decoration-gray-500/40 hover:underline-offset-4${
                          isHighlighted ? ' bg-indigo-100/60 dark:bg-indigo-900/40 rounded-sm' : ''
                        }${
                          isPhraseWord && !isHighlighted ? ' underline decoration-dashed decoration-gray-400 dark:decoration-gray-500 underline-offset-4' : ''
                        }`}
                      >
                        {renderedChars}
                      </span>
                      {wordAnnotations.has(groupIdx) && (() => {
                        const wordEndCharIndex = group.startIndex + group.length - 1;
                        const isWordCompleted = currentIndex > wordEndCharIndex;
                        const annotationColorClass = isWordCompleted
                          ? 'text-emerald-500 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-gray-500';
                        return (
                          <span className={`${annotationColorClass} select-none pointer-events-none`}>
                            ({wordAnnotations.get(groupIdx)})
                          </span>
                        );
                      })()}
                    </Fragment>
                  );
                }

                return <span key={`s-${group.startIndex}`} className="cursor-text">{renderedChars}</span>;
              })}

              {/* Part 3: After window - merged span for untyped text */}
              {useWindowing && windowEndCharIdx < activeText.length && (
                <span className="text-gray-400 dark:text-gray-500">
                  {activeText.substring(windowEndCharIdx)}
                </span>
              )}
              {/* Loading indicator when more text is available */}
              {loadedLength < fullTextRef.current.length && (
                <span className="text-gray-300 dark:text-gray-600 select-none"> ...</span>
              )}
            </div>
          </div>

          {/* Word Tooltip */}
          {tooltip && (
            <WordTooltip
              word={tooltip.word}
              phonetic={tooltip.phonetic}
              translation={tooltip.translation}
              position={tooltip.position}
              onClose={closeTooltip}
            />
          )}

          {/* Bottom hint */}
          {!isStarted && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-3 animate-pulse">
              开始输入即可计时...
            </p>
          )}
          {isStarted && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-3">
              Tab 重新开始 | Esc 结束
            </p>
          )}
        </div>
      )}
    </div>
  );
}
