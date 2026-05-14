import { useMemo } from 'react';
import { dictionaryService } from '../services/dictionary';
import type { Settings, FreqLevel } from '../types';

export interface WordGroup {
  word: string;
  startIndex: number;
  length: number;
}

export interface OnlyWord extends WordGroup {
  groupIndex: number;
}

export interface UseTextRenderingOptions {
  text: string;              // activeText (progressively loaded portion)
  originalText: string;      // full text for matchCorrelative
  currentIndex?: number;     // Practice uses this as center
  visibleCenter?: number;    // Reading uses this as center
  renderWindow?: number;     // window size (default 1500)
  settings: Settings;
}

export interface CorrelativeInfo {
  indices: number[];
  translation: string;
  patternLabel: string;
}

export interface UseTextRenderingResult {
  wordGroups: WordGroup[];
  onlyWords: OnlyWord[];
  windowStartGroupIdx: number;
  windowEndGroupIdx: number;
  windowStartCharIdx: number;
  windowEndCharIdx: number;
  useWindowing: boolean;
  phraseMarkedIndices: Set<number>;
  correlativeMap: Map<number, CorrelativeInfo>;
  wordFrequencies: Map<number, FreqLevel>;
  wordAnnotations: Map<number, string>;
}

export function useTextRendering(options: UseTextRenderingOptions): UseTextRenderingResult {
  const { text, originalText, currentIndex, visibleCenter, renderWindow = 1500, settings } = options;

  // The center position for windowing: currentIndex (Practice) or visibleCenter (Reading)
  const centerPosition = currentIndex ?? visibleCenter ?? 0;

  // Group text into words
  const wordGroups = useMemo(() => {
    const groups: WordGroup[] = [];
    let i = 0;
    while (i < text.length) {
      if (/[a-zA-Z'-]/.test(text[i])) {
        let j = i;
        while (j < text.length && /[a-zA-Z'-]/.test(text[j])) {
          j++;
        }
        groups.push({ word: text.slice(i, j), startIndex: i, length: j - i });
        i = j;
      } else {
        groups.push({ word: text[i], startIndex: i, length: 1 });
        i++;
      }
    }
    return groups;
  }, [text]);

  // Build only-word list for phrase lookup
  const onlyWords = useMemo(() => {
    return wordGroups
      .map((g, idx) => ({ ...g, groupIndex: idx }))
      .filter(g => /[a-zA-Z]/.test(g.word));
  }, [wordGroups]);

  // Windowed rendering: compute window boundaries
  const { windowStartGroupIdx, windowEndGroupIdx, windowStartCharIdx, windowEndCharIdx, useWindowing } = useMemo(() => {
    if (text.length < renderWindow * 2) {
      return { windowStartGroupIdx: 0, windowEndGroupIdx: wordGroups.length, windowStartCharIdx: 0, windowEndCharIdx: text.length, useWindowing: false };
    }

    const rawStart = Math.max(0, centerPosition - renderWindow);
    const rawEnd = Math.min(text.length, centerPosition + renderWindow);

    // Find first wordGroup that overlaps with rawStart
    let startIdx = 0;
    for (let i = 0; i < wordGroups.length; i++) {
      if (wordGroups[i].startIndex + wordGroups[i].length > rawStart) {
        startIdx = i;
        break;
      }
    }

    // Find last wordGroup that overlaps with rawEnd
    let endIdx = wordGroups.length;
    for (let i = wordGroups.length - 1; i >= 0; i--) {
      if (wordGroups[i].startIndex < rawEnd) {
        endIdx = i + 1;
        break;
      }
    }

    const wsChar = wordGroups[startIdx]?.startIndex ?? 0;
    const weChar = endIdx < wordGroups.length ? wordGroups[endIdx].startIndex : text.length;

    return {
      windowStartGroupIdx: startIdx,
      windowEndGroupIdx: endIdx,
      windowStartCharIdx: wsChar,
      windowEndCharIdx: weChar,
      useWindowing: true,
    };
  }, [text, centerPosition, wordGroups, renderWindow]);

  // Pre-compute phrase marks and correlative map (windowed)
  const { phraseMarkedIndices, correlativeMap } = useMemo(() => {
    const marked = new Set<number>();
    const corrMap = new Map<number, CorrelativeInfo>();

    if (!settings.phraseHighlight || !dictionaryService.isLoaded()) {
      return { phraseMarkedIndices: marked, correlativeMap: corrMap };
    }

    // Determine which onlyWords fall within the render window (with buffer)
    const PHRASE_BUFFER = 15;
    let windowWordStart = 0;
    let windowWordEnd = onlyWords.length;

    if (useWindowing) {
      windowWordStart = onlyWords.length;
      for (let i = 0; i < onlyWords.length; i++) {
        if (onlyWords[i].startIndex + onlyWords[i].length > windowStartCharIdx) {
          windowWordStart = Math.max(0, i - PHRASE_BUFFER);
          break;
        }
      }
      for (let i = onlyWords.length - 1; i >= 0; i--) {
        if (onlyWords[i].startIndex < windowEndCharIdx) {
          windowWordEnd = Math.min(onlyWords.length, i + 1 + PHRASE_BUFFER);
          break;
        }
      }
    }

    const wordStrings = onlyWords.map(w => w.word);
    const wordPositions = onlyWords.map(w => w.startIndex);

    // Continuous phrase matching (only in window range)
    let i = windowWordStart;
    while (i < windowWordEnd) {
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

    // Correlative (non-continuous) phrase matching (only in window range)
    const usedByCorrelative = new Set<number>();
    for (let wi = windowWordStart; wi < windowWordEnd; wi++) {
      if (usedByCorrelative.has(wi)) continue;
      const result = dictionaryService.matchCorrelative(wordStrings, wi, originalText, wordPositions);
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
  }, [onlyWords, settings.phraseHighlight, useWindowing, windowStartCharIdx, windowEndCharIdx, originalText]);

  // Pre-compute word frequencies (windowed)
  const wordFrequencies = useMemo(() => {
    const freqMap = new Map<number, FreqLevel>();
    if (!dictionaryService.isLoaded()) return freqMap;
    const start = useWindowing ? windowStartGroupIdx : 0;
    const end = useWindowing ? windowEndGroupIdx : wordGroups.length;
    for (let i = start; i < end; i++) {
      const group = wordGroups[i];
      if (/[a-zA-Z]/.test(group.word)) {
        const freq = dictionaryService.getFrequency(group.word);
        freqMap.set(group.startIndex, freq);
      }
    }
    return freqMap;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordGroups, useWindowing, windowStartGroupIdx, windowEndGroupIdx, dictionaryService.isLoaded()]);

  // Pre-compute word annotations (windowed)
  const wordAnnotations = useMemo(() => {
    const annotations = new Map<number, string>();
    if (!dictionaryService.isLoaded()) return annotations;
    const start = useWindowing ? windowStartGroupIdx : 0;
    const end = useWindowing ? windowEndGroupIdx : wordGroups.length;
    for (let i = start; i < end; i++) {
      const group = wordGroups[i];
      if (!/[a-zA-Z]/.test(group.word)) continue;
      const freq = dictionaryService.getFrequency(group.word);
      const shouldAnnotate =
        (freq === 'h' && settings.freqAnnotation.h) ||
        (freq === 'm' && settings.freqAnnotation.m) ||
        (freq === 'l' && settings.freqAnnotation.l);
      if (!shouldAnnotate) continue;
      const entry = dictionaryService.lookup(group.word);
      if (entry && entry.t) {
        let line = entry.t.split('\n')[0].trim();
        line = line.replace(/^[a-z]+\.\s*/i, '');
        const first = line.split(/[,;，；、]/)[0].trim();
        if (first) annotations.set(i, first);
      }
    }
    return annotations;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordGroups, settings.freqAnnotation, useWindowing, windowStartGroupIdx, windowEndGroupIdx, dictionaryService.isLoaded()]);

  return {
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
  };
}
