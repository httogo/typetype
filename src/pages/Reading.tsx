import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import { useSettings } from '../context/SettingsContext';
import { dictionaryService } from '../services/dictionary';
import { getRandomText } from '../utils/textSelection';
import WordTooltip from '../components/WordTooltip';
import type { FreqLevel } from '../types';

export default function Reading() {
  const { settings } = useSettings();
  const { difficulty } = settings;

  const [currentText, setCurrentText] = useState('');

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

  // Load initial text
  useEffect(() => {
    loadNextText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNextText = () => {
    const item = getRandomText(difficulty);
    setCurrentText(item.content);
    setTooltip(null);
    setHighlightedIndices(new Set());
  };

  // Group text into words
  const wordGroups = useMemo(() => {
    const groups: { word: string; startIndex: number; length: number }[] = [];
    let i = 0;
    while (i < currentText.length) {
      if (/[a-zA-Z'-]/.test(currentText[i])) {
        let j = i;
        while (j < currentText.length && /[a-zA-Z'-]/.test(currentText[j])) {
          j++;
        }
        groups.push({ word: currentText.slice(i, j), startIndex: i, length: j - i });
        i = j;
      } else {
        groups.push({ word: currentText[i], startIndex: i, length: 1 });
        i++;
      }
    }
    return groups;
  }, [currentText]);

  // Build only-word list for phrase lookup
  const onlyWords = useMemo(() => {
    return wordGroups
      .map((g, idx) => ({ ...g, groupIndex: idx }))
      .filter(g => /[a-zA-Z]/.test(g.word));
  }, [wordGroups]);

  // Pre-compute phrase marks and correlative map
  const { phraseMarkedIndices, correlativeMap } = useMemo(() => {
    const marked = new Set<number>();
    const corrMap = new Map<number, { indices: number[]; translation: string; patternLabel: string }>();

    if (!settings.phraseHighlight || !dictionaryService.isLoaded()) {
      return { phraseMarkedIndices: marked, correlativeMap: corrMap };
    }

    const wordStrings = onlyWords.map(w => w.word);

    // Continuous phrase matching
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

    // Correlative (non-continuous) phrase matching
    const usedByCorrelative = new Set<number>();
    for (let wi = 0; wi < onlyWords.length; wi++) {
      if (usedByCorrelative.has(wi)) continue;
      const result = dictionaryService.matchCorrelative(wordStrings, wi);
      if (result) {
        const startIndices = result.indices.map(idx => onlyWords[idx].startIndex);
        for (const idx of result.indices) {
          usedByCorrelative.add(idx);
          marked.add(onlyWords[idx].startIndex);
        }
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

  // Pre-compute word frequencies
  const wordFrequencies = useMemo(() => {
    const freqMap = new Map<number, FreqLevel>();
    if (!dictionaryService.isLoaded()) return freqMap;
    wordGroups.forEach((group) => {
      if (/[a-zA-Z]/.test(group.word)) {
        const freq = dictionaryService.getFrequency(group.word);
        freqMap.set(group.startIndex, freq);
      }
    });
    return freqMap;
  }, [wordGroups, dictionaryService.isLoaded()]);

  // Pre-compute annotations
  const wordAnnotations = useMemo(() => {
    const annotations = new Map<number, string>();
    if (!dictionaryService.isLoaded()) return annotations;
    wordGroups.forEach((group, idx) => {
      if (!/[a-zA-Z]/.test(group.word)) return;
      const freq = dictionaryService.getFrequency(group.word);
      const shouldAnnotate =
        (freq === 'h' && settings.freqAnnotation.h) ||
        (freq === 'm' && settings.freqAnnotation.m) ||
        (freq === 'l' && settings.freqAnnotation.l);
      if (!shouldAnnotate) return;
      const entry = dictionaryService.lookup(group.word);
      if (entry && entry.t) {
        // 去掉词性，只取第一个翻译
        let line = entry.t.split('\n')[0].trim();
        line = line.replace(/^[a-z]+\.\s*/i, '');
        const first = line.split(/[,;，；、]/)[0].trim();
        if (first) annotations.set(idx, first);
      }
    });
    return annotations;
  }, [wordGroups, settings.freqAnnotation, dictionaryService.isLoaded()]);

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

    // Check phrase match
    const wordIdx = onlyWords.findIndex(w => w.startIndex === groupStartIndex);
    if (wordIdx >= 0) {
      const wordStrings = onlyWords.map(w => w.word);
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
        translation: '未收录',
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div
          className="font-mono leading-relaxed tracking-wide break-all max-w-4xl mx-auto"
          style={{ fontSize: `${settings.fontSize}px` }}
        >
          {wordGroups.map((group, groupIdx) => {
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
              return (
                <Fragment key={`w-${group.startIndex}`}>
                  <span
                    className={`cursor-pointer hover:underline hover:decoration-dashed hover:decoration-gray-400/40 dark:hover:decoration-gray-500/40 hover:underline-offset-4 ${textColorClass}${
                      isHighlighted ? ' bg-indigo-100/60 dark:bg-indigo-900/40 rounded-sm' : ''
                    }${
                      isPhraseWord && !isHighlighted ? ' underline decoration-dashed decoration-gray-400 dark:decoration-gray-500 underline-offset-4' : ''
                    }`}
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
          下一篇
        </button>
      </div>
    </div>
  );
}
