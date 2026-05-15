import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useTextRendering } from '../hooks/useTextRendering';
import { dictionaryService } from '../services/dictionary';
import { storageService } from '../services/storage';
import { highlightConfigToCss } from '../services/customization';
import { getRandomText } from '../utils/textSelection';
import WordTooltip from '../components/WordTooltip';
import type { WordList, HighlightStyle } from '../types';

const VISIBLE_BUFFER = 3000;
const READING_CHUNK_SIZE = 8000;
const READING_LOAD_THRESHOLD = 200; // px from bottom to trigger load

/** Align a split position to the nearest word boundary (space/newline) */
function alignToWordBoundary(text: string, pos: number): number {
  if (pos >= text.length) return text.length;
  for (let i = pos; i < Math.min(pos + 100, text.length); i++) {
    if (text[i] === ' ' || text[i] === '\n') return i + 1;
  }
  return pos;
}

export default function Reading() {
  const { t } = useTranslation();
  const location = useLocation();
  const { settings } = useSettings();
  const { difficulty } = settings;

  const [currentText, setCurrentText] = useState('');

  // Progressive loading state
  const fullTextRef = useRef('');
  const [loadedLength, setLoadedLength] = useState(0);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{
    word: string;
    phonetic: string;
    translation: string;
    position: { x: number; y: number; width: number; top: number };
  } | null>(null);

  // Phrase highlight state
  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());

  // Word list highlight state
  const [wordLists, setWordLists] = useState<WordList[]>(() => storageService.getWordLists());
  const [highlightStyles, setHighlightStyles] = useState<HighlightStyle[]>(() => storageService.getHighlightStyles());

  // Scroll-based windowing state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [visibleCenter, setVisibleCenter] = useState(0);

  // Compute active text (progressively loaded portion)
  const activeText = useMemo(() => {
    if (currentText.length <= READING_CHUNK_SIZE) return currentText;
    return currentText.substring(0, loadedLength);
  }, [currentText, loadedLength]);

  // Initialize progressive loading when currentText changes
  useEffect(() => {
    fullTextRef.current = currentText;
    const initialLen = currentText.length <= READING_CHUNK_SIZE
      ? currentText.length
      : alignToWordBoundary(currentText, READING_CHUNK_SIZE);
    setLoadedLength(initialLen);
  }, [currentText]);

  // Load dictionary on mount
  useEffect(() => {
    dictionaryService.load();
  }, []);

  // Listen for wordlists-updated event
  useEffect(() => {
    const handler = () => {
      setWordLists(storageService.getWordLists());
      setHighlightStyles(storageService.getHighlightStyles());
    };
    window.addEventListener('wordlists-updated', handler);
    return () => window.removeEventListener('wordlists-updated', handler);
  }, []);

  // Load initial text
  useEffect(() => {
    const state = location.state as { text?: string; title?: string } | null;
    if (state?.text) {
      setCurrentText(state.text);
      window.history.replaceState({}, document.title);
    } else {
      loadNextText();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNextText = () => {
    const item = getRandomText(difficulty);
    if (!item || !item.content.trim()) {
      setCurrentText('No text available. Please try a different difficulty.');
      return;
    }
    setCurrentText(item.content);
    setTooltip(null);
    setHighlightedIndices(new Set());
    setVisibleCenter(0);
    // Reset scroll position
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Scroll handler: estimate which character position is in the center of the viewport
  // and trigger progressive loading when near bottom
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      setVisibleCenter(0);
      return;
    }
    const scrollRatio = el.scrollTop / scrollable;
    const estimatedCharPos = Math.floor(scrollRatio * activeText.length);
    setVisibleCenter(estimatedCharPos);

    // Progressive load: when near bottom, load more
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < READING_LOAD_THRESHOLD;
    if (nearBottom && loadedLength < fullTextRef.current.length) {
      const nextLen = alignToWordBoundary(
        fullTextRef.current,
        loadedLength + READING_CHUNK_SIZE
      );
      setLoadedLength(Math.min(nextLen, fullTextRef.current.length));
    }
  }, [activeText.length, loadedLength]);

  // Shared text rendering computations
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
    customHighlightMap,
  } = useTextRendering({
    text: activeText,
    originalText: currentText,
    visibleCenter,
    renderWindow: VISIBLE_BUFFER,
    settings,
    wordLists,
    highlightStyles,
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

  const handleWordClick = (e: React.MouseEvent<HTMLSpanElement>, word: string, groupStartIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!/[a-zA-Z]/.test(word)) return;

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();

    // Check correlative phrase
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

    // Check phrase match using O(1) Map lookup
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

    // Single word lookup
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
        translation: t('tooltip.notFound'),
        position: { x: rect.left, y: rect.bottom, width: rect.width, top: rect.top },
      });
    }
  };

  const closeTooltip = useCallback(() => {
    setTooltip(null);
    setHighlightedIndices(new Set());
  }, []);

  return (
    <div className="outline-none w-full h-full flex flex-col">
      {/* Text Display Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-8"
        onScroll={handleScroll}
      >
        <div
          className="font-mono leading-relaxed tracking-wide break-all max-w-4xl mx-auto"
          style={{ fontSize: `${settings.fontSize}px` }}
        >
          {/* Part 1: Before window - plain text, default color */}
          {useWindowing && windowStartCharIdx > 0 && (
            <span className="text-gray-800 dark:text-gray-200">
              {activeText.substring(0, windowStartCharIdx)}
            </span>
          )}

          {/* Part 2: Active window - full per-word rendering with all features */}
          {wordGroups.slice(windowStartGroupIdx, windowEndGroupIdx).map((group, relIdx) => {
            const groupIdx = windowStartGroupIdx + relIdx;
            const isWord = /[a-zA-Z]/.test(group.word);
            const freq = isWord ? wordFrequencies.get(group.startIndex) : undefined;
            const isPhraseWord = phraseMarkedIndices.has(group.startIndex);

            // Determine text color
            let textColorClass = 'text-gray-800 dark:text-gray-200';

            // Apply frequency color highlight
            if (isWord && !isPhraseWord && freq) {
              const colorMap = { h: 'text-green-600 dark:text-green-400', m: 'text-blue-600 dark:text-blue-400', l: 'text-orange-600 dark:text-orange-400' };
              if (freq !== 'u' && settings.freqHighlight[freq]) {
                textColorClass = colorMap[freq];
              }
            }

            // Apply frequency dimming (overrides default color but not freq highlight color)
            if (isWord && freq === 'l' && settings.freqDimLow && !settings.freqHighlight.l) {
              textColorClass = 'text-gray-400 dark:text-gray-500';
            } else if (isWord && freq === 'u' && settings.freqDimUltraLow) {
              textColorClass = 'text-gray-300 dark:text-gray-600';
            }

            if (isWord) {
              const isHighlighted = highlightedIndices.has(group.startIndex);

              // Apply custom highlight style for words
              let customStyle: React.CSSProperties | undefined;
              if (customHighlightMap) {
                const highlight = customHighlightMap.get(group.startIndex);
                if (highlight) {
                  customStyle = highlightConfigToCss(highlight.style) as React.CSSProperties;
                }
              }

              return (
                <Fragment key={`w-${group.startIndex}`}>
                  <span
                    className={`cursor-pointer hover:underline hover:decoration-dashed hover:decoration-gray-400/40 dark:hover:decoration-gray-500/40 hover:underline-offset-4 ${textColorClass}${
                      isHighlighted ? ' bg-indigo-100/60 dark:bg-indigo-900/40 rounded-sm' : ''
                    }${
                      isPhraseWord && !isHighlighted ? ' underline decoration-dashed decoration-gray-400 dark:decoration-gray-500 underline-offset-4' : ''
                    }`}
                    style={customStyle}
                    onClick={(e) => handleWordClick(e, group.word, group.startIndex)}
                  >
                    {group.word}
                  </span>
                  {wordAnnotations.has(groupIdx) && (
                    <span className="select-none pointer-events-none">
                      ({wordAnnotations.get(groupIdx)})
                    </span>
                  )}
                </Fragment>
              );
            }

            // Non-word characters (spaces, punctuation)
            return (
              <span key={`s-${group.startIndex}`} className={textColorClass}>
                {group.word === ' ' ? '\u00A0' : group.word}
              </span>
            );
          })}

          {/* Part 3: After window - plain text, default color */}
          {useWindowing && windowEndCharIdx < activeText.length && (
            <span className="text-gray-800 dark:text-gray-200">
              {activeText.substring(windowEndCharIdx)}
            </span>
          )}
          {/* Loading indicator when more text is available */}
          {loadedLength < fullTextRef.current.length && (
            <div className="text-center py-4">
              <span className="text-gray-300 dark:text-gray-600 text-sm select-none">...</span>
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <WordTooltip
          word={tooltip.word}
          phonetic={tooltip.phonetic}
          translation={tooltip.translation}
          position={tooltip.position}
          onClose={closeTooltip}
        />
      )}

      {/* Bottom bar */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center justify-center">
        <button
          onClick={loadNextText}
          className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
        >
          {t('reading.next')}
        </button>
      </div>
    </div>
  );
}
