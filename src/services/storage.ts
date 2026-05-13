import type { TypingResult, Settings, TextItem } from '../types';

const HISTORY_KEY = 'typetype_history';
const SETTINGS_KEY = 'typetype_settings';
const ERROR_STATS_KEY = 'typetype_error_stats';
const CUSTOM_TEXTS_KEY = 'typetype_custom_texts';

const DEFAULT_SETTINGS: Settings = {
  fontSize: 20,
  showLiveStats: true,
  theme: 'light',
  difficulty: 'medium',
  mode: 'full',
  timedDuration: 30,
  soundEnabled: false,
  soundVolume: 0.5,
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

  saveResult(result: TypingResult): void {
    try {
      const history = this.getHistory();
      history.push(result);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      console.error('Failed to save typing result');
    }
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      console.error('Failed to clear history');
    }
  },

  deleteResult(id: string): void {
    try {
      const history = this.getHistory().filter((r) => r.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      console.error('Failed to delete result');
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
      console.error('Failed to save settings');
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
      console.error('Failed to update error stats');
    }
  },

  // ---- 自定义文本 ----

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
      console.error('Failed to save custom texts');
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
      console.error('Failed to add custom texts');
    }
  },
};
