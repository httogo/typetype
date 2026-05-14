import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTypingEngine } from '../hooks/useTypingEngine';
import { useSettings } from '../context/SettingsContext';
import { storageService } from '../services/storage';
import { dictionaryService } from '../services/dictionary';
import { getRandomText } from '../utils/textSelection';
import WordTooltip from '../components/WordTooltip';
import type { Settings } from '../types';

type Difficulty = Settings['difficulty'];

export default function Practice() {
  const location = useLocation();
  const { settings } = useSettings();

  const { difficulty, mode, timedDuration } = settings;

  // State for text management
  const [currentText, setCurrentText] = useState('');
  const [resultSaved, setResultSaved] = useState(false);
  const [manuallyFinished, setManuallyFinished] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLDivElement>(null);

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

  // Load initial text
  useEffect(() => {
    const state = location.state as { text?: string; title?: string } | null;
    if (state?.text) {
      setCurrentText(state.text);
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
      setResultSaved(false);
      setManuallyFinished(false);
    }
  }, [difficulty, mode, timedDuration]);

  const loadRandomText = (diff: Difficulty) => {
    const item = getRandomText(diff);
    setCurrentText(item.content);
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
  } = useTypingEngine({ text: currentText, mode, timedDuration });

  // Auto-focus container on mount and after reset
  useEffect(() => {
    containerRef.current?.focus();
  }, [currentText]);

  // Auto-scroll to current character
  useEffect(() => {
    if (textAreaRef.current) {
      const currentSpan = textAreaRef.current.querySelector('[data-current="true"]');
      if (currentSpan) {
        currentSpan.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [currentIndex]);

  const handleFinish = useCallback(() => {
    const result = getResult();
    storageService.saveResult(result);
    if (result.errorMap) {
      storageService.updateErrorStats(result.errorMap);
    }
    setResultSaved(true);
    setManuallyFinished(true);
  }, [getResult]);

  // Handle Escape key to finish early
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStarted && !isFinished && !manuallyFinished) {
          handleFinish();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isStarted, isFinished, manuallyFinished, handleFinish]);

  // Save result when finished
  useEffect(() => {
    if (isFinished && !resultSaved) {
      const result = getResult();
      storageService.saveResult(result);
      if (result.errorMap) {
        storageService.updateErrorStats(result.errorMap);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResultSaved(true);
    }
  }, [isFinished, resultSaved, getResult]);

  // Listen for Enter key when finished to load next text
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (isFinished || manuallyFinished) && resultSaved) {
        e.preventDefault();
        loadNextText();
      }
    };
    window.addEventListener('keydown', handleEnter);
    return () => window.removeEventListener('keydown', handleEnter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, manuallyFinished, resultSaved, difficulty]);

  const loadNextText = () => {
    loadRandomText(difficulty);
    setResultSaved(false);
    setManuallyFinished(false);
  };

  const handleReset = () => {
    reset();
    setResultSaved(false);
    setManuallyFinished(false);
    containerRef.current?.focus();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timeDisplay = mode === 'timed' && remaining !== null ? remaining : elapsed;

  // Group chars into words for click handling
  const wordGroups = useMemo(() => {
    const groups: { word: string; startIndex: number; length: number }[] = [];
    let i = 0;
    while (i < currentText.length) {
      if (/[a-zA-Z'-]/.test(currentText[i])) {
        // Start of a word
        let j = i;
        while (j < currentText.length && /[a-zA-Z'-]/.test(currentText[j])) {
          j++;
        }
        groups.push({ word: currentText.slice(i, j), startIndex: i, length: j - i });
        i = j;
      } else {
        // Non-word char (space, punctuation, etc.)
        groups.push({ word: currentText[i], startIndex: i, length: 1 });
        i++;
      }
    }
    return groups;
  }, [currentText]);

  // Build a list of only word groups (for phrase lookup)
  const onlyWords = useMemo(() => {
    return wordGroups
      .map((g, idx) => ({ ...g, groupIndex: idx }))
      .filter(g => /[a-zA-Z]/.test(g.word));
  }, [wordGroups]);

  // Pre-compute which word startIndices belong to a phrase (for auto phrase highlight)
  // Also compute correlative phrase indices
  const { phraseMarkedIndices, correlativeMap } = useMemo(() => {
    const marked = new Set<number>();
    // correlativeMap: startIndex -> { indices (startIndex[]), translation, patternLabel }
    const corrMap = new Map<number, { indices: number[]; translation: string; patternLabel: string }>();

    if (!settings.phraseHighlight || !dictionaryService.isLoaded()) {
      return { phraseMarkedIndices: marked, correlativeMap: corrMap };
    }

    const wordStrings = onlyWords.map(w => w.word);

    // 1. Continuous phrase matching
    let i = 0;
    while (i < onlyWords.length) {
      const result = dictionaryService.lookupPhrase(wordStrings, i);
      if (result) {
        for (let k = i; k < i + result.length; k++) {
          marked.add(onlyWords[k].startIndex);
        }
        i += result.length;
      } else {
        i++;
      }
    }

    // 2. Correlative (non-continuous) phrase matching
    const usedByCorrelative = new Set<number>(); // word indices already matched
    for (let wi = 0; wi < onlyWords.length; wi++) {
      if (usedByCorrelative.has(wi)) continue;
      const result = dictionaryService.matchCorrelative(wordStrings, wi);
      if (result) {
        // Mark all keyword indices
        const startIndices = result.indices.map(idx => onlyWords[idx].startIndex);
        for (const idx of result.indices) {
          usedByCorrelative.add(idx);
          marked.add(onlyWords[idx].startIndex);
        }
        // Store in correlativeMap keyed by each keyword's startIndex
        for (const si of startIndices) {
          corrMap.set(si, {
            indices: startIndices,
            translation: result.translation,
            patternLabel: result.patternLabel,
          });
        }
      }
    }

    return { phraseMarkedIndices: marked, correlativeMap: corrMap };
  }, [onlyWords, settings.phraseHighlight]);

  const handleWordClick = (e: React.MouseEvent<HTMLSpanElement>, word: string, groupStartIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    // Only look up actual words
    if (!/[a-zA-Z]/.test(word)) return;

    const target = e.currentTarget;
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

    // Find this word's index in the onlyWords array
    const wordIdx = onlyWords.findIndex(w => w.startIndex === groupStartIndex);
    if (wordIdx >= 0) {
      // Extract just the word strings for phrase lookup
      const wordStrings = onlyWords.map(w => w.word);
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
  };

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
      {settings.showLiveStats && !isFinished && !manuallyFinished && (
        <div className="border-b border-gray-100 dark:border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-1.5 flex items-center text-xs text-gray-500 dark:text-gray-400 tabular-nums">
            <div className="flex items-center gap-4">
              <span>WPM: <span className="font-medium text-gray-700 dark:text-gray-200">{wpm}</span></span>
              <span>准确率: <span className="font-medium text-gray-700 dark:text-gray-200">{accuracy}%</span></span>
              <span>{mode === 'timed' ? '剩余' : '用时'}: <span className="font-medium text-gray-700 dark:text-gray-200">{formatTime(timeDisplay)}</span></span>
              <span>进度: <span className="font-medium text-gray-700 dark:text-gray-200">{currentIndex}/{chars.length}</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {(isFinished || manuallyFinished) && resultSaved ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <ResultCard result={getResult()} onReset={handleReset} onNext={loadNextText} formatTime={formatTime} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col relative">
          {/* Pause overlay */}
          {isPaused && isStarted && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="animate-fade-in-scale bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-500 dark:text-gray-400">已暂停 — 继续输入恢复</p>
              </div>
            </div>
          )}

          {/* Text Display Area - fills available space */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div
              ref={textAreaRef}
              className="font-mono leading-relaxed tracking-wide break-all max-w-4xl mx-auto"
              style={{ fontSize: `${settings.fontSize}px` }}
            >
              {wordGroups.map((group) => {
                const isWord = /[a-zA-Z]/.test(group.word);
                const charSlice = chars.slice(group.startIndex, group.startIndex + group.length);

                const renderedChars = charSlice.map((charState, i) => {
                  const idx = group.startIndex + i;
                  const className = (() => {
                    switch (charState.status) {
                      case 'correct':
                        return 'char-transition text-emerald-500 dark:text-emerald-400';
                      case 'incorrect':
                        return 'char-transition text-red-400 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-sm';
                      case 'current':
                        return 'char-transition border-l-2 border-indigo-500 animate-cursor text-gray-800 dark:text-gray-100';
                      case 'pending':
                      default:
                        return 'char-transition text-gray-300 dark:text-gray-500';
                    }
                  })();
                  return (
                    <span
                      key={idx}
                      data-current={charState.status === 'current' ? 'true' : undefined}
                      className={className}
                    >
                      {charState.char === ' ' ? '\u00A0' : charState.char}
                    </span>
                  );
                });

                if (isWord) {
                  const isHighlighted = highlightedIndices.has(group.startIndex);
                  const isPhraseWord = phraseMarkedIndices.has(group.startIndex);
                  return (
                    <span
                      key={`w-${group.startIndex}`}
                      className={`cursor-pointer hover:underline hover:decoration-dashed hover:decoration-gray-400/40 dark:hover:decoration-gray-500/40 hover:underline-offset-4${
                        isHighlighted ? ' bg-indigo-100/60 dark:bg-indigo-900/40 rounded-sm' : ''
                      }${
                        isPhraseWord && !isHighlighted ? ' underline decoration-dashed underline-offset-4' : ''
                      }`}
                      onClick={(e) => handleWordClick(e, group.word, group.startIndex)}
                    >
                      {renderedChars}
                    </span>
                  );
                }

                return <span key={`s-${group.startIndex}`}>{renderedChars}</span>;
              })}
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

/* ---------- Result Card ---------- */

function ResultCard({
  result,
  onReset,
  onNext,
  formatTime,
}: {
  result: { wpm: number; accuracy: number; duration: number; correctChars: number; incorrectChars: number };
  onReset: () => void;
  onNext: () => void;
  formatTime: (s: number) => string;
}) {
  return (
    <div className="w-full max-w-md text-center animate-fade-in">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">练习完成</h2>

      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {/* WPM Hero Number */}
        <div className="mb-5">
          <div className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tabular-nums animate-count-up">
            {result.wpm}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">WPM</div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="relative bg-green-50 dark:bg-green-900/20 rounded-lg p-3 animate-count-up overflow-hidden" style={{ animationDelay: '0.1s', opacity: 0 }}>
            <div className="text-xl font-bold text-green-600 dark:text-green-400 tabular-nums">{result.accuracy}%</div>
            <div className="text-xs text-green-500 dark:text-green-400">准确率</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"></div>
          </div>
          <div className="relative bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 animate-count-up overflow-hidden" style={{ animationDelay: '0.2s', opacity: 0 }}>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">{formatTime(result.duration)}</div>
            <div className="text-xs text-purple-500 dark:text-purple-400">用时</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400"></div>
          </div>
          <div className="relative bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 animate-count-up overflow-hidden" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <div className="text-lg font-bold tabular-nums">
              <span className="text-green-600 dark:text-green-400">{result.correctChars}</span>
              <span className="text-gray-400 dark:text-gray-500 mx-0.5">/</span>
              <span className="text-red-500 dark:text-red-400">{result.incorrectChars}</span>
            </div>
            <div className="text-xs text-orange-500 dark:text-orange-400">正确/错误</div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"></div>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 animate-float">按 Enter 开始下一篇</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onNext}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
        >
          下一篇
        </button>
        <button
          onClick={onReset}
          className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 hover:shadow-md transition-all duration-200"
        >
          重新练习
        </button>
      </div>
    </div>
  );
}
