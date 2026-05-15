import type {
  HighlightStyle,
  HighlightStyleConfig,
  ResolvedWordHighlight,
  WordList,
  WordListTerm,
} from '../types';
import { generateId } from '../utils/typing';

interface WordToken {
  word: string;
  normalized: string;
  startIndex: number;
}

type HighlightInput = Omit<HighlightStyle, 'createdAt' | 'updatedAt'> & Partial<Pick<HighlightStyle, 'createdAt' | 'updatedAt'>>;
type WordListInput = Omit<WordList, 'createdAt' | 'updatedAt' | 'matchForms'> &
  Partial<Pick<WordList, 'createdAt' | 'updatedAt' | 'matchForms'>>;

const SUFFIX_RULES: [RegExp, string][] = [
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

const STYLE_KEYS: (keyof HighlightStyleConfig)[] = [
  'textColor',
  'backgroundColor',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'underline',
  'underlineColor',
  'strikethrough',
  'strikethroughColor',
  'borderColor',
  'borderRadius',
];

export function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z'\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWord(value: string): string {
  return value.toLowerCase().replace(/[^a-z'-]/g, '');
}

function stemWord(word: string): string[] {
  const stems: string[] = [];
  for (const [suffix, replacement] of SUFFIX_RULES) {
    const stem = word.replace(suffix, replacement);
    if (stem !== word && stem.length > 2 && !stems.includes(stem)) {
      stems.push(stem);
    }
  }
  return stems;
}

function wordsEquivalent(actual: string, expected: string, matchForms: boolean): boolean {
  if (actual === expected) return true;
  if (!matchForms) return false;
  return stemWord(actual).includes(expected) || stemWord(expected).includes(actual);
}

function tokenizeText(text: string): WordToken[] {
  const tokens: WordToken[] = [];
  const regex = /[a-zA-Z'-]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      normalized: normalizeWord(match[0]),
      startIndex: match.index,
    });
  }
  return tokens;
}

export function createHighlightStyle(input: HighlightInput): HighlightStyle {
  const now = Date.now();
  return {
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function createWordList(input: WordListInput): WordList {
  const now = Date.now();
  return {
    ...input,
    matchForms: input.matchForms ?? true,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function createWordListTerm(value: string): WordListTerm {
  return {
    id: generateId(),
    value: normalizeTerm(value),
    createdAt: Date.now(),
  };
}

export function mergeHighlightStyles(styles: HighlightStyleConfig[]): HighlightStyleConfig {
  const merged: HighlightStyleConfig = {};
  for (const style of styles) {
    for (const key of STYLE_KEYS) {
      if (merged[key] === undefined && style[key] !== undefined) {
        (merged as Record<keyof HighlightStyleConfig, unknown>)[key] = style[key];
      }
    }
  }
  return merged;
}

function addMatch(
  matches: Map<number, { styles: HighlightStyleConfig[]; matchedTerms: string[]; listIds: string[] }>,
  startIndex: number,
  style: HighlightStyleConfig,
  termValue: string,
  listId: string
) {
  const existing = matches.get(startIndex) ?? { styles: [], matchedTerms: [], listIds: [] };
  existing.styles.push(style);
  if (!existing.matchedTerms.includes(termValue)) existing.matchedTerms.push(termValue);
  if (!existing.listIds.includes(listId)) existing.listIds.push(listId);
  matches.set(startIndex, existing);
}

export function buildCustomHighlightMap(
  text: string,
  wordLists: WordList[],
  highlightStyles: HighlightStyle[]
): Map<number, ResolvedWordHighlight> {
  const tokens = tokenizeText(text);
  const stylesById = new Map(highlightStyles.map((style) => [style.id, style]));
  const activeLists = [...wordLists]
    .filter((list) => list.enabled)
    .sort((a, b) => a.priority - b.priority);
  const matches = new Map<number, { styles: HighlightStyleConfig[]; matchedTerms: string[]; listIds: string[] }>();

  for (const list of activeLists) {
    const style = stylesById.get(list.styleId);
    if (!style) continue;

    for (const term of list.terms) {
      const normalizedTerm = normalizeTerm(term.value);
      if (!normalizedTerm) continue;
      const termWords = normalizedTerm.split(' ');

      for (let i = 0; i <= tokens.length - termWords.length; i++) {
        let matched = true;
        for (let j = 0; j < termWords.length; j++) {
          if (!wordsEquivalent(tokens[i + j].normalized, termWords[j], list.matchForms)) {
            matched = false;
            break;
          }
        }
        if (!matched) continue;
        for (let j = 0; j < termWords.length; j++) {
          const token = tokens[i + j];
          for (let k = token.startIndex; k < token.startIndex + token.word.length; k++) {
            addMatch(matches, k, style.config, normalizedTerm, list.id);
          }
        }
      }
    }
  }

  const resolved = new Map<number, ResolvedWordHighlight>();
  for (const [startIndex, match] of matches) {
    resolved.set(startIndex, {
      style: mergeHighlightStyles(match.styles),
      matchedTerms: match.matchedTerms,
      listIds: match.listIds,
    });
  }
  return resolved;
}

export function highlightConfigToCss(config: HighlightStyleConfig): Record<string, string | number> {
  const style: Record<string, string | number> = {};
  if (config.textColor) style.color = config.textColor;
  if (config.backgroundColor) style.backgroundColor = config.backgroundColor;
  if (config.fontFamily) {
    style.fontFamily = config.fontFamily === 'serif'
      ? 'Georgia, Cambria, Times New Roman, serif'
      : config.fontFamily === 'sans'
        ? 'Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
        : 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  }
  if (config.fontWeight) style.fontWeight = config.fontWeight;
  if (config.fontStyle) style.fontStyle = config.fontStyle;
  if (config.borderRadius !== undefined) style.borderRadius = `${config.borderRadius}px`;
  if (config.borderColor) style.borderBottom = `2px solid ${config.borderColor}`;

  const decorations: string[] = [];
  if (config.underline) decorations.push('underline');
  if (config.strikethrough) decorations.push('line-through');
  if (decorations.length > 0) {
    style.textDecorationLine = decorations.join(' ');
    style.textUnderlineOffset = '0.18em';
  }
  if (config.underlineColor || config.strikethroughColor) {
    style.textDecorationColor = config.underlineColor ?? config.strikethroughColor!;
  }

  return style;
}
