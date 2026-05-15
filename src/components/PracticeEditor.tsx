import { useMemo, Fragment } from 'react';
import type { CharState, FreqLevel, Settings, ResolvedWordHighlight } from '../types';
import type { WordGroup } from '../hooks/useTextRendering';
import { highlightConfigToCss } from '../services/customization';

export interface PracticeEditorProps {
  wordGroups: WordGroup[];
  windowStartGroupIdx: number;
  windowEndGroupIdx: number;
  windowStartCharIdx: number;
  windowEndCharIdx: number;
  useWindowing: boolean;
  chars: CharState[];
  currentIndex: number;
  activeText: string;
  settings: Settings;
  phraseMarkedIndices: Set<number>;
  highlightedIndices: Set<number>;
  wordFrequencies: Map<number, FreqLevel>;
  wordAnnotations: Map<number, string>;
  customHighlightMap?: Map<number, ResolvedWordHighlight> | null;
  loadedLength: number;
  fullTextLength: number;
  onTextAreaClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onWheel: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  textAreaRef: React.RefObject<HTMLDivElement | null>;
  maskStyle: React.CSSProperties;
  isPaused: boolean;
  isStarted: boolean;
}

export function PracticeEditor({
  wordGroups,
  windowStartGroupIdx,
  windowEndGroupIdx,
  windowStartCharIdx,
  windowEndCharIdx,
  useWindowing,
  chars,
  currentIndex,
  activeText,
  settings,
  phraseMarkedIndices,
  highlightedIndices,
  wordFrequencies,
  wordAnnotations,
  customHighlightMap,
  loadedLength,
  fullTextLength,
  onTextAreaClick,
  onScroll,
  onWheel,
  scrollContainerRef,
  textAreaRef,
  maskStyle,
  isPaused,
  isStarted,
}: PracticeEditorProps) {
  // Memoize character rendering for the active window
  const renderedContent = useMemo(() => {
    return wordGroups.slice(windowStartGroupIdx, windowEndGroupIdx).map((group, relIdx) => {
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

        // Apply custom highlight style for pending chars only
        let extraStyle: React.CSSProperties | undefined;
        if (charState.status === 'pending' && customHighlightMap) {
          const highlight = customHighlightMap.get(idx);
          if (highlight) {
            extraStyle = highlightConfigToCss(highlight.style) as React.CSSProperties;
          }
        }

        return (
          <span
            key={idx}
            data-current={charState.status === 'current' ? 'true' : undefined}
            data-char-idx={idx}
            data-char={charState.char}
            className={className}
            style={extraStyle}
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
    });
  }, [wordGroups, windowStartGroupIdx, windowEndGroupIdx, chars, currentIndex, settings.freqHighlight, phraseMarkedIndices, highlightedIndices, wordFrequencies, wordAnnotations, customHighlightMap]);

  return (
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
        onScroll={onScroll}
        onWheel={onWheel}
      >
        <div
          ref={textAreaRef}
          className="font-mono leading-relaxed tracking-wide break-all max-w-4xl mx-auto"
          style={{ fontSize: `${settings.fontSize}px` }}
          onClick={onTextAreaClick}
        >
          {/* Part 1: Before window - merged span for already-typed text */}
          {useWindowing && windowStartCharIdx > 0 && (
            <span className="text-emerald-500 dark:text-emerald-400">
              {activeText.substring(0, windowStartCharIdx)}
            </span>
          )}

          {/* Part 2: Active window - full per-character rendering */}
          {renderedContent}

          {/* Part 3: After window - merged span for untyped text */}
          {useWindowing && windowEndCharIdx < activeText.length && (
            <span className="text-gray-400 dark:text-gray-500">
              {activeText.substring(windowEndCharIdx)}
            </span>
          )}
          {/* Loading indicator when more text is available */}
          {loadedLength < fullTextLength && (
            <span className="text-gray-300 dark:text-gray-600 select-none"> ...</span>
          )}
        </div>
      </div>

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
  );
}
