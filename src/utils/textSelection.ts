import type { TextItem } from '../types';
import { texts } from '../data/texts';

/** 获取指定难度的文本列表 */
export function getTextsByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): TextItem[] {
  return texts.filter((t) => t.difficulty === difficulty);
}

/** 随机获取一个指定难度的文本，不传难度则从全部文本中随机 */
export function getRandomText(difficulty?: 'easy' | 'medium' | 'hard'): TextItem {
  const pool = difficulty ? getTextsByDifficulty(difficulty) : texts;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
