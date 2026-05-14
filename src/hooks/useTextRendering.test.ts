import { renderHook } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useTextRendering } from './useTextRendering';
import type { Settings } from '../types';

// Mock dictionaryService
vi.mock('../services/dictionary', () => ({
  dictionaryService: {
    isLoaded: vi.fn(() => false),
    lookupPhrase: vi.fn(() => null),
    matchCorrelative: vi.fn(() => null),
    getFrequency: vi.fn(() => 'u'),
    lookup: vi.fn(() => null),
  },
}));

const defaultSettings: Settings = {
  fontSize: 20,
  showLiveStats: true,
  theme: 'light',
  difficulty: 'medium',
  mode: 'full',
  timedDuration: 30,
  soundEnabled: false,
  soundVolume: 0.5,
  phraseHighlight: true,
  freqHighlight: { h: false, m: false, l: false },
  freqAnnotation: { h: true, m: true, l: true },
  freqDimLow: false,
  freqDimUltraLow: false,
};

describe('useTextRendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('a) 词组分组 (wordGroups)', () => {
    test('文本正确分组为单词和非单词', () => {
      const text = 'hello world';
      const { result } = renderHook(() =>
        useTextRendering({
          text,
          originalText: text,
          currentIndex: 0,
          settings: defaultSettings,
        })
      );

      const groups = result.current.wordGroups;
      // "hello" + " " + "world" = 3 groups
      expect(groups.length).toBe(3);
      expect(groups[0].word).toBe('hello');
      expect(groups[0].startIndex).toBe(0);
      expect(groups[0].length).toBe(5);
      expect(groups[1].word).toBe(' ');
      expect(groups[1].startIndex).toBe(5);
      expect(groups[1].length).toBe(1);
      expect(groups[2].word).toBe('world');
      expect(groups[2].startIndex).toBe(6);
      expect(groups[2].length).toBe(5);
    });

    test('包含标点的文本正确分组', () => {
      const text = "don't stop!";
      const { result } = renderHook(() =>
        useTextRendering({
          text,
          originalText: text,
          currentIndex: 0,
          settings: defaultSettings,
        })
      );

      const groups = result.current.wordGroups;
      // "don't" (apostrophe is part of word) + " " + "stop" + "!"
      expect(groups[0].word).toBe("don't");
      expect(groups[0].length).toBe(5);
    });

    test('空文本返回空数组', () => {
      const { result } = renderHook(() =>
        useTextRendering({
          text: '',
          originalText: '',
          currentIndex: 0,
          settings: defaultSettings,
        })
      );

      expect(result.current.wordGroups).toEqual([]);
    });

    test('onlyWords 只包含英文单词', () => {
      const text = 'hello, world!';
      const { result } = renderHook(() =>
        useTextRendering({
          text,
          originalText: text,
          currentIndex: 0,
          settings: defaultSettings,
        })
      );

      // onlyWords should filter out non-alphabetic groups
      const onlyWords = result.current.onlyWords;
      expect(onlyWords.length).toBe(2);
      expect(onlyWords[0].word).toBe('hello');
      expect(onlyWords[1].word).toBe('world');
    });
  });

  describe('b) 渲染窗口计算', () => {
    test('短文本不启用 windowing', () => {
      const text = 'short text';
      const { result } = renderHook(() =>
        useTextRendering({
          text,
          originalText: text,
          currentIndex: 0,
          renderWindow: 1500,
          settings: defaultSettings,
        })
      );

      expect(result.current.useWindowing).toBe(false);
      expect(result.current.windowStartGroupIdx).toBe(0);
      expect(result.current.windowEndGroupIdx).toBe(result.current.wordGroups.length);
    });

    test('长文本启用 windowing 且窗口在 currentIndex 附近', () => {
      // Generate a long text > 3000 chars (renderWindow * 2)
      const words = Array.from({ length: 600 }, (_, i) => `word${i}`);
      const text = words.join(' '); // ~4000 chars

      const centerIdx = Math.floor(text.length / 2);
      const { result } = renderHook(() =>
        useTextRendering({
          text,
          originalText: text,
          currentIndex: centerIdx,
          renderWindow: 1500,
          settings: defaultSettings,
        })
      );

      expect(result.current.useWindowing).toBe(true);
      // The window should contain the center position
      expect(result.current.windowStartCharIdx).toBeLessThanOrEqual(centerIdx);
      expect(result.current.windowEndCharIdx).toBeGreaterThanOrEqual(centerIdx);
    });

    test('窗口不超出文本边界', () => {
      const words = Array.from({ length: 600 }, (_, i) => `word${i}`);
      const text = words.join(' ');

      // currentIndex at start
      const { result: r1 } = renderHook(() =>
        useTextRendering({
          text,
          originalText: text,
          currentIndex: 0,
          renderWindow: 1500,
          settings: defaultSettings,
        })
      );
      expect(r1.current.windowStartCharIdx).toBeGreaterThanOrEqual(0);

      // currentIndex at end
      const { result: r2 } = renderHook(() =>
        useTextRendering({
          text,
          originalText: text,
          currentIndex: text.length - 1,
          renderWindow: 1500,
          settings: defaultSettings,
        })
      );
      expect(r2.current.windowEndCharIdx).toBeLessThanOrEqual(text.length);
    });
  });

  describe('c) 增量更新', () => {
    test('文本追加时 wordGroups 正确扩展', () => {
      const initialText = 'hello';
      const { result, rerender } = renderHook(
        ({ text }) =>
          useTextRendering({
            text,
            originalText: text,
            currentIndex: 0,
            settings: defaultSettings,
          }),
        { initialProps: { text: initialText } }
      );

      expect(result.current.wordGroups.length).toBe(1);
      expect(result.current.wordGroups[0].word).toBe('hello');

      // Append text (progressive loading simulation)
      rerender({ text: 'hello world' });
      expect(result.current.wordGroups.length).toBe(3);
      expect(result.current.wordGroups[2].word).toBe('world');
    });

    test('文本追加时保持已有分组位置不变', () => {
      const { result, rerender } = renderHook(
        ({ text }) =>
          useTextRendering({
            text,
            originalText: text,
            currentIndex: 0,
            settings: defaultSettings,
          }),
        { initialProps: { text: 'hello ' } }
      );

      const firstGroup = result.current.wordGroups[0];
      expect(firstGroup.word).toBe('hello');
      expect(firstGroup.startIndex).toBe(0);

      rerender({ text: 'hello world' });
      // First group should still start at 0
      expect(result.current.wordGroups[0].startIndex).toBe(0);
      expect(result.current.wordGroups[0].word).toBe('hello');
    });
  });

  describe('d) 空文本保护', () => {
    test('传入空字符串不崩溃，返回空结果', () => {
      const { result } = renderHook(() =>
        useTextRendering({
          text: '',
          originalText: '',
          currentIndex: 0,
          settings: defaultSettings,
        })
      );

      expect(result.current.wordGroups).toEqual([]);
      expect(result.current.onlyWords).toEqual([]);
      expect(result.current.useWindowing).toBe(false);
      expect(result.current.windowStartGroupIdx).toBe(0);
      expect(result.current.windowEndGroupIdx).toBe(0);
      expect(result.current.phraseMarkedIndices.size).toBe(0);
      expect(result.current.correlativeMap.size).toBe(0);
      expect(result.current.wordFrequencies.size).toBe(0);
      expect(result.current.wordAnnotations.size).toBe(0);
    });

    test('传入 undefined 式空文本不崩溃', () => {
      const { result } = renderHook(() =>
        useTextRendering({
          text: '',
          originalText: '',
          settings: defaultSettings,
        })
      );

      expect(result.current.wordGroups).toEqual([]);
    });
  });
});
