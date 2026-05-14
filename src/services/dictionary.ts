interface DictEntry {
  p: string; // phonetic 音标
  t: string; // translation 中文释义
}

interface CorrelativePattern {
  pattern: string[]; // ['as', '*', 'as'] 其中 * 表示任意 1-maxGap 个词
  t: string;        // 中文释义
  maxGap: number;   // * 代表的最大间隔词数
}

class DictionaryService {
  private dict: Record<string, DictEntry> | null = null;
  private loading: Promise<void> | null = null;
  private correlativePatterns: CorrelativePattern[] = [];

  async load(): Promise<void> {
    if (this.dict) return;
    if (this.loading) return this.loading;

    this.loading = fetch('/dict.json')
      .then(res => res.json())
      .then(data => {
        // 提取关联词组模式
        if (data && data['__correlative__']) {
          this.correlativePatterns = data['__correlative__'] as CorrelativePattern[];
          delete data['__correlative__'];
        }
        this.dict = data;
      })
      .catch(err => {
        console.error('Failed to load dictionary:', err);
        this.dict = {};
      });

    return this.loading;
  }

  lookup(word: string): DictEntry | null {
    if (!this.dict) return null;
    // 先查原词（小写）
    const lower = word.toLowerCase().replace(/[^a-z'-]/g, '');
    if (this.dict[lower]) return this.dict[lower];
    // 简单词形还原：去掉常见后缀尝试查找
    const stems = [
      lower.replace(/ing$/, ''),
      lower.replace(/ing$/, 'e'),
      lower.replace(/ed$/, ''),
      lower.replace(/ed$/, 'e'),
      lower.replace(/s$/, ''),
      lower.replace(/es$/, ''),
      lower.replace(/ies$/, 'y'),
      lower.replace(/ly$/, ''),
      lower.replace(/tion$/, 'te'),
      lower.replace(/ment$/, ''),
      lower.replace(/ness$/, ''),
      lower.replace(/er$/, ''),
      lower.replace(/est$/, ''),
    ];
    for (const stem of stems) {
      if (stem !== lower && stem.length > 2 && this.dict[stem]) {
        return this.dict[stem];
      }
    }
    return null;
  }

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

  // 匹配关联词组（非连续词组）
  matchCorrelative(words: string[], startIndex: number): {
    indices: number[];
    translation: string;
    patternLabel: string;
  } | null {
    const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z'-]/g, ''));

    for (const cp of this.correlativePatterns) {
      const result = this.tryMatchPattern(lowerWords, startIndex, cp);
      if (result) return result;
    }
    return null;
  }

  private tryMatchPattern(
    words: string[],
    startIndex: number,
    cp: CorrelativePattern
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

  isLoaded(): boolean {
    return this.dict !== null;
  }
}

export const dictionaryService = new DictionaryService();
export type { DictEntry, CorrelativePattern };
