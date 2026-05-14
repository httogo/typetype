import type { TypingResult, Settings, TextItem, SavedArticle } from '../types';
import { parseChapters } from '../utils/chapterParser';
import { logger } from './logger';

const HISTORY_KEY = 'typetype_history';
const SETTINGS_KEY = 'typetype_settings';
const ERROR_STATS_KEY = 'typetype_error_stats';
const CUSTOM_TEXTS_KEY = 'typetype_custom_texts';
const ARTICLES_KEY = 'typetype_articles';

const DEFAULT_SETTINGS: Settings = {
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

export const storageService = {
  // ---- 历史记录 ----

  getHistory(): TypingResult[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveResult(result: TypingResult): boolean {
    try {
      const history = this.getHistory();
      history.push(result);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      return true;
    } catch (e) {
      logger.error('storage.saveResult', e);
      return false;
    }
  },

  /** 原子操作：同时保存打字结果和错误统计，防止数据不一致 */
  saveTypingResult(result: TypingResult, errorMap: Record<string, { errors: number; total: number }>): boolean {
    try {
      // 读取当前数据
      const history = this.getHistory();
      const errorStats = this.getErrorStats();

      // 更新数据
      history.push(result);
      Object.keys(errorMap).forEach(key => {
        errorStats[key] = {
          errors: (errorStats[key]?.errors ?? 0) + errorMap[key].errors,
          total: (errorStats[key]?.total ?? 0) + errorMap[key].total,
        };
      });

      // 一次性写入
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      localStorage.setItem(ERROR_STATS_KEY, JSON.stringify(errorStats));
      return true;
    } catch (e) {
      logger.error('storage.saveTypingResult', e);
      return false;
    }
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      logger.error('storage.clearHistory');
    }
  },

  deleteResult(id: string): void {
    try {
      const history = this.getHistory().filter((r) => r.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      logger.error('storage.deleteResult');
    }
  },

  // ---- 设置 ----

  getSettings(): Settings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings: Settings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      logger.error('storage.saveSettings');
    }
  },

  // ---- 错误统计 ----

  getErrorStats(): Record<string, { errors: number; total: number }> {
    try {
      const raw = localStorage.getItem(ERROR_STATS_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  },

  updateErrorStats(newErrors: Record<string, { errors: number; total: number }>): void {
    try {
      const existing = this.getErrorStats();
      for (const [key, value] of Object.entries(newErrors)) {
        if (!existing[key]) {
          existing[key] = { errors: 0, total: 0 };
        }
        existing[key].errors += value.errors;
        existing[key].total += value.total;
      }
      localStorage.setItem(ERROR_STATS_KEY, JSON.stringify(existing));
    } catch {
      logger.error('storage.updateErrorStats');
    }
  },

  // ---- 导入文章 ----

  getCustomTexts(): TextItem[] {
    try {
      const raw = localStorage.getItem(CUSTOM_TEXTS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveCustomTexts(texts: TextItem[]): void {
    try {
      localStorage.setItem(CUSTOM_TEXTS_KEY, JSON.stringify(texts));
    } catch {
      logger.error('storage.saveCustomTexts');
    }
  },

  addCustomTexts(newTexts: TextItem[]): void {
    try {
      const existing = this.getCustomTexts();
      const existingIds = new Set(existing.map(t => t.id));
      const unique = newTexts.filter(t => !existingIds.has(t.id));
      const merged = [...existing, ...unique];
      localStorage.setItem(CUSTOM_TEXTS_KEY, JSON.stringify(merged));
    } catch {
      logger.error('storage.addCustomTexts');
    }
  },

  // ---- 我的文章 ----

  getSavedArticles(): SavedArticle[] {
    try {
      const raw = localStorage.getItem(ARTICLES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveArticle(article: Omit<SavedArticle, 'id' | 'createdAt'>): SavedArticle {
    const chapters = article.chapters ?? parseChapters(article.content);
    const newArticle: SavedArticle = {
      ...article,
      id: `article-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      chapters: chapters.length > 0 ? chapters : undefined,
    };
    try {
      const articles = this.getSavedArticles();
      articles.unshift(newArticle);
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    } catch (e) {
      logger.error('storage.saveArticle', e);
      throw new Error('存储空间不足，无法保存文章');
    }
    return newArticle;
  },

  updateArticle(id: string, updates: Partial<SavedArticle>): void {
    try {
      const articles = this.getSavedArticles();
      const idx = articles.findIndex((a) => a.id === id);
      if (idx !== -1) {
        articles[idx] = { ...articles[idx], ...updates };
        localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
      }
    } catch (e) {
      logger.error('storage.updateArticle', e);
      throw new Error('存储空间不足，无法更新文章');
    }
  },

  deleteArticle(id: string): void {
    try {
      const articles = this.getSavedArticles().filter((a) => a.id !== id);
      localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles));
    } catch (e) {
      logger.error('storage.deleteArticle', e);
      throw new Error('存储操作失败，无法删除文章');
    }
  },

  clearAllArticles(): void {
    try {
      localStorage.removeItem(ARTICLES_KEY);
    } catch {
      logger.error('storage.clearAllArticles');
    }
  },
};
