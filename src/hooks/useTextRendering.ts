import { useMemo, useRef } from 'react';
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

/** Binary search: find the first group that overlaps with targetPos (startIndex + length > targetPos) */
function binarySearchStart(groups: WordGroup[], targetPos: number): number {
  let left = 0, right = groups.length - 1;
  let result = 0;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (groups[mid].startIndex + groups[mid].length <= targetPos) {
      left = mid + 1;
    } else {
      result = mid;
      right = mid - 1;
    }
  }
  return result;
}

/** Binary search: find the first group whose startIndex >= targetPos */
function binarySearchEnd(groups: WordGroup[], targetPos: number): number {
  let left = 0, right = groups.length - 1;
  let result = groups.length;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (groups[mid].startIndex < targetPos) {
      left = mid + 1;
    } else {
      result = mid;
      right = mid - 1;
    }
  }
  return result;
}

/**
 * Shared text rendering hook for Practice and Reading pages.
 * Handles word grouping, windowed rendering, phrase marking,
 * word frequency analysis, and annotation generation.
 *
 * @param options - Configuration for text rendering
 * @param options.text - The text content to process (may be progressively loaded subset)
 * @param options.originalText - The full original text (for correlative matching context)
 * @param options.currentIndex - Current typing position (Practice mode)
 * @param options.visibleCenter - Estimated visible center character position (Reading mode)
 * @param options.renderWindow - Number of characters to render around the center
 * @param options.settings - User settings for frequency highlighting, annotations, etc.
 */
export function useTextRendering(options: UseTextRenderingOptions): UseTextRenderingResult {
  const { text, originalText, currentIndex, visibleCenter, renderWindow = 1500, settings } = options;

  // The center position for windowing: currentIndex (Practice) or visibleCenter (Reading)
  const centerPosition = currentIndex ?? visibleCenter ?? 0;

  // Incremental wordGroups: avoid full rebuild when text is only appended
  const prevTextRef = useRef('');
  const prevGroupsRef = useRef<WordGroup[]>([]);

  // Early return for empty text
  const emptyResult: UseTextRenderingResult = useMemo(() => ({
    wordGroups: [],
    onlyWords: [],
    windowStartGroupIdx: 0,
    windowEndGroupIdx: 0,
    windowStartCharIdx: 0,
    windowEndCharIdx: 0,
    useWindowing: false,
    phraseMarkedIndices: new Set<number>(),
    correlativeMap: new Map<number, CorrelativeInfo>(),
    wordFrequencies: new Map<number, FreqLevel>(),
    wordAnnotations: new Map<number, string>(),
  }), []);

  const isEmpty = !text;

  // Group text into words
  const wordGroups = useMemo(() => {
    if (isEmpty) return [];

    // If new text starts with the old text (pure append), only compute new portion
    if (text.length > prevTextRef.current.length &&
        text.startsWith(prevTextRef.current)) {
      const newStart = prevTextRef.current.length;
      const newGroups = [...prevGroupsRef.current];

      // Fix last group if the old text's tail and new text's start belong to the same word
      let i = newStart;
      if (newGroups.length > 0) {
        const lastGroup = newGroups[newGroups.length - 1];
        const lastGroupEnd = lastGroup.startIndex + lastGroup.length;
        if (lastGroupEnd === newStart && /[a-zA-Z'-]/.test(text[newStart])) {
          newGroups.pop();
          i = lastGroup.startIndex;
        }
      }

      // Parse from i onwards
      while (i < text.length) {
        if (/[a-zA-Z'-]/.test(text[i])) {
          let j = i;
          while (j < text.length && /[a-zA-Z'-]/.test(text[j])) j++;
          newGroups.push({ word: text.slice(i, j), startIndex: i, length: j - i });
          i = j;
        } else {
          newGroups.push({ word: text[i], startIndex: i, length: 1 });
          i++;
        }
      }

      prevTextRef.current = text;
      prevGroupsRef.current = newGroups;
      return newGroups;
    }

    // Full rebuild for new text
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

    prevTextRef.current = text;
    prevGroupsRef.current = groups;
    return groups;
  }, [text, isEmpty]);

  // Build only-word list for phrase lookup
  const onlyWords = useMemo(() => {
    if (isEmpty) return [];
    return wordGroups
      .map((g, idx) => ({ ...g, groupIndex: idx }))
      .filter(g => /[a-zA-Z]/.test(g.word));
  }, [wordGroups]);

  // Windowed rendering: compute window boundaries using binary search
  const { windowStartGroupIdx, windowEndGroupIdx, windowStartCharIdx, windowEndCharIdx, useWindowing } = useMemo(() => {
    if (text.length < renderWindow * 2) {
      return { windowStartGroupIdx: 0, windowEndGroupIdx: wordGroups.length, windowStartCharIdx: 0, windowEndCharIdx: text.length, useWindowing: false };
    }

    const rawStart = Math.max(0, centerPosition - renderWindow);
    const rawEnd = Math.min(text.length, centerPosition + renderWindow);

    // Binary search: first group overlapping rawStart
    const startIdx = binarySearchStart(wordGroups, rawStart);

    // Binary search: first group whose startIndex >= rawEnd (i.e. endIdx = that index)
    const endIdx = binarySearchEnd(wordGroups, rawEnd);

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

  if (isEmpty) return emptyResult;

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
