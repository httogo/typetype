import type { FreqLevel } from '../types';
import { logger } from './logger';

interface DictEntry {
  p: string; // phonetic 音标
  t: string; // translation 中文释义
  f?: 'h' | 'm' | 'l'; // frequency level 频率等级
}

interface CorrelativePattern {
  pattern: string[]; // ['as', '*', 'as'] 其中 * 表示任意 1-maxGap 个词
  t: string;        // 中文释义
  maxGap: number;   // * 代表的最大间隔词数
}

class DictionaryService {
  private dict: Record<string, DictEntry> | null = null;
  private loading: Promise<void> | null = null;
  private fullLoadPromise: Promise<void> | null = null;
  private isFullLoaded = false;
  private correlativePatterns: CorrelativePattern[] = [];
  private lookupCache = new Map<string, DictEntry | null>();
  private freqCache = new Map<string, FreqLevel>();
  private static readonly MAX_CACHE_SIZE = 10000;

  private static readonly SUFFIX_RULES: [RegExp, string][] = [
    [/ing$/, ''],
    [/ing$/, 'e'],
    [/ed$/, ''],
    [/ed$/, 'e'],
    [/s$/, ''],
    [/es$/, ''],
    [/ies$/, 'y'],
    [/ly$/, ''],
    [/tion$/, 'te'],
    [/ment$/, ''],
    [/ness$/, ''],
    [/er$/, ''],
    [/est$/, ''],
  ];

  private normalize(word: string): string {
    return word.toLowerCase().replace(/[^a-z'-]/g, '');
  }

  private stem(word: string): string[] {
    const stems: string[] = [];
    for (const [suffix, replacement] of DictionaryService.SUFFIX_RULES) {
      const s = word.replace(suffix, replacement);
      if (s !== word && s.length > 2) {
        stems.push(s);
      }
    }
    return stems;
  }

  private cacheSet<T>(cache: Map<string, T>, key: string, value: T): void {
    if (cache.size >= DictionaryService.MAX_CACHE_SIZE) {
      cache.clear();
    }
    cache.set(key, value);
  }

  async load(): Promise<void> {
    if (this.dict) return;
    if (this.loading) return this.loading;

    // 两阶段加载：先加载常用词典（小体积，快速可用），再后台加载完整词典
    this.loading = this.loadCommonDict();
    return this.loading;
  }

  private async loadCommonDict(): Promise<void> {
    try {
      const res = await fetch('/dict-common.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data['__correlative__']) {
          this.correlativePatterns = data['__correlative__'] as CorrelativePattern[];
          delete data['__correlative__'];
        }
        this.dict = data;
      } else {
        // 降级：直接加载完整词典
        await this.loadFullDictDirect();
        return;
      }
    } catch {
      // 降级：直接加载完整词典
      await this.loadFullDictDirect();
      return;
    }

    // 阶段2：后台加载完整词典
    this.fullLoadPromise = this.loadFullDict();
  }

  private async loadFullDict(): Promise<void> {
    try {
      const res = await fetch('/dict.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data['__correlative__']) {
          this.correlativePatterns = data['__correlative__'] as CorrelativePattern[];
          delete data['__correlative__'];
        }
        this.dict = data;
        this.isFullLoaded = true;
        // 清除缓存，让后续查询使用完整词典
        this.lookupCache.clear();
        this.freqCache.clear();
      }
    } catch (err) {
      logger.warn('dictionary', 'Full dictionary load failed, using common dict');
    }
  }

  private async loadFullDictDirect(): Promise<void> {
    try {
      const res = await fetch('/dict.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data['__correlative__']) {
          this.correlativePatterns = data['__correlative__'] as CorrelativePattern[];
          delete data['__correlative__'];
        }
        this.dict = data;
        this.isFullLoaded = true;
      } else {
        this.dict = {};
      }
    } catch (err) {
      logger.error('dictionary.load', err);
      this.dict = {};
    }
  }

  /** 等待完整词典加载完成（用于需要完整数据的场景） */
  async waitForFull(): Promise<void> {
    if (this.fullLoadPromise) await this.fullLoadPromise;
  }

  /**
   * Look up a word's dictionary entry, with lemmatization fallback.
   * Returns phonetic transcription, translation, and frequency level.
   * Results are cached for performance.
   *
   * @param word - The word to look up (case-insensitive, punctuation stripped)
   * @returns Dictionary entry or null if not found
   */
  lookup(word: string): DictEntry | null {
    if (!this.dict) return null;
    const lower = this.normalize(word);
    if (!lower) return null;

    // 查询缓存
    if (this.lookupCache.has(lower)) return this.lookupCache.get(lower)!;

    // 直接查找
    if (this.dict[lower]) {
      this.cacheSet(this.lookupCache, lower, this.dict[lower]);
      return this.dict[lower];
    }

    // 词形还原后查找
    for (const s of this.stem(lower)) {
      if (this.dict[s]) {
        this.cacheSet(this.lookupCache, lower, this.dict[s]);
        return this.dict[s];
      }
    }

    this.cacheSet(this.lookupCache, lower, null);
    return null;
  }

  /**
   * Try to match a continuous phrase starting at startIndex.
   * Checks from longest (5 words) to shortest (2 words).
   *
   * @param words - Array of all words in the text
   * @param startIndex - Index to start matching from
   * @returns Matched phrase entry and its word length, or null
   */
  // 尝试从 startIndex 开始匹配词组（从长到短，最多5个词）
  lookupPhrase(words: string[], startIndex: number): { entry: DictEntry; length: number } | null {
    if (!this.dict) return null;
    for (let len = Math.min(5, words.length - startIndex); len >= 2; len--) {
      const phrase = words.slice(startIndex, startIndex + len).join(' ').toLowerCase();
      if (this.dict[phrase]) {
        return { entry: this.dict[phrase], length: len };
      }
    }
    return null;
  }

  /**
   * Match correlative (non-continuous) phrase patterns like "as...as", "not only...but also".
   * Uses sentence boundary detection to avoid cross-sentence matching.
   *
   * @param words - Array of normalized words
   * @param startIndex - Index to start matching from
   * @param originalText - Full original text for sentence boundary checking
   * @param wordPositions - Character positions of each word in the original text
   * @returns Matched indices, translation, and pattern label, or null
   */
  // 匹配关联词组（非连续词组）
  // originalText 和 wordPositions 用于句子边界检查，防止跨句匹配
  matchCorrelative(words: string[], startIndex: number, originalText?: string, wordPositions?: number[]): {
    indices: number[];
    translation: string;
    patternLabel: string;
  } | null {
    const lowerWords = words.map(w => this.normalize(w));

    for (const cp of this.correlativePatterns) {
      const result = this.tryMatchPattern(lowerWords, startIndex, cp, originalText, wordPositions);
      if (result) return result;
    }
    return null;
  }

  private tryMatchPattern(
    words: string[],
    startIndex: number,
    cp: CorrelativePattern,
    originalText?: string,
    wordPositions?: number[]
  ): { indices: number[]; translation: string; patternLabel: string } | null {
    if (startIndex >= words.length) return null;
    if (words[startIndex] !== cp.pattern[0]) return null;

    const indices: number[] = [];
    let wordIdx = startIndex;

    for (let patIdx = 0; patIdx < cp.pattern.length; patIdx++) {
      if (wordIdx >= words.length) return null;

      if (cp.pattern[patIdx] === '*') {
        // 通配符：跳过 1 到 maxGap 个词，然后尝试匹配下一个 pattern 元素
        const nextPatToken = cp.pattern[patIdx + 1];
        if (!nextPatToken) return null;

        let found = false;
        for (let gap = 1; gap <= cp.maxGap && wordIdx + gap < words.length; gap++) {
          // 检查句子边界：如果原文中两个词之间存在句子终止符，则停止搜索
          if (originalText && wordPositions) {
            const fromPos = wordPositions[wordIdx];
            const toPos = wordPositions[wordIdx + gap];
            if (fromPos !== undefined && toPos !== undefined) {
              const textBetween = originalText.slice(fromPos, toPos);
              if (/[.?!]/.test(textBetween)) {
                break; // 遇到句子边界，停止搜索
              }
            }
          }
          if (words[wordIdx + gap] === nextPatToken) {
            wordIdx = wordIdx + gap;
            found = true;
            break;
          }
        }
        if (!found) return null;
        // wordIdx 现在指向 nextPatToken 的位置
        indices.push(wordIdx);
        patIdx++; // 跳过已匹配的 nextPatToken
        wordIdx++;
      } else {
        if (words[wordIdx] !== cp.pattern[patIdx]) return null;
        indices.push(wordIdx);
        wordIdx++;
      }
    }

    // 生成模式标签，如 "as...as", "not only...but also"
    const patternLabel = cp.pattern.filter(p => p !== '*').join('...');

    return { indices, translation: cp.t, patternLabel };
  }

  getCorrelativePatterns(): CorrelativePattern[] {
    return this.correlativePatterns;
  }

  /**
   * Get the frequency level of a word.
   * Returns 'h' (high), 'm' (medium), 'l' (low), or 'u' (unknown/unlisted).
   * Uses lemmatization fallback and caches results.
   *
   * @param word - The word to check (case-insensitive)
   * @returns Frequency level
   */
  getFrequency(word: string): FreqLevel {
    if (!this.dict) return 'u';
    const lower = this.normalize(word);
    if (!lower) return 'u';

    // 查询频率缓存
    const cached = this.freqCache.get(lower);
    if (cached !== undefined) return cached;

    let freq: FreqLevel = 'u';

    // 直接查字典获取频率，不经过 lookup
    if (this.dict[lower]) {
      freq = this.dict[lower].f ?? 'u';
    } else {
      for (const s of this.stem(lower)) {
        if (this.dict[s]) {
          freq = this.dict[s].f ?? 'u';
          break;
        }
      }
    }

    this.cacheSet(this.freqCache, lower, freq);
    return freq;
  }

  isLoaded(): boolean {
    return this.dict !== null;
  }

  isFullDictLoaded(): boolean {
    return this.isFullLoaded;
  }
}

export const dictionaryService = new DictionaryService();
export type { DictEntry, CorrelativePattern };
