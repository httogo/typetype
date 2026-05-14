import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { useTextRendering } from '../hooks/useTextRendering';
import { useSettings } from '../context/SettingsContext';
import { storageService } from '../services/storage';
import { logger } from '../services/logger';
import { dictionaryService } from '../services/dictionary';
import WordTooltip from '../components/WordTooltip';
import { PracticeStatsBar } from '../components/PracticeStatsBar';
import { PracticeResultCard } from '../components/PracticeResultCard';
import { PracticeEditor } from '../components/PracticeEditor';
import {
  usePracticeState,
  computeInitialLoadedLength,
  RENDER_WINDOW,
  PRACTICE_LOAD_THRESHOLD,
} from '../hooks/usePracticeState';

export default function Practice() {
  const { settings } = useSettings();
  const { difficulty, mode, timedDuration } = settings;

  // State management hook
  const {
    state,
    dispatch,
    isPending,
    activeText,
    fullTextRef,
    loadMoreRef,
    loadRandomText,
  } = usePracticeState(settings);
  const { phase, currentText, loadedLength, resultSaved } = state;

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

  // Phrase highlight state
  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());

  // Load dictionary on mount
  useEffect(() => {
    dictionaryService.load();
  }, []);

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
  }, [isStarted, phase, dispatch]);

  // --- Scroll management ---
  const userScrollingRef = useRef(false);
  const scrollTimerRef = useRef<number | undefined>(undefined);

  const handleWheel = useCallback(() => {
    userScrollingRef.current = true;
    clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = window.setTimeout(() => {
      userScrollingRef.current = false;
      setVisibleCenter(undefined);
    }, 3000);
  }, []);

  // Typing resumes auto-scroll
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
  }, [currentIndex, loadedLength, fullTextRef, loadMoreRef]);

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

    if (userScrollingRef.current) {
      const scrollableHeight = el.scrollHeight - el.clientHeight;
      const scrollRatio = scrollableHeight > 0 ? el.scrollTop / scrollableHeight : 0;
      const estimatedPos = Math.floor(scrollRatio * activeText.length);
      setVisibleCenter(estimatedPos);
    }
  }, [activeText.length]);

  const maskStyle = useMemo(() => {
    const { atTop, atBottom } = scrollState;
    if (atTop && atBottom) return {};

    let gradient: string;
    if (atTop && !atBottom) {
      gradient = 'linear-gradient(to bottom, black 0%, black 85%, transparent 100%)';
    } else if (!atTop && atBottom) {
      gradient = 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)';
    } else {
      gradient = 'linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)';
    }
    return { maskImage: gradient, WebkitMaskImage: gradient };
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

  // Auto-scroll to current character
  useEffect(() => {
    if (userScrollingRef.current) return;
    if (textAreaRef.current) {
      const currentSpan = textAreaRef.current.querySelector('[data-current="true"]');
      if (currentSpan) {
        currentSpan.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [currentIndex]);

  // --- Click to jump ---
  const handleCharClick = useCallback((charIndex: number, char: string) => {
    if (isFinished || phase === 'finished') return;
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
  }, [getResult, dispatch]);

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

  // Rendering window centered on effective position
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
    onlyWords.forEach((w, idx) => { map.set(w.startIndex, idx); });
    return map;
  }, [onlyWords]);

  const wordStrings = useMemo(() => onlyWords.map(w => w.word), [onlyWords]);

  const handleWordClick = useCallback((e: React.MouseEvent | MouseEvent, word: string, groupStartIndex: number, targetEl?: HTMLElement) => {
    e.preventDefault();
    e.stopPropagation();
    if (!/[a-zA-Z]/.test(word)) return;

    const target = targetEl || e.currentTarget as HTMLElement || e.target as HTMLElement;
    const rect = target.getBoundingClientRect();

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

    const wordIdx = wordIdxMap.get(groupStartIndex);
    if (wordIdx !== undefined) {
      const phraseResult = dictionaryService.lookupPhrase(wordStrings, wordIdx);
      if (phraseResult) {
        const phraseWordGroups = onlyWords.slice(wordIdx, wordIdx + phraseResult.length);
        const newHighlight = new Set(phraseWordGroups.map(w => w.startIndex));
        setHighlightedIndices(newHighlight);
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
    const wordTarget = (e.target as HTMLElement).closest('[data-word-start]') as HTMLElement | null;
    if (wordTarget) {
      const wordStart = parseInt(wordTarget.getAttribute('data-word-start')!, 10);
      const word = wordTarget.getAttribute('data-word')!;
      handleWordClick(e, word, wordStart, wordTarget);
      return;
    }

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
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="outline-none w-full h-full flex flex-col"
    >
      {/* Top stats bar */}
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
        <>
          <PracticeEditor
            wordGroups={wordGroups}
            windowStartGroupIdx={windowStartGroupIdx}
            windowEndGroupIdx={windowEndGroupIdx}
            windowStartCharIdx={windowStartCharIdx}
            windowEndCharIdx={windowEndCharIdx}
            useWindowing={useWindowing}
            chars={chars}
            currentIndex={currentIndex}
            activeText={activeText}
            settings={settings}
            phraseMarkedIndices={phraseMarkedIndices}
            highlightedIndices={highlightedIndices}
            wordFrequencies={wordFrequencies}
            wordAnnotations={wordAnnotations}
            loadedLength={loadedLength}
            fullTextLength={fullTextRef.current.length}
            onTextAreaClick={handleTextAreaClick}
            onScroll={handleScroll}
            onWheel={handleWheel}
            scrollContainerRef={scrollContainerRef}
            textAreaRef={textAreaRef}
            maskStyle={maskStyle}
            isPaused={isPaused}
            isStarted={isStarted}
          />

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
        </>
      )}
    </div>
  );
}
