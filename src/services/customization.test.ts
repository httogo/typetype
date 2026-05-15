import { describe, expect, test } from 'vitest';
import {
  buildCustomHighlightMap,
  createHighlightStyle,
  createWordList,
  mergeHighlightStyles,
} from './customization';
import type { HighlightStyleConfig, WordListTerm } from '../types';

const emphasis = createHighlightStyle({
  id: 'style-emphasis',
  name: '重点词',
  config: {
    textColor: '#b91c1c',
    backgroundColor: '#fef3c7',
    fontWeight: '700',
    underline: true,
    underlineColor: '#b91c1c',
  },
});

const learned = createHighlightStyle({
  id: 'style-learned',
  name: '已掌握',
  config: {
    textColor: '#6b7280',
    strikethrough: true,
  },
});

function term(value: string): WordListTerm {
  return {
    id: `term-${value}`,
    value,
    createdAt: 1700000000000,
  };
}

describe('customization service', () => {
  test('merges non-conflicting style fields and keeps higher priority conflicts', () => {
    const highPriority: HighlightStyleConfig = {
      textColor: '#b91c1c',
      backgroundColor: '#fef3c7',
    };
    const lowPriority: HighlightStyleConfig = {
      textColor: '#075985',
      fontFamily: 'serif',
      underline: true,
      underlineColor: '#075985',
      borderRadius: 3,
    };

    const merged = mergeHighlightStyles([highPriority, lowPriority]);

    expect(merged.textColor).toBe('#b91c1c');
    expect(merged.backgroundColor).toBe('#fef3c7');
    expect(merged.fontFamily).toBe('serif');
    expect(merged.underline).toBe(true);
    expect(merged.underlineColor).toBe('#075985');
    expect(merged.borderRadius).toBe(3);
  });

  test('matches single words and applies their referenced style', () => {
    const text = 'Careful analysis matters.';
    const wordList = createWordList({
      id: 'list-1',
      name: '考研核心词',
      styleId: emphasis.id,
      terms: [term('analysis')],
      enabled: true,
      priority: 0,
    });

    const highlights = buildCustomHighlightMap(text, [wordList], [emphasis]);

    expect(highlights.get(8)?.style.textColor).toBe('#b91c1c');
    expect(highlights.get(8)?.matchedTerms).toEqual(['analysis']);
  });

  test('matches fixed phrases across continuous word tokens', () => {
    const text = 'The result is in terms of evidence.';
    const wordList = createWordList({
      id: 'list-phrase',
      name: '短语',
      styleId: emphasis.id,
      terms: [term('in terms of')],
      enabled: true,
      priority: 0,
    });

    const highlights = buildCustomHighlightMap(text, [wordList], [emphasis]);

    expect(highlights.get(14)?.matchedTerms).toEqual(['in terms of']);
    expect(highlights.get(17)?.matchedTerms).toEqual(['in terms of']);
    expect(highlights.get(23)?.matchedTerms).toEqual(['in terms of']);
  });

  test('matches simple word forms when the list enables form matching', () => {
    const text = 'She analyzed the result and analyzes evidence.';
    const wordList = createWordList({
      id: 'list-forms',
      name: '词形',
      styleId: emphasis.id,
      terms: [term('analyze')],
      enabled: true,
      priority: 0,
      matchForms: true,
    });

    const highlights = buildCustomHighlightMap(text, [wordList], [emphasis]);

    expect(highlights.get(4)?.matchedTerms).toEqual(['analyze']);
    expect(highlights.get(28)?.matchedTerms).toEqual(['analyze']);
  });

  test('uses word-list priority for same-field conflicts', () => {
    const text = 'analysis';
    const high = createWordList({
      id: 'list-high',
      name: '高优先级',
      styleId: emphasis.id,
      terms: [term('analysis')],
      enabled: true,
      priority: 0,
    });
    const low = createWordList({
      id: 'list-low',
      name: '低优先级',
      styleId: learned.id,
      terms: [term('analysis')],
      enabled: true,
      priority: 1,
    });

    const highlights = buildCustomHighlightMap(text, [low, high], [learned, emphasis]);

    expect(highlights.get(0)?.style.textColor).toBe('#b91c1c');
    expect(highlights.get(0)?.style.strikethrough).toBe(true);
    expect(highlights.get(0)?.listIds).toEqual(['list-high', 'list-low']);
  });
});
